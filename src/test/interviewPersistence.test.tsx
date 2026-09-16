/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { InterviewProvider, useInterviews } from '../context/InterviewContext';

function TestInterviewConsumer() {
  const { user } = useAuth();
  const {
    interviews,
    createInterview,
    updateInterview,
    deleteInterview,
    getInterviewAnswers,
    saveAnswer,
    getInterviewChecklist,
    updateChecklistItem,
    getInterviewNotes,
    saveNotes,
    uploadDocumentFile,
    autoSaveStatus,
    selectInterview,
    activeInterviewId,
  } = useInterviews();

  return (
    <div>
      <div data-testid="interview-count">{interviews.length}</div>
      <div data-testid="autosave-status">{autoSaveStatus}</div>
      <div data-testid="active-id">{activeInterviewId || 'none'}</div>

      <button
        data-testid="create-btn"
        onClick={() => {
          const created = createInterview({
            interviewee_name: 'Dr. Jane Akello',
            role_title: 'Commissioner Occupational Safety & Health',
            department_unit: 'OSH Department',
            years_in_role: 4.5,
            interview_date: '2025-09-20',
            interview_time: '11:00 AM',
            location: 'Ministry HQ Room 4B',
            interviewer_id: user?.id || 'usr-john-okello-001',
            interviewer_name: user?.full_name || 'John Okello',
            tier: 'Management',
            status: 'Draft',
            duration_min: 60,
          });
          selectInterview(created.id);
        }}
      >
        Create Interview
      </button>

      {interviews.length > 0 && (
        <>
          <div data-testid="first-interview-name">{interviews[0].interviewee_name}</div>
          <div data-testid="first-interview-status">{interviews[0].status}</div>
          <div data-testid="first-interview-progress">
            {interviews[0].completion_percentage}
          </div>

          <button
            data-testid="save-answer-btn"
            onClick={() => {
              saveAnswer(interviews[0].id, 'A1', 'Detailed statutory mandate answer');
            }}
          >
            Save Answer
          </button>

          <div data-testid="answers-count">
            {getInterviewAnswers(interviews[0].id).length}
          </div>

          <button
            data-testid="update-checklist-btn"
            onClick={() => {
              updateChecklistItem(interviews[0].id, 1, {
                exists_status: 'Yes',
                collected_status: 'Collected',
                notes: 'Verified copy in registry',
              });
            }}
          >
            Update Checklist
          </button>

          <div data-testid="checklist-item-1-status">
            {getInterviewChecklist(interviews[0].id).find((i) => i.item_number === 1)?.collected_status}
          </div>

          <button
            data-testid="save-notes-btn"
            onClick={() => {
              saveNotes(interviews[0].id, {
                observations: 'Officer was highly receptive and shared full OSH registers.',
              });
            }}
          >
            Save Notes
          </button>

          <div data-testid="notes-observation">
            {getInterviewNotes(interviews[0].id)?.observations}
          </div>

          <button
            data-testid="upload-file-btn"
            onClick={() => {
              uploadDocumentFile(interviews[0].id, 1, 'National_OSH_Policy_2025.pdf');
            }}
          >
            Upload File
          </button>

          <div data-testid="checklist-item-1-file">
            {getInterviewChecklist(interviews[0].id).find((i) => i.item_number === 1)?.file_name}
          </div>

          <button
            data-testid="delete-btn"
            onClick={() => {
              deleteInterview(interviews[0].id);
            }}
          >
            Delete Interview
          </button>
        </>
      )}
    </div>
  );
}

describe('InterviewContext Supabase Persistence & State Operations', () => {
  it('creates an interview with optimistic update and initial checklists/notes', async () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <TestInterviewConsumer />
        </InterviewProvider>
      </AuthProvider>
    );

    const initialCount = parseInt(screen.getByTestId('interview-count').textContent || '0');

    act(() => {
      screen.getByTestId('create-btn').click();
    });

    const newCount = parseInt(screen.getByTestId('interview-count').textContent || '0');
    expect(newCount).toBe(initialCount + 1);
    expect(screen.getByTestId('first-interview-name').textContent).toBe('Dr. Jane Akello');
    expect(screen.getByTestId('active-id').textContent).not.toBe('none');
  });

  it('saves an answer optimistically, updates progress and answers map', async () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <TestInterviewConsumer />
        </InterviewProvider>
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('create-btn').click();
    });

    act(() => {
      screen.getByTestId('save-answer-btn').click();
    });

    expect(parseInt(screen.getByTestId('answers-count').textContent || '0')).toBeGreaterThan(0);
    expect(screen.getByTestId('first-interview-status').textContent).toBe('In Progress');
  });

  it('updates document checklist and handles document attachment upload', async () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <TestInterviewConsumer />
        </InterviewProvider>
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('create-btn').click();
    });

    act(() => {
      screen.getByTestId('update-checklist-btn').click();
    });

    expect(screen.getByTestId('checklist-item-1-status').textContent).toBe('Collected');

    act(() => {
      screen.getByTestId('upload-file-btn').click();
    });

    expect(screen.getByTestId('checklist-item-1-file').textContent).toBe(
      'National_OSH_Policy_2025.pdf'
    );
  });

  it('saves interviewer notes and deletes an interview cleanly', async () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <TestInterviewConsumer />
        </InterviewProvider>
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('create-btn').click();
    });

    act(() => {
      screen.getByTestId('save-notes-btn').click();
    });

    expect(screen.getByTestId('notes-observation').textContent).toContain(
      'Officer was highly receptive'
    );

    const countBeforeDelete = parseInt(screen.getByTestId('interview-count').textContent || '0');

    act(() => {
      screen.getByTestId('delete-btn').click();
    });

    const countAfterDelete = parseInt(screen.getByTestId('interview-count').textContent || '0');
    expect(countAfterDelete).toBe(countBeforeDelete - 1);
  });
});
