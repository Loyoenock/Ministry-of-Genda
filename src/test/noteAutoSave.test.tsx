/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '../context/AuthContext';
import { InterviewProvider, InterviewContext, useInterviews } from '../context/InterviewContext';
import { useInterviewFormState } from '../hooks/useInterviewFormState';

function NoteFormChild({ interviewId }: { interviewId: string }) {
  const form = useInterviewFormState(interviewId);

  return (
    <div>
      <div data-testid="local-observations">{form.localNotes?.observations || ''}</div>
      <div data-testid="auto-save-status">{form.autoSaveStatus}</div>
      <button
        data-testid="type-observation-1"
        onClick={() => {
          form.handleNoteFieldChange('observations', 'First draft note');
        }}
      >
        Type 1
      </button>
      <button
        data-testid="type-observation-2"
        onClick={() => {
          form.handleNoteFieldChange('observations', 'Final observation note');
        }}
      >
        Type 2
      </button>
      <button
        data-testid="type-numbers-metric"
        onClick={() => {
          form.handleNumbersCapturedChange('inspections_target', '45');
        }}
      >
        Type Metric
      </button>
      <button
        data-testid="type-maturity-score"
        onClick={() => {
          form.handleMaturityScoreChange('leadership_governance', 4);
        }}
      >
        Type Maturity
      </button>
      <button
        data-testid="flush-btn"
        onClick={() => {
          form.flushNotesSave();
        }}
      >
        Flush
      </button>
    </div>
  );
}

function NavigationHarness({
  customSaveNotes,
}: {
  customSaveNotes?: (id: string, updates: any) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(true);
  const { getInterviewNotes } = useInterviews();

  const savedNote = getInterviewNotes('int-001');

  return (
    <div>
      <button data-testid="navigate-away-btn" onClick={() => setShowForm(false)}>
        Navigate Away
      </button>
      <div data-testid="context-observations">{savedNote?.observations || ''}</div>
      {showForm && <NoteFormChild interviewId="int-001" />}
    </div>
  );
}

function ErrorRollbackHarness() {
  const form = useInterviewFormState('int-001');

  return (
    <div>
      <div data-testid="rollback-observations">{form.localNotes?.observations || ''}</div>
      <div data-testid="rollback-status">{form.autoSaveStatus}</div>
      <button
        data-testid="trigger-error-type"
        onClick={() => {
          form.handleNoteFieldChange('observations', 'Unsaved volatile thought');
        }}
      >
        Trigger Change
      </button>
    </div>
  );
}

describe('Note Auto-Save Hardening & Debounce Behaviors', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates localNotes optimistically on typing and debounces save by ~700ms', async () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <NavigationHarness />
        </InterviewProvider>
      </AuthProvider>
    );

    const statusEl = screen.getByTestId('auto-save-status');
    const obsEl = screen.getByTestId('local-observations');
    const typeBtn1 = screen.getByTestId('type-observation-1');
    const typeBtn2 = screen.getByTestId('type-observation-2');

    expect(statusEl.textContent).toBe('saved');

    // 1. Type first draft
    act(() => {
      typeBtn1.click();
    });

    // Optimistic UI updates immediately!
    expect(obsEl.textContent).toBe('First draft note');
    expect(statusEl.textContent).toBe('saving');

    // 2. Advance 300ms (within debounce window)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // 3. Type second draft rapidly
    act(() => {
      typeBtn2.click();
    });

    expect(obsEl.textContent).toBe('Final observation note');
    expect(statusEl.textContent).toBe('saving');

    // 4. Advance past 700ms
    await act(async () => {
      vi.advanceTimersByTime(750);
    });

    expect(statusEl.textContent).toBe('saved');
    expect(obsEl.textContent).toBe('Final observation note');
    expect(screen.getByTestId('context-observations').textContent).toBe('Final observation note');
  });

  it('debounces numbers_captured and maturity_signals field changes', async () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <NavigationHarness />
        </InterviewProvider>
      </AuthProvider>
    );

    const metricBtn = screen.getByTestId('type-numbers-metric');
    const maturityBtn = screen.getByTestId('type-maturity-score');

    act(() => {
      metricBtn.click();
      maturityBtn.click();
    });

    expect(screen.getByTestId('auto-save-status').textContent).toBe('saving');

    await act(async () => {
      vi.advanceTimersByTime(750);
    });

    expect(screen.getByTestId('auto-save-status').textContent).toBe('saved');
  });

  it('flushes pending updates when navigating away or unmounting form', async () => {
    render(
      <AuthProvider>
        <InterviewProvider>
          <NavigationHarness />
        </InterviewProvider>
      </AuthProvider>
    );

    const typeBtn = screen.getByTestId('type-observation-1');
    act(() => {
      typeBtn.click();
    });

    // User navigates away before debounce timer expires
    const navBtn = screen.getByTestId('navigate-away-btn');
    await act(async () => {
      navBtn.click();
    });

    // Context should receive the flushed note
    expect(screen.getByTestId('context-observations').textContent).toBe('First draft note');
  });

  it('rolls back localNotes to the last successfully saved version on error and sets autoSaveStatus = error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockSaveNotes = vi.fn().mockRejectedValue(new Error('Persistence failed'));
    const initialNote = {
      interview_id: 'int-001',
      observations: 'Initial rock-solid baseline',
      numbers_captured: {},
      contradictions: '',
      documents_collected_summary: '',
      follow_ups: '',
      maturity_signals: {},
      updated_at: new Date().toISOString(),
    };

    const mockContextValue: any = {
      interviews: [
        {
          id: 'int-001',
          interviewee_name: 'Sarah',
          tier: 'Leadership',
          status: 'Draft',
          department_unit: 'HR',
          role_title: 'Director',
          years_in_role: 3,
          interview_date: '16 Sep 2025',
          interview_time: '10:00 AM',
          location: 'HQ',
          interviewer_id: 'usr-1',
          interviewer_name: 'John',
          duration_min: 60,
          completion_percentage: 0,
        },
      ],
      getInterviewAnswers: () => [],
      getInterviewChecklist: () => [],
      getInterviewNotes: () => initialNote,
      saveNotes: mockSaveNotes,
      saveAnswer: vi.fn(),
      updateChecklistItem: vi.fn(),
      uploadDocumentFile: vi.fn(),
      updateInterview: vi.fn(),
      deleteInterview: vi.fn(),
      autoSaveStatus: 'saved',
      setAutoSaveStatus: vi.fn(),
    };

    render(
      <InterviewContext.Provider value={mockContextValue}>
        <NoteFormChild interviewId="int-001" />
      </InterviewContext.Provider>
    );

    const statusEl = screen.getByTestId('auto-save-status');
    const obsEl = screen.getByTestId('local-observations');
    const typeBtn1 = screen.getByTestId('type-observation-1');

    // Baseline is loaded
    expect(obsEl.textContent).toBe('Initial rock-solid baseline');

    // Type a change
    act(() => {
      typeBtn1.click();
    });

    // Optimistic UI updates right away
    expect(obsEl.textContent).toBe('First draft note');
    expect(statusEl.textContent).toBe('saving');

    // Debounce timer fires -> mockSaveNotes rejects
    await act(async () => {
      vi.advanceTimersByTime(750);
    });

    // State rolls back to baseline and status is set to error!
    expect(statusEl.textContent).toBe('error');
    expect(obsEl.textContent).toBe('Initial rock-solid baseline');

    consoleSpy.mockRestore();
  });
});
