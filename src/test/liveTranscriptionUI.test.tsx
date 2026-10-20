/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LiveTranscriptionPanel } from '../features/transcription/components/LiveTranscriptionPanel';
import { TranscriptionErrorBoundary } from '../features/transcription/components/TranscriptionErrorBoundary';
import { FakeProvider, ScriptedItem } from '../features/transcription/providers/types';
import { SegmentWriter } from '../features/transcription/persistence/segmentWriter';
import { DynamicInterviewForm } from '../components/DynamicInterviewForm';
import { AuthProvider } from '../context/AuthContext';
import { InterviewProvider } from '../context/InterviewContext';
import { Question, Answer, InterviewerNote } from '../types';

describe('Live Transcription UI & Consent Integration', () => {
  let mockWriter: SegmentWriter;
  let fakeProvider: FakeProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    const scriptedEvents: ScriptedItem[] = [
      {
        type: 'interim',
        text: 'We are currently reviewing the public procurement audit...',
        startMs: 0,
        endMs: 1200,
        speaker: 'Interviewer',
        delayMs: 10,
      },
      {
        type: 'final',
        text: 'We are currently reviewing the public procurement audit records.',
        startMs: 0,
        endMs: 2400,
        speaker: 'Interviewer',
        confidence: 0.96,
        delayMs: 20,
      },
    ];

    fakeProvider = new FakeProvider(scriptedEvents);
    mockWriter = new SegmentWriter({
      flushIntervalMs: 5000,
      batchSize: 100,
      client: {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders in idle state with start button and language selector', () => {
    render(
      <LiveTranscriptionPanel
        interviewId="int-ui-test-1"
        customProvider={fakeProvider}
        customWriter={mockWriter}
      />
    );

    expect(screen.getByTestId('live-transcription-widget')).toBeInTheDocument();
    expect(screen.getByTestId('transcription-start-btn')).toHaveTextContent('Start Live Transcription');
    expect(screen.getByTestId('transcription-language-select')).toBeInTheDocument();
  });

  it('enforces mandatory participant consent modal before starting', async () => {
    render(
      <LiveTranscriptionPanel
        interviewId="int-ui-test-1"
        customProvider={fakeProvider}
        customWriter={mockWriter}
      />
    );

    // Click Start
    fireEvent.click(screen.getByTestId('transcription-start-btn'));

    // Modal appears
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Participant Consent Required')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('consent-confirm-btn');
    expect(confirmBtn).toBeDisabled();

    // Check consent checkbox
    const checkbox = screen.getByTestId('consent-checkbox');
    fireEvent.click(checkbox);
    expect(confirmBtn).not.toBeDisabled();

    // Cancel dismisses modal without starting
    const cancelBtn = screen.getByTestId('consent-cancel-btn');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('transcription-start-btn')).toBeInTheDocument();
  });

  it('connects, replays scripted transcription events, and renders segments in feed', async () => {
    render(
      <LiveTranscriptionPanel
        interviewId="int-ui-test-1"
        customProvider={fakeProvider}
        customWriter={mockWriter}
      />
    );

    // Open consent and confirm
    fireEvent.click(screen.getByTestId('transcription-start-btn'));
    fireEvent.click(screen.getByTestId('consent-checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('consent-confirm-btn'));
    });

    // Recording controls become active
    await waitFor(() => {
      expect(screen.getByTestId('transcription-pause-btn')).toBeInTheDocument();
      expect(screen.getByTestId('transcription-stop-btn')).toBeInTheDocument();
      expect(screen.getByTestId('audio-level-meter')).toBeInTheDocument();
    });

    // Wait for scripted final segment to appear
    await waitFor(
      () => {
        expect(
          screen.getByText('We are currently reviewing the public procurement audit records.')
        ).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('allows pause and resume of live transcription session', async () => {
    render(
      <LiveTranscriptionPanel
        interviewId="int-ui-test-1"
        customProvider={fakeProvider}
        customWriter={mockWriter}
      />
    );

    fireEvent.click(screen.getByTestId('transcription-start-btn'));
    fireEvent.click(screen.getByTestId('consent-checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('consent-confirm-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('transcription-pause-btn')).toBeInTheDocument();
    });

    // Click pause
    fireEvent.click(screen.getByTestId('transcription-pause-btn'));

    await waitFor(() => {
      expect(screen.getByText('Paused')).toBeInTheDocument();
      expect(screen.getByTestId('transcription-resume-btn')).toBeInTheDocument();
    });

    // Click resume
    fireEvent.click(screen.getByTestId('transcription-resume-btn'));

    await waitFor(() => {
      expect(screen.getByText('Recording Live')).toBeInTheDocument();
      expect(screen.getByTestId('transcription-pause-btn')).toBeInTheDocument();
    });
  });

  it('supports tagQuestion and setSpeaker for recorded transcript segments', async () => {
    render(
      <LiveTranscriptionPanel
        interviewId="int-ui-test-1"
        activeSectionCode="PROC-01"
        customProvider={fakeProvider}
        customWriter={mockWriter}
      />
    );

    fireEvent.click(screen.getByTestId('transcription-start-btn'));
    fireEvent.click(screen.getByTestId('consent-checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('consent-confirm-btn'));
    });

    await waitFor(
      () => {
        expect(
          screen.getByText('We are currently reviewing the public procurement audit records.')
        ).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    // Tag section
    const tagBtn = screen.getByText('Tag PROC-01');
    fireEvent.click(tagBtn);

    await waitFor(() => {
      expect(screen.getByText('Q: PROC-01')).toBeInTheDocument();
    });

    // Change speaker
    const speakerSelect = screen.getByRole('combobox', { name: /Assign speaker/i });
    fireEvent.change(speakerSelect, { target: { value: 'Participant' } });

    expect(speakerSelect).toHaveValue('Participant');
  });

  it('can be minimized and expanded without losing state', async () => {
    render(
      <LiveTranscriptionPanel
        interviewId="int-ui-test-1"
        customProvider={fakeProvider}
        customWriter={mockWriter}
      />
    );

    expect(screen.getByTestId('transcript-segment-feed')).toBeInTheDocument();

    // Toggle minimize
    const toggleBtn = screen.getByTestId('transcription-toggle-expand');
    fireEvent.click(toggleBtn);

    // Segment feed is hidden
    expect(screen.queryByTestId('transcript-segment-feed')).not.toBeInTheDocument();

    // Toggle expand again
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('transcript-segment-feed')).toBeInTheDocument();
  });

  it('stops cleanly and transitions to completed', async () => {
    render(
      <LiveTranscriptionPanel
        interviewId="int-ui-test-1"
        customProvider={fakeProvider}
        customWriter={mockWriter}
      />
    );

    fireEvent.click(screen.getByTestId('transcription-start-btn'));
    fireEvent.click(screen.getByTestId('consent-checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('consent-confirm-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('transcription-stop-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('transcription-stop-btn'));
    });

    await waitFor(() => {
      expect(screen.getByText('Finished')).toBeInTheDocument();
      expect(screen.getByTestId('transcription-start-btn')).toHaveTextContent('Transcribe Again');
    });
  });

  it('TranscriptionErrorBoundary catches child errors safely and sanitizes error display', () => {
    const ProblematicChild = () => {
      throw new Error('Streaming failed with secret_token=dg_live_123456');
    };

    const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TranscriptionErrorBoundary>
        <ProblematicChild />
      </TranscriptionErrorBoundary>
    );

    expect(screen.getByTestId('transcription-error-boundary')).toBeInTheDocument();
    expect(screen.getByText('Live Transcription Notice')).toBeInTheDocument();
    // Verify secret token is NOT leaked in the UI
    expect(screen.queryByText(/dg_live_123456/)).not.toBeInTheDocument();
    expect(
      screen.getByText('Transcription service encountered an authentication or network error')
    ).toBeInTheDocument();

    spyConsole.mockRestore();
  });

  it('guarantees that with VITE_ENABLE_LIVE_TRANSCRIPTION flag OFF, no widget is rendered', () => {
    // Render without flag (default env)
    render(
      <AuthProvider>
        <InterviewProvider>
          <DynamicInterviewForm
            interviewId="int-ui-test-1"
            onBack={() => {}}
          />
        </InterviewProvider>
      </AuthProvider>
    );

    // DynamicInterviewForm mounts cleanly without live-transcription-widget DOM node
    expect(screen.queryByTestId('live-transcription-widget')).not.toBeInTheDocument();
  });

  describe('Transcript Append, Citation Markers, and Save Guards', () => {
    const sampleTierQuestions: (Question & { code?: string })[] = [
      {
        id: 'q-gov-01',
        code: 'A1',
        section_code: 'A',
        section_title: 'Strategic Direction',
        question_text: 'Governance and institutional leadership overview',
        who_to_ask: 'Leadership',
        applicable_tiers: ['Leadership'],
        response_type: 'text',
        sort_order: 1,
      },
      {
        id: 'q-proc-02',
        code: 'A3',
        section_code: 'A',
        section_title: 'Strategic Direction',
        question_text: 'Procurement compliance and audit log integrity',
        who_to_ask: 'Leadership',
        applicable_tiers: ['Leadership'],
        response_type: 'text',
        sort_order: 2,
      },
    ];

    it('formats citation markers correctly as [Transcript mm:ss]', async () => {
      const { formatTranscriptMarker } = await import(
        '../features/transcription/components/LiveTranscriptionPanel'
      );
      expect(formatTranscriptMarker(0)).toBe('[Transcript 00:00]');
      expect(formatTranscriptMarker(15)).toBe('[Transcript 00:15]');
      expect(formatTranscriptMarker(75)).toBe('[Transcript 01:15]');
      expect(formatTranscriptMarker(3665)).toBe('[Transcript 61:05]');
    });

    it('appends to existing answer text with marker and NEVER overwrites existing text', async () => {
      const { appendTranscriptToAnswer } = await import(
        '../features/transcription/components/LiveTranscriptionPanel'
      );

      const existingText = 'Initial manual notes entered by the interviewer.';
      const snippet = '[Transcript 00:15] The respondent affirmed annual budget compliance.';

      const result = appendTranscriptToAnswer(existingText, snippet);
      expect(result).toBe(
        'Initial manual notes entered by the interviewer.\n\n[Transcript 00:15] The respondent affirmed annual budget compliance.'
      );
      // Original text is preserved at the beginning
      expect(result.startsWith(existingText)).toBe(true);

      // Empty existing text path
      expect(appendTranscriptToAnswer('', snippet)).toBe(snippet);
      expect(appendTranscriptToAnswer(null, snippet)).toBe(snippet);
    });

    it('appends to observations with marker and NEVER overwrites existing observations', async () => {
      const { appendTranscriptToObservations } = await import(
        '../features/transcription/components/LiveTranscriptionPanel'
      );

      const existingObs = 'Initial demeanor was cooperative.';
      const snippet = '[Transcript 01:30] Discussion shifted to ICT server maintenance.';

      const result = appendTranscriptToObservations(existingObs, snippet);
      expect(result).toBe(
        'Initial demeanor was cooperative.\n\n[Transcript 01:30] Discussion shifted to ICT server maintenance.'
      );
      expect(result.startsWith(existingObs)).toBe(true);

      expect(appendTranscriptToObservations('', snippet)).toBe(snippet);
    });

    it('presents a question picker limited to interview tier questions and appends to answer', async () => {
      const mockSaveAnswer = vi.fn().mockResolvedValue(undefined);
      const existingAnswers: Answer[] = [
        {
          id: 'ans-1',
          interview_id: 'int-1',
          question_id: 'q-proc-02',
          answer_text: 'Prior answer text for A3.',
          updated_at: new Date().toISOString(),
        },
      ];

      render(
        <LiveTranscriptionPanel
          interviewId="int-1"
          customProvider={fakeProvider}
          customWriter={mockWriter}
          tierQuestionsOverride={sampleTierQuestions}
          interviewsOverride={[
            {
              id: 'int-1',
              interviewee_name: 'Director Jane',
              role_title: 'Director',
              department_unit: 'Finance',
              tier: 'Leadership',
              status: 'In Progress',
              interview_date: '2026-10-20',
              interview_time: '10:00',
              location: 'Kampala',
              interviewer_id: 'user-1',
              interviewer_name: 'John',
              duration_min: 60,
              completion_percentage: 30,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]}
          answersOverride={existingAnswers}
          saveAnswerOverride={mockSaveAnswer}
        />
      );

      // Start transcription
      fireEvent.click(screen.getByTestId('transcription-start-btn'));
      fireEvent.click(screen.getByTestId('consent-checkbox'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('consent-confirm-btn'));
      });

      // Wait for segment to appear
      await waitFor(() => {
        expect(
          screen.getByText('We are currently reviewing the public procurement audit records.')
        ).toBeInTheDocument();
      });

      // Find the "Add to answer" button on the first segment
      const addAnswerBtns = screen.getAllByText('Add to answer');
      fireEvent.click(addAnswerBtns[0]);

      // Question picker modal appears
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add to Diagnostic Answer')).toBeInTheDocument();

      // Picker contains tier questions A1 and A3
      const select = screen.getByTestId('question-picker-select');
      expect(select).toBeInTheDocument();
      expect(screen.getByText(/A1 — Governance and institutional leadership/)).toBeInTheDocument();
      expect(screen.getByText(/A3 — Procurement compliance/)).toBeInTheDocument();

      // Select A3 (which has existing answer)
      fireEvent.change(select, { target: { value: 'q-proc-02' } });

      // Confirm append
      const confirmBtn = screen.getByTestId('question-picker-confirm-btn');
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      // Verify saveAnswer was called with previous text PRESERVED and new transcript appended
      expect(mockSaveAnswer).toHaveBeenCalledTimes(1);
      const [calledIntId, calledQId, calledText] = mockSaveAnswer.mock.calls[0];
      expect(calledIntId).toBe('int-1');
      expect(calledQId).toBe('q-proc-02');
      expect(calledText).toContain('Prior answer text for A3.');
      expect(calledText).toContain('[Transcript 00:00]');
      expect(calledText).toContain('We are currently reviewing the public procurement audit records.');

      // Panel surfaces success
      await waitFor(() => {
        expect(screen.getByText(/Appended to answer for A3!/)).toBeInTheDocument();
      });
    });

    it('appends segment text to observations via saveNotes', async () => {
      const mockSaveNotes = vi.fn().mockResolvedValue(undefined);
      const existingNotes: InterviewerNote = {
        id: 'note-1',
        interview_id: 'int-1',
        observations: 'Previous observations recorded.',
        contradictions: '',
        documents_collected_summary: '',
        follow_ups: '',
        numbers_captured: {
          total_staff: null,
          labour_officers_count: null,
          annual_inspections: null,
          disputes_logged: null,
          disputes_resolved: null,
          budget_allocated_ugx: null,
          budget_released_pct: null,
          backlog_cases: null,
        },
        maturity_signals: {
          governance_score: 3,
          technology_score: 3,
          process_score: 3,
          people_skills_score: 3,
          data_reporting_score: 3,
          justification: '',
        },
        updated_at: new Date().toISOString(),
      };

      render(
        <LiveTranscriptionPanel
          interviewId="int-1"
          customProvider={fakeProvider}
          customWriter={mockWriter}
          tierQuestionsOverride={sampleTierQuestions}
          interviewsOverride={[
            {
              id: 'int-1',
              interviewee_name: 'Director Jane',
              role_title: 'Director',
              department_unit: 'Finance',
              tier: 'Leadership',
              status: 'In Progress',
              interview_date: '2026-10-20',
              interview_time: '10:00',
              location: 'Kampala',
              interviewer_id: 'user-1',
              interviewer_name: 'John',
              duration_min: 60,
              completion_percentage: 30,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]}
          notesOverride={existingNotes}
          saveNotesOverride={mockSaveNotes}
        />
      );

      // Start transcription
      fireEvent.click(screen.getByTestId('transcription-start-btn'));
      fireEvent.click(screen.getByTestId('consent-checkbox'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('consent-confirm-btn'));
      });

      await waitFor(() => {
        expect(
          screen.getByText('We are currently reviewing the public procurement audit records.')
        ).toBeInTheDocument();
      });

      // Click "Add to obs" on the segment
      const addObsBtn = screen.getByText('Add to obs');
      await act(async () => {
        fireEvent.click(addObsBtn);
      });

      expect(mockSaveNotes).toHaveBeenCalledTimes(1);
      const [calledIntId, calledUpdates] = mockSaveNotes.mock.calls[0];
      expect(calledIntId).toBe('int-1');
      expect(calledUpdates.observations).toContain('Previous observations recorded.');
      expect(calledUpdates.observations).toContain('[Transcript 00:00]');
      expect(calledUpdates.observations).toContain(
        'We are currently reviewing the public procurement audit records.'
      );

      // Panel surfaces success notification
      await waitFor(() => {
        expect(
          screen.getByText('Appended transcript to interviewer observations!')
        ).toBeInTheDocument();
      });
    });

    it('applies auto-tag from the dock dropdown to subsequent segments and allows jump filtering', async () => {
      render(
        <LiveTranscriptionPanel
          interviewId="int-1"
          customProvider={fakeProvider}
          customWriter={mockWriter}
          tierQuestionsOverride={sampleTierQuestions}
          interviewsOverride={[
            {
              id: 'int-1',
              interviewee_name: 'Director Jane',
              role_title: 'Director',
              department_unit: 'Finance',
              tier: 'Leadership',
              status: 'In Progress',
              interview_date: '2026-10-20',
              interview_time: '10:00',
              location: 'Kampala',
              interviewer_id: 'user-1',
              interviewer_name: 'John',
              duration_min: 60,
              completion_percentage: 30,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]}
        />
      );

      // Select A3 in "Tag current question" dropdown in dock
      const tagSelect = screen.getByTestId('tag-current-question-select');
      fireEvent.change(tagSelect, { target: { value: 'q-proc-02' } });

      // Start transcription
      fireEvent.click(screen.getByTestId('transcription-start-btn'));
      fireEvent.click(screen.getByTestId('consent-checkbox'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('consent-confirm-btn'));
      });

      // Verify the subsequent segment received question tag Q: A3
      await waitFor(() => {
        expect(screen.getByText('Q: A3')).toBeInTheDocument();
      });

      // Click on Q: A3 jump badge
      const jumpBadge = screen.getByTestId('jump-to-q-q-proc-02');
      fireEvent.click(jumpBadge);

      // Clear filter button appears
      expect(screen.getByText('Clear filter')).toBeInTheDocument();

      // Clearing filter restores full stream
      fireEvent.click(screen.getByText('Clear filter'));
      expect(screen.queryByText('Clear filter')).not.toBeInTheDocument();
    });

    it('guards against locked/completed interview: surfaces failure in panel only and leaves original answer untouched', async () => {
      const mockSaveAnswer = vi.fn();
      const existingAnswers: Answer[] = [
        {
          id: 'ans-locked',
          interview_id: 'int-locked',
          question_id: 'q-gov-01',
          answer_text: 'Unchanged pristine answer.',
          updated_at: new Date().toISOString(),
        },
      ];

      render(
        <LiveTranscriptionPanel
          interviewId="int-locked"
          customProvider={fakeProvider}
          customWriter={mockWriter}
          tierQuestionsOverride={sampleTierQuestions}
          interviewsOverride={[
            {
              id: 'int-locked',
              interviewee_name: 'Completed Interviewee',
              role_title: 'Director',
              department_unit: 'Finance',
              tier: 'Leadership',
              status: 'Completed', // LOCKED INTERVIEW
              interview_date: '2026-10-20',
              interview_time: '10:00',
              location: 'Kampala',
              interviewer_id: 'user-1',
              interviewer_name: 'John',
              duration_min: 60,
              completion_percentage: 100,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]}
          answersOverride={existingAnswers}
          saveAnswerOverride={mockSaveAnswer}
        />
      );

      // Start transcription
      fireEvent.click(screen.getByTestId('transcription-start-btn'));
      fireEvent.click(screen.getByTestId('consent-checkbox'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('consent-confirm-btn'));
      });

      await waitFor(() => {
        expect(
          screen.getByText('We are currently reviewing the public procurement audit records.')
        ).toBeInTheDocument();
      });

      // Attempt "Add to answer"
      fireEvent.click(screen.getAllByText('Add to answer')[0]);
      const confirmBtn = screen.getByTestId('question-picker-confirm-btn');

      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      // Verify saveAnswer was NOT called
      expect(mockSaveAnswer).not.toHaveBeenCalled();

      // Original answer remains untouched
      expect(existingAnswers[0].answer_text).toBe('Unchanged pristine answer.');

      // Panel surfaces error notice
      expect(
        screen.getByText('Interview is completed and locked from modifications.')
      ).toBeInTheDocument();
    });

    it('guards against autoSaveStatus "saving": retries, surfaces failure in panel only on timeout, and leaves answer untouched', async () => {
      const mockSaveAnswer = vi.fn();
      const existingAnswers: Answer[] = [
        {
          id: 'ans-busy',
          interview_id: 'int-busy',
          question_id: 'q-gov-01',
          answer_text: 'Original answer when autosave was busy.',
          updated_at: new Date().toISOString(),
        },
      ];

      render(
        <LiveTranscriptionPanel
          interviewId="int-busy"
          customProvider={fakeProvider}
          customWriter={mockWriter}
          tierQuestionsOverride={sampleTierQuestions}
          autoSaveStatusOverride="saving" // AUTOSAVE IS CURRENTLY BUSY
          interviewsOverride={[
            {
              id: 'int-busy',
              interviewee_name: 'Participant',
              role_title: 'Director',
              department_unit: 'Finance',
              tier: 'Leadership',
              status: 'In Progress',
              interview_date: '2026-10-20',
              interview_time: '10:00',
              location: 'Kampala',
              interviewer_id: 'user-1',
              interviewer_name: 'John',
              duration_min: 60,
              completion_percentage: 20,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]}
          answersOverride={existingAnswers}
          saveAnswerOverride={mockSaveAnswer}
        />
      );

      // Start transcription
      fireEvent.click(screen.getByTestId('transcription-start-btn'));
      fireEvent.click(screen.getByTestId('consent-checkbox'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('consent-confirm-btn'));
      });

      await waitFor(() => {
        expect(
          screen.getByText('We are currently reviewing the public procurement audit records.')
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText('Add to answer')[0]);
      const confirmBtn = screen.getByTestId('question-picker-confirm-btn');

      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      // Waits and times out because status remains 'saving'
      await waitFor(
        () => {
          expect(
            screen.getByText(/Auto-save was busy. Action queued and timed out. Original text left untouched./)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // saveAnswer was NOT invoked, answer untouched
      expect(mockSaveAnswer).not.toHaveBeenCalled();
      expect(existingAnswers[0].answer_text).toBe('Original answer when autosave was busy.');
    });
  });
});


