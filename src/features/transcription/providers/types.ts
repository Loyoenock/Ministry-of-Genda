/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TranscriptionEvent {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
  speaker?: string;
}

export type TranscriptionEventType = 'interim' | 'final' | 'error' | 'close';

export type InterimFinalHandler = (event: TranscriptionEvent) => void;
export type ErrorHandler = (error: Error) => void;
export type CloseHandler = () => void;

export interface Session {
  sendAudio(chunk: Int16Array): void;
  on(event: 'interim' | 'final', handler: InterimFinalHandler): void;
  on(event: 'error', handler: ErrorHandler): void;
  on(event: 'close', handler: CloseHandler): void;
  close(): Promise<void> | void;
}

export interface ConnectOptions {
  language?: string;
  sampleRate?: number;
  token?: string;
  model?: string;
  endpoint?: string;
  [key: string]: unknown;
}

export interface TranscriptionProvider {
  connect(opts?: ConnectOptions): Promise<Session>;
}

export interface ScriptedItem {
  type: 'interim' | 'final';
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
  speaker?: string;
  delayMs?: number;
}

/**
 * FakeProvider replays a scripted or default realistic dialogue sequence.
 * Used for testing, offline demonstrations, and zero-network verification.
 */
export class FakeProvider implements TranscriptionProvider {
  private script: ScriptedItem[];

  constructor(script?: ScriptedItem[]) {
    this.script = script && script.length > 0 ? script : FakeProvider.getDefaultScript();
  }

  public static getDefaultScript(): ScriptedItem[] {
    return [
      {
        type: 'interim',
        text: 'Good morning',
        startMs: 0,
        endMs: 800,
        confidence: 0.88,
        speaker: 'Interviewer',
        delayMs: 50,
      },
      {
        type: 'final',
        text: 'Good morning. Welcome to the diagnostic interview session.',
        startMs: 0,
        endMs: 2400,
        confidence: 0.96,
        speaker: 'Interviewer',
        delayMs: 100,
      },
      {
        type: 'interim',
        text: 'Thank you for',
        startMs: 2600,
        endMs: 3100,
        confidence: 0.91,
        speaker: 'Respondent',
        delayMs: 60,
      },
      {
        type: 'final',
        text: 'Thank you for having me. I am ready to review the department systems.',
        startMs: 2600,
        endMs: 5200,
        confidence: 0.95,
        speaker: 'Respondent',
        delayMs: 120,
      },
    ];
  }

  public async connect(_opts?: ConnectOptions): Promise<Session> {
    return new FakeSession(this.script);
  }
}

export class FakeSession implements Session {
  private interimHandlers: InterimFinalHandler[] = [];
  private finalHandlers: InterimFinalHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private closeHandlers: CloseHandler[] = [];
  private timeouts: NodeJS.Timeout[] = [];
  private isClosed = false;

  constructor(private script: ScriptedItem[]) {}

  public sendAudio(_chunk: Int16Array): void {
    if (this.isClosed) {
      this.emitError(new Error('Cannot send audio on a closed session'));
      return;
    }

    // On receiving first audio chunk, trigger scripted sequence if not yet scheduled
    if (this.timeouts.length === 0 && this.script.length > 0) {
      this.schedulePlayback();
    }
  }

  private schedulePlayback(): void {
    let cumulativeDelay = 0;
    for (const item of this.script) {
      cumulativeDelay += item.delayMs ?? 100;
      const timeout = setTimeout(() => {
        if (this.isClosed) return;
        const payload: TranscriptionEvent = {
          text: item.text,
          startMs: item.startMs,
          endMs: item.endMs,
          confidence: item.confidence,
          speaker: item.speaker,
        };
        if (item.type === 'interim') {
          this.interimHandlers.forEach((h) => h(payload));
        } else {
          this.finalHandlers.forEach((h) => h(payload));
        }
      }, cumulativeDelay);
      this.timeouts.push(timeout);
    }
  }

  public on(event: 'interim' | 'final', handler: InterimFinalHandler): void;
  public on(event: 'error', handler: ErrorHandler): void;
  public on(event: 'close', handler: CloseHandler): void;
  public on(
    event: 'interim' | 'final' | 'error' | 'close',
    handler: InterimFinalHandler | ErrorHandler | CloseHandler
  ): void {
    if (event === 'interim') {
      this.interimHandlers.push(handler as InterimFinalHandler);
    } else if (event === 'final') {
      this.finalHandlers.push(handler as InterimFinalHandler);
    } else if (event === 'error') {
      this.errorHandlers.push(handler as ErrorHandler);
    } else if (event === 'close') {
      this.closeHandlers.push(handler as CloseHandler);
    }
  }

  public emitError(err: Error): void {
    this.errorHandlers.forEach((h) => h(err));
  }

  public close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    this.timeouts.forEach((t) => clearTimeout(t));
    this.timeouts = [];
    this.closeHandlers.forEach((h) => h());
  }
}
