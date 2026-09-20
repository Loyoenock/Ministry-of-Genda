/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Security Hardening & Access Control', () => {
  beforeEach(() => {
    localStorage.clear();
    setSupabaseConfiguredForTesting(false);
  });

  it('prevents role escalation via updateProfile', async () => {
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

    await act(async () => {
      screen.getByTestId('malicious-update-btn').click();
    });

    expect(screen.getByTestId('profile-name').textContent).toBe('John Updated');
    expect(screen.getByTestId('profile-role').textContent).toBe('interviewer');
  });
});
