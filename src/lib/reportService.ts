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

/**
 * Generates and triggers download of a complete diagnostic brief dossier document.
 */
export function generateDiagnosticBriefPdf(data: DiagnosticBriefData): void {
  const { interview, answers, checklist, notes, interviewerProfile, fetchedAt } = data;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Diagnostic Brief - ${interview.interviewee_name || interview.id}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Times New Roman', Georgia, serif; color: #0f172a; margin: 0; padding: 24px; line-height: 1.5; font-size: 12px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .coat-of-arms { width: 70px; height: 70px; object-fit: contain; margin-bottom: 6px; }
    .sub-title { font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
    .main-title { font-family: Arial, sans-serif; font-size: 16px; font-weight: 900; text-transform: uppercase; color: #020617; margin: 4px 0; }
    .programme-title { font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #134e4a; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-family: Arial, sans-serif; margin-bottom: 16px; }
    .section-heading { font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #020617; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px; }
    .scores-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; text-align: center; font-family: Arial, sans-serif; margin-bottom: 12px; }
    .score-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; }
    .score-val { font-size: 14px; font-weight: bold; color: #134e4a; display: block; margin-top: 2px; }
    .response-item { border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-bottom: 6px; }
    .q-text { font-weight: bold; font-family: Arial, sans-serif; color: #0f172a; margin-bottom: 2px; }
    .ans-text { font-style: italic; background: #f8fafc; padding: 6px 8px; border-radius: 4px; border: 1px solid #f1f5f9; color: #334155; }
    .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-family: Arial, sans-serif; font-size: 11px; margin-bottom: 12px; }
    .check-item { display: flex; justify-content: space-between; padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
    .status-badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 9px; }
    .status-collected { background: #d1fae5; color: #065f46; }
    .status-pending { background: #e2e8f0; color: #334155; }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px; padding-top: 16px; border-top: 2px solid #0f172a; font-family: Arial, sans-serif; }
    .sig-line { border-bottom: 1px solid #94a3b8; width: 180px; margin-top: 32px; margin-bottom: 4px; }
    .footer { text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="/Coat_of_arms_of_Uganda.svg" class="coat-of-arms" alt="Coat of Arms of Uganda">
    <div class="sub-title">The Republic of Uganda</div>
    <div class="main-title">Ministry of Gender, Labour and Social Development</div>
    <div class="programme-title">Labour Directorate • TRANSFORMATIVE Programme Diagnostic Brief</div>
    <div style="font-family: Arial, sans-serif; font-size: 10px; color: #64748b; margin-top: 2px;">
      Official Record of Field Evidence & Institutional Current-State Assessment • Verified Supabase Record
    </div>
  </div>

  <div class="meta-grid">
    <div>
      <div><strong>Interviewee:</strong> ${interview.interviewee_name || 'Not provided'}</div>
      <div><strong>Official Title:</strong> ${interview.role_title || 'Not provided'}</div>
      <div><strong>Department / Unit:</strong> ${interview.department_unit || 'Labour Directorate'}</div>
      <div><strong>Duty Location:</strong> ${interview.location || 'Headquarters, Kampala'}</div>
    </div>
    <div>
      <div><strong>Interview Tier:</strong> ${interview.tier}</div>
      <div><strong>Field Interviewer:</strong> ${interviewerProfile?.full_name || interview.interviewer_name || 'Assigned Officer'}</div>
      <div><strong>Session Date & Time:</strong> ${interview.interview_date || 'N/A'} at ${interview.interview_time || '10:00 AM'}</div>
      <div><strong>Dossier Status:</strong> ${interview.status} (${interview.completion_percentage}%)</div>
    </div>
  </div>

  <div class="section-heading">1. Institutional Maturity Diagnostic Scores (1 to 5)</div>
  <div class="scores-grid">
    <div class="score-card">
      <span style="color: #64748b; font-size: 10px;">Governance</span>
      <span class="score-val">${notes.maturity_signals?.governance_score ? `${notes.maturity_signals.governance_score}/5` : 'N/S'}</span>
    </div>
    <div class="score-card">
      <span style="color: #64748b; font-size: 10px;">IT & Systems</span>
      <span class="score-val">${notes.maturity_signals?.technology_score ? `${notes.maturity_signals.technology_score}/5` : 'N/S'}</span>
    </div>
    <div class="score-card">
      <span style="color: #64748b; font-size: 10px;">Workflows & SOPs</span>
      <span class="score-val">${notes.maturity_signals?.process_score ? `${notes.maturity_signals.process_score}/5` : 'N/S'}</span>
    </div>
    <div class="score-card">
      <span style="color: #64748b; font-size: 10px;">Staff Capabilities</span>
      <span class="score-val">${notes.maturity_signals?.people_skills_score ? `${notes.maturity_signals.people_skills_score}/5` : 'N/S'}</span>
    </div>
    <div class="score-card">
      <span style="color: #64748b; font-size: 10px;">Data & Reporting</span>
      <span class="score-val">${notes.maturity_signals?.data_reporting_score ? `${notes.maturity_signals.data_reporting_score}/5` : 'N/S'}</span>
    </div>
  </div>

  <div class="section-heading">2. Key Diagnostic Responses (${answers.length} Responses Logged)</div>
  <div>
    ${answers.length === 0 ? '<p style="font-style: italic; color: #64748b;">No questionnaire responses recorded in database.</p>' : answers.map(a => `
      <div class="response-item">
        <div class="q-text">[${a.question_id}] Response</div>
        <div class="ans-text">"${a.answer_text}"</div>
      </div>
    `).join('')}
  </div>

  <div class="section-heading">3. Statutory Supporting Evidence Status</div>
  <div class="checklist-grid">
    ${checklist.slice(0, 14).map(d => `
      <div class="check-item">
        <span>${d.item_number}. ${d.document_title}</span>
        <span class="status-badge ${d.collected_status === 'Collected' ? 'status-collected' : 'status-pending'}">${d.collected_status}</span>
      </div>
    `).join('')}
  </div>

  <div class="section-heading">4. Field Observations & Quantitative Baselines</div>
  <div style="font-family: Arial, sans-serif; font-size: 11px; margin-bottom: 8px;">
    <strong>Annual Inspections:</strong> ${notes.numbers_captured?.annual_inspections ?? 'N/A'} | 
    <strong>Disputes Logged:</strong> ${notes.numbers_captured?.disputes_logged ?? 'N/A'} | 
    <strong>Disputes Resolved:</strong> ${notes.numbers_captured?.disputes_resolved ?? 'N/A'} | 
    <strong>Unit Staff Count:</strong> ${notes.numbers_captured?.total_staff ?? 'N/A'}
  </div>
  ${notes.observations ? `<div style="margin-bottom: 6px;"><strong>Interviewer Qualitative Observations:</strong><br><span style="font-style: italic;">${notes.observations}</span></div>` : ''}
  ${notes.contradictions ? `<div><strong>Operational Friction / Contradictions:</strong><br><span style="font-style: italic;">${notes.contradictions}</span></div>` : ''}

  <div class="signature-grid">
    <div>
      <div><strong>Field Diagnostic Interviewer:</strong></div>
      <div class="sig-line"></div>
      <div><strong>${interviewerProfile?.full_name || interview.interviewer_name || 'Assigned Officer'}</strong></div>
      <div style="font-size: 10px; color: #64748b;">${interviewerProfile?.department_unit || 'MGLSD Labour Directorate'}</div>
    </div>
    <div>
      <div><strong>Interviewee Verification:</strong></div>
      <div class="sig-line"></div>
      <div><strong>${interview.interviewee_name || 'Interviewee'}</strong></div>
      <div style="font-size: 10px; color: #64748b;">${interview.role_title || 'Officer'}</div>
    </div>
  </div>

  <div class="footer">
    TRANSFORMATIVE Diagnostic Suite • System Timestamp: ${fetchedAt} • CONFIDENTIAL • FOR OFFICIAL GOVERNMENT USE ONLY
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `Diagnostic_Brief_${(interview.interviewee_name || interview.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
