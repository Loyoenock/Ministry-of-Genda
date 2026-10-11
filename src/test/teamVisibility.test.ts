/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { UserProfile, Interview } from '../types';

/**
 * Pure helper simulating same_department and can_view_interview RLS logic
 */
function sameDepartment(userDept?: string | null, targetDept?: string | null): boolean {
  if (!userDept || !targetDept) return false;
  return userDept.trim().toLowerCase() === targetDept.trim().toLowerCase();
}

function canViewInterview(
  currentUser: UserProfile | null,
  interview: Partial<Interview> & { interviewer_id: string; department_unit?: string }
): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  if (interview.interviewer_id === currentUser.id) return true;
  return sameDepartment(currentUser.department_unit, interview.department_unit);
}

function canModifyInterview(
  currentUser: UserProfile | null,
  interview: Partial<Interview> & { interviewer_id: string }
): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  return interview.interviewer_id === currentUser.id;
}

describe('Dynamic Department Team Visibility & RLS Logic', () => {
  const profileTeammateA: UserProfile = {
    id: 'usr-officer-a-001',
    email: 'officer.a@mglsd.go.ug',
    full_name: 'Officer Alice',
    role: 'interviewer',
    department_unit: 'Labour Inspectorate – Central Region',
  };

  const profileTeammateB: UserProfile = {
    id: 'usr-officer-b-002',
    email: 'officer.b@mglsd.go.ug',
    full_name: 'Officer Bob',
    role: 'interviewer',
    department_unit: 'Labour Inspectorate – Central Region',
  };

  const profileOutsideDept: UserProfile = {
    id: 'usr-officer-c-003',
    email: 'officer.c@mglsd.go.ug',
    full_name: 'Officer Charlie',
    role: 'interviewer',
    department_unit: 'OSH Department – Eastern Region',
  };

  const teammateInterview: Partial<Interview> & { id: string; interviewer_id: string; department_unit: string } = {
    id: 'int-teammate-100',
    interviewer_id: profileTeammateA.id,
    interviewer_name: profileTeammateA.full_name,
    department_unit: profileTeammateA.department_unit,
    interviewee_name: 'Kampala Industrial Plant Manager',
    status: 'In Progress',
  };

  it('allows teammate B to view interview conducted by teammate A in same department', () => {
    expect(sameDepartment(profileTeammateB.department_unit, teammateInterview.department_unit)).toBe(true);
    expect(canViewInterview(profileTeammateB, teammateInterview)).toBe(true);
  });

  it('prevents officer C in different department from viewing teammate A interview', () => {
    expect(sameDepartment(profileOutsideDept.department_unit, teammateInterview.department_unit)).toBe(false);
    expect(canViewInterview(profileOutsideDept, teammateInterview)).toBe(false);
  });

  it('ensures write operations remain restricted to original interviewer or admin', () => {
    // Owner can modify
    expect(canModifyInterview(profileTeammateA, teammateInterview)).toBe(true);

    // Teammate in same department CANNOT modify (read-only)
    expect(canModifyInterview(profileTeammateB, teammateInterview)).toBe(false);

    // Officer in different department CANNOT modify
    expect(canModifyInterview(profileOutsideDept, teammateInterview)).toBe(false);

    // Admin CAN modify
    const adminUser: UserProfile = {
      id: 'usr-admin-999',
      email: 'admin@mglsd.go.ug',
      full_name: 'System Admin',
      role: 'admin',
      department_unit: 'Ministry Directorate',
    };
    expect(canModifyInterview(adminUser, teammateInterview)).toBe(true);
  });
});
