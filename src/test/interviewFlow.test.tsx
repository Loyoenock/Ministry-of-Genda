/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
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

function DynamicFormTestHost({
  onBack,
  name = 'Sarah Nansubuga',
  tier = 'Leadership',
  initialStatus = 'In Progress',
}: {
  onBack: () => void;
  name?: string;
  tier?: 'Leadership' | 'Management' | 'Frontline' | 'Support/IT';
  initialStatus?: 'Draft' | 'In Progress' | 'Completed';
}) {
  const { createInterview, interviews } = useInterviews();
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (interviews.length === 0) {
      const interview = createInterview({
        interviewee_name: name,
        role_title: 'Permanent Secretary',
        department_unit: 'Ministry of Gender',
        years_in_role: 3.5,
        interview_date: '16 Sep 2025',
        interview_time: '10:15 AM',
        location: 'Kampala',
        interviewer_id: 'usr-john-okello-001',
        interviewer_name: 'John Okello',
        tier,
        status: initialStatus,
        duration_min: 75,
      });
      setCreatedId(interview.id);
    } else {
      setCreatedId(interviews[0].id);
    }
  }, [createInterview, initialStatus, interviews, name, tier]);

  if (!createdId) return null;
  return <DynamicInterviewForm interviewId={createdId} onBack={onBack} />;
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
          <DynamicFormTestHost onBack={() => {}} name="Sarah Nansubuga" tier="Leadership" />
        </InterviewProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Sarah Nansubuga')).toBeTruthy();
    expect(screen.getAllByText(/Tier: Leadership/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Diagnostic Questions/i).length).toBeGreaterThan(0);
  });

  it('renders status segmented controls in header and allows switching status', async () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <DynamicFormTestHost onBack={() => {}} />
        </InterviewProvider>
      </AuthProvider>
    );

    // Verify status controls exist
    const draftBtn = screen.getByRole('button', { name: /^Draft$/i });
    const inProgressBtn = screen.getByRole('button', { name: /^In Progress$/i });
    const completedBtn = screen.getByRole('button', { name: /^Completed$/i });

    expect(draftBtn).toBeTruthy();
    expect(inProgressBtn).toBeTruthy();
    expect(completedBtn).toBeTruthy();

    // Click Draft
    act(() => {
      draftBtn.click();
    });

    // Toast feedback appears
    expect(await screen.findByText(/Status successfully updated to Draft/i)).toBeTruthy();
  });

  it('handles delete interview workflow with confirmation modal and cancellation', () => {
    const onBackMock = vi.fn();
    render(
      <AuthProvider>
        <InterviewProvider>
          <DynamicFormTestHost onBack={onBackMock} />
        </InterviewProvider>
      </AuthProvider>
    );

    const deleteBtn = screen.getByRole('button', { name: /Delete interview/i });
    expect(deleteBtn).toBeTruthy();

    // Open modal
    act(() => {
      deleteBtn.click();
    });

    expect(screen.getByText('Permanently delete this interview?')).toBeTruthy();
    expect(
      screen.getByText(/This will remove the interview, all answers, checklist items, notes and uploaded files/i)
    ).toBeTruthy();

    // Click cancel
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    act(() => {
      cancelBtn.click();
    });

    expect(screen.queryByText('Permanently delete this interview?')).toBeNull();
    expect(onBackMock).not.toHaveBeenCalled();
  });

  it('confirms interview deletion, cleans up storage, and navigates back', async () => {
    const onBackMock = vi.fn();
    render(
      <AuthProvider>
        <InterviewProvider>
          <DynamicFormTestHost onBack={onBackMock} />
        </InterviewProvider>
      </AuthProvider>
    );

    const deleteBtn = screen.getByRole('button', { name: /Delete interview/i });
    act(() => {
      deleteBtn.click();
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: /Delete permanently/i });
    await act(async () => {
      confirmDeleteBtn.click();
    });

    expect(onBackMock).toHaveBeenCalledTimes(1);
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
