/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../../lib/supabase';
import { TranscriptSegment } from '../types';

export interface SegmentWriterOptions {
  batchSize?: number;
  flushIntervalMs?: number;
  maxRetries?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: any;
}

export class SegmentWriter {
  private queue: TranscriptSegment[] = [];
  private isFlushing = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private isStopped = false;

  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly maxRetries: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly client: any;

  private visibilityHandler: (() => void) | null = null;
  private pageHideHandler: (() => void) | null = null;

  constructor(opts: SegmentWriterOptions = {}) {
    this.batchSize = opts.batchSize ?? 20;
    this.flushIntervalMs = opts.flushIntervalMs ?? 5000;
    this.maxRetries = opts.maxRetries ?? 5;
    this.client = opts.client ?? supabase;

    this.startPeriodicFlush();
    this.attachLifecycleListeners();
  }

  private startPeriodicFlush(): void {
    if (typeof setInterval !== 'undefined') {
      this.intervalTimer = setInterval(() => {
        void this.flush();
      }, this.flushIntervalMs);
    }
  }

  private attachLifecycleListeners(): void {
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'hidden') {
          void this.flush();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    if (typeof window !== 'undefined') {
      this.pageHideHandler = () => {
        void this.flush();
      };
      window.addEventListener('pagehide', this.pageHideHandler);
    }
  }

  /**
   * Enqueue a segment to be persisted. If a segment with the same (transcript_id, seq)
   * is already queued, it updates in place.
   */
  public enqueue(segment: TranscriptSegment): void {
    if (this.isStopped) return;

    const existingIdx = this.queue.findIndex(
      (s) => s.transcript_id === segment.transcript_id && s.seq === segment.seq
    );

    if (existingIdx >= 0) {
      this.queue[existingIdx] = segment;
    } else {
      this.queue.push(segment);
    }

    if (this.queue.length >= this.batchSize) {
      void this.flush();
    }
  }

  /**
   * Flush queued segments to Supabase via idempotent upsert on (transcript_id, seq).
   * Retries with exponential backoff on failure and never throws into the UI.
   */
  public async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;

    // Snapshot the current queue items to flush
    const batchToFlush = [...this.queue];

    try {
      const records = batchToFlush.map((s) => ({
        id: s.id,
        transcript_id: s.transcript_id,
        seq: s.seq,
        start_time: s.start_time,
        end_time: s.end_time,
        raw_text: s.raw_text,
        edited_text: s.edited_text ?? null,
        speaker_label: s.speaker_label,
        confidence: s.confidence ?? null,
        is_final: s.is_final,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.client.from('transcript_segments').upsert(records, {
        onConflict: 'transcript_id,seq',
      });

      if (error) {
        throw error;
      }

      // Remove successfully flushed items from the queue
      const flushedIds = new Set(batchToFlush.map((s) => `${s.transcript_id}:${s.seq}`));
      this.queue = this.queue.filter((s) => !flushedIds.has(`${s.transcript_id}:${s.seq}`));
      this.retryCount = 0;
    } catch (_err) {
      // Never throw into caller / UI. Back off and retry.
      this.scheduleRetry();
    } finally {
      this.isFlushing = false;
    }
  }

  private scheduleRetry(): void {
    if (this.isStopped || this.retryTimeout) return;
    if (this.retryCount >= this.maxRetries) {
      return;
    }

    const backoffDelay = Math.min(30000, 1000 * Math.pow(2, this.retryCount));
    this.retryCount++;

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      void this.flush();
    }, backoffDelay);
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getRetryCount(): number {
    return this.retryCount;
  }

  /**
   * Flush all remaining segments and clean up timers and listeners.
   */
  public async stop(): Promise<void> {
    this.isStopped = true;

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.pageHideHandler && typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.pageHideHandler);
      this.pageHideHandler = null;
    }

    await this.flush();
  }
}
