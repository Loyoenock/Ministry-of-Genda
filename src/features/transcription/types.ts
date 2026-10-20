/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TranscriptStatus = 'idle' | 'recording' | 'stopped' | 'completed' | 'failed';

export type LiveTranscriptionStatus =
  | 'idle'
  | 'consent'
  | 'connecting'
  | 'recording'
  | 'paused'
  | 'reconnecting'
  | 'stopping'
  | 'completed'
  | 'failed';

export interface InterviewTranscript {
  id: string;
  interview_id: string;
  status: TranscriptStatus;
  consent_confirmed_at: string | null;
  consent_by?: string | null;
  session_duration_seconds: number;
  language_code: string;
  metadata?: Record<string, unknown>;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  id: string;
  transcript_id: string;
  seq: number;
  start_time: number;
  end_time: number;
  raw_text: string;
  edited_text?: string | null;
  speaker_label: string;
  confidence?: number | null;
  is_final: boolean;
  question_id?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}
