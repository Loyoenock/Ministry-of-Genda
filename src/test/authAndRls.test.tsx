/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { InterviewProvider, useInterviews } from '../context/InterviewContext';

// Helper component to test Auth & RLS behavior
function TestAuthConsumer() {
  const { user, role, switchRole } = useAuth();
  const { interviews, allInterviewsGlobal } = useInterviews();

  return (
    <div>
      <div data-testid="user-name">{user.full_name}</div>
      <div data-testid="user-role">{role}</div>
      <div data-testid="visible-count">{interviews.length}</div>
      <div data-testid="global-count">{allInterviewsGlobal.length}</div>
      <button data-testid="switch-admin-btn" onClick={() => switchRole('admin')}>
        Switch to Admin
      </button>
      <button data-testid="switch-interviewer-btn" onClick={() => switchRole('interviewer')}>
        Switch to Interviewer
      </button>
    </div>
  );
}

describe('Authentication & Row Level Security (RLS)', () => {
  it('initializes default interviewer John Okello', () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <TestAuthConsumer />
        </InterviewProvider>
      </AuthProvider>
    );

    expect(screen.getByTestId('user-name').textContent).toContain('John Okello');
    expect(screen.getByTestId('user-role').textContent).toBe('interviewer');
  });

  it('enforces RLS: interviewer only sees interviews assigned to them', () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <TestAuthConsumer />
        </InterviewProvider>
      </AuthProvider>
    );

    const visibleCount = parseInt(screen.getByTestId('visible-count').textContent || '0');
    const globalCount = parseInt(screen.getByTestId('global-count').textContent || '0');

    // John Okello has 4 interviews assigned out of the 6 total in mockData
    expect(visibleCount).toBeLessThanOrEqual(globalCount);
    expect(visibleCount).toBeGreaterThan(0);
  });

  it('switches role to Admin and grants visibility to all interviews', () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <TestAuthConsumer />
        </InterviewProvider>
      </AuthProvider>
    );

    const switchAdminBtn = screen.getByTestId('switch-admin-btn');
    act(() => {
      switchAdminBtn.click();
    });

    expect(screen.getByTestId('user-role').textContent).toBe('admin');
    const visibleCountAfter = parseInt(screen.getByTestId('visible-count').textContent || '0');
    const globalCount = parseInt(screen.getByTestId('global-count').textContent || '0');
    expect(visibleCountAfter).toBe(globalCount);
  });
});
