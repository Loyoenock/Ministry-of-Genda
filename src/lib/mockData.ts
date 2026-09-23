/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, DocumentItem, InterviewerNote } from '../types';
import { STATUTORY_DOCUMENTS_CATALOGUE } from './questionsData';

export const INITIAL_CURRENT_USER: UserProfile = {
  id: 'usr-john-okello-001',
  email: 'john.okello@mglsd.go.ug',
  full_name: 'John Okello',
  role: 'interviewer',
  department_unit: 'Labour Directorate – TRANSFORMATIVE Programme',
  phone_number: '+256 772 458 912',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

export const ADMIN_USER: UserProfile = {
  id: 'usr-admin-florence-002',
  email: 'florence.nsubuga@mglsd.go.ug',
  full_name: 'Florence Nsubuga',
  role: 'admin',
  department_unit: 'Policy, Planning & Modernisation Secretariat',
  phone_number: '+256 701 889 344',
  avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
};

/**
 * Initializes a clean statutory document checklist structure for a new interview.
 * All items default to Unknown/Pending with no mock files or text.
 */
export function createInitialChecklist(interviewId: string): DocumentItem[] {
  return STATUTORY_DOCUMENTS_CATALOGUE.map((doc) => ({
    id: `doc-${interviewId}-${doc.item_number}`,
    interview_id: interviewId,
    item_number: doc.item_number,
    document_title: doc.document_title,
    category: doc.category,
    exists_status: 'Unknown',
    collected_status: 'Pending',
    notes: '',
    follow_up_action: '',
    file_name: undefined,
    file_url: undefined,
  }));
}

/**
 * Initializes a clean notes structure for a new interview.
 */
export function createInitialNotes(interviewId: string): InterviewerNote {
  return {
    id: `note-${interviewId}`,
    interview_id: interviewId,
    observations: '',
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
    contradictions: '',
    documents_collected_summary: '',
    follow_ups: '',
    maturity_signals: {
      governance_score: 3,
      technology_score: 2,
      process_score: 2,
      people_skills_score: 3,
      data_reporting_score: 2,
      justification: '',
    },
    updated_at: new Date().toISOString(),
  };
}
