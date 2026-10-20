/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../../lib/supabase';
import { InterviewTranscript } from '../types';
import { ConsentMissing } from './getToken';

export interface CreateSessionOptions {
  interviewId: string;
  language?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: any;
}

/**
 * Creates an interview_transcripts database record with verified consent.
 *
 * Guardrail Enforcement:
 * - consent_confirmed_at and consent_by are explicitly set upon user confirmation.
 * - The database BEFORE INSERT trigger on transcript_segments requires consent_confirmed_at IS NOT NULL.
 */
export async function createTranscriptSession(
  interviewId: string,
  language = 'en-UG',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any = supabase
): Promise<InterviewTranscript> {
  if (!interviewId) {
    throw new Error('interviewId is required to create a transcription session');
  }

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData?.user) {
    throw new ConsentMissing('Authenticated interviewer session required to confirm consent');
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from('interview_transcripts')
    .insert({
      interview_id: interviewId,
      status: 'idle',
      consent_confirmed_at: nowIso,
      consent_by: authData.user.id,
      session_duration_seconds: 0,
      language_code: language,
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create transcript record: ${error.message}`);
  }

  return data as InterviewTranscript;
}
