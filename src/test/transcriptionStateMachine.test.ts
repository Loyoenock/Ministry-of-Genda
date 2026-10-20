/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  transitionStatus,
  VALID_TRANSITIONS,
} from '../features/transcription/state/TranscriptionProvider';
import { LiveTranscriptionStatus } from '../features/transcription/types';

describe('Transcription State Machine', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('allows valid normal lifecycle flow: idle -> consent -> connecting -> recording <-> paused -> stopping -> completed -> idle', () => {
    let status: LiveTranscriptionStatus = 'idle';

    status = transitionStatus(status, 'consent');
    expect(status).toBe('consent');

    status = transitionStatus(status, 'connecting');
    expect(status).toBe('connecting');

    status = transitionStatus(status, 'recording');
    expect(status).toBe('recording');

    // Pause & Resume
    status = transitionStatus(status, 'paused');
    expect(status).toBe('paused');

    status = transitionStatus(status, 'recording');
    expect(status).toBe('recording');

    // Stopping & Completed
    status = transitionStatus(status, 'stopping');
    expect(status).toBe('stopping');

    status = transitionStatus(status, 'completed');
    expect(status).toBe('completed');

    // Reset back to idle
    status = transitionStatus(status, 'idle');
    expect(status).toBe('idle');
  });

  it('allows failure branches from connecting, recording, paused, and stopping', () => {
    expect(transitionStatus('connecting', 'failed')).toBe('failed');
    expect(transitionStatus('recording', 'failed')).toBe('failed');
    expect(transitionStatus('paused', 'failed')).toBe('failed');
    expect(transitionStatus('stopping', 'failed')).toBe('failed');

    // Reset from failed
    expect(transitionStatus('failed', 'idle')).toBe('idle');
    expect(transitionStatus('failed', 'connecting')).toBe('connecting');
  });

  it('throws in DEV mode for illegal transitions', () => {
    process.env.NODE_ENV = 'development';

    // Direct jump from idle to recording without consent or connection
    expect(() => transitionStatus('idle', 'recording')).toThrowError(
      /Illegal transcription state transition: idle -> recording/
    );

    // Direct jump from completed to recording
    expect(() => transitionStatus('completed', 'recording')).toThrowError(
      /Illegal transcription state transition: completed -> recording/
    );

    // Cannot jump from paused directly to completed without stopping
    expect(() => transitionStatus('paused', 'completed')).toThrowError(
      /Illegal transcription state transition: paused -> completed/
    );

    // Cannot jump backwards from recording to consent
    expect(() => transitionStatus('recording', 'consent')).toThrowError(
      /Illegal transcription state transition: recording -> consent/
    );
  });

  it('no-ops safely in PRODUCTION mode for illegal transitions without throwing', () => {
    process.env.NODE_ENV = 'production';

    // In production, invalid transitions must no-op and preserve current state
    const current: LiveTranscriptionStatus = 'recording';
    const result = transitionStatus(current, 'consent');
    expect(result).toBe('recording');

    const completedStatus: LiveTranscriptionStatus = 'completed';
    const nextResult = transitionStatus(completedStatus, 'paused');
    expect(nextResult).toBe('completed');
  });

  it('covers all allowed transitions defined in VALID_TRANSITIONS map', () => {
    for (const [from, allowedList] of Object.entries(VALID_TRANSITIONS)) {
      for (const to of allowedList) {
        expect(transitionStatus(from as LiveTranscriptionStatus, to as LiveTranscriptionStatus)).toBe(to);
      }
    }
  });
});
