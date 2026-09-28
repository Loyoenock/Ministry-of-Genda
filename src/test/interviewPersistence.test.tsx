/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { InterviewProvider, useInterviews } from '../context/InterviewContext';
import { useInterviewFormState } from '../hooks/useInterviewFormState';
import { DynamicInterviewForm } from '../components/DynamicInterviewForm';
import { supabase } from '../lib/supabase';
import { MASTER_QUESTIONS } from '../lib/questionsData';
import { updateQuestionsCache } from '../lib/questionsService';

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

function createMockQueryBuilder(data: any = [], error: any = null) {
  const builder: any = {
    then(onfulfilled: any, onrejected: any) {
      return Promise.resolve({ data, error }).then(onfulfilled, onrejected);
    },
    catch(onrejected: any) {
      return Promise.resolve({ data, error }).catch(onrejected);
    },
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => ({
      data: Array.isArray(data) ? (data[0] ?? null) : data,
      error,
    })),
    maybeSingle: vi.fn(async () => ({
      data: Array.isArray(data) ? (data[0] ?? null) : data,
      error,
    })),
  };
  return builder;
}

describe('InterviewContext Supabase Persistence & State Operations', () => {
  let fromSpy: any;
  let storageSpy: any;

  beforeEach(() => {
    fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'answers') {
        const b = createMockQueryBuilder([]);
        b.upsert = vi.fn((payload: any) =>
          createMockQueryBuilder({ id: 'ans-test-1', ...payload, created_at: new Date().toISOString() })
        );
        return b;
      }
      if (table === 'interviews') {
        const b = createMockQueryBuilder({ id: 'int-test-1' });
        b.insert = vi.fn((payload: any) =>
          createMockQueryBuilder({ id: payload.id || 'int-test-1', ...payload })
        );
        return b;
      }
      if (table === 'documents_checklist') {
        return createMockQueryBuilder([]);
      }
      if (table === 'interviewer_notes') {
        return createMockQueryBuilder(null);
      }
      if (table === 'questions') {
        return createMockQueryBuilder(MASTER_QUESTIONS);
      }
      if (table === 'profiles') {
        return createMockQueryBuilder(null);
      }
      return createMockQueryBuilder([]);
    });

    storageSpy = vi.spyOn(supabase.storage, 'from').mockImplementation(() => {
      return {
        upload: async () => ({ data: { path: 'test-path/file.pdf' }, error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: 'https://test-storage/file.pdf' }, error: null }),
        remove: async () => ({ data: null, error: null }),
      } as any;
    });
  });

  afterEach(() => {
    fromSpy?.mockRestore();
    storageSpy?.mockRestore();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

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

  it('flushes pending questionnaire answers entered in DynamicInterviewForm when clicking Finish Interview & Complete', async () => {
    const upsertedAnswers: any[] = [];
    const updatedInterviews: any[] = [];
    let createdInterviewId = '';

    fromSpy.mockImplementation((table: string) => {
      if (table === 'answers') {
        const b = createMockQueryBuilder();
        b.upsert = vi.fn((payload: any) => {
          upsertedAnswers.push(payload);
          return createMockQueryBuilder({ id: 'ans-test-2', ...payload, created_at: new Date().toISOString() });
        });
        b.select = vi.fn(() => createMockQueryBuilder(upsertedAnswers));
        return b;
      }
      if (table === 'interviews') {
        const b = createMockQueryBuilder({ id: createdInterviewId || 'int-test-uuid' });
        b.insert = vi.fn((payload: any) =>
          createMockQueryBuilder({ id: payload.id || createdInterviewId || 'int-test-uuid', ...payload })
        );
        b.update = vi.fn((updates: any) => {
          const updateB = createMockQueryBuilder();
          updateB.eq = vi.fn(async (field: string, val: string) => {
            updatedInterviews.push({ [field]: val, ...updates });
            return { data: null, error: null };
          });
          return updateB;
        });
        return b;
      }
      if (table === 'questions') {
        return createMockQueryBuilder(MASTER_QUESTIONS);
      }
      if (table === 'interviewer_notes') {
        return createMockQueryBuilder(null);
      }
      if (table === 'documents_checklist') {
        return createMockQueryBuilder([]);
      }
      if (table === 'profiles') {
        return createMockQueryBuilder(null);
      }
      return createMockQueryBuilder([]);
    });

    function DynamicHarness() {
      const { createInterview, selectInterview } = useInterviews();

      useEffect(() => {
        const created = createInterview({
          interviewee_name: 'Dr. Jane Akello',
          role_title: 'Commissioner OSH',
          department_unit: 'OSH Department',
          years_in_role: 4,
          interview_date: '2025-09-20',
          interview_time: '11:00 AM',
          location: 'Ministry HQ',
          interviewer_id: 'usr-john-okello-001',
          interviewer_name: 'John Okello',
          tier: 'Leadership',
          status: 'Draft',
          duration_min: 60,
        });
        createdInterviewId = created.id;
        selectInterview(created.id);
      }, [createInterview, selectInterview]);

      if (!createdInterviewId) return null;
      return <DynamicInterviewForm interviewId={createdInterviewId} onBack={() => {}} />;
    }

    updateQuestionsCache(MASTER_QUESTIONS, 'supabase');

    render(
      <AuthProvider>
        <InterviewProvider>
          <DynamicHarness />
        </InterviewProvider>
      </AuthProvider>
    );

    // Verify form rendered
    expect(screen.getByText('Dr. Jane Akello')).toBeInTheDocument();

    // Find questionnaire textarea for question A1
    const answerInput = screen.getByTestId('question-input-A1');

    // Type an answer
    act(() => {
      fireEvent.change(answerInput, {
        target: { value: 'Direct form test answer entered before debounce' },
      });
    });

    // Zero time elapsed, click finish
    const finishBtn = screen.getByRole('button', { name: /Finish Interview & Complete/i });
    await act(async () => {
      fireEvent.click(finishBtn);
    });

    // Assert persisted
    expect(upsertedAnswers.length).toBeGreaterThan(0);
    expect(
      upsertedAnswers.some((a) => a.answer_text === 'Direct form test answer entered before debounce')
    ).toBe(true);

    expect(
      updatedInterviews.some((i) => i.status === 'Completed')
    ).toBe(true);
  });
});
