/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { InterviewProvider, useInterviews } from '../context/InterviewContext';

// Helper component to test Auth & RLS behavior
function TestAuthConsumer() {
  const { user, role, switchRole } = useAuth();
  const { interviews, allInterviewsGlobal, createInterview } = useInterviews();

  useEffect(() => {
    if (allInterviewsGlobal.length === 0) {
      createInterview({
        interviewee_name: 'Assigned Participant',
        role_title: 'Director',
        department_unit: 'Labour Unit',
        years_in_role: 3,
        interview_date: '2025-09-16',
        interview_time: '11:00 AM',
        location: 'Kampala',
        interviewer_id: 'usr-john-okello-001',
        interviewer_name: 'John Okello',
        tier: 'Leadership',
        status: 'Draft',
        duration_min: 60,
      });
      createInterview({
        interviewee_name: 'Other Participant',
        role_title: 'Manager',
        department_unit: 'OSH',
        years_in_role: 2,
        interview_date: '2025-09-17',
        interview_time: '2:00 PM',
        location: 'Entebbe',
        interviewer_id: 'usr-other-interviewer-999',
        interviewer_name: 'Other Interviewer',
        tier: 'Management',
        status: 'Draft',
        duration_min: 60,
      });
    }
  }, [allInterviewsGlobal.length, createInterview]);

  return (
    <div>
      <div data-testid="user-name">{user?.full_name || 'No user'}</div>
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

    // John Okello only sees 1 assigned interview out of 2 created
    expect(visibleCount).toBeLessThanOrEqual(globalCount);
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBe(1);
    expect(globalCount).toBe(2);
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
    expect(visibleCountAfter).toBe(2);
  });

  it('renders safely when user logs out and is unauthenticated (user is null)', async () => {
    function UnauthTestConsumer() {
      const { user, logout } = useAuth();
      const { interviews } = useInterviews();

      return (
        <div>
          <div data-testid="auth-state">{user ? user.full_name : 'null-user'}</div>
          <div data-testid="interviews-length">{interviews.length}</div>
          <button data-testid="logout-trigger" onClick={() => logout()}>
            Logout
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <InterviewProvider>
          <UnauthTestConsumer />
        </InterviewProvider>
      </AuthProvider>
    );

    const logoutBtn = screen.getByTestId('logout-trigger');
    await act(async () => {
      logoutBtn.click();
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('null-user');
    expect(parseInt(screen.getByTestId('interviews-length').textContent || '0')).toBeGreaterThanOrEqual(0);
  });
});
