/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FakeProvider, ScriptedItem } from '../features/transcription/providers/types';
import { segmentReducer, initialSegmentState } from '../features/transcription/state/segmentReducer';
import { DeepgramSession } from '../features/transcription/providers/deepgram';

describe('Transcription Reconnect & Resync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('replays and re-syncs segments using FakeProvider across simulated connection cycles', async () => {
    const scriptPart1: ScriptedItem[] = [
      {
        type: 'interim',
        text: 'First',
        startMs: 0,
        endMs: 500,
        delayMs: 20,
      },
      {
        type: 'final',
        text: 'First question answered.',
        startMs: 0,
        endMs: 1500,
        delayMs: 40,
      },
    ];

    const provider = new FakeProvider(scriptPart1);
    const session = await provider.connect();

    let state = initialSegmentState;

    session.on('interim', (evt) => {
      state = segmentReducer(state, {
        type: 'SET_INTERIM',
        payload: {
          text: evt.text,
          startMs: evt.startMs,
          endMs: evt.endMs,
          speaker: evt.speaker,
        },
      });
    });

    session.on('final', (evt) => {
      state = segmentReducer(state, {
        type: 'APPEND_FINAL',
        payload: {
          transcriptId: 't-recon-1',
          text: evt.text,
          startTime: evt.startMs / 1000,
          endTime: evt.endMs / 1000,
        },
      });
    });

    session.sendAudio(new Int16Array(100));
    vi.advanceTimersByTime(200);

    expect(state.segments).toHaveLength(1);
    expect(state.segments[0].raw_text).toBe('First question answered.');
    expect(state.segments[0].seq).toBe(0);

    // Simulate connection drop and close
    session.close();

    // Re-connect second phase with overlapping / re-sent segment (common after reconnect)
    const scriptPart2: ScriptedItem[] = [
      // Duplicate of previous segment
      {
        type: 'final',
        text: 'First question answered.',
        startMs: 0,
        endMs: 1500,
        delayMs: 20,
      },
      // New segment after reconnect
      {
        type: 'final',
        text: 'Second question answered after reconnect.',
        startMs: 1600,
        endMs: 3200,
        delayMs: 40,
      },
    ];

    const session2 = await new FakeProvider(scriptPart2).connect();
    session2.on('final', (evt) => {
      state = segmentReducer(state, {
        type: 'APPEND_FINAL',
        payload: {
          transcriptId: 't-recon-1',
          text: evt.text,
          startTime: evt.startMs / 1000,
          endTime: evt.endMs / 1000,
        },
      });
    });

    session2.sendAudio(new Int16Array(100));
    vi.advanceTimersByTime(200);

    // The duplicate final was safely discarded; state contains exactly 2 unique segments ordered by sequence
    expect(state.segments).toHaveLength(2);
    expect(state.segments[0].raw_text).toBe('First question answered.');
    expect(state.segments[1].raw_text).toBe('Second question answered after reconnect.');
    expect(state.segments[0].seq).toBe(0);
    expect(state.segments[1].seq).toBe(1);

    session2.close();
  });

  it('DeepgramSession schedules reconnect with exponential backoff on unexpected close', async () => {
    let mockSocketInstance: any = null;

    class MockWebSocket {
      public readyState = 1;
      public binaryType = 'arraybuffer';
      public onopen: (() => void) | null = null;
      public onmessage: ((e: any) => void) | null = null;
      public onerror: ((e: any) => void) | null = null;
      public onclose: (() => void) | null = null;
      public send = vi.fn();
      public close = vi.fn();

      constructor(_url: string, _protocols?: string[]) {
        mockSocketInstance = this;
        setTimeout(() => {
          if (this.onopen) this.onopen();
        }, 10);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = MockWebSocket;

    const session = new DeepgramSession({
      token: 'test-token',
      endpoint: 'wss://api.deepgram.com/v1/listen',
      reconnectBaseDelayMs: 1000,
      maxReconnectDelayMs: 30000,
    });

    await session.init();
    vi.advanceTimersByTime(20);

    expect(session.getReconnectAttempt()).toBe(0);

    // Simulate unexpected drop
    if (mockSocketInstance?.onclose) {
      mockSocketInstance.onclose();
    }

    // Reconnect attempt incremented to 1 (1000ms backoff)
    expect(session.getReconnectAttempt()).toBe(1);

    // Advance 1000ms to trigger reconnect
    vi.advanceTimersByTime(1050);

    // Next drop -> attempt 2 (2000ms backoff)
    if (mockSocketInstance?.onclose) {
      mockSocketInstance.onclose();
    }
    expect(session.getReconnectAttempt()).toBe(2);

    // Clean close stops reconnection
    session.close();
  });
});
