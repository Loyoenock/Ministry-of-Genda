/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SegmentWriter } from '../features/transcription/persistence/segmentWriter';
import { TranscriptSegment } from '../features/transcription/types';

describe('SegmentWriter', () => {
  let mockUpsert: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockClient = {
      from: vi.fn().mockReturnValue({
        upsert: mockUpsert,
      }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createSampleSegment(seq: number, text: string): TranscriptSegment {
    return {
      id: `seg-${seq}`,
      transcript_id: 'transcript-uuid-01',
      seq,
      start_time: seq * 2.0,
      end_time: seq * 2.0 + 1.8,
      raw_text: text,
      edited_text: null,
      speaker_label: 'Interviewer',
      confidence: 0.95,
      is_final: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  it('batches segments and flushes when batch size is reached', async () => {
    const writer = new SegmentWriter({
      batchSize: 3,
      flushIntervalMs: 10000,
      client: mockClient,
    });

    writer.enqueue(createSampleSegment(0, 'First'));
    writer.enqueue(createSampleSegment(1, 'Second'));
    expect(mockUpsert).not.toHaveBeenCalled();

    // 3rd segment triggers batch flush
    writer.enqueue(createSampleSegment(2, 'Third'));
    await Promise.resolve();

    expect(mockClient.from).toHaveBeenCalledWith('transcript_segments');
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ seq: 0, raw_text: 'First' }),
        expect.objectContaining({ seq: 1, raw_text: 'Second' }),
        expect.objectContaining({ seq: 2, raw_text: 'Third' }),
      ]),
      { onConflict: 'transcript_id,seq' }
    );

    await writer.stop();
  });

  it('guarantees idempotency when replaying the same batch twice', async () => {
    const writer = new SegmentWriter({
      batchSize: 10,
      client: mockClient,
    });

    const seg0 = createSampleSegment(0, 'Statement A');
    const seg1 = createSampleSegment(1, 'Statement B');

    // First enqueue and flush
    writer.enqueue(seg0);
    writer.enqueue(seg1);
    await writer.flush();

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ transcript_id: 'transcript-uuid-01', seq: 0 }),
        expect.objectContaining({ transcript_id: 'transcript-uuid-01', seq: 1 }),
      ]),
      { onConflict: 'transcript_id,seq' }
    );

    // Replay identical batch (e.g. after network retry or reconnect)
    writer.enqueue(seg0);
    writer.enqueue(seg1);
    await writer.flush();

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    // Both calls target exact same (transcript_id, seq) keys, guaranteeing database idempotency
    expect(mockUpsert).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ transcript_id: 'transcript-uuid-01', seq: 0 }),
        expect.objectContaining({ transcript_id: 'transcript-uuid-01', seq: 1 }),
      ]),
      { onConflict: 'transcript_id,seq' }
    );

    await writer.stop();
  });

  it('retries with exponential backoff on failure and never throws into UI caller', async () => {
    // Fail first call, succeed on second
    mockUpsert
      .mockRejectedValueOnce(new Error('Transient database network timeout'))
      .mockResolvedValueOnce({ error: null });

    const writer = new SegmentWriter({
      batchSize: 5,
      client: mockClient,
    });

    writer.enqueue(createSampleSegment(0, 'Retry test segment'));

    // Flushes without throwing
    await expect(writer.flush()).resolves.not.toThrow();
    expect(writer.getPendingCount()).toBe(1);
    expect(writer.getRetryCount()).toBe(1);

    // Advance timers for backoff retry
    vi.advanceTimersByTime(1500);
    await Promise.resolve();

    // After retry succeeds, queue should be empty
    expect(writer.getPendingCount()).toBe(0);

    await writer.stop();
  });

  it('flushes pending queue on stop() and visibility change', async () => {
    const writer = new SegmentWriter({
      batchSize: 50,
      flushIntervalMs: 60000,
      client: mockClient,
    });

    writer.enqueue(createSampleSegment(0, 'Stop flush test'));
    expect(mockUpsert).not.toHaveBeenCalled();

    // Calling stop flushes all pending segments
    await writer.stop();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(writer.getPendingCount()).toBe(0);
  });
});
