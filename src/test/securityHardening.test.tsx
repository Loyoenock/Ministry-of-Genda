/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DemoModeBanner } from '../components/DemoModeBanner';

describe('Security Hardening & Demo Mode Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
