/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'interviewer' | 'admin';

export type InterviewTier = 'Leadership' | 'Management' | 'Frontline' | 'Support/IT';

export type InterviewStatus = 'Draft' | 'In Progress' | 'Completed';

export type ExistsStatus = 'Yes' | 'No' | 'Partial' | 'Unknown';

export type CollectedStatus = 'Collected' | 'Pending' | 'Refused' | 'N/A';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_unit: string;
  phone_number?: string;
  avatar_url?: string;
}

export interface Question {
  id: string; // e.g. 'A1', 'B3', 'C1a', 'W1'
  section_code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'W';
  section_title: string;
  question_text: string;
  who_to_ask: string;
  prompt_hints?: string;
  applicable_tiers: InterviewTier[];
  response_type: 'text' | 'structured' | 'composite';
  sort_order: number;
}

export interface Answer {
  id: string;
  interview_id: string;
  question_id: string;
  answer_text: string;
  structured_data?: Record<string, any>;
  is_flagged?: boolean;
  updated_at: string;
}

export interface DocumentItem {
  id: string;
  interview_id: string;
  item_number: number;
  document_title: string;
  category: string;
  exists_status: ExistsStatus;
  collected_status: CollectedStatus;
  notes: string;
  follow_up_action: string;
  file_url?: string;
  file_name?: string;
}

export interface NumbersCaptured {
  total_staff: number | null;
  labour_officers_count: number | null;
  annual_inspections: number | null;
  disputes_logged: number | null;
  disputes_resolved: number | null;
  budget_allocated_ugx: string | null;
  budget_released_pct: number | null;
  backlog_cases: number | null;
}

export interface MaturitySignals {
  governance_score: number; // 1 to 5
  technology_score: number; // 1 to 5
  process_score: number; // 1 to 5
  people_skills_score: number; // 1 to 5
  data_reporting_score: number; // 1 to 5
  justification: string;
}

export interface InterviewerNote {
  id: string;
  interview_id: string;
  observations: string;
  numbers_captured: NumbersCaptured;
  contradictions: string;
  documents_collected_summary: string;
  follow_ups: string;
  maturity_signals: MaturitySignals;
  updated_at: string;
}

export interface Interview {
  id: string;
  interviewee_name: string;
  role_title: string;
  department_unit: string;
  years_in_role: number;
  interview_date: string; // e.g. '2025-09-16' or formatted
  interview_time: string; // e.g. '10:15 AM'
  location: string;
  interviewer_id: string;
  interviewer_name: string;
  tier: InterviewTier;
  status: InterviewStatus;
  duration_min: number;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface RecentActivityItem {
  id: string;
  description: string;
  timestamp: string;
  type: 'completed' | 'started' | 'document' | 'updated';
  interviewee?: string;
  organisation?: string;
}
