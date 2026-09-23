/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from './supabase';
import {
  Interview,
  Answer,
  DocumentItem,
  InterviewerNote,
  InterviewTier,
  InterviewStatus,
  UserProfile,
} from '../types';
import {
  mapRowToInterview,
  mapRowToAnswer,
  mapRowToDocumentItem,
  mapRowToInterviewerNote,
  isUuid,
} from './interviewService';
import { createInitialNotes } from './mockData';

export interface AnalyticsFilters {
  dateRange: 'all' | 'last7days' | 'last30days' | 'last90days';
  tier: string;
  status: string;
  department: string;
  interviewerId: string;
}

export interface AnalyticsKPIs {
  totalInterviews: number;
  completedCount: number;
  inProgressCount: number;
  draftCount: number;
  completionRate: number;
}

export interface TierAnalyticsItem {
  tier: string;
  total: number;
  completed: number;
  inProgress: number;
  draft: number;
  rate: number;
}

export interface MaturityDomainScore {
  domain: string;
  score: number;
  fullMark: number;
  dataPointsCount: number;
}

export interface QuantitativeMetrics {
  totalInspections: number;
  disputesLogged: number;
  disputesResolved: number;
  totalStaffCount: number;
  hasData: boolean;
}

export interface InterviewerWorkloadItem {
  interviewerId: string;
  interviewerName: string;
  department: string;
  total: number;
  completed: number;
  inProgress: number;
}

export interface SynthesizedBottleneck {
  id: string;
  interviewId: string;
  department: string;
  tier: string;
  interviewee: string;
  topic: string;
  content: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AnalyticsDataset {
  kpis: AnalyticsKPIs;
  tierData: TierAnalyticsItem[];
  maturityScores: MaturityDomainScore[];
  quantitativeMetrics: QuantitativeMetrics;
  interviewerWorkload: InterviewerWorkloadItem[];
  departmentDistribution: { department: string; count: number; completed: number }[];
  synthesizedBottlenecks: SynthesizedBottleneck[];
  availableDepartments: string[];
  availableInterviewers: { id: string; name: string }[];
  filteredInterviews: Interview[];
  lastRefreshedAt: string;
}

export interface DiagnosticBriefData {
  interview: Interview;
  answers: Answer[];
  checklist: DocumentItem[];
  notes: InterviewerNote;
  interviewerProfile?: {
    full_name: string;
    department_unit: string;
    email: string;
  } | null;
  isValidForOfficialReport: boolean;
  validationWarnings: string[];
  fetchedAt: string;
}

/**
 * Loads the latest interview record, answers, checklist, and notes freshly from Supabase at the moment of export.
 * Enforces role-based visibility: Interviewers can only view their own interviews, Admins can view any.
 */
export async function fetchInterviewReportData(
  interviewId: string,
  currentUser?: UserProfile | null,
  isAdmin: boolean = false
): Promise<{ data: DiagnosticBriefData | null; error: string | null }> {
  if (!interviewId) {
    return { data: null, error: 'No interview ID specified.' };
  }

  try {
    // 1. Fetch fresh interview record with interviewer profile
    let interview: Interview | null = null;
    let interviewerProfile: { full_name: string; department_unit: string; email: string } | null = null;

    if (isSupabaseConfigured && isUuid(interviewId)) {
      const { data: dbRow, error: interviewErr } = await supabase
        .from('interviews')
        .select('*, profiles:interviewer_id(full_name, department_unit, email)')
        .eq('id', interviewId)
        .single();

      if (interviewErr) {
        return { data: null, error: `Failed to load interview from database: ${interviewErr.message}` };
      }

      if (!dbRow) {
        return { data: null, error: 'Interview record not found in database.' };
      }

      const rowData = dbRow as any;
      interview = mapRowToInterview(rowData);
      if (rowData.profiles) {
        interviewerProfile = {
          full_name: rowData.profiles.full_name || interview.interviewer_name,
          department_unit: rowData.profiles.department_unit || interview.department_unit,
          email: rowData.profiles.email || '',
        };
      }
    }

    if (!interview) {
      return { data: null, error: 'Interview record could not be loaded.' };
    }

    // 2. Role-Based Visibility Check
    if (!isAdmin && currentUser && interview.interviewer_id) {
      if (interview.interviewer_id !== currentUser.id) {
        return {
          data: null,
          error: 'UNAUTHORIZED: You do not have permission to view or export diagnostic briefs for interviews conducted by another officer.',
        };
      }
    }

    // 3. Fetch answers fresh from Supabase
    let answers: Answer[] = [];
    if (isSupabaseConfigured && isUuid(interviewId)) {
      const { data: ansRows, error: ansErr } = await supabase
        .from('answers')
        .select('*')
        .eq('interview_id', interviewId);

      if (!ansErr && ansRows) {
        answers = ansRows.map(mapRowToAnswer);
      }
    }

    // 4. Fetch checklist fresh from Supabase
    let checklist: DocumentItem[] = [];
    if (isSupabaseConfigured && isUuid(interviewId)) {
      const { data: checkRows, error: checkErr } = await supabase
        .from('documents_checklist')
        .select('*')
        .eq('interview_id', interviewId)
        .order('item_number', { ascending: true });

      if (!checkErr && checkRows) {
        checklist = checkRows.map(mapRowToDocumentItem);
      }
    }

    // 5. Fetch notes fresh from Supabase
    let notes: InterviewerNote = createInitialNotes(interviewId);
    if (isSupabaseConfigured && isUuid(interviewId)) {
      const { data: noteRow, error: noteErr } = await supabase
        .from('interviewer_notes')
        .select('*')
        .eq('interview_id', interviewId)
        .maybeSingle();

      if (!noteErr && noteRow) {
        notes = mapRowToInterviewerNote(noteRow);
      }
    }

    // 6. Data Integrity & Validation Checks
    const validationWarnings: string[] = [];
    const isCompleted = interview.status === 'Completed';

    if (!isCompleted) {
      validationWarnings.push(
        `This interview is currently marked as "${interview.status}". Official statutory Diagnostic Briefs require "Completed" status.`
      );
    }

    if (answers.length === 0) {
      validationWarnings.push('No diagnostic questionnaire responses were recorded for this interview session.');
    }

    if (checklist.length === 0) {
      validationWarnings.push('Statutory document checklist has not been verified or initialized.');
    }

    const collectedCount = checklist.filter((d) => d.collected_status === 'Collected').length;
    if (collectedCount === 0) {
      validationWarnings.push('No supporting evidence documents were collected during this interview.');
    }

    const isValidForOfficialReport = isCompleted && answers.length > 0;

    return {
      data: {
        interview,
        answers,
        checklist,
        notes,
        interviewerProfile,
        isValidForOfficialReport,
        validationWarnings,
        fetchedAt: new Date().toISOString(),
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Error fetching interview report data:', err);
    return { data: null, error: err?.message || 'Unexpected error loading interview report.' };
  }
}

/**
 * Loads analytics dataset from Supabase matching filters and user permissions.
 */
export async function fetchAnalyticsDataset(
  filters: AnalyticsFilters,
  currentUser?: UserProfile | null,
  isAdmin: boolean = false,
  fallbackInterviews: Interview[] = [],
  fallbackNotes: Record<string, InterviewerNote> = {}
): Promise<AnalyticsDataset> {
  let rawInterviews: Interview[] = [];
  const notesMap: Record<string, InterviewerNote> = { ...fallbackNotes };

  // 1. Fetch live interviews with profiles join
  if (isSupabaseConfigured) {
    try {
      let query: any = supabase
        .from('interviews')
        .select('*, profiles:interviewer_id(full_name, department_unit, email)');

      // Enforce RLS on client query
      if (!isAdmin && currentUser && isUuid(currentUser.id)) {
        if (typeof query.eq === 'function') {
          query = query.eq('interviewer_id', currentUser.id);
        }
      }

      if (typeof query.order === 'function') {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        rawInterviews = data.map(mapRowToInterview);
      } else {
        rawInterviews = fallbackInterviews;
      }
    } catch (e) {
      console.warn('Notice: Error querying live interviews for analytics, using fallback:', e);
      rawInterviews = fallbackInterviews;
    }
  } else {
    rawInterviews = fallbackInterviews;
  }

  // 2. Extract distinct metadata for filters
  const departmentsSet = new Set<string>();
  const interviewersMap = new Map<string, string>();

  rawInterviews.forEach((i) => {
    if (i.department_unit) departmentsSet.add(i.department_unit);
    if (i.interviewer_id && i.interviewer_name) {
      interviewersMap.set(i.interviewer_id, i.interviewer_name);
    }
  });

  const availableDepartments = Array.from(departmentsSet).sort();
  const availableInterviewers = Array.from(interviewersMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  // 3. Apply active filters to raw interviews
  const now = Date.now();
  const filteredInterviews = rawInterviews.filter((interview) => {
    // Tier filter
    if (filters.tier !== 'All Tiers' && interview.tier !== filters.tier) {
      return false;
    }

    // Status filter
    if (filters.status !== 'All Statuses' && interview.status !== filters.status) {
      return false;
    }

    // Department filter
    if (filters.department !== 'All Departments' && interview.department_unit !== filters.department) {
      return false;
    }

    // Interviewer filter
    if (filters.interviewerId !== 'All Interviewers' && interview.interviewer_id !== filters.interviewerId) {
      return false;
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const interviewDate = new Date(interview.interview_date || interview.created_at).getTime();
      if (!isNaN(interviewDate)) {
        const diffDays = (now - interviewDate) / (1000 * 60 * 60 * 24);
        if (filters.dateRange === 'last7days' && diffDays > 7) return false;
        if (filters.dateRange === 'last30days' && diffDays > 30) return false;
        if (filters.dateRange === 'last90days' && diffDays > 90) return false;
      }
    }

    return true;
  });

  // 4. Fetch associated notes for filtered interviews to compute real maturity and metrics
  const filteredIds = filteredInterviews.map((i) => i.id).filter(isUuid);
  if (isSupabaseConfigured && filteredIds.length > 0) {
    try {
      let notesQuery: any = supabase
        .from('interviewer_notes')
        .select('*');

      if (typeof notesQuery.in === 'function') {
        notesQuery = notesQuery.in('interview_id', filteredIds);
      }

      const { data: dbNotes, error: notesErr } = await notesQuery;

      if (!notesErr && Array.isArray(dbNotes)) {
        dbNotes.forEach((row) => {
          notesMap[row.interview_id] = mapRowToInterviewerNote(row);
        });
      }
    } catch (e) {
      console.warn('Notice: Error querying live interviewer notes for analytics:', e);
    }
  }

  // 5. Compute real KPIs
  const totalInterviews = filteredInterviews.length;
  const completedCount = filteredInterviews.filter((i) => i.status === 'Completed').length;
  const inProgressCount = filteredInterviews.filter((i) => i.status === 'In Progress').length;
  const draftCount = filteredInterviews.filter((i) => i.status === 'Draft').length;
  const completionRate = totalInterviews > 0 ? Math.round((completedCount / totalInterviews) * 100) : 0;

  // 6. Compute real Tier Breakdown
  const tierMap: Record<string, { total: number; completed: number; inProgress: number; draft: number }> = {
    Leadership: { total: 0, completed: 0, inProgress: 0, draft: 0 },
    Management: { total: 0, completed: 0, inProgress: 0, draft: 0 },
    Frontline: { total: 0, completed: 0, inProgress: 0, draft: 0 },
    'Support/IT': { total: 0, completed: 0, inProgress: 0, draft: 0 },
  };

  filteredInterviews.forEach((i) => {
    if (tierMap[i.tier]) {
      tierMap[i.tier].total++;
      if (i.status === 'Completed') tierMap[i.tier].completed++;
      else if (i.status === 'In Progress') tierMap[i.tier].inProgress++;
      else if (i.status === 'Draft') tierMap[i.tier].draft++;
    }
  });

  const tierData: TierAnalyticsItem[] = Object.keys(tierMap).map((tier) => ({
    tier,
    total: tierMap[tier].total,
    completed: tierMap[tier].completed,
    inProgress: tierMap[tier].inProgress,
    draft: tierMap[tier].draft,
    rate: tierMap[tier].total > 0 ? Math.round((tierMap[tier].completed / tierMap[tier].total) * 100) : 0,
  }));

  // 7. Compute real Maturity Scores from live notes (no fake 3.0 fallbacks!)
  const domainScores = {
    governance: [] as number[],
    technology: [] as number[],
    process: [] as number[],
    people: [] as number[],
    data: [] as number[],
  };

  filteredInterviews.forEach((i) => {
    const note = notesMap[i.id];
    if (note?.maturity_signals) {
      const ms = note.maturity_signals;
      if (typeof ms.governance_score === 'number' && ms.governance_score > 0) {
        domainScores.governance.push(ms.governance_score);
      }
      if (typeof ms.technology_score === 'number' && ms.technology_score > 0) {
        domainScores.technology.push(ms.technology_score);
      }
      if (typeof ms.process_score === 'number' && ms.process_score > 0) {
        domainScores.process.push(ms.process_score);
      }
      if (typeof ms.people_skills_score === 'number' && ms.people_skills_score > 0) {
        domainScores.people.push(ms.people_skills_score);
      }
      if (typeof ms.data_reporting_score === 'number' && ms.data_reporting_score > 0) {
        domainScores.data.push(ms.data_reporting_score);
      }
    }
  });

  const calcAvg = (arr: number[]) =>
    arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;

  const maturityScores: MaturityDomainScore[] = [
    { domain: 'Governance', score: calcAvg(domainScores.governance), fullMark: 5, dataPointsCount: domainScores.governance.length },
    { domain: 'IT & Systems', score: calcAvg(domainScores.technology), fullMark: 5, dataPointsCount: domainScores.technology.length },
    { domain: 'Workflows & SOPs', score: calcAvg(domainScores.process), fullMark: 5, dataPointsCount: domainScores.process.length },
    { domain: 'Staffing & Skills', score: calcAvg(domainScores.people), fullMark: 5, dataPointsCount: domainScores.people.length },
    { domain: 'Data & Reporting', score: calcAvg(domainScores.data), fullMark: 5, dataPointsCount: domainScores.data.length },
  ];

  // 8. Compute real Quantitative Baseline metrics (strictly summed from live numbers_captured)
  let totalInspections = 0;
  let disputesLogged = 0;
  let disputesResolved = 0;
  let totalStaffCount = 0;
  let quantitativeDataPoints = 0;

  filteredInterviews.forEach((i) => {
    const note = notesMap[i.id];
    if (note?.numbers_captured) {
      const nc = note.numbers_captured;
      if (typeof nc.annual_inspections === 'number') {
        totalInspections += nc.annual_inspections;
        quantitativeDataPoints++;
      }
      if (typeof nc.disputes_logged === 'number') {
        disputesLogged += nc.disputes_logged;
        quantitativeDataPoints++;
      }
      if (typeof nc.disputes_resolved === 'number') {
        disputesResolved += nc.disputes_resolved;
        quantitativeDataPoints++;
      }
      if (typeof nc.total_staff === 'number') {
        totalStaffCount += nc.total_staff;
        quantitativeDataPoints++;
      }
    }
  });

  const quantitativeMetrics: QuantitativeMetrics = {
    totalInspections,
    disputesLogged,
    disputesResolved,
    totalStaffCount,
    hasData: quantitativeDataPoints > 0,
  };

  // 9. Compute real Interviewer Workload breakdown
  const workloadMap = new Map<string, { interviewerName: string; department: string; total: number; completed: number; inProgress: number }>();

  filteredInterviews.forEach((i) => {
    const id = i.interviewer_id || 'unknown';
    const name = i.interviewer_name || 'Unassigned Officer';
    const dept = i.department_unit || 'Labour Directorate';

    if (!workloadMap.has(id)) {
      workloadMap.set(id, { interviewerName: name, department: dept, total: 0, completed: 0, inProgress: 0 });
    }

    const item = workloadMap.get(id)!;
    item.total++;
    if (i.status === 'Completed') item.completed++;
    else if (i.status === 'In Progress') item.inProgress++;
  });

  const interviewerWorkload: InterviewerWorkloadItem[] = Array.from(workloadMap.entries()).map(
    ([interviewerId, val]) => ({
      interviewerId,
      interviewerName: val.interviewerName,
      department: val.department,
      total: val.total,
      completed: val.completed,
      inProgress: val.inProgress,
    })
  );

  // 10. Compute Department Distribution
  const deptCounts: Record<string, { count: number; completed: number }> = {};
  filteredInterviews.forEach((i) => {
    const d = i.department_unit || 'General';
    if (!deptCounts[d]) deptCounts[d] = { count: 0, completed: 0 };
    deptCounts[d].count++;
    if (i.status === 'Completed') deptCounts[d].completed++;
  });

  const departmentDistribution = Object.entries(deptCounts).map(([department, val]) => ({
    department,
    count: val.count,
    completed: val.completed,
  }));

  // 11. Extract Synthesized Bottlenecks from real observations & contradictions in notes
  const synthesizedBottlenecks: SynthesizedBottleneck[] = [];

  filteredInterviews.forEach((i) => {
    const note = notesMap[i.id];
    if (note) {
      if (note.contradictions && note.contradictions.trim().length > 10) {
        synthesizedBottlenecks.push({
          id: `bot-con-${i.id}`,
          interviewId: i.id,
          department: i.department_unit,
          tier: i.tier,
          interviewee: i.interviewee_name,
          topic: 'Institutional Contradiction & Friction',
          content: note.contradictions.trim(),
          severity: 'high',
        });
      }
      if (note.observations && note.observations.trim().length > 15) {
        synthesizedBottlenecks.push({
          id: `bot-obs-${i.id}`,
          interviewId: i.id,
          department: i.department_unit,
          tier: i.tier,
          interviewee: i.interviewee_name,
          topic: 'Field Diagnostic Observation',
          content: note.observations.trim(),
          severity: 'medium',
        });
      }
    }
  });

  return {
    kpis: {
      totalInterviews,
      completedCount,
      inProgressCount,
      draftCount,
      completionRate,
    },
    tierData,
    maturityScores,
    quantitativeMetrics,
    interviewerWorkload,
    departmentDistribution,
    synthesizedBottlenecks,
    availableDepartments,
    availableInterviewers,
    filteredInterviews,
    lastRefreshedAt: new Date().toISOString(),
  };
}
