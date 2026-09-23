/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured, Database } from './supabase';
import {
  Interview,
  Answer,
  DocumentItem,
  InterviewerNote,
  InterviewTier,
  InterviewStatus,
} from '../types';
import { STATUTORY_DOCUMENTS_CATALOGUE } from './questionsData';
import { createInitialNotes } from './mockData';

export {
  fetchQuestionsFromSupabase,
  mapRowToQuestion,
  getCachedOrFallbackQuestions,
  updateQuestionsCache,
  clearQuestionsCache,
} from './questionsService';

export const isUuid = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

export const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Maps raw database row from public.interviews to frontend Interview model
 */
export function mapRowToInterview(row: any): Interview {
  return {
    id: row.id,
    interviewee_name: row.interviewee_name,
    role_title: row.role_title,
    department_unit: row.department_unit,
    years_in_role: Number(row.years_in_role) || 1.0,
    interview_date: row.interview_date,
    interview_time: row.interview_time || '10:00 AM',
    location: row.location || 'Ministry Headquarters, Kampala',
    interviewer_id: row.interviewer_id,
    interviewer_name: row.profiles?.full_name || row.interviewer_name || 'Assigned Officer',
    tier: row.tier as InterviewTier,
    status: row.status as InterviewStatus,
    duration_min: Number(row.duration_min) || 60,
    completion_percentage: Number(row.completion_percentage) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Maps raw database row from public.documents_checklist to DocumentItem
 */
export function mapRowToDocumentItem(row: any): DocumentItem {
  let fileName: string | undefined = undefined;
  if (row.file_url) {
    const cleanUrl = row.file_url.split('?')[0];
    const rawName = cleanUrl.split('/').pop() || '';
    // Strip leading item number and timestamp or demo prefix
    // e.g. "1_1726578912345_OSH_Act.pdf" -> "OSH_Act.pdf"
    fileName = rawName.replace(/^(\d+_\d+_|\d+_|#demo-|#)/, '') || row.file_url;
  }

  return {
    id: row.id,
    interview_id: row.interview_id,
    item_number: row.item_number,
    document_title: row.document_title,
    category: row.category,
    exists_status: row.exists_status as any,
    collected_status: row.collected_status as any,
    notes: row.notes || '',
    follow_up_action: row.follow_up_action || '',
    file_url: row.file_url || undefined,
    file_name: fileName,
    storage_path: row.file_url || undefined,
  };
}

/**
 * Maps raw database row from public.interviewer_notes to InterviewerNote
 */
export function mapRowToInterviewerNote(row: any): InterviewerNote {
  return {
    id: row.id,
    interview_id: row.interview_id,
    observations: row.observations || '',
    numbers_captured: row.numbers_captured || {
      total_staff: null,
      labour_officers_count: null,
      annual_inspections: null,
      disputes_logged: null,
      disputes_resolved: null,
      budget_allocated_ugx: null,
      budget_released_pct: null,
      backlog_cases: null,
    },
    contradictions: row.contradictions || '',
    documents_collected_summary: row.documents_collected_summary || '',
    follow_ups: row.follow_ups || '',
    maturity_signals: row.maturity_signals || {
      governance_score: 3,
      technology_score: 2,
      process_score: 2,
      people_skills_score: 3,
      data_reporting_score: 2,
      justification: '',
    },
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Maps raw database row from public.answers to Answer
 */
export function mapRowToAnswer(row: any): Answer {
  return {
    id: row.id,
    interview_id: row.interview_id,
    question_id: row.question_id,
    answer_text: row.answer_text || '',
    structured_data: row.structured_data || undefined,
    is_flagged: Boolean(row.is_flagged),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Fetch interviews from Supabase with RLS:
 * Interviewers only see their own interviews, Admins see all.
 */
export async function fetchInterviewsFromSupabase(
  userId?: string,
  isAdmin: boolean = false
): Promise<Interview[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    let query = supabase
      .from('interviews')
      .select('*, profiles:interviewer_id(full_name)')
      .order('created_at', { ascending: false });

    // Client-side guard aligned with RLS
    if (!isAdmin && userId && isUuid(userId)) {
      query = query.eq('interviewer_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase fetch interviews notice:', error.message);
      return [];
    }

    return (data || []).map(mapRowToInterview);
  } catch (err) {
    console.warn('Error fetching interviews from Supabase:', err);
    return [];
  }
}

/**
 * Fetch all interviews globally (for Admin analytics or count)
 */
export async function fetchAllInterviewsGlobalFromSupabase(): Promise<Interview[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('*, profiles:interviewer_id(full_name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase global interviews fetch notice:', error.message);
      return [];
    }

    return (data || []).map(mapRowToInterview);
  } catch (err) {
    console.warn('Error fetching global interviews from Supabase:', err);
    return [];
  }
}

/**
 * Insert a new interview into Supabase
 */
export async function insertInterviewToSupabase(interview: Interview): Promise<Interview | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const insertPayload = {
      id: interview.id,
      interviewee_name: interview.interviewee_name,
      role_title: interview.role_title,
      department_unit: interview.department_unit,
      years_in_role: interview.years_in_role,
      interview_date: interview.interview_date,
      interview_time: interview.interview_time,
      location: interview.location,
      interviewer_id: interview.interviewer_id,
      tier: interview.tier,
      status: interview.status,
      duration_min: interview.duration_min,
      completion_percentage: interview.completion_percentage,
    };

    const { data, error } = await supabase
      .from('interviews')
      .insert([insertPayload])
      .select('*, profiles:interviewer_id(full_name)')
      .single();

    if (error) {
      console.warn('Supabase insert interview notice:', error.message);
      return null;
    }

    return mapRowToInterview(data);
  } catch (err) {
    console.warn('Error inserting interview to Supabase:', err);
    return null;
  }
}

/**
 * Update an interview in Supabase
 */
export async function updateInterviewInSupabase(
  id: string,
  updates: Partial<Interview>
): Promise<void> {
  if (!isSupabaseConfigured || !isUuid(id)) return;

  try {
    const dbUpdates: Database['public']['Tables']['interviews']['Update'] = {};
    if (updates.interviewee_name !== undefined) dbUpdates.interviewee_name = updates.interviewee_name;
    if (updates.role_title !== undefined) dbUpdates.role_title = updates.role_title;
    if (updates.department_unit !== undefined) dbUpdates.department_unit = updates.department_unit;
    if (updates.years_in_role !== undefined) dbUpdates.years_in_role = updates.years_in_role;
    if (updates.interview_date !== undefined) dbUpdates.interview_date = updates.interview_date;
    if (updates.interview_time !== undefined) dbUpdates.interview_time = updates.interview_time;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.tier !== undefined) dbUpdates.tier = updates.tier;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.duration_min !== undefined) dbUpdates.duration_min = updates.duration_min;
    if (updates.completion_percentage !== undefined)
      dbUpdates.completion_percentage = updates.completion_percentage;

    const { error } = await supabase.from('interviews').update(dbUpdates).eq('id', id);

    if (error) {
      console.warn('Supabase update interview notice:', error.message);
    }
  } catch (err) {
    console.warn('Error updating interview in Supabase:', err);
  }
}

/**
 * Delete an interview from Supabase (Draft by interviewer or any by admin)
 */
export async function deleteInterviewFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !isUuid(id)) return false;

  try {
    const { error } = await supabase.from('interviews').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete interview notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting interview from Supabase:', err);
    return false;
  }
}

/**
 * Completes an interview in Supabase, marking status as Completed and updating completion percentage
 */
export async function completeInterviewInSupabase(
  id: string,
  completionPercentage: number
): Promise<void> {
  if (!isSupabaseConfigured || !isUuid(id)) return;

  const { error } = await supabase
    .from('interviews')
    .update({
      status: 'Completed',
      completion_percentage: Math.min(100, Math.max(0, completionPercentage)),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to complete interview in database: ${error.message}`);
  }
}

/**
 * Remove local storage entries for an interview in demo mode or offline cache
 */
export function removeDemoStorageEntriesForInterview(interviewId: string): void {
  try {
    // 1. Remove from mglsd_interviews
    const savedInterviews = localStorage.getItem('mglsd_interviews');
    if (savedInterviews) {
      const parsed = JSON.parse(savedInterviews);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((it: any) => it.id !== interviewId);
        localStorage.setItem('mglsd_interviews', JSON.stringify(filtered));
      }
    }

    // 2. Remove from mglsd_answers
    const savedAnswers = localStorage.getItem('mglsd_answers');
    if (savedAnswers) {
      const parsed = JSON.parse(savedAnswers);
      if (parsed && typeof parsed === 'object') {
        delete parsed[interviewId];
        localStorage.setItem('mglsd_answers', JSON.stringify(parsed));
      }
    }

    // 3. Remove from mglsd_checklists
    const savedChecklists = localStorage.getItem('mglsd_checklists');
    if (savedChecklists) {
      const parsed = JSON.parse(savedChecklists);
      if (parsed && typeof parsed === 'object') {
        delete parsed[interviewId];
        localStorage.setItem('mglsd_checklists', JSON.stringify(parsed));
      }
    }

    // 4. Remove from mglsd_notes
    const savedNotes = localStorage.getItem('mglsd_notes');
    if (savedNotes) {
      const parsed = JSON.parse(savedNotes);
      if (parsed && typeof parsed === 'object') {
        delete parsed[interviewId];
        localStorage.setItem('mglsd_notes', JSON.stringify(parsed));
      }
    }
  } catch (err) {
    console.warn('Notice: Error clearing demo localStorage entries:', err);
  }
}

/**
 * Fetch answers for a given interview
 */
export async function fetchAnswersFromSupabase(interviewId: string): Promise<Answer[]> {
  if (!isSupabaseConfigured || !isUuid(interviewId)) return [];

  try {
    const { data, error } = await supabase
      .from('answers')
      .select('*')
      .eq('interview_id', interviewId);

    if (error) {
      console.warn('Supabase fetch answers notice:', error.message);
      return [];
    }

    return (data || []).map(mapRowToAnswer);
  } catch (err) {
    console.warn('Error fetching answers from Supabase:', err);
    return [];
  }
}

/**
 * Upsert an answer for an interview question
 */
export async function upsertAnswerInSupabase(
  interviewId: string,
  questionId: string,
  text: string,
  structuredData?: Record<string, any>,
  updatedBy?: string
): Promise<Answer | null> {
  if (!isSupabaseConfigured || !isUuid(interviewId)) return null;

  try {
    const payload: any = {
      interview_id: interviewId,
      question_id: questionId,
      answer_text: text,
      structured_data: structuredData || {},
      updated_at: new Date().toISOString(),
    };

    if (updatedBy && isUuid(updatedBy)) {
      payload.updated_by = updatedBy;
    }

    const { data, error } = await supabase
      .from('answers')
      .upsert(payload, { onConflict: 'interview_id,question_id' })
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase upsert answer notice:', error.message);
      return null;
    }

    return mapRowToAnswer(data);
  } catch (err) {
    console.warn('Error upserting answer in Supabase:', err);
    return null;
  }
}

/**
 * Fetch document checklist for an interview, auto-initializing default 20 statutory items if none exist
 */
export async function fetchOrInitChecklistFromSupabase(
  interviewId: string
): Promise<DocumentItem[]> {
  if (!isSupabaseConfigured || !isUuid(interviewId)) return [];

  try {
    const { data, error } = await supabase
      .from('documents_checklist')
      .select('*')
      .eq('interview_id', interviewId)
      .order('item_number', { ascending: true });

    if (error) {
      console.warn('Supabase fetch checklist notice:', error.message);
      return [];
    }

    if (data && data.length > 0) {
      return data.map(mapRowToDocumentItem);
    }

    // Auto-seed initial 20 statutory documents in DB if none found
    const initialRows = STATUTORY_DOCUMENTS_CATALOGUE.map((doc, idx) => ({
      interview_id: interviewId,
      item_number: doc.item_number,
      document_title: doc.document_title,
      category: doc.category,
      exists_status: idx < 5 ? 'Yes' : idx < 10 ? 'Partial' : 'Unknown',
      collected_status: idx < 3 ? 'Collected' : 'Pending',
      notes: idx === 0 ? 'Verified 2020-2025 strategic document from Registry.' : '',
      follow_up_action: idx >= 3 && idx < 6 ? 'Requested official copy from Commissioner OSH.' : '',
      file_url: null,
    }));

    const { data: insertedData, error: seedErr } = await supabase
      .from('documents_checklist')
      .insert(initialRows)
      .select('*')
      .order('item_number', { ascending: true });

    if (seedErr) {
      console.warn('Supabase seed checklist notice:', seedErr.message);
      return [];
    }

    return (insertedData || []).map(mapRowToDocumentItem);
  } catch (err) {
    console.warn('Error fetching or initializing checklist in Supabase:', err);
    return [];
  }
}

/**
 * Update a specific checklist item
 */
export async function updateChecklistItemInSupabase(
  interviewId: string,
  itemNumber: number,
  updates: Partial<DocumentItem>
): Promise<void> {
  if (!isSupabaseConfigured || !isUuid(interviewId)) return;

  try {
    const dbUpdates: Database['public']['Tables']['documents_checklist']['Update'] = {
      updated_at: new Date().toISOString(),
    };
    if (updates.exists_status !== undefined) dbUpdates.exists_status = updates.exists_status;
    if (updates.collected_status !== undefined) dbUpdates.collected_status = updates.collected_status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.follow_up_action !== undefined) dbUpdates.follow_up_action = updates.follow_up_action;
    if (updates.file_url !== undefined) dbUpdates.file_url = updates.file_url;

    const { error } = await supabase
      .from('documents_checklist')
      .update(dbUpdates)
      .eq('interview_id', interviewId)
      .eq('item_number', itemNumber);

    if (error) {
      console.warn('Supabase update checklist item notice:', error.message);
    }
  } catch (err) {
    console.warn('Error updating checklist item in Supabase:', err);
  }
}

/**
 * Fetch or initialize interviewer post-interview notes
 */
export async function fetchOrInitNotesFromSupabase(
  interviewId: string
): Promise<InterviewerNote | null> {
  if (!isSupabaseConfigured || !isUuid(interviewId)) return null;

  try {
    const { data, error } = await supabase
      .from('interviewer_notes')
      .select('*')
      .eq('interview_id', interviewId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch notes notice:', error.message);
      return null;
    }

    if (data) {
      return mapRowToInterviewerNote(data);
    }

    // Insert default initial note
    const defaultNote = createInitialNotes(interviewId);
    const insertPayload = {
      interview_id: interviewId,
      observations: defaultNote.observations,
      numbers_captured: defaultNote.numbers_captured,
      contradictions: defaultNote.contradictions,
      documents_collected_summary: defaultNote.documents_collected_summary,
      follow_ups: defaultNote.follow_ups,
      maturity_signals: defaultNote.maturity_signals,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('interviewer_notes')
      .insert([insertPayload])
      .select('*')
      .single();

    if (insertErr) {
      console.warn('Supabase create initial notes notice:', insertErr.message);
      return defaultNote;
    }

    return mapRowToInterviewerNote(inserted);
  } catch (err) {
    console.warn('Error fetching or initializing notes in Supabase:', err);
    return null;
  }
}

/**
 * Upsert or update interviewer notes in Supabase
 */
export async function saveNotesToSupabase(
  interviewId: string,
  updates: Partial<InterviewerNote>
): Promise<void> {
  if (!isSupabaseConfigured || !isUuid(interviewId)) return;

  try {
    const payload: Database['public']['Tables']['interviewer_notes']['Insert'] = {
      interview_id: interviewId,
      updated_at: new Date().toISOString(),
    };

    if (updates.observations !== undefined) payload.observations = updates.observations;
    if (updates.numbers_captured !== undefined) payload.numbers_captured = updates.numbers_captured;
    if (updates.contradictions !== undefined) payload.contradictions = updates.contradictions;
    if (updates.documents_collected_summary !== undefined)
      payload.documents_collected_summary = updates.documents_collected_summary;
    if (updates.follow_ups !== undefined) payload.follow_ups = updates.follow_ups;
    if (updates.maturity_signals !== undefined) payload.maturity_signals = updates.maturity_signals;

    const { error } = await supabase
      .from('interviewer_notes')
      .upsert(payload, { onConflict: 'interview_id' });

    if (error) {
      console.warn('Supabase save notes notice:', error.message);
      throw new Error(`Failed to save notes: ${error.message}`);
    }
  } catch (err) {
    console.warn('Error saving notes to Supabase:', err);
    throw err;
  }
}

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export const MAX_DOCUMENT_SIZE_BYTES = 52428800; // 50MB storage quota per file

/**
 * Validates file size and format before attempting upload
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Upload failed: File exceeds the 50MB maximum size limit allowed by the Directorate repository.',
    };
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];
  const isMimeAllowed = file.type ? ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type) : false;
  const isExtAllowed = allowedExtensions.includes(fileExt);

  if (!isMimeAllowed && !isExtAllowed) {
    return {
      valid: false,
      error: 'Upload failed: Unsupported file format. Please upload a PDF, Word document (DOC/DOCX), Excel spreadsheet (XLS/XLSX), or image (PNG/JPEG/WEBP).',
    };
  }

  return { valid: true };
}

/**
 * Maps Supabase Storage and Postgres error codes to clear, accessible user messages
 */
export function parseStorageError(error: any): string {
  if (!error) return 'An unknown storage error occurred.';
  const message = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
  const status = error.statusCode || error.status || (error as any).code;

  if (
    status === 403 ||
    status === '403' ||
    /permission denied|row-level security|violates row-level|unauthorized|access denied/i.test(message)
  ) {
    return 'Upload failed: Access denied by security policy. You do not have permission to attach documents to this interview.';
  }

  if (
    status === 413 ||
    status === '413' ||
    /payload too large|file size|exceeded|quota/i.test(message)
  ) {
    return 'Upload failed: File exceeds the 50MB maximum size limit allowed by the Directorate repository.';
  }

  if (
    status === 415 ||
    /mime type|invalid format|unsupported|not allowed/i.test(message)
  ) {
    return 'Upload failed: Unsupported file format. Please upload a PDF, Word document (DOC/DOCX), Excel spreadsheet (XLS/XLSX), or image (PNG/JPEG/WEBP).';
  }

  if (/network|failed to fetch|offline|timeout|abort|connection/i.test(message)) {
    return 'Upload failed: Network connection error. Unable to reach Supabase storage. Please check your connection and retry.';
  }

  return `Upload failed: ${message}`;
}

/**
 * Real file upload to Supabase Storage:
 * a. Uploads the binary to storage path: {interview_id}/{item_number}_{timestamp}_{filename}
 * b. Inserts a row into public.interview_files
 * c. Updates documents_checklist.file_url
 * d. Returns a usable signed URL (1-hour expiry) and storage path
 */
export async function uploadFileToSupabaseStorage(
  interviewId: string,
  itemNumber: number,
  file: File,
  uploadedByUserId?: string
): Promise<{ storagePath: string; url: string; fileName: string }> {
  // Pre-upload validation
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${interviewId}/${itemNumber}_${timestamp}_${sanitizedName}`;

  if (!isSupabaseConfigured) {
    return {
      storagePath,
      url: `#demo-${file.name}`,
      fileName: file.name,
    };
  }

  // 1. Upload to Supabase Storage bucket 'interview-documents'
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('interview-documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadErr) {
    const userMsg = parseStorageError(uploadErr);
    console.error('Supabase storage upload error:', uploadErr);
    throw new Error(userMsg);
  }

  // 2. Generate a usable signed URL (1-hour expiry = 3600 seconds)
  let accessUrl = storagePath;
  const { data: signedUrlData, error: signErr } = await supabase.storage
    .from('interview-documents')
    .createSignedUrl(storagePath, 3600);

  if (!signErr && signedUrlData?.signedUrl) {
    accessUrl = signedUrlData.signedUrl;
  } else if (uploadData?.path) {
    accessUrl = uploadData.path;
  }

  // 3. Resolve user id for uploaded_by
  let effectiveUserId = uploadedByUserId;
  if (!effectiveUserId || !isUuid(effectiveUserId)) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) {
      effectiveUserId = authData.user.id;
    }
  }

  // 4. Insert row into public.interview_files
  if (effectiveUserId && isUuid(effectiveUserId) && isUuid(interviewId)) {
    let documentItemId: string | null = null;
    try {
      const { data: docRow } = await supabase
        .from('documents_checklist')
        .select('id')
        .eq('interview_id', interviewId)
        .eq('item_number', itemNumber)
        .maybeSingle();
      if (docRow?.id) {
        documentItemId = docRow.id;
      }
    } catch {
      // Non-blocking lookup
    }

    const { error: fileInsertErr } = await supabase.from('interview_files').insert([
      {
        interview_id: interviewId,
        document_item_id: documentItemId,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
        uploaded_by: effectiveUserId,
      },
    ]);

    if (fileInsertErr) {
      console.warn('Notice: public.interview_files insert returned:', fileInsertErr.message);
    }
  }

  // 5. Update public.documents_checklist.file_url in database
  if (isUuid(interviewId)) {
    try {
      await supabase
        .from('documents_checklist')
        .update({
          file_url: storagePath,
          collected_status: 'Collected',
          exists_status: 'Yes',
          updated_at: new Date().toISOString(),
        })
        .eq('interview_id', interviewId)
        .eq('item_number', itemNumber);
    } catch (checklistUpdateErr) {
      console.warn('Notice: updating documents_checklist table returned:', checklistUpdateErr);
    }
  }

  return {
    storagePath,
    url: accessUrl,
    fileName: file.name,
  };
}

/**
 * Generates a fresh signed URL (1-hour expiry = 3600 seconds) for private storage path or signed URL
 */
export async function getDocumentSignedUrl(
  fileUrlOrPath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (!fileUrlOrPath) {
    throw new Error('No document file path specified.');
  }

  if (fileUrlOrPath.startsWith('#demo-') || fileUrlOrPath.startsWith('#')) {
    return fileUrlOrPath;
  }

  if (!isSupabaseConfigured) {
    return fileUrlOrPath;
  }

  // Extract storage path if passed an existing signed/public URL
  let storagePath = fileUrlOrPath;
  if (fileUrlOrPath.includes('/interview-documents/')) {
    const afterBucket = fileUrlOrPath.split('/interview-documents/')[1];
    storagePath = decodeURIComponent(afterBucket.split('?')[0]);
  }

  try {
    const { data, error } = await supabase.storage
      .from('interview-documents')
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      const userMsg = parseStorageError(error || 'Failed to generate signed download link.');
      throw new Error(userMsg);
    }

    return data.signedUrl;
  } catch (err: any) {
    const userMsg = parseStorageError(err);
    throw new Error(userMsg);
  }
}
