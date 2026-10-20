/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../../lib/supabase';

export interface TranscriptionTokenResult {
  token: string;
  expiresAt: string;
  provider: string;
  endpoint: string;
  transcriptId: string;
}

export class TranscriptionTokenError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'TranscriptionTokenError';
  }
}

export class ConsentMissing extends TranscriptionTokenError {
  constructor(message = 'Transcription consent has not been confirmed for this session') {
    super(message, 'CONSENT_MISSING');
    this.name = 'ConsentMissing';
  }
}

export class InterviewLocked extends TranscriptionTokenError {
  constructor(message = 'Interview is completed and locked from live transcription') {
    super(message, 'INTERVIEW_LOCKED');
    this.name = 'InterviewLocked';
  }
}

export class RateLimited extends TranscriptionTokenError {
  constructor(message = 'Rate limit exceeded: maximum 10 tokens per minute') {
    super(message, 'RATE_LIMITED');
    this.name = 'RateLimited';
  }
}

export class ProviderUnavailable extends TranscriptionTokenError {
  constructor(message = 'Transcription provider service unavailable or unconfigured') {
    super(message, 'PROVIDER_UNAVAILABLE');
    this.name = 'ProviderUnavailable';
  }
}

export interface GetTranscriptionTokenParams {
  interviewId: string;
  transcriptId: string;
}

/**
 * Requests an ephemeral, scoped transcription token from the Edge Function.
 *
 * Enforces:
 * - Active authenticated session with caller JWT
 * - Consent timestamp verification
 * - Non-completed interview (or admin caller)
 * - Per-user rate limiting
 *
 * NOTE: Never logs returned tokens, credentials, or audio payloads.
 */
export async function getTranscriptionToken({
  interviewId,
  transcriptId,
}: GetTranscriptionTokenParams): Promise<TranscriptionTokenResult> {
  if (!interviewId || !transcriptId) {
    throw new TranscriptionTokenError('interviewId and transcriptId are required', 'BAD_REQUEST');
  }

  const { data, error } = await supabase.functions.invoke('transcription-token', {
    body: {
      interview_id: interviewId,
      transcript_id: transcriptId,
    },
  });

  if (error) {
    const errorBody = error?.context?.json || {};
    const errorCode = errorBody.code || (error as any).code || '';
    const errorMessage = errorBody.error || error.message || 'Failed to obtain transcription token';

    if (errorCode === 'CONSENT_MISSING' || errorMessage.includes('consent')) {
      throw new ConsentMissing(errorMessage);
    }
    if (errorCode === 'INTERVIEW_LOCKED' || errorMessage.includes('locked') || errorMessage.includes('completed')) {
      throw new InterviewLocked(errorMessage);
    }
    if (errorCode === 'RATE_LIMITED' || errorMessage.includes('Rate limit') || error.status === 429) {
      throw new RateLimited(errorMessage);
    }
    if (
      errorCode === 'PROVIDER_UNAVAILABLE' ||
      errorMessage.includes('unavailable') ||
      error.status === 503
    ) {
      throw new ProviderUnavailable(errorMessage);
    }

    throw new TranscriptionTokenError(errorMessage, errorCode || 'FUNCTION_ERROR');
  }

  if (!data?.token) {
    throw new TranscriptionTokenError('Edge function returned empty token payload', 'EMPTY_PAYLOAD');
  }

  return {
    token: data.token,
    expiresAt: data.expires_at,
    provider: data.provider,
    endpoint: data.endpoint,
    transcriptId: data.transcript_id || transcriptId,
  };
}
