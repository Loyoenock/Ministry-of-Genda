/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LoginView } from '../components/LoginView';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function AuthTestRig() {
  const { user, role, isAdmin, isDemoMode, logout, demoLogin } = useAuth();

  return (
    <div>
      <div data-testid="user-status">{user ? user.full_name : 'unauthenticated'}</div>
      <div data-testid="role-status">{role}</div>
      <div data-testid="is-admin">{isAdmin ? 'true' : 'false'}</div>
      <div data-testid="is-demo">{isDemoMode ? 'true' : 'false'}</div>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
      <button data-testid="login-admin-btn" onClick={() => demoLogin('admin')}>
        Demo Admin
      </button>
      <button data-testid="login-interviewer-btn" onClick={() => demoLogin('interviewer')}>
        Demo Interviewer
      </button>
    </div>
  );
}

describe('Supabase Client & Auth System', () => {
  it('exports valid supabase client and isSupabaseConfigured flag', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(typeof isSupabaseConfigured).toBe('boolean');
  });

  it('renders LoginView with Uganda Ministry branding and demo buttons', () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    expect(screen.getAllByText(/Ministry of Gender, Labour and Social Development/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Labour Directorate Diagnostic/i)).toBeDefined();
    expect(screen.getByText(/John Okello/i)).toBeDefined();
    expect(screen.getByText(/Florence Nsubuga/i)).toBeDefined();
  });


  it('allows logging out and switching demo credentials', async () => {
    render(
      <AuthProvider>
        <AuthTestRig />
      </AuthProvider>
    );

    // Initial state in test is John Okello
    expect(screen.getByTestId('user-status').textContent).toContain('John Okello');

    // Switch to Admin
    await act(async () => {
      screen.getByTestId('login-admin-btn').click();
    });
    expect(screen.getByTestId('user-status').textContent).toContain('Florence Nsubuga');
    expect(screen.getByTestId('is-admin').textContent).toBe('true');

    // Logout
    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });
    expect(screen.getByTestId('user-status').textContent).toBe('unauthenticated');
  });
});
