/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTranscriptionToken,
  ConsentMissing,
  InterviewLocked,
  RateLimited,
  ProviderUnavailable,
  TranscriptionTokenError,
} from '../features/transcription/api/getToken';
import { FakeProvider, ScriptedItem, TranscriptionEvent } from '../features/transcription/providers/types';
import { supabase } from '../lib/supabase';

// Mock supabase.functions.invoke
vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Live Transcription Token Minting & Client Wrapper', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let consoleInfoSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  it('successfully obtains an ephemeral transcription token with valid TTL and endpoint', async () => {
    const mockToken = 'mocked-ephemeral-jwt-token-998877';
    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: {
        token: mockToken,
        expires_at: expiresAt,
        provider: 'deepgram',
        endpoint: 'wss://api.deepgram.com/v1/listen',
        transcript_id: 'transcript-uuid-1',
      },
      error: null,
    });

    const result = await getTranscriptionToken({
      interviewId: 'interview-uuid-1',
      transcriptId: 'transcript-uuid-1',
    });

    expect(result).toEqual({
      token: mockToken,
      expiresAt,
      provider: 'deepgram',
      endpoint: 'wss://api.deepgram.com/v1/listen',
      transcriptId: 'transcript-uuid-1',
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('transcription-token', {
      body: {
        interview_id: 'interview-uuid-1',
        transcript_id: 'transcript-uuid-1',
      },
    });
  });

  it('rejects with ConsentMissing when session consent has not been confirmed', async () => {
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Transcription consent has not been confirmed for this session',
        status: 403,
        context: {
          json: {
            error: 'Transcription consent has not been confirmed for this session',
            code: 'CONSENT_MISSING',
          },
        },
      },
    });

    await expect(
      getTranscriptionToken({
        interviewId: 'interview-uuid-1',
        transcriptId: 'transcript-uuid-unconsented',
      })
    ).rejects.toThrow(ConsentMissing);
  });

  it('rejects with InterviewLocked when interview is Completed and caller is not admin', async () => {
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Interview is completed and locked from live transcription',
        status: 403,
        context: {
          json: {
            error: 'Interview is completed and locked from live transcription',
            code: 'INTERVIEW_LOCKED',
          },
        },
      },
    });

    await expect(
      getTranscriptionToken({
        interviewId: 'interview-uuid-completed',
        transcriptId: 'transcript-uuid-1',
      })
    ).rejects.toThrow(InterviewLocked);
  });

  it('rejects with RateLimited when rate limit of 10 tokens/min is exceeded', async () => {
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Rate limit exceeded: maximum 10 tokens per minute',
        status: 429,
        context: {
          json: {
            error: 'Rate limit exceeded: maximum 10 tokens per minute',
            code: 'RATE_LIMITED',
          },
        },
      },
    });

    await expect(
      getTranscriptionToken({
        interviewId: 'interview-uuid-1',
        transcriptId: 'transcript-uuid-1',
      })
    ).rejects.toThrow(RateLimited);
  });

  it('rejects with ProviderUnavailable when transcription provider credentials or flags are missing', async () => {
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Transcription provider service unavailable or unconfigured',
        status: 503,
        context: {
          json: {
            error: 'Transcription provider service unavailable or unconfigured',
            code: 'PROVIDER_UNAVAILABLE',
          },
        },
      },
    });

    await expect(
      getTranscriptionToken({
        interviewId: 'interview-uuid-1',
        transcriptId: 'transcript-uuid-1',
      })
    ).rejects.toThrow(ProviderUnavailable);
  });

  it('rejects with TranscriptionTokenError when Edge function returns an empty payload', async () => {
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(
      getTranscriptionToken({
        interviewId: 'interview-uuid-1',
        transcriptId: 'transcript-uuid-1',
      })
    ).rejects.toThrow(TranscriptionTokenError);
  });

  it('rejects missing parameters before network invocation', async () => {
    await expect(
      getTranscriptionToken({ interviewId: '', transcriptId: 'transcript-uuid-1' })
    ).rejects.toThrow(TranscriptionTokenError);

    await expect(
      getTranscriptionToken({ interviewId: 'interview-uuid-1', transcriptId: '' })
    ).rejects.toThrow(TranscriptionTokenError);

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('CRITICAL AUDIT: verifies that no secret, token, or auth credential is ever logged to console', async () => {
    const sensitiveToken = 'super-secret-transcription-bearer-token-xyz-987';
    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: {
        token: sensitiveToken,
        expires_at: expiresAt,
        provider: 'deepgram',
        endpoint: 'wss://api.deepgram.com/v1/listen',
        transcript_id: 'transcript-uuid-1',
      },
      error: null,
    });

    const result = await getTranscriptionToken({
      interviewId: 'interview-uuid-1',
      transcriptId: 'transcript-uuid-1',
    });

    expect(result.token).toBe(sensitiveToken);

    // Verify all console calls do not contain the sensitive token
    const allConsoleCalls = [
      ...consoleLogSpy.mock.calls,
      ...consoleWarnSpy.mock.calls,
      ...consoleErrorSpy.mock.calls,
      ...consoleInfoSpy.mock.calls,
    ];

    for (const callArgs of allConsoleCalls) {
      const serialized = JSON.stringify(callArgs);
      expect(serialized).not.toContain(sensitiveToken);
      expect(serialized).not.toContain('super-secret');
    }
  });
});

describe('FakeProvider & Session Adapter Implementation', () => {
  it('connects and replays scripted transcription sequence upon sending audio', async () => {
    const script: ScriptedItem[] = [
      {
        type: 'interim',
        text: 'Interim text chunk',
        startMs: 0,
        endMs: 500,
        delayMs: 10,
      },
      {
        type: 'final',
        text: 'Finalized spoken utterance for diagnostic note.',
        startMs: 0,
        endMs: 1200,
        delayMs: 20,
      },
    ];

    const provider = new FakeProvider(script);
    const session = await provider.connect();

    const interimEvents: TranscriptionEvent[] = [];
    const finalEvents: TranscriptionEvent[] = [];
    let closed = false;

    session.on('interim', (e) => interimEvents.push(e));
    session.on('final', (e) => finalEvents.push(e));
    session.on('close', () => {
      closed = true;
    });

    // Send audio chunk (PCM 16-bit)
    const audioChunk = new Int16Array(1024);
    session.sendAudio(audioChunk);

    // Wait for events to replay
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(interimEvents.length).toBe(1);
    expect(interimEvents[0].text).toBe('Interim text chunk');

    expect(finalEvents.length).toBe(1);
    expect(finalEvents[0].text).toBe('Finalized spoken utterance for diagnostic note.');

    session.close();
    expect(closed).toBe(true);
  });

  it('emits error if audio is sent to a closed session', async () => {
    const provider = new FakeProvider([]);
    const session = await provider.connect();

    let capturedError: Error | null = null;
    session.on('error', (err) => {
      capturedError = err;
    });

    session.close();
    session.sendAudio(new Int16Array(512));

    expect(capturedError).not.toBeNull();
    expect(capturedError?.message).toContain('closed session');
  });
});
