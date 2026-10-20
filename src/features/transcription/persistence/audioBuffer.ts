/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AudioChunk {
  id: string;
  interviewId: string;
  transcriptId: string;
  seq: number;
  timestampMs: number;
  durationMs: number;
  byteLength: number;
  pcmData: Int16Array;
}

export interface AudioRingBufferOptions {
  dbName?: string;
  storeName?: string;
  maxDurationMinutes?: number; // default 10 min
  maxSizeBytes?: number; // default 25 MB
}

export interface EvictedGap {
  startMs: number;
  endMs: number;
}

const DEFAULT_DB_NAME = 'MGLSD_Transcription_Buffer';
const DEFAULT_STORE_NAME = 'pcm_chunks';
const DEFAULT_MAX_DURATION_MINUTES = 10;
const DEFAULT_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * AudioRingBuffer maintains a bounded, time- and byte-capped ring buffer
 * of 16-bit PCM audio chunks in IndexedDB (with in-memory fallback).
 *
 * It is completely isolated from MGLSD_Offline_Docs.
 * Cleared on stop/complete.
 * Automatically evicts the oldest chunks when max duration or max byte cap is exceeded,
 * and records the time range of evicted audio to generate gap marker segments.
 */
export class AudioRingBuffer {
  private dbName: string;
  private storeName: string;
  private maxDurationMs: number;
  private maxSizeBytes: number;

  private db: IDBDatabase | null = null;
  private isIndexedDBAvailable = false;
  private inMemoryChunks: AudioChunk[] = [];
  private totalBytes = 0;
  private nextSeq = 0;

  private evictedGap: EvictedGap | null = null;

  constructor(options: AudioRingBufferOptions = {}) {
    this.dbName = options.dbName || DEFAULT_DB_NAME;
    this.storeName = options.storeName || DEFAULT_STORE_NAME;
    const minutes = options.maxDurationMinutes ?? DEFAULT_MAX_DURATION_MINUTES;
    this.maxDurationMs = minutes * 60 * 1000;
    this.maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  }

  public async init(): Promise<void> {
    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        this.db = await this.openDB();
        this.isIndexedDBAvailable = true;
      } catch {
        this.isIndexedDBAvailable = false;
      }
    } else {
      this.isIndexedDBAvailable = false;
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('seq', 'seq', { unique: true });
          store.createIndex('timestampMs', 'timestampMs', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Appends a PCM chunk into the ring buffer and enforces duration and byte caps.
   */
  public async pushChunk(chunkData: {
    interviewId: string;
    transcriptId: string;
    timestampMs: number;
    durationMs: number;
    pcmData: Int16Array;
  }): Promise<AudioChunk> {
    const seq = this.nextSeq++;
    const byteLength = chunkData.pcmData.byteLength;
    const chunk: AudioChunk = {
      id: `${chunkData.transcriptId}_${seq}_${chunkData.timestampMs}`,
      interviewId: chunkData.interviewId,
      transcriptId: chunkData.transcriptId,
      seq,
      timestampMs: chunkData.timestampMs,
      durationMs: chunkData.durationMs,
      byteLength,
      pcmData: chunkData.pcmData,
    };

    if (this.isIndexedDBAvailable && this.db) {
      try {
        await this.idbPut(chunk);
      } catch {
        // Fall back to memory if IndexedDB transaction fails or quota is exceeded
        this.inMemoryChunks.push(chunk);
      }
    } else {
      this.inMemoryChunks.push(chunk);
    }

    this.totalBytes += byteLength;
    await this.enforceEvictionPolicy(chunk.timestampMs);

    return chunk;
  }

  /**
   * Enforces the eviction policy:
   * 1. Total byte size must not exceed maxSizeBytes.
   * 2. Time span between newest chunk and oldest chunk must not exceed maxDurationMs.
   */
  private async enforceEvictionPolicy(currentTimestampMs: number): Promise<void> {
    if (this.isIndexedDBAvailable && this.db) {
      try {
        const all = await this.idbGetAll();
        all.sort((a, b) => a.seq - b.seq);

        let total = all.reduce((sum, c) => sum + c.byteLength, 0);
        this.totalBytes = total;

        while (all.length > 0) {
          const oldest = all[0];
          const isOverBytes = total > this.maxSizeBytes;
          const isOverTime = currentTimestampMs - oldest.timestampMs > this.maxDurationMs;

          if (isOverBytes || isOverTime) {
            all.shift();
            total -= oldest.byteLength;
            this.recordEviction(oldest);
            await this.idbDelete(oldest.id);
          } else {
            break;
          }
        }
        this.totalBytes = total;
        return;
      } catch {
        // Fall back to memory eviction
      }
    }

    // In-memory eviction
    while (this.inMemoryChunks.length > 0) {
      const oldest = this.inMemoryChunks[0];
      const isOverBytes = this.totalBytes > this.maxSizeBytes;
      const isOverTime = currentTimestampMs - oldest.timestampMs > this.maxDurationMs;

      if (isOverBytes || isOverTime) {
        this.inMemoryChunks.shift();
        this.totalBytes -= oldest.byteLength;
        this.recordEviction(oldest);
      } else {
        break;
      }
    }
  }

  private recordEviction(chunk: AudioChunk): void {
    const chunkStart = chunk.timestampMs;
    const chunkEnd = chunk.timestampMs + chunk.durationMs;

    if (!this.evictedGap) {
      this.evictedGap = {
        startMs: chunkStart,
        endMs: chunkEnd,
      };
    } else {
      this.evictedGap = {
        startMs: Math.min(this.evictedGap.startMs, chunkStart),
        endMs: Math.max(this.evictedGap.endMs, chunkEnd),
      };
    }
  }

  public getEvictedGap(): EvictedGap | null {
    return this.evictedGap;
  }

  public clearEvictedGap(): void {
    this.evictedGap = null;
  }

  /**
   * Retrieves all currently buffered chunks in chronological sequence.
   */
  public async getBufferedChunks(): Promise<AudioChunk[]> {
    if (this.isIndexedDBAvailable && this.db) {
      try {
        const all = await this.idbGetAll();
        return all.sort((a, b) => a.seq - b.seq);
      } catch {
        return [...this.inMemoryChunks].sort((a, b) => a.seq - b.seq);
      }
    }
    return [...this.inMemoryChunks].sort((a, b) => a.seq - b.seq);
  }

  /**
   * Drains all buffered chunks and empties the ring buffer.
   */
  public async drainChunks(): Promise<AudioChunk[]> {
    const chunks = await this.getBufferedChunks();
    await this.clear();
    return chunks;
  }

  /**
   * Clears the entire ring buffer on session stop or complete.
   */
  public async clear(): Promise<void> {
    this.inMemoryChunks = [];
    this.totalBytes = 0;
    this.nextSeq = 0;

    if (this.isIndexedDBAvailable && this.db) {
      try {
        await this.idbClear();
      } catch {
        // Safe clear
      }
    }
  }

  public getTotalBytes(): number {
    return this.totalBytes;
  }

  public getChunkCount(): number {
    return this.inMemoryChunks.length;
  }

  public close(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch {
        // Safe close
      }
      this.db = null;
    }
    this.inMemoryChunks = [];
    this.totalBytes = 0;
  }

  // --- IndexedDB Helper Promises ---

  private idbPut(chunk: AudioChunk): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not open'));
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(chunk);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private idbGetAll(): Promise<AudioChunk[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not open'));
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  private idbDelete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not open'));
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private idbClear(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not open'));
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
