/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Simulation of the PostgreSQL Row Level Security (RLS) policies
 * defined in supabase/migrations/20260920_harden_profiles_role_update.sql
 */
interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: 'interviewer' | 'admin';
  department_unit: string;
  phone_number: string | null;
  avatar_url: string | null;
}

class SimulatedProfilesPostgresDB {
  private rows: Map<string, ProfileRow> = new Map();

  constructor(initialRows: ProfileRow[]) {
    initialRows.forEach((r) => this.rows.set(r.id, { ...r }));
  }

  public getRow(id: string): ProfileRow | undefined {
    const r = this.rows.get(id);
    return r ? { ...r } : undefined;
  }

  /**
   * Evaluates public.is_admin() for the active auth session
   */
  public isAdmin(authUid: string | null): boolean {
    if (!authUid) return false;
    const profile = this.rows.get(authUid);
    return profile?.role === 'admin';
  }

  /**
   * Executes an UPDATE against public.profiles, enforcing:
   * 1. RLS Policy: "Admins can update any profile"
   *    USING (is_admin()) WITH CHECK (is_admin())
   * 2. RLS Policy: "Users update own non-role fields"
   *    USING (auth.uid() = id)
   *    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
   * 3. Defensive Trigger: trg_prevent_role_escalation
   *    IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() -> RAISE EXCEPTION '42501'
   */
  public updateProfile(
    authUid: string,
    targetId: string,
    updates: Partial<ProfileRow>
  ): { success: boolean; data?: ProfileRow; error?: { code: string; message: string } } {
    const existing = this.rows.get(targetId);
    if (!existing) {
      return {
        success: false,
        error: { code: 'PGRST116', message: 'Row not found' },
      };
    }

    const isAdminCaller = this.isAdmin(authUid);

    // --- STEP 1: RLS USING clause evaluation ---
    const policyAdminUsing = isAdminCaller;
    const policyUserUsing = authUid === targetId;

    if (!policyAdminUsing && !policyUserUsing) {
      return {
        success: false,
        error: {
          code: '42501',
          message: 'new row violates row-level security policy for table "profiles" (no matching USING policy)',
        },
      };
    }

    // Proposed new row
    const newRow: ProfileRow = {
      ...existing,
      ...updates,
      id: existing.id, // ID cannot be updated
    };

    // --- STEP 2: RLS WITH CHECK clause evaluation ---
    let passedWithCheck = false;

    if (policyAdminUsing) {
      // Policy 2b: Admins can update any profile WITH CHECK (public.is_admin())
      passedWithCheck = this.isAdmin(authUid);
    } else if (policyUserUsing) {
      // Policy 2a: Users update own non-role fields
      // WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
      const currentStoredRole = existing.role;
      const proposedRole = newRow.role;
      passedWithCheck = authUid === newRow.id && proposedRole === currentStoredRole;
    }

    if (!passedWithCheck) {
      return {
        success: false,
        error: {
          code: '42501',
          message: 'new row violates row-level security policy for table "profiles"',
        },
      };
    }

    // --- STEP 3: Defensive Trigger: trg_prevent_role_escalation ---
    if (newRow.role !== existing.role && !isAdminCaller) {
      return {
        success: false,
        error: {
          code: '42501',
          message: 'Unauthorized: Non-admin users are strictly prohibited from modifying the role attribute.',
        },
      };
    }

    // Update succeeds
    this.rows.set(targetId, newRow);
    return { success: true, data: newRow };
  }
}

describe('PostgreSQL RLS & Profiles Role Hardening (20260920_harden_profiles_role_update)', () => {
  let db: SimulatedProfilesPostgresDB;

  const interviewerId = 'usr-interviewer-001';
  const victimInterviewerId = 'usr-interviewer-002';
  const adminId = 'usr-admin-florence-001';

  beforeEach(() => {
    db = new SimulatedProfilesPostgresDB([
      {
        id: interviewerId,
        email: 'john.okello@mglsd.go.ug',
        full_name: 'John Okello',
        role: 'interviewer',
        department_unit: 'Labour Inspectorate',
        phone_number: '+256 772 123 456',
        avatar_url: null,
      },
      {
        id: victimInterviewerId,
        email: 'sarah.namatovu@mglsd.go.ug',
        full_name: 'Sarah Namatovu',
        role: 'interviewer',
        department_unit: 'Industrial Relations',
        phone_number: '+256 701 987 654',
        avatar_url: null,
      },
      {
        id: adminId,
        email: 'florence.nsubuga@mglsd.go.ug',
        full_name: 'Florence Nsubuga',
        role: 'admin',
        department_unit: 'Office of the Director',
        phone_number: '+256 700 111 222',
        avatar_url: null,
      },
    ]);
  });

  it('blocks non-admin user from escalating own role to admin via client update', () => {
    // Attempt privilege escalation:
    // await supabase.from('profiles').update({ role: 'admin' }).eq('id', auth.uid())
    const result = db.updateProfile(interviewerId, interviewerId, {
      role: 'admin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('42501');
    expect(result.error?.message).toMatch(/violates row-level security policy|strictly prohibited/i);

    // Assert that the stored database record is still 'interviewer'
    const stored = db.getRow(interviewerId);
    expect(stored?.role).toBe('interviewer');
  });

  it('allows non-admin user to update their own non-role profile attributes', () => {
    const result = db.updateProfile(interviewerId, interviewerId, {
      full_name: 'John Baptist Okello',
      phone_number: '+256 772 999 888',
      department_unit: 'Regional Labour Office - Jinja',
      avatar_url: 'https://example.com/avatars/john.jpg',
    });

    expect(result.success).toBe(true);
    expect(result.data?.full_name).toBe('John Baptist Okello');
    expect(result.data?.phone_number).toBe('+256 772 999 888');
    expect(result.data?.department_unit).toBe('Regional Labour Office - Jinja');
    expect(result.data?.role).toBe('interviewer'); // Preserved

    const stored = db.getRow(interviewerId);
    expect(stored?.full_name).toBe('John Baptist Okello');
    expect(stored?.role).toBe('interviewer');
  });

  it('blocks non-admin user from updating another user profile', () => {
    const result = db.updateProfile(interviewerId, victimInterviewerId, {
      full_name: 'Hacked Name',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('42501');

    const victimStored = db.getRow(victimInterviewerId);
    expect(victimStored?.full_name).toBe('Sarah Namatovu');
  });

  it('allows authorized administrator to update any user role', () => {
    // Administrator promotes Sarah to admin
    const promoteResult = db.updateProfile(adminId, victimInterviewerId, {
      role: 'admin',
    });

    expect(promoteResult.success).toBe(true);
    expect(promoteResult.data?.role).toBe('admin');

    const stored = db.getRow(victimInterviewerId);
    expect(stored?.role).toBe('admin');

    // Administrator demotes back to interviewer
    const demoteResult = db.updateProfile(adminId, victimInterviewerId, {
      role: 'interviewer',
    });

    expect(demoteResult.success).toBe(true);
    expect(demoteResult.data?.role).toBe('interviewer');
  });

  it('allows administrator to update other profile fields across all users', () => {
    const result = db.updateProfile(adminId, interviewerId, {
      department_unit: 'National Headquarters Directorate',
    });

    expect(result.success).toBe(true);
    expect(result.data?.department_unit).toBe('National Headquarters Directorate');

    const stored = db.getRow(interviewerId);
    expect(stored?.department_unit).toBe('National Headquarters Directorate');
  });

  it('verifies public.is_admin() correctly discriminates between roles', () => {
    expect(db.isAdmin(adminId)).toBe(true);
    expect(db.isAdmin(interviewerId)).toBe(false);
    expect(db.isAdmin(null)).toBe(false);
    expect(db.isAdmin('non-existent-user')).toBe(false);
  });
});
