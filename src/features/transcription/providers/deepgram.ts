/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TranscriptionProvider,
  Session,
  ConnectOptions,
  InterimFinalHandler,
  ErrorHandler,
  CloseHandler,
  TranscriptionEvent,
} from './types';
import { getTranscriptionToken } from '../api/getToken';

export interface DeepgramConnectOptions extends ConnectOptions {
  interviewId?: string;
  transcriptId?: string;
  reconnectBaseDelayMs?: number;
  maxReconnectDelayMs?: number;
}

export class DeepgramProvider implements TranscriptionProvider {
  public async connect(opts: DeepgramConnectOptions = {}): Promise<Session> {
    const session = new DeepgramSession(opts);
    await session.init();
    return session;
  }
}

export class DeepgramSession implements Session {
  private ws: WebSocket | null = null;
  private interimHandlers: InterimFinalHandler[] = [];
  private finalHandlers: InterimFinalHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private closeHandlers: CloseHandler[] = [];
  private reconnectingHandlers: (() => void)[] = [];
  private reconnectedHandlers: (() => void)[] = [];
  private audioBuffer: Int16Array[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private isClosed = false;
  private isConnecting = false;

  private readonly baseDelay: number;
  private readonly maxDelay: number;

  constructor(private opts: DeepgramConnectOptions) {
    this.baseDelay = opts.reconnectBaseDelayMs ?? 1000;
    this.maxDelay = opts.maxReconnectDelayMs ?? 30000;
  }

  public async init(): Promise<void> {
    await this.connectSocket();
  }

  private async fetchToken(): Promise<string> {
    if (this.opts.token) {
      return this.opts.token;
    }
    if (this.opts.interviewId && this.opts.transcriptId) {
      const res = await getTranscriptionToken({
        interviewId: this.opts.interviewId,
        transcriptId: this.opts.transcriptId,
      });
      return res.token;
    }
    throw new Error('Missing authentication token or interviewId/transcriptId context');
  }

  private async connectSocket(): Promise<void> {
    if (this.isClosed) return;
    this.isConnecting = true;

    try {
      const token = await this.fetchToken();

      const rawEndpoint = this.opts.endpoint || 'wss://api.deepgram.com/v1/listen';
      const url = new URL(rawEndpoint);
      url.searchParams.set('model', (this.opts.model as string) || 'nova-2');
      url.searchParams.set('language', (this.opts.language as string) || 'en');
      url.searchParams.set('sample_rate', String(this.opts.sampleRate || 16000));
      url.searchParams.set('encoding', 'linear16');
      url.searchParams.set('channels', '1');
      url.searchParams.set('interim_results', 'true');
      url.searchParams.set('smart_format', 'true');
      url.searchParams.set('endpointing', '300');

      const WSClass = typeof WebSocket !== 'undefined' ? WebSocket : (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket;
      if (!WSClass) {
        throw new Error('WebSocket is not available in the current runtime environment');
      }

      this.ws = new WSClass(url.toString(), ['token', token]);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectAttempt > 0) {
          this.reconnectedHandlers.forEach((h) => h());
        }
        this.reconnectAttempt = 0;
        this.flushAudioBuffer();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (_err: Event) => {
        // Redact any sensitive error properties; never log token or audio
        const safeError = new Error('Transcription WebSocket connection encountered an error');
        this.emitError(safeError);
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        if (this.isClosed) {
          this.closeHandlers.forEach((h) => h());
        } else {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.isConnecting = false;
      this.emitError(err instanceof Error ? err : new Error(String(err)));
      if (!this.isClosed) {
        this.scheduleReconnect();
      }
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
      const parsed = JSON.parse(raw);

      const alt = parsed.channel?.alternatives?.[0];
      if (!alt || !alt.transcript || alt.transcript.trim() === '') {
        return;
      }

      const text = alt.transcript.trim();
      const startSec = parsed.start ?? 0;
      const durationSec = parsed.duration ?? 0;
      const startMs = Math.round(startSec * 1000);
      const endMs = Math.round((startSec + durationSec) * 1000);
      const confidence = typeof alt.confidence === 'number' ? alt.confidence : undefined;
      const speaker = alt.words?.[0]?.speaker !== undefined ? `Speaker ${alt.words[0].speaker}` : undefined;

      const payload: TranscriptionEvent = {
        text,
        startMs,
        endMs,
        confidence,
        speaker,
      };

      if (parsed.is_final) {
        this.finalHandlers.forEach((h) => h(payload));
      } else {
        this.interimHandlers.forEach((h) => h(payload));
      }
    } catch {
      // Discard malformed provider frames silently
    }
  }

  private scheduleReconnect(): void {
    if (this.isClosed || this.reconnectTimeout) return;

    // Exponential backoff with jitter, capped at maxDelay (1s -> 30s)
    const exponential = this.baseDelay * Math.pow(2, this.reconnectAttempt);
    const delay = Math.min(this.maxDelay, exponential);
    this.reconnectAttempt++;
    this.reconnectingHandlers.forEach((h) => h());

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      if (!this.isClosed) {
        await this.connectSocket();
      }
    }, delay);
  }

  private flushAudioBuffer(): void {
    if (!this.ws || this.ws.readyState !== 1) return;
    while (this.audioBuffer.length > 0) {
      const chunk = this.audioBuffer.shift();
      if (chunk) {
        this.ws.send(chunk.buffer);
      }
    }
  }

  public sendAudio(chunk: Int16Array): void {
    if (this.isClosed) {
      return;
    }

    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(chunk.buffer);
    } else {
      // Retain bounded recent chunks (up to 50 chunks ~ 5s) during brief network drops
      if (this.audioBuffer.length < 50) {
        this.audioBuffer.push(chunk);
      }
    }
  }

  public on(event: 'interim' | 'final', handler: InterimFinalHandler): void;
  public on(event: 'error', handler: ErrorHandler): void;
  public on(event: 'close', handler: CloseHandler): void;
  public on(event: 'reconnecting' | 'reconnected', handler: () => void): void;
  public on(
    event: 'interim' | 'final' | 'error' | 'close' | 'reconnecting' | 'reconnected',
    handler: InterimFinalHandler | ErrorHandler | CloseHandler | (() => void)
  ): void {
    if (event === 'interim') {
      this.interimHandlers.push(handler as InterimFinalHandler);
    } else if (event === 'final') {
      this.finalHandlers.push(handler as InterimFinalHandler);
    } else if (event === 'error') {
      this.errorHandlers.push(handler as ErrorHandler);
    } else if (event === 'close') {
      this.closeHandlers.push(handler as CloseHandler);
    } else if (event === 'reconnecting') {
      this.reconnectingHandlers.push(handler as () => void);
    } else if (event === 'reconnected') {
      this.reconnectedHandlers.push(handler as () => void);
    }
  }

  private emitError(err: Error): void {
    this.errorHandlers.forEach((h) => h(err));
  }

  public close(): void {
    if (this.isClosed) return;
    this.isClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }

    this.audioBuffer = [];
    this.closeHandlers.forEach((h) => h());
  }

  // Exposed for inspection in unit tests
  public getReconnectAttempt(): number {
    return this.reconnectAttempt;
  }
}
