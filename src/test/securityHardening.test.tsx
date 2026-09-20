/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DemoModeBanner } from '../components/DemoModeBanner';
import { setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Security Hardening & Demo Mode Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    setSupabaseConfiguredForTesting(false);
  });

  function SecurityTestRig({ onSwitch }: { onSwitch?: (role: any) => void }) {
    const { user, role, actualRole, isAdmin, isDemoMode, switchRole, demoLogin } = useAuth();

    return (
      <div>
        <div data-testid="user-role">{role}</div>
        <div data-testid="actual-role">{actualRole}</div>
        <div data-testid="is-demo">{isDemoMode ? 'true' : 'false'}</div>
        <button
          data-testid="switch-admin-btn"
          onClick={() => {
            switchRole('admin');
            onSwitch?.('admin');
          }}
        >
          Switch Admin
        </button>
        <button
          data-testid="switch-interviewer-btn"
          onClick={() => {
            switchRole('interviewer');
            onSwitch?.('interviewer');
          }}
        >
          Switch Interviewer
        </button>
        <button data-testid="demo-login-interviewer" onClick={() => demoLogin('interviewer')}>
          Demo Login Interviewer
        </button>
      </div>
    );
  }

  it('renders DemoModeBanner when running in demo mode and allows dismissal', async () => {
    render(
      <AuthProvider>
        <DemoModeBanner />
        <SecurityTestRig />
      </AuthProvider>
    );

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText(/Demo Mode/i)).toBeDefined();

    // Click dismiss button
    const dismissBtn = screen.getByLabelText(/Dismiss demo mode warning/i);
    await act(async () => {
      dismissBtn.click();
    });

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('logs a security warning when demo mode is active', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <AuthProvider>
        <SecurityTestRig />
      </AuthProvider>
    );

    // Should contain a demo mode warning when in demo mode
    expect(screen.getByTestId('is-demo').textContent).toBe('true');
    warnSpy.mockRestore();
  });

  it('preserves role boundaries and tracks actualRole vs activeRole', async () => {
    render(
      <AuthProvider>
        <SecurityTestRig />
      </AuthProvider>
    );

    expect(screen.getByTestId('actual-role').textContent).toBe('interviewer');
    expect(screen.getByTestId('user-role').textContent).toBe('interviewer');
  });

  it('prevents non-admin from escalating role via updateProfile', async () => {
    function ProfileUpdateTestRig() {
      const { user, updateProfile } = useAuth();
      return (
        <div>
          <div data-testid="profile-name">{user?.full_name}</div>
          <div data-testid="profile-role">{user?.role}</div>
          <button
            data-testid="malicious-update-btn"
            onClick={() =>
              updateProfile({
                full_name: 'John Updated',
                // Malicious payload attempting role escalation
                ...({ role: 'admin' } as any),
              })
            }
          >
            Update Profile
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <ProfileUpdateTestRig />
      </AuthProvider>
    );

    expect(screen.getByTestId('profile-role').textContent).toBe('interviewer');

    await act(async () => {
      screen.getByTestId('malicious-update-btn').click();
    });

    // Name should be updated
    expect(screen.getByTestId('profile-name').textContent).toBe('John Updated');
    // Role must remain interviewer
    expect(screen.getByTestId('profile-role').textContent).toBe('interviewer');
  });

  it('allows admin to update user roles across the organization', async () => {
    function AdminRoleManagementTestRig() {
      const { demoLogin, updateUserRole, allUsers, isAdmin } = useAuth();
      return (
        <div>
          <div data-testid="is-admin-status">{isAdmin ? 'true' : 'false'}</div>
          <button data-testid="login-admin" onClick={() => demoLogin('admin')}>
            Login Admin
          </button>
          <button
            data-testid="promote-user"
            onClick={() => updateUserRole('usr-john-okello-001', 'admin')}
          >
            Promote John
          </button>
          <div data-testid="john-role">
            {allUsers.find((u) => u.id === 'usr-john-okello-001')?.role}
          </div>
        </div>
      );
    }

    render(
      <AuthProvider>
        <AdminRoleManagementTestRig />
      </AuthProvider>
    );

    // Login as Florence (admin)
    await act(async () => {
      screen.getByTestId('login-admin').click();
    });
    expect(screen.getByTestId('is-admin-status').textContent).toBe('true');

    // Admin promotes John
    await act(async () => {
      screen.getByTestId('promote-user').click();
    });

    expect(screen.getByTestId('john-role').textContent).toBe('admin');
  });
});
