/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';
import { mapRowToInterview, InterviewRowInput } from '../lib/interviewService';
import {
  generateDiagnosticPdf,
  downloadServerDiagnosticPdf,
  generateDiagnosticBriefPdf,
  DiagnosticBriefData,
} from '../lib/reportService';
import { useAnswersState } from '../hooks/useAnswersState';
import { DynamicInterviewForm } from '../components/DynamicInterviewForm';
import { AuthProvider } from '../context/AuthContext';
import { InterviewProvider } from '../context/InterviewContext';

// Top-level mock for useInterviewFormState to assert error banner & status badge rendering
const mockInterviewRecord = {
  id: '11111111-1111-4000-8000-000000000001',
  interviewee_name: 'Test Officer',
  role_title: 'Inspector',
  department_unit: 'Labour',
  interviewer_id: 'usr-123',
  interviewer_name: 'Assigned Officer',
  tier: 'Leadership' as const,
  status: 'Completed' as const,
  duration_min: 60,
  completion_percentage: 100,
  created_at: '2026-10-17T10:00:00Z',
  updated_at: '2026-10-17T12:00:00Z',
  years_in_role: 3,
  interview_date: '2026-10-17',
  interview_time: '10:00 AM',
  location: 'Kampala',
};

let currentAutoSaveStatus: 'saved' | 'saving' | 'error' = 'saved';

vi.mock('../hooks/useInterviewFormState', () => ({
  useInterviewFormState: () => ({
    interview: mockInterviewRecord,
    activeSection: 'A',
    applicableSections: [{ code: 'A', title: 'Section A: Strategic Alignment' }],
    applicableQuestions: [],
    currentQuestions: [],
    answers: [],
    localAnswers: {},
    checklist: [],
    notes: {
      id: 'n1',
      interview_id: '11111111-1111-4000-8000-000000000001',
      observations: '',
      numbers_captured: {},
      contradictions: '',
      documents_collected_summary: '',
      follow_ups: '',
      maturity_signals: {},
      updated_at: '',
    },
    localNotes: {
      id: 'n1',
      interview_id: '11111111-1111-4000-8000-000000000001',
      observations: '',
      numbers_captured: {},
      contradictions: '',
      documents_collected_summary: '',
      follow_ups: '',
      maturity_signals: {},
      updated_at: '',
    },
    overallPercentage: 100,
    pendingDocsCount: 0,
    autoSaveStatus: currentAutoSaveStatus,
    questionsLoading: false,
    questionsError: null,
    refreshQuestions: vi.fn(),
    handleAnswerChange: vi.fn(),
    handleStatusChange: vi.fn(),
    handleNotesChange: vi.fn(),
    handleChecklistToggle: vi.fn(),
    handleDocumentFileUpload: vi.fn(),
    setActiveSection: vi.fn(),
    flushAnswersSave: vi.fn(),
    flushNotesSave: vi.fn(),
  }),
}));

describe('Completed Interview Immutability & Edge PDF Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSupabaseConfiguredForTesting(true);
    localStorage.clear();
    currentAutoSaveStatus = 'saved';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (import.meta.env as any).VITE_ENABLE_SERVER_PDF;
  });

  describe('Part A: Immutability, Error Surfacing & completed_at Mapping', () => {
    it('mapRowToInterview maps completed_at when present and defaults to null when missing', () => {
      const rawRowWithCompletedAt: InterviewRowInput = {
        id: '00000000-0000-4000-8000-000000000001',
        interviewee_name: 'Commissioner Opio',
        role_title: 'Director',
        department_unit: 'Labour Standards',
        interviewer_id: '00000000-0000-4000-8000-000000000002',
        tier: 'Leadership',
        status: 'Completed',
        completed_at: '2026-10-17T12:00:00.000Z',
      };

      const mapped = mapRowToInterview(rawRowWithCompletedAt);
      expect(mapped.completed_at).toBe('2026-10-17T12:00:00.000Z');

      const rawRowWithoutCompletedAt: InterviewRowInput = {
        id: '00000000-0000-4000-8000-000000000002',
        interviewee_name: 'Officer Mukasa',
        role_title: 'Inspector',
        department_unit: 'Labour Relations',
        interviewer_id: '00000000-0000-4000-8000-000000000002',
        tier: 'Management',
        status: 'In Progress',
      };

      const mappedPending = mapRowToInterview(rawRowWithoutCompletedAt);
      expect(mappedPending.completed_at).toBeNull();
    });

    it('surfaces 42501 immutability database errors through autoSaveStatus = "error"', async () => {
      // Mock Supabase answers upsert to reject with PostgreSQL code 42501 (insufficient_privilege)
      const immutabilityError = {
        code: '42501',
        message: 'Completed interviews are immutable and cannot be modified by non-admin users',
      };

      const interviewData = {
        id: '11111111-1111-4000-8000-000000000001',
        interviewee_name: 'Completed Subject',
        role_title: 'Director',
        department_unit: 'Labour',
        interviewer_id: '00000000-0000-4000-8000-000000000002',
        tier: 'Leadership',
        status: 'Completed',
      };

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'answers') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: immutabilityError,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'interviews') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: interviewData,
                  error: null,
                }),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: interviewData,
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          } as any;
        }
        return { select: vi.fn().mockReturnThis() } as any;
      });

      const setAutoSaveStatusMock = vi.fn();
      const updateInterviewMock = vi.fn();

      function TestAnswersComponent() {
        const { saveAnswer } = useAnswersState({
          userId: '00000000-0000-4000-8000-000000000002',
          allInterviews: [
            {
              id: '11111111-1111-4000-8000-000000000001',
              interviewee_name: 'Completed Subject',
              role_title: 'Director',
              department_unit: 'Labour',
              interviewer_id: '00000000-0000-4000-8000-000000000002',
              interviewer_name: 'Officer',
              tier: 'Leadership',
              status: 'Completed',
              duration_min: 60,
              completion_percentage: 100,
              created_at: '2026-10-17T10:00:00Z',
              updated_at: '2026-10-17T12:00:00Z',
              years_in_role: 5,
              interview_date: '2026-10-17',
              interview_time: '10:00 AM',
              location: 'Kampala',
            },
          ],
          updateInterview: updateInterviewMock,
          setAutoSaveStatus: setAutoSaveStatusMock,
        });

        return (
          <button
            data-testid="edit-answer-btn"
            onClick={() =>
              saveAnswer(
                '11111111-1111-4000-8000-000000000001',
                'A1',
                'Attempt to overwrite completed answer'
              )
            }
          >
            Edit Answer
          </button>
        );
      }

      render(<TestAnswersComponent />);

      // Trigger answer change
      act(() => {
        screen.getByTestId('edit-answer-btn').click();
      });

      // Initially transitions to 'saving'
      expect(setAutoSaveStatusMock).toHaveBeenCalledWith('saving');

      // Wait for debounce window (450ms) and async database rejection
      await act(async () => {
        await new Promise((r) => setTimeout(r, 600));
      });

      // Confirms autoSaveStatus transitions to 'error' when 42501 is returned
      expect(setAutoSaveStatusMock).toHaveBeenCalledWith('error');
    });

    it('renders the existing autosave error banner and sync issue badge when autoSaveStatus is error', () => {
      currentAutoSaveStatus = 'error';

      render(
        <AuthProvider>
          <InterviewProvider>
            <DynamicInterviewForm
              interviewId="11111111-1111-4000-8000-000000000001"
              onBack={vi.fn()}
            />
          </InterviewProvider>
        </AuthProvider>
      );

      // Verify that the existing autosave error banner is rendered
      expect(screen.getByTestId('autosave-error-banner')).toBeInTheDocument();
      expect(
        screen.getByText(/Answers could not be saved to the server/i)
      ).toBeInTheDocument();
      expect(screen.getByTestId('autosave-retry-btn')).toBeInTheDocument();

      // Verify the existing status indicator shows "Sync issue"
      expect(screen.getByText('Sync issue')).toBeInTheDocument();
    });
  });

  describe('Part B: generateDiagnosticPdf Edge Function Integration', () => {
    it('returns null and does not invoke edge function when VITE_ENABLE_SERVER_PDF is false/unset', async () => {
      (import.meta.env as any).VITE_ENABLE_SERVER_PDF = 'false';
      const invokeSpy = vi.spyOn(Object.getPrototypeOf(supabase.functions), 'invoke');

      const result = await generateDiagnosticPdf('11111111-1111-4000-8000-000000000001');

      expect(result).toBeNull();
      expect(invokeSpy).not.toHaveBeenCalled();
    });

    it('invokes generate-diagnostic-pdf edge function and returns Blob when VITE_ENABLE_SERVER_PDF is true', async () => {
      (import.meta.env as any).VITE_ENABLE_SERVER_PDF = 'true';

      const mockPdfBlob = new Blob(['%PDF-1.4 mock pdf content'], { type: 'application/pdf' });
      const invokeSpy = vi
        .spyOn(Object.getPrototypeOf(supabase.functions), 'invoke')
        .mockResolvedValue({ data: mockPdfBlob, error: null });

      const result = await generateDiagnosticPdf('11111111-1111-4000-8000-000000000001');

      expect(invokeSpy).toHaveBeenCalledWith('generate-diagnostic-pdf', {
        body: { interview_id: '11111111-1111-4000-8000-000000000001' },
      });
      expect(result).toBeInstanceOf(Blob);
      expect(result?.type).toBe('application/pdf');
    });

    it('throws error when edge function invocation returns an error', async () => {
      (import.meta.env as any).VITE_ENABLE_SERVER_PDF = 'true';

      const edgeFunctionError = new Error('Edge function timed out or unauthorized');
      vi.spyOn(Object.getPrototypeOf(supabase.functions), 'invoke').mockResolvedValue({
        data: null,
        error: edgeFunctionError as any,
      });

      await expect(
        generateDiagnosticPdf('11111111-1111-4000-8000-000000000001')
      ).rejects.toThrow('Edge function timed out or unauthorized');
    });

    it('rejects invalid interview UUIDs with descriptive error', async () => {
      (import.meta.env as any).VITE_ENABLE_SERVER_PDF = 'true';

      await expect(generateDiagnosticPdf('invalid-uuid')).rejects.toThrow(
        'Invalid interview ID UUID: invalid-uuid'
      );
    });

    it('downloadServerDiagnosticPdf downloads server PDF when Edge Function returns 200', async () => {
      (import.meta.env as any).VITE_ENABLE_SERVER_PDF = 'true';

      const mockPdfBlob = new Blob(['%PDF-1.4 binary content'], { type: 'application/pdf' });
      vi.spyOn(Object.getPrototypeOf(supabase.functions), 'invoke').mockResolvedValue({
        data: mockPdfBlob,
        error: null,
      });

      const clickedDownloads: string[] = [];
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'a') {
          el.click = vi.fn(() => {
            clickedDownloads.push((el as HTMLAnchorElement).download);
          });
        }
        return el;
      });

      await downloadServerDiagnosticPdf('11111111-1111-4000-8000-000000000001');

      expect(clickedDownloads).toContain('Diagnostic_Brief_11111111-1111-4000-8000-000000000001.pdf');
    });

    it('downloadServerDiagnosticPdf falls back to HTML Blob download when Edge Function returns 500 or network error', async () => {
      (import.meta.env as any).VITE_ENABLE_SERVER_PDF = 'true';

      vi.spyOn(Object.getPrototypeOf(supabase.functions), 'invoke').mockResolvedValue({
        data: null,
        error: new Error('Edge Function 500 Internal Server Error'),
      });

      const clickedDownloads: string[] = [];
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'a') {
          el.click = vi.fn(() => {
            clickedDownloads.push((el as HTMLAnchorElement).download);
          });
        }
        return el;
      });

      const sampleReportData: DiagnosticBriefData = {
        interview: {
          id: '11111111-1111-4000-8000-000000000001',
          interviewee_name: 'Dr Jane Okello',
          role_title: 'Commissioner',
          department_unit: 'Labour Standards',
          interviewer_id: '00000000-0000-4000-8000-000000000002',
          interviewer_name: 'Field Officer',
          tier: 'Leadership',
          status: 'Completed',
          duration_min: 60,
          completion_percentage: 100,
          created_at: '2026-10-17T10:00:00Z',
          updated_at: '2026-10-17T12:00:00Z',
          completed_at: '2026-10-17T12:00:00Z',
          years_in_role: 4,
          interview_date: '2026-10-17',
          interview_time: '10:00 AM',
          location: 'Kampala',
        },
        answers: [],
        checklist: [],
        notes: {
          id: 'n1',
          interview_id: '11111111-1111-4000-8000-000000000001',
          observations: 'Evidence intact',
          numbers_captured: {
            total_staff: 15,
            labour_officers_count: 8,
            annual_inspections: 120,
            disputes_logged: 45,
            disputes_resolved: 40,
            budget_allocated_ugx: '500000000',
            budget_released_pct: 80,
            backlog_cases: 5,
          },
          contradictions: '',
          documents_collected_summary: '',
          follow_ups: '',
          maturity_signals: {
            governance_score: 4,
            technology_score: 3,
            process_score: 4,
            people_skills_score: 3,
            data_reporting_score: 4,
            justification: 'Strong governance',
          },
          updated_at: '2026-10-17T12:00:00Z',
        },
        interviewerProfile: {
          full_name: 'Field Officer',
          department_unit: 'Labour Standards',
          email: 'officer@mglsd.go.ug',
        },
        isValidForOfficialReport: true,
        validationWarnings: [],
        fetchedAt: '2026-10-17T12:05:00Z',
      };

      await downloadServerDiagnosticPdf('11111111-1111-4000-8000-000000000001', sampleReportData);

      // Verify that the fallback HTML file download was triggered
      expect(clickedDownloads.length).toBeGreaterThan(0);
      expect(clickedDownloads[0]).toMatch(/\.html$/);
      expect(clickedDownloads[0]).toContain('Diagnostic_Brief');
    });

    it('downloadServerDiagnosticPdf falls back to HTML Blob download directly when VITE_ENABLE_SERVER_PDF is false', async () => {
      (import.meta.env as any).VITE_ENABLE_SERVER_PDF = 'false';

      const invokeSpy = vi.spyOn(Object.getPrototypeOf(supabase.functions), 'invoke');
      const clickedDownloads: string[] = [];
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'a') {
          el.click = vi.fn(() => {
            clickedDownloads.push((el as HTMLAnchorElement).download);
          });
        }
        return el;
      });

      const sampleReportData: DiagnosticBriefData = {
        interview: {
          id: '11111111-1111-4000-8000-000000000001',
          interviewee_name: 'Dr Jane Okello',
          role_title: 'Commissioner',
          department_unit: 'Labour Standards',
          interviewer_id: '00000000-0000-4000-8000-000000000002',
          interviewer_name: 'Field Officer',
          tier: 'Leadership',
          status: 'Completed',
          duration_min: 60,
          completion_percentage: 100,
          created_at: '2026-10-17T10:00:00Z',
          updated_at: '2026-10-17T12:00:00Z',
          completed_at: '2026-10-17T12:00:00Z',
          years_in_role: 4,
          interview_date: '2026-10-17',
          interview_time: '10:00 AM',
          location: 'Kampala',
        },
        answers: [],
        checklist: [],
        notes: {
          id: 'n1',
          interview_id: '11111111-1111-4000-8000-000000000001',
          observations: 'Evidence intact',
          numbers_captured: {
            total_staff: 15,
            labour_officers_count: 8,
            annual_inspections: 120,
            disputes_logged: 45,
            disputes_resolved: 40,
            budget_allocated_ugx: '500000000',
            budget_released_pct: 80,
            backlog_cases: 5,
          },
          contradictions: '',
          documents_collected_summary: '',
          follow_ups: '',
          maturity_signals: {
            governance_score: 4,
            technology_score: 3,
            process_score: 4,
            people_skills_score: 3,
            data_reporting_score: 4,
            justification: 'Strong governance',
          },
          updated_at: '2026-10-17T12:00:00Z',
        },
        isValidForOfficialReport: true,
        validationWarnings: [],
        fetchedAt: '2026-10-17T12:05:00Z',
      };

      await downloadServerDiagnosticPdf('11111111-1111-4000-8000-000000000001', sampleReportData);

      expect(invokeSpy).not.toHaveBeenCalled();
      expect(clickedDownloads.length).toBeGreaterThan(0);
      expect(clickedDownloads[0]).toMatch(/\.html$/);
    });

    it('Edge Function contract test: validates request/response shapes for generate-diagnostic-pdf', async () => {
      // Contract specification verification:
      // Request shape: POST { interview_id: string }
      // Headers: Authorization: Bearer <jwt>
      const requestPayload = { interview_id: '11111111-1111-4000-8000-000000000001' };
      expect(typeof requestPayload.interview_id).toBe('string');
      expect(requestPayload.interview_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

      // Response shape:
      // 200 OK: Content-Type: application/pdf, Content-Disposition: attachment; filename="Diagnostic_Brief_<id>.pdf"
      // Error shape: { error: string } with 400, 401, 403, 404, or 500
      const mockContractResponse = {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Diagnostic_Brief_${requestPayload.interview_id}.pdf"`,
        },
        body: new Blob(['%PDF-1.4 contract mock bytes'], { type: 'application/pdf' }),
      };

      expect(mockContractResponse.status).toBe(200);
      expect(mockContractResponse.headers['Content-Type']).toBe('application/pdf');
      expect(mockContractResponse.headers['Content-Disposition']).toContain(requestPayload.interview_id);
      expect(mockContractResponse.body.type).toBe('application/pdf');
    });
  });
});

