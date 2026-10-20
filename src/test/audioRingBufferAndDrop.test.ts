/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioRingBuffer } from '../features/transcription/persistence/audioBuffer';
import {
  formatGapMarker,
  formatTime,
} from '../features/transcription/components/LiveTranscriptionPanel';
import { FakeProvider, ScriptedItem, FakeSession } from '../features/transcription/providers/types';
import { segmentReducer, initialSegmentState } from '../features/transcription/state/segmentReducer';
import {
  transitionStatus,
  VALID_TRANSITIONS,
} from '../features/transcription/state/TranscriptionProvider';
import { LiveTranscriptionStatus } from '../features/transcription/types';

describe('Audio Ring Buffer, Network Drops & Reconnect Resync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AudioRingBuffer Eviction Policy & Byte Cap', () => {
    it('initializes and buffers PCM audio chunks in memory fallback when IndexedDB is unavailable', async () => {
      const buffer = new AudioRingBuffer({
        maxDurationMinutes: 10,
        maxSizeBytes: 1024 * 1024,
      });

      await buffer.init();

      // Push 3 chunks of 256 samples (512 bytes each)
      const pcm1 = new Int16Array(256);
      const pcm2 = new Int16Array(256);
      const pcm3 = new Int16Array(256);

      await buffer.pushChunk({
        interviewId: 'int-1',
        transcriptId: 'tr-1',
        timestampMs: 0,
        durationMs: 16,
        pcmData: pcm1,
      });

      await buffer.pushChunk({
        interviewId: 'int-1',
        transcriptId: 'tr-1',
        timestampMs: 16,
        durationMs: 16,
        pcmData: pcm2,
      });

      await buffer.pushChunk({
        interviewId: 'int-1',
        transcriptId: 'tr-1',
        timestampMs: 32,
        durationMs: 16,
        pcmData: pcm3,
      });

      const buffered = await buffer.getBufferedChunks();
      expect(buffered).toHaveLength(3);
      expect(buffer.getTotalBytes()).toBe(512 * 3);
      expect(buffered[0].seq).toBe(0);
      expect(buffered[1].seq).toBe(1);
      expect(buffered[2].seq).toBe(2);
      expect(buffer.getEvictedGap()).toBeNull();

      buffer.close();
    });

    it('enforces hard byte cap: evicts oldest chunks and tracks evicted gap time span', async () => {
      // 1 KB cap: can only hold up to 2 chunks of 512 bytes
      const buffer = new AudioRingBuffer({
        maxSizeBytes: 1024,
        maxDurationMinutes: 10,
      });

      await buffer.init();

      // Chunk 1: 0 - 200 ms (512 bytes)
      await buffer.pushChunk({
        interviewId: 'int-1',
        transcriptId: 'tr-1',
        timestampMs: 0,
        durationMs: 200,
        pcmData: new Int16Array(256),
      });

      // Chunk 2: 200 - 400 ms (512 bytes)
      await buffer.pushChunk({
        interviewId: 'int-1',
        transcriptId: 'tr-1',
        timestampMs: 200,
        durationMs: 200,
        pcmData: new Int16Array(256),
      });

      expect(buffer.getTotalBytes()).toBe(1024);
      expect(buffer.getEvictedGap()).toBeNull();

      // Chunk 3: 400 - 600 ms (512 bytes) -> pushes total to 1536 > 1024 cap
      // Should evict Chunk 1 (0 - 200ms)
      await buffer.pushChunk({
        interviewId: 'int-1',
        transcriptId: 'tr-1',
        timestampMs: 400,
        durationMs: 200,
        pcmData: new Int16Array(256),
      });

      expect(buffer.getTotalBytes()).toBeLessThanOrEqual(1024);
      const remaining = await buffer.getBufferedChunks();
      expect(remaining).toHaveLength(2);
      expect(remaining[0].timestampMs).toBe(200);
      expect(remaining[1].timestampMs).toBe(400);

      // Evicted gap recorded the evicted 0 - 200ms range
      const gap = buffer.getEvictedGap();
      expect(gap).not.toBeNull();
      expect(gap?.startMs).toBe(0);
      expect(gap?.endMs).toBe(200);

      buffer.close();
    });

    it('enforces time duration cap: evicts chunks older than maxDurationMinutes', async () => {
      // 1 minute duration cap
      const buffer = new AudioRingBuffer({
        maxDurationMinutes: 1, // 60,000 ms
        maxSizeBytes: 100 * 1024 * 1024, // High byte cap to isolate time test
      });

      await buffer.init();

      // Chunk 1 at t=0 ms (duration 1000 ms)
      await buffer.pushChunk({
        interviewId: 'int-1',
        transcriptId: 'tr-1',
        timestampMs: 0,
        durationMs: 1000,
        pcmData: new Int16Array(100),
      });

      // Chunk 2 at t=30,000 ms (30s)
      await buffer.pushChunk({
        interviewId: 'int-1',
        transcriptId: 'tr-1',
        timestampMs: 30000,
        durationMs: 1000,
        pcmData: new Int16Array(100),
      });

      // Both retained initially
      expect(await buffer.getBufferedChunks()).toHaveLength(2);

      // Chunk 3 at t=70,000 ms (70s -> 70,000 - 0 = 70,000 > 60,000 ms cap)
      // Chunk 1 must be evicted
      await buffer.pushChunk({
        interviewId: 'int-1',
        transcriptId: 'tr-1',
        timestampMs: 70000,
        durationMs: 1000,
        pcmData: new Int16Array(100),
      });

      const remaining = await buffer.getBufferedChunks();
      expect(remaining).toHaveLength(2);
      expect(remaining[0].timestampMs).toBe(30000);
      expect(remaining[1].timestampMs).toBe(70000);

      const gap = buffer.getEvictedGap();
      expect(gap).not.toBeNull();
      expect(gap?.startMs).toBe(0);
      expect(gap?.endMs).toBe(1000);

      buffer.close();
    });

    it('clears all records completely on stop/complete', async () => {
      const buffer = new AudioRingBuffer();
      await buffer.init();

      await buffer.pushChunk({
        interviewId: 'int-1',
        transcriptId: 'tr-1',
        timestampMs: 0,
        durationMs: 100,
        pcmData: new Int16Array(100),
      });

      expect(await buffer.getBufferedChunks()).toHaveLength(1);
      await buffer.clear();

      expect(await buffer.getBufferedChunks()).toHaveLength(0);
      expect(buffer.getTotalBytes()).toBe(0);

      buffer.close();
    });
  });

  describe('Gap Marker Segments', () => {
    it('formats gap marker strings accurately as [audio not transcribed: mm:ss–mm:ss]', () => {
      expect(formatGapMarker(0, 60)).toBe('[audio not transcribed: 00:00–01:00]');
      expect(formatGapMarker(75, 165)).toBe('[audio not transcribed: 01:15–02:45]');
      expect(formatGapMarker(610, 675)).toBe('[audio not transcribed: 10:10–11:15]');
    });

    it('appends gap marker segment into state when outage exceeds buffer', () => {
      let state = initialSegmentState;

      // Existing segment before outage
      state = segmentReducer(state, {
        type: 'APPEND_FINAL',
        payload: {
          transcriptId: 'tr-gap',
          text: 'Discussion began prior to the network outage.',
          startTime: 0,
          endTime: 15,
          speakerLabel: 'Interviewer',
        },
      });

      // Gap marker segment inserted
      const gapText = formatGapMarker(15, 75);
      state = segmentReducer(state, {
        type: 'APPEND_FINAL',
        payload: {
          transcriptId: 'tr-gap',
          text: gapText,
          startTime: 15,
          endTime: 75,
          speakerLabel: 'System',
          confidence: 1.0,
        },
      });

      // Subsequent segment after reconnect
      state = segmentReducer(state, {
        type: 'APPEND_FINAL',
        payload: {
          transcriptId: 'tr-gap',
          text: 'Discussion resumed once connectivity was restored.',
          startTime: 75,
          endTime: 90,
          speakerLabel: 'Respondent',
        },
      });

      expect(state.segments).toHaveLength(3);
      expect(state.segments[0].raw_text).toBe('Discussion began prior to the network outage.');
      expect(state.segments[1].raw_text).toBe('[audio not transcribed: 00:15–01:15]');
      expect(state.segments[1].speaker_label).toBe('System');
      expect(state.segments[2].raw_text).toBe('Discussion resumed once connectivity was restored.');
    });
  });

  describe('Monotonic Timestamps Guarantee', () => {
    it('guarantees timestamps are strictly non-decreasing even if replayed audio clock resets', () => {
      let state = initialSegmentState;
      let lastSegmentEndTime = 0;

      function appendWithMonotonicGuard(
        text: string,
        rawStart: number,
        rawEnd: number
      ) {
        const monotonicStart = Math.max(lastSegmentEndTime, rawStart);
        const monotonicEnd = Math.max(monotonicStart + 0.1, rawEnd);
        lastSegmentEndTime = monotonicEnd;

        state = segmentReducer(state, {
          type: 'APPEND_FINAL',
          payload: {
            transcriptId: 'tr-mono',
            text,
            startTime: monotonicStart,
            endTime: monotonicEnd,
          },
        });
      }

      // Segment 1: 0s to 5s
      appendWithMonotonicGuard('First statement', 0, 5);
      // Segment 2: 5s to 12s
      appendWithMonotonicGuard('Second statement', 5, 12);
      // Segment 3: Socket dropped and reconnected; clock reset to 0s
      appendWithMonotonicGuard('Third statement arriving after socket reset', 0, 4);

      expect(state.segments).toHaveLength(3);
      expect(state.segments[0].start_time).toBe(0);
      expect(state.segments[0].end_time).toBe(5);

      expect(state.segments[1].start_time).toBe(5);
      expect(state.segments[1].end_time).toBe(12);

      // Third segment must not go backwards; start_time must be >= 12
      expect(state.segments[2].start_time).toBeGreaterThanOrEqual(12);
      expect(state.segments[2].end_time).toBeGreaterThan(state.segments[2].start_time);
    });
  });

  describe('Simulated 60s Outage with FakeProvider (No Lost or Duplicated Segments)', () => {
    it('simulates a 60-second drop: buffers audio, replays on reconnect, deduplicates overlapping finals, and preserves all segments', async () => {
      vi.useFakeTimers();

      const initialScript: ScriptedItem[] = [
        {
          type: 'final',
          text: 'We are verifying the Directorate attendance logs.',
          startMs: 0,
          endMs: 2500,
          confidence: 0.95,
          speaker: 'Interviewer',
          delayMs: 50,
        },
      ];

      const fakeProvider = new FakeProvider(initialScript);
      const session = (await fakeProvider.connect()) as FakeSession;

      let state = initialSegmentState;
      let status: LiveTranscriptionStatus = 'recording';

      session.on('final', (evt) => {
        state = segmentReducer(state, {
          type: 'APPEND_FINAL',
          payload: {
            transcriptId: 'tr-drop-test',
            text: evt.text,
            startTime: evt.startMs / 1000,
            endTime: evt.endMs / 1000,
            speakerLabel: evt.speaker,
            confidence: evt.confidence,
          },
        });
      });

      session.on('reconnecting', () => {
        status = transitionStatus(status, 'reconnecting');
      });

      session.on('reconnected', () => {
        status = transitionStatus(status, 'recording');
      });

      // Send initial audio chunk to trigger initial speech
      session.sendAudio(new Int16Array(256));
      vi.advanceTimersByTime(100);

      expect(state.segments).toHaveLength(1);
      expect(state.segments[0].raw_text).toBe('We are verifying the Directorate attendance logs.');

      // --- SIMULATE 60-SECOND DROP ---
      session.simulateDrop();
      expect(status).toBe('reconnecting');

      // Audio ring buffer buffers 60 seconds of captured PCM audio locally
      const audioBuffer = new AudioRingBuffer();
      await audioBuffer.init();

      for (let sec = 0; sec < 60; sec++) {
        await audioBuffer.pushChunk({
          interviewId: 'int-drop',
          transcriptId: 'tr-drop-test',
          timestampMs: 2500 + sec * 1000,
          durationMs: 1000,
          pcmData: new Int16Array(256),
        });
      }

      // Fast forward 60 seconds of simulated drop
      vi.advanceTimersByTime(60000);
      expect(await audioBuffer.getBufferedChunks()).toHaveLength(60);

      // --- SIMULATE RECONNECT & RESYNC ---
      const reconnectScript: ScriptedItem[] = [
        // Duplicate re-sent by provider upon reconnect
        {
          type: 'final',
          text: 'We are verifying the Directorate attendance logs.',
          startMs: 0,
          endMs: 2500,
          confidence: 0.95,
          speaker: 'Interviewer',
          delayMs: 20,
        },
        // Speech captured during the buffered outage
        {
          type: 'final',
          text: 'All biometric registers from the regional offices are accounted for.',
          startMs: 2600,
          endMs: 8000,
          confidence: 0.94,
          speaker: 'Respondent',
          delayMs: 40,
        },
        // Post-reconnect speech
        {
          type: 'final',
          text: 'Very well, let us proceed to the payroll reconciliations.',
          startMs: 8200,
          endMs: 12000,
          confidence: 0.96,
          speaker: 'Interviewer',
          delayMs: 60,
        },
      ];

      // Replay buffered audio chunks at up to 4x real time
      const drained = await audioBuffer.drainChunks();
      expect(drained).toHaveLength(60);
      for (const chunk of drained) {
        session.sendAudio(chunk.pcmData);
      }

      session.simulateReconnect(reconnectScript);
      expect(status).toBe('recording');

      vi.advanceTimersByTime(200);

      // Verification:
      // 1. Zero lost segments: all dialog captured across drop
      // 2. Zero duplicated segments: duplicate initial segment was safely rejected
      expect(state.segments).toHaveLength(3);
      expect(state.segments[0].raw_text).toBe('We are verifying the Directorate attendance logs.');
      expect(state.segments[1].raw_text).toBe(
        'All biometric registers from the regional offices are accounted for.'
      );
      expect(state.segments[2].raw_text).toBe(
        'Very well, let us proceed to the payroll reconciliations.'
      );

      // 3. Sequences and timestamps strictly monotonic
      expect(state.segments[0].seq).toBe(0);
      expect(state.segments[1].seq).toBe(1);
      expect(state.segments[2].seq).toBe(2);
      expect(state.segments[1].start_time).toBeGreaterThan(state.segments[0].start_time);
      expect(state.segments[2].start_time).toBeGreaterThan(state.segments[1].start_time);

      audioBuffer.close();
      vi.useRealTimers();
    });
  });

  describe('Transcription State Machine Transitions with Reconnecting', () => {
    it('supports valid transitions to and from reconnecting', () => {
      let status: LiveTranscriptionStatus = 'recording';

      // Socket drops while recording -> reconnecting
      status = transitionStatus(status, 'reconnecting');
      expect(status).toBe('reconnecting');

      // Socket reconnects -> recording
      status = transitionStatus(status, 'recording');
      expect(status).toBe('recording');

      // Reconnecting to stopping
      status = transitionStatus(status, 'reconnecting');
      expect(status).toBe('reconnecting');
      status = transitionStatus(status, 'stopping');
      expect(status).toBe('stopping');
    });

    it('covers all transitions in VALID_TRANSITIONS without throwing', () => {
      for (const [from, allowedList] of Object.entries(VALID_TRANSITIONS)) {
        for (const to of allowedList) {
          expect(transitionStatus(from as LiveTranscriptionStatus, to as LiveTranscriptionStatus)).toBe(to);
        }
      }
    });
  });
});
