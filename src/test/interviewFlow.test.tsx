/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '../context/AuthContext';
import { InterviewProvider, useInterviews } from '../context/InterviewContext';
import { DynamicInterviewForm } from '../components/DynamicInterviewForm';

function TestInterviewCreation() {
  const { createInterview, interviews } = useInterviews();

  return (
    <div>
      <div data-testid="count">{interviews.length}</div>
      <button
        data-testid="create-btn"
        onClick={() =>
          createInterview({
            interviewee_name: 'Test Participant',
            role_title: 'Director',
            department_unit: 'Labour Unit',
            years_in_role: 3,
            interview_date: '16 Sep 2025',
            interview_time: '11:00 AM',
            location: 'Kampala',
            interviewer_id: 'usr-john-okello-001',
            interviewer_name: 'John Okello',
            tier: 'Leadership',
            status: 'Draft',
            duration_min: 60,
          })
        }
      >
        Create
      </button>
    </div>
  );
}

describe('Interview Management & Dynamic Questionnaire Workflow', () => {
  it('creates an interview with proper tier routing and initialization', () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <TestInterviewCreation />
        </InterviewProvider>
      </AuthProvider>
    );

    const initialCount = parseInt(screen.getByTestId('count').textContent || '0');
    const createBtn = screen.getByTestId('create-btn');

    act(() => {
      createBtn.click();
    });

    const newCount = parseInt(screen.getByTestId('count').textContent || '0');
    expect(newCount).toBe(initialCount + 1);
  });

  it('renders dynamic questionnaire for active interview with prompt hints', () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <DynamicInterviewForm interviewId="int-001" onBack={() => {}} />
        </InterviewProvider>
      </AuthProvider>
    );

    // int-001 is Sarah Nansubuga, Leadership Tier
    expect(screen.getByText('Sarah Nansubuga')).toBeTruthy();
    expect(screen.getAllByText(/Tier: Leadership/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Diagnostic Questions/i).length).toBeGreaterThan(0);
  });

  it('renders DashboardView with Interviews by Tier and Ministry Headquarters Building link', async () => {
    const { DashboardView } = await import('../components/DashboardView');
    render(
      <AuthProvider>
        <InterviewProvider>
          <DashboardView onOpenInterview={() => {}} onOpenNewInterview={() => {}} onNavigate={() => {}} />
        </InterviewProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Interviews by Tier')).toBeTruthy();
    const hqLink = screen.getByRole('link', { name: /Ministry Headquarters Building/i });
    expect(hqLink).toBeTruthy();
    expect(hqLink.getAttribute('href')).toBe('https://mglsd.go.ug');
  });
});


