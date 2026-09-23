/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { fetchInterviewReportData, fetchAnalyticsDataset } from '../lib/reportService';
import { DiagnosticExportModal } from '../components/DiagnosticExportModal';
import { AdminAnalyticsDashboard } from '../components/AdminAnalyticsDashboard';
import { AuthContext } from '../context/AuthContext';
import { InterviewContext } from '../context/InterviewContext';
import { useInterviewReport } from '../hooks/useInterviewReport';
import { Interview, InterviewerNote, Answer, DocumentItem } from '../types';

// Helper to create a thenable query object mimicking Supabase's PostgrestFilterBuilder
function createMockQuery(resultData: any) {
  const queryObj: any = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    in: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: resultData, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: resultData, error: null }),
    then(onFulfilled: any) {
      return Promise.resolve({ data: resultData, error: null }).then(onFulfilled);
    },
  };
  queryObj.select.mockReturnValue(queryObj);
  queryObj.eq.mockReturnValue(queryObj);
  queryObj.order.mockReturnValue(queryObj);
  queryObj.in.mockReturnValue(queryObj);
  return queryObj;
}

// Mock Supabase
vi.mock('../lib/supabase', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: vi.fn(),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
    },
  };
});

// Mock useInterviewReport for DiagnosticExportModal component tests
vi.mock('../hooks/useInterviewReport', () => ({
  useInterviewReport: vi.fn(),
}));

describe('Report & Analytics Service & Components', () => {
  const mockOfficerUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'officer@mglsd.go.ug',
    full_name: 'Grace Okello',
    role: 'interviewer' as const,
    department_unit: 'Labour Inspection',
  };

  const mockAdminUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'admin@mglsd.go.ug',
    full_name: 'Commissioner Bernard',
    role: 'admin' as const,
    department_unit: 'Directorate of Labour',
  };

  const sampleInterview: Interview = {
    id: '33333333-3333-4333-8333-333333333333',
    interviewee_name: 'Dr. Jane Namubiru',
    role_title: 'Chief Industrial Relations Officer',
    department_unit: 'Industrial Relations & Productivity',
    years_in_role: 4,
    interview_date: '2026-09-20',
    interview_time: '11:00 AM',
    location: 'Headquarters, Simbamanyo House',
    interviewer_id: mockOfficerUser.id,
    interviewer_name: mockOfficerUser.full_name,
    tier: 'Leadership',
    status: 'Completed',
    duration_min: 75,
    completion_percentage: 100,
    created_at: '2026-09-20T08:00:00Z',
    updated_at: '2026-09-20T09:15:00Z',
  };

  const sampleNotes: InterviewerNote = {
    id: 'note-1',
    interview_id: sampleInterview.id,
    observations: 'Strong institutional memory but legacy manual paper ledgers remain widespread.',
    numbers_captured: {
      total_staff: 28,
      labour_officers_count: 14,
      annual_inspections: 320,
      disputes_logged: 150,
      disputes_resolved: 120,
      budget_allocated_ugx: '500,000,000',
      budget_released_pct: 65,
      backlog_cases: 30,
    },
    contradictions: 'Budget allocations are reported on paper but 40% never reaches field operations.',
    documents_collected_summary: 'OSH registers and dispute logbooks provided.',
    follow_ups: 'Recommend migration to electronic case management system.',
    maturity_signals: {
      governance_score: 4,
      technology_score: 2,
      process_score: 3,
      people_skills_score: 4,
      data_reporting_score: 2,
      justification: 'Competent personnel hampered by lack of digital infrastructure.',
    },
    updated_at: '2026-09-20T09:15:00Z',
  };

  const sampleAnswers: Answer[] = [
    {
      id: 'ans-1',
      interview_id: sampleInterview.id,
      question_id: 'A1',
      answer_text: 'The department oversees statutory dispute resolution and tripartite labour advisory.',
      updated_at: '2026-09-20T08:30:00Z',
    },
  ];

  const sampleChecklist: DocumentItem[] = [
    {
      id: 'doc-1',
      interview_id: sampleInterview.id,
      item_number: 1,
      document_title: 'Annual Labour Directorate Performance Report',
      category: 'Strategic',
      exists_status: 'Yes',
      collected_status: 'Collected',
      notes: 'Physical hardcopy verified',
      follow_up_action: '',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchInterviewReportData (Service Layer)', () => {
    it('blocks unauthorised officer from accessing reports of another officer', async () => {
      const otherOfficer = {
        id: '99999999-9999-4999-8999-999999999999',
        email: 'other@mglsd.go.ug',
        full_name: 'Other Officer',
        role: 'interviewer' as const,
        department_unit: 'Industrial Relations',
      };

      const { supabase } = await import('../lib/supabase');
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'interviews') {
          return createMockQuery({
            ...sampleInterview,
            interviewer_id: mockOfficerUser.id,
            profiles: { full_name: mockOfficerUser.full_name, department_unit: 'Labour' },
          });
        }
        return createMockQuery([]);
      });

      const result = await fetchInterviewReportData(sampleInterview.id, otherOfficer, false);
      expect(result.data).toBeNull();
      expect(result.error).toContain('UNAUTHORIZED');
    });

    it('allows admin to access any interview report', async () => {
      const { supabase } = await import('../lib/supabase');
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'interviews') {
          return createMockQuery({
            ...sampleInterview,
            profiles: { full_name: mockOfficerUser.full_name, department_unit: 'Labour' },
          });
        }
        if (table === 'answers') {
          return createMockQuery(sampleAnswers);
        }
        if (table === 'documents_checklist') {
          return createMockQuery(sampleChecklist);
        }
        if (table === 'interviewer_notes') {
          return createMockQuery(sampleNotes);
        }
        return createMockQuery([]);
      });

      const result = await fetchInterviewReportData(sampleInterview.id, mockAdminUser, true);
      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.interview.interviewee_name).toBe('Dr. Jane Namubiru');
      expect(result.data?.isValidForOfficialReport).toBe(true);
      expect(result.data?.notes.numbers_captured.annual_inspections).toBe(320);
    });

    it('flags in-progress interview as not valid for official report with clear warning', async () => {
      const inProgressInterview: Interview = {
        ...sampleInterview,
        status: 'In Progress',
        completion_percentage: 45,
      };

      const { supabase } = await import('../lib/supabase');
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'interviews') {
          return createMockQuery(inProgressInterview);
        }
        return createMockQuery([]);
      });

      const result = await fetchInterviewReportData(sampleInterview.id, mockOfficerUser, false);
      expect(result.data?.isValidForOfficialReport).toBe(false);
      expect(result.data?.validationWarnings.some((w) => w.includes('In Progress'))).toBe(true);
    });
  });

  describe('fetchAnalyticsDataset (Aggregation Layer)', () => {
    it('aggregates live quantitative metrics without hardcoded numbers', async () => {
      const dataset = await fetchAnalyticsDataset(
        {
          dateRange: 'all',
          tier: 'All Tiers',
          status: 'All Statuses',
          department: 'All Departments',
          interviewerId: 'All Interviewers',
        },
        mockAdminUser,
        true,
        [sampleInterview],
        { [sampleInterview.id]: sampleNotes }
      );

      expect(dataset.kpis.totalInterviews).toBe(1);
      expect(dataset.kpis.completedCount).toBe(1);
      expect(dataset.kpis.completionRate).toBe(100);

      // Verifies quantitative metrics match sampleNotes, NOT fake 1240 / 890 / 612 / 142
      expect(dataset.quantitativeMetrics.totalInspections).toBe(320);
      expect(dataset.quantitativeMetrics.disputesLogged).toBe(150);
      expect(dataset.quantitativeMetrics.disputesResolved).toBe(120);
      expect(dataset.quantitativeMetrics.totalStaffCount).toBe(28);

      // Verifies maturity scores match sampleNotes
      const govScore = dataset.maturityScores.find((m) => m.domain === 'Governance');
      expect(govScore?.score).toBe(4);

      // Verifies synthesized bottlenecks extracted from real contradictions
      expect(dataset.synthesizedBottlenecks.length).toBeGreaterThan(0);
      expect(dataset.synthesizedBottlenecks[0].content).toContain('never reaches field operations');
    });

    it('returns clean 0s when no quantitative data exists, avoiding fake fallbacks', async () => {
      const interviewNoNotes: Interview = {
        ...sampleInterview,
        id: 'empty-1',
      };

      const dataset = await fetchAnalyticsDataset(
        {
          dateRange: 'all',
          tier: 'All Tiers',
          status: 'All Statuses',
          department: 'All Departments',
          interviewerId: 'All Interviewers',
        },
        mockAdminUser,
        true,
        [interviewNoNotes],
        {} // no notes
      );

      expect(dataset.quantitativeMetrics.totalInspections).toBe(0);
      expect(dataset.quantitativeMetrics.disputesLogged).toBe(0);
      expect(dataset.quantitativeMetrics.disputesResolved).toBe(0);
      expect(dataset.quantitativeMetrics.totalStaffCount).toBe(0);
      expect(dataset.quantitativeMetrics.hasData).toBe(false);
    });

    it('filters interviews by tier and status correctly', async () => {
      const frontlineDraft: Interview = {
        ...sampleInterview,
        id: 'frontline-1',
        tier: 'Frontline',
        status: 'Draft',
      };

      const dataset = await fetchAnalyticsDataset(
        {
          dateRange: 'all',
          tier: 'Leadership',
          status: 'Completed',
          department: 'All Departments',
          interviewerId: 'All Interviewers',
        },
        mockAdminUser,
        true,
        [sampleInterview, frontlineDraft],
        {}
      );

      expect(dataset.filteredInterviews.length).toBe(1);
      expect(dataset.filteredInterviews[0].tier).toBe('Leadership');
    });
  });

  describe('DiagnosticExportModal Component', () => {
    it('renders the official letterhead, metadata, maturity ratings, and responses', async () => {
      (useInterviewReport as any).mockReturnValue({
        reportData: {
          interview: sampleInterview,
          answers: sampleAnswers,
          checklist: sampleChecklist,
          notes: sampleNotes,
          interviewerProfile: {
            full_name: mockOfficerUser.full_name,
            department_unit: 'Labour Inspection',
            email: 'officer@mglsd.go.ug',
          },
          isValidForOfficialReport: true,
          validationWarnings: [],
          fetchedAt: '2026-09-22T23:00:00Z',
        },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <AuthContext.Provider
          value={{
            user: mockOfficerUser,
            session: null,
            loading: false,
            authError: null,
            allUsers: [],
            isAdmin: false,
            login: vi.fn(),
            signUp: vi.fn(),
            logout: vi.fn(),
            clearAuthError: vi.fn(),
            updateUserRole: vi.fn(),
            addNewUser: vi.fn(),
          }}
        >
          <DiagnosticExportModal interviewId={sampleInterview.id} onClose={vi.fn()} />
        </AuthContext.Provider>
      );

      // Verify Interviewee Name renders in metadata and signature
      expect(screen.getAllByText(/Dr\. Jane Namubiru/i).length).toBeGreaterThanOrEqual(1);

      // Letterhead & Ministry Title
      expect(
        screen.getByText(/Ministry of Gender, Labour and Social Development/i)
      ).toBeInTheDocument();

      // Maturity Scores Section
      expect(screen.getByText('1. Institutional Maturity Diagnostic Scores (1 to 5)')).toBeInTheDocument();
      expect(screen.getAllByText('4/5').length).toBeGreaterThanOrEqual(1); // governance & skills scores from notes

      // Answers Section
      expect(
        screen.getByText(/The department oversees statutory dispute resolution/i)
      ).toBeInTheDocument();

      // Supporting Documents Section
      expect(screen.getByText(/Annual Labour Directorate Performance Report/i)).toBeInTheDocument();

      // Signatures
      expect(screen.getByText('Field Diagnostic Interviewer:')).toBeInTheDocument();
      expect(screen.getByText('Interviewee Verification:')).toBeInTheDocument();
    });

    it('shows warning when viewing an in-progress interview', async () => {
      const inProgressInterview: Interview = {
        ...sampleInterview,
        status: 'In Progress',
        completion_percentage: 50,
      };

      (useInterviewReport as any).mockReturnValue({
        reportData: {
          interview: inProgressInterview,
          answers: sampleAnswers,
          checklist: sampleChecklist,
          notes: sampleNotes,
          interviewerProfile: null,
          isValidForOfficialReport: false,
          validationWarnings: [
            'This interview is currently marked as "In Progress". Official statutory Diagnostic Briefs require "Completed" status.',
          ],
          fetchedAt: '2026-09-22T23:00:00Z',
        },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <AuthContext.Provider
          value={{
            user: mockOfficerUser,
            session: null,
            loading: false,
            authError: null,
            allUsers: [],
            isAdmin: false,
            login: vi.fn(),
            signUp: vi.fn(),
            logout: vi.fn(),
            clearAuthError: vi.fn(),
            updateUserRole: vi.fn(),
            addNewUser: vi.fn(),
          }}
        >
          <DiagnosticExportModal interviewId={sampleInterview.id} onClose={vi.fn()} />
        </AuthContext.Provider>
      );

      expect(screen.getByText(/Informal Draft \/ In-Progress Preview/i)).toBeInTheDocument();
    });
  });

  describe('AdminAnalyticsDashboard Component', () => {
    it('renders live KPIs and filters correctly', async () => {
      const { supabase } = await import('../lib/supabase');
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'interviews') {
          return createMockQuery([sampleInterview]);
        }
        if (table === 'interviewer_notes') {
          return createMockQuery([sampleNotes]);
        }
        return createMockQuery([]);
      });

      render(
        <AuthContext.Provider
          value={{
            user: mockAdminUser,
            session: null,
            loading: false,
            authError: null,
            allUsers: [],
            isAdmin: true,
            login: vi.fn(),
            signUp: vi.fn(),
            logout: vi.fn(),
            clearAuthError: vi.fn(),
            updateUserRole: vi.fn(),
            addNewUser: vi.fn(),
          }}
        >
          <InterviewContext.Provider
            value={{
              interviews: [sampleInterview],
              allInterviewsGlobal: [sampleInterview],
              activeInterviewId: null,
              activeInterview: null,
              recentActivities: [],
              answers: {},
              checklists: {},
              notes: { [sampleInterview.id]: sampleNotes },
              autoSaveStatus: 'saved',
              setAutoSaveStatus: vi.fn(),
              loading: false,
              error: null,
              refreshInterviews: vi.fn(),
              selectInterview: vi.fn(),
              createInterview: vi.fn(),
              updateInterview: vi.fn(),
              deleteInterview: vi.fn(),
              completeInterview: vi.fn(),
              flushAnswersSave: vi.fn(),
              flushNotesSave: vi.fn(),
              getInterviewAnswers: vi.fn(() => []),
              saveAnswer: vi.fn(),
              getInterviewChecklist: vi.fn(() => []),
              updateChecklistItem: vi.fn(),
              getInterviewNotes: vi.fn(() => sampleNotes),
              saveNotes: vi.fn(),
              uploadDocumentFile: vi.fn(),
            }}
          >
            <AdminAnalyticsDashboard onOpenInterview={vi.fn()} />
          </InterviewContext.Provider>
        </AuthContext.Provider>
      );

      // Verify title & national oversight banner
      expect(screen.getByText('TRANSFORMATIVE Diagnostic Analytics')).toBeInTheDocument();
      expect(screen.getByText('National Oversight Suite')).toBeInTheDocument();

      // Verify filter controls exist
      expect(screen.getByText('Live Analytics Query Filters')).toBeInTheDocument();

      // Wait for async load to finish and button to show 'Sync Live Data'
      await waitFor(() => {
        expect(screen.getByText('Sync Live Data')).toBeInTheDocument();
      });

      expect(screen.getByText('Export Report (JSON)')).toBeInTheDocument();
    });
  });
});
