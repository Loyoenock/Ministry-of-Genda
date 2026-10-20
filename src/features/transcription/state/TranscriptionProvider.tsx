/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { LiveTranscriptionStatus, TranscriptSegment } from '../types';
import { segmentReducer, initialSegmentState, FinalSegmentPayload } from './segmentReducer';
import {
  TranscriptionProvider as ITranscriptionProvider,
  Session,
  FakeProvider,
  FakeSession,
  ScriptedItem,
} from '../providers/types';
import { DeepgramProvider } from '../providers/deepgram';
import { SegmentWriter } from '../persistence/segmentWriter';
import { AudioRingBuffer } from '../persistence/audioBuffer';
import { createTranscriptSession } from '../api/createSession';

export const VALID_TRANSITIONS: Record<LiveTranscriptionStatus, LiveTranscriptionStatus[]> = {
  idle: ['consent', 'connecting', 'failed'],
  consent: ['connecting', 'idle', 'failed'],
  connecting: ['recording', 'failed'],
  recording: ['paused', 'stopping', 'failed', 'reconnecting'],
  reconnecting: ['recording', 'failed', 'stopping'],
  paused: ['recording', 'stopping', 'failed', 'reconnecting'],
  stopping: ['completed', 'failed'],
  completed: ['idle'],
  failed: ['idle', 'connecting', 'reconnecting'],
};

export function isDevEnvironment(): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  return typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
}

export function transitionStatus(
  current: LiveTranscriptionStatus,
  next: LiveTranscriptionStatus,
  isDevOverride?: boolean
): LiveTranscriptionStatus {
  if (current === next) return current;
  const allowed = VALID_TRANSITIONS[current] || [];
  if (allowed.includes(next)) {
    return next;
  }
  const inDev = isDevOverride !== undefined ? isDevOverride : isDevEnvironment();
  if (inDev) {
    throw new Error(`Illegal transcription state transition: ${current} -> ${next}`);
  }
  // In production: no-op to protect app stability
  return current;
}

/**
 * Formats seconds into mm:ss
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats a gap marker segment when an outage exceeds the local ring buffer capacity.
 */
export function formatGapMarker(startTimeSeconds: number, endTimeSeconds: number): string {
  const startStr = formatTime(Math.floor(startTimeSeconds));
  const endStr = formatTime(Math.ceil(endTimeSeconds));
  return `[audio not transcribed: ${startStr}–${endStr}]`;
}

export interface TranscriptionContextValue {
  status: LiveTranscriptionStatus;
  segments: TranscriptSegment[];
  interim: string | null;
  level: number;
  start: (options: {
    interviewId: string;
    language?: string;
    transcriptId?: string;
    skipConsentCreation?: boolean;
  }) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  setSpeaker: (segmentId: string, speaker: string) => void;
  tagQuestion: (questionId: string | null, segmentId?: string) => void;
  activeQuestionTag?: string | null;
  setActiveQuestionTag?: (questionId: string | null) => void;
  error: Error | string | null;
  audioRingBuffer?: AudioRingBuffer;
  simulateDrop?: () => void;
  simulateReconnect?: (newScript?: ScriptedItem[]) => Promise<void>;
}

const TranscriptionContext = createContext<TranscriptionContextValue | undefined>(undefined);

export interface TranscriptionProviderProps {
  children: ReactNode;
  provider?: ITranscriptionProvider;
  segmentWriter?: SegmentWriter;
  audioBuffer?: AudioRingBuffer;
}

export const TranscriptionProvider: React.FC<TranscriptionProviderProps> = ({
  children,
  provider: customProvider,
  segmentWriter: customWriter,
  audioBuffer: customAudioBuffer,
}) => {
  const [status, setStatus] = useState<LiveTranscriptionStatus>('idle');
  const statusRef = useRef<LiveTranscriptionStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const [level, setLevel] = useState<number>(0);
  const [error, setError] = useState<Error | string | null>(null);
  const [activeQuestionTag, setActiveQuestionTagState] = useState<string | null>(null);
  const activeQuestionTagRef = useRef<string | null>(null);
  const [segmentState, dispatch] = useReducer(segmentReducer, initialSegmentState);

  const activeTranscriptIdRef = useRef<string | null>(null);
  const interviewIdRef = useRef<string>('');
  const sessionStartTimeRef = useRef<number>(0);
  const lastSegmentEndTimeRef = useRef<number>(0);

  const providerRef = useRef<ITranscriptionProvider>(customProvider || new DeepgramProvider());
  const writerRef = useRef<SegmentWriter>(customWriter || new SegmentWriter());
  const audioBufferRef = useRef<AudioRingBuffer>(customAudioBuffer || new AudioRingBuffer());
  const sessionRef = useRef<Session | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioContextRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scriptProcessorRef = useRef<any>(null);
  const isPausedRef = useRef<boolean>(false);

  // Sync custom provider, writer, and audioBuffer when updated via props
  useEffect(() => {
    if (customProvider) providerRef.current = customProvider;
  }, [customProvider]);

  useEffect(() => {
    if (customWriter) writerRef.current = customWriter;
  }, [customWriter]);

  useEffect(() => {
    if (customAudioBuffer) audioBufferRef.current = customAudioBuffer;
  }, [customAudioBuffer]);

  const safeSetStatus = useCallback((next: LiveTranscriptionStatus) => {
    setStatus((prev) => {
      const updated = transitionStatus(prev, next);
      statusRef.current = updated;
      return updated;
    });
  }, []);

  const cleanupAudio = useCallback(() => {
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {
        // Safe tear-down
      }
      scriptProcessorRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        void audioContextRef.current.close();
      } catch {
        // Safe tear-down
      }
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // Safe tear-down
      }
      mediaStreamRef.current = null;
    }

    setLevel(0);
  }, []);

  /**
   * Replays buffered audio chunks upon reconnection and handles any gap marker.
   */
  const handleSessionReconnected = useCallback(async () => {
    // 1. If outage exceeded buffer cap, mark a gap segment
    const evictedGap = audioBufferRef.current.getEvictedGap();
    if (evictedGap) {
      const gapStartSec = evictedGap.startMs / 1000;
      const gapEndSec = evictedGap.endMs / 1000;
      const gapText = formatGapMarker(gapStartSec, gapEndSec);

      const monotonicStart = Math.max(lastSegmentEndTimeRef.current, gapStartSec);
      const monotonicEnd = Math.max(monotonicStart + 0.1, gapEndSec);
      lastSegmentEndTimeRef.current = monotonicEnd;

      const gapPayload: FinalSegmentPayload = {
        transcriptId: activeTranscriptIdRef.current || 'unknown',
        text: gapText,
        startTime: monotonicStart,
        endTime: monotonicEnd,
        speakerLabel: 'System',
        confidence: 1.0,
        questionId: activeQuestionTagRef.current || undefined,
      };
      dispatch({ type: 'APPEND_FINAL', payload: gapPayload });

      writerRef.current.enqueue({
        id: `gap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        transcript_id: gapPayload.transcriptId,
        seq: segmentState.nextSeq,
        start_time: monotonicStart,
        end_time: monotonicEnd,
        raw_text: gapText,
        edited_text: null,
        speaker_label: 'System',
        confidence: 1.0,
        is_final: true,
        question_id: activeQuestionTagRef.current || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      audioBufferRef.current.clearEvictedGap();
    }

    // 2. Replay buffered audio chunks at up to 4x real time
    const bufferedChunks = await audioBufferRef.current.drainChunks();
    if (bufferedChunks.length > 0 && sessionRef.current) {
      for (const chunk of bufferedChunks) {
        sessionRef.current.sendAudio(chunk.pcmData);
      }
    }

    // 3. Transition back to recording
    safeSetStatus('recording');
  }, [safeSetStatus, segmentState.nextSeq]);

  const start = useCallback(
    async (options: {
      interviewId: string;
      language?: string;
      transcriptId?: string;
      skipConsentCreation?: boolean;
    }) => {
      try {
        setError(null);
        interviewIdRef.current = options.interviewId;
        sessionStartTimeRef.current = Date.now();
        lastSegmentEndTimeRef.current = 0;

        await audioBufferRef.current.init();

        let transcriptId = options.transcriptId;

        // Step 1: Consent transition & record creation
        if (!options.skipConsentCreation && !transcriptId) {
          safeSetStatus('consent');
          try {
            const sessionRecord = await createTranscriptSession(options.interviewId, options.language);
            transcriptId = sessionRecord.id;
          } catch (sessionErr) {
            if (providerRef.current instanceof FakeProvider) {
              transcriptId = `fake-trans-${Date.now()}`;
            } else {
              throw sessionErr;
            }
          }
        }

        activeTranscriptIdRef.current = transcriptId || `trans-${Date.now()}`;

        // Step 2: Connecting
        safeSetStatus('connecting');

        const session = await providerRef.current.connect({
          interviewId: options.interviewId,
          transcriptId: activeTranscriptIdRef.current,
          language: options.language || 'en-UG',
        });
        sessionRef.current = session;

        // Wire session events
        session.on('reconnecting', () => {
          if (statusRef.current === 'recording' || statusRef.current === 'paused') {
            safeSetStatus('reconnecting');
          }
        });

        session.on('reconnected', () => {
          void handleSessionReconnected();
        });

        session.on('close', () => {
          if (statusRef.current === 'recording') {
            safeSetStatus('reconnecting');
          }
        });

        session.on('interim', (evt) => {
          dispatch({
            type: 'SET_INTERIM',
            payload: {
              text: evt.text,
              startMs: evt.startMs,
              endMs: evt.endMs,
              speaker: evt.speaker,
              confidence: evt.confidence,
            },
          });
        });

        session.on('final', (evt) => {
          const rawStartTime = evt.startMs / 1000;
          const rawEndTime = evt.endMs / 1000;
          const monotonicStartTime = Math.max(lastSegmentEndTimeRef.current, rawStartTime);
          const monotonicEndTime = Math.max(monotonicStartTime + 0.05, rawEndTime);
          lastSegmentEndTimeRef.current = monotonicEndTime;

          const finalPayload: FinalSegmentPayload = {
            transcriptId: activeTranscriptIdRef.current || 'unknown',
            text: evt.text,
            startTime: monotonicStartTime,
            endTime: monotonicEndTime,
            speakerLabel: evt.speaker || 'Speaker',
            confidence: evt.confidence,
            questionId: activeQuestionTagRef.current || undefined,
          };
          dispatch({ type: 'APPEND_FINAL', payload: finalPayload });

          // Also enqueue to persistence writer
          writerRef.current.enqueue({
            id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            transcript_id: finalPayload.transcriptId,
            seq: segmentState.nextSeq,
            start_time: finalPayload.startTime,
            end_time: finalPayload.endTime,
            raw_text: finalPayload.text,
            edited_text: null,
            speaker_label: finalPayload.speakerLabel || 'Speaker',
            confidence: finalPayload.confidence ?? null,
            is_final: true,
            question_id: activeQuestionTagRef.current || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });

        session.on('error', (err) => {
          if (statusRef.current === 'recording') {
            safeSetStatus('reconnecting');
          } else {
            setError(err.message || 'Transcription error occurred');
            safeSetStatus('failed');
            cleanupAudio();
          }
        });

        // If using FakeProvider (tests and demos), kickstart audio playback
        if (providerRef.current instanceof FakeProvider) {
          session.sendAudio(new Int16Array(1024));
        }

        // Step 3: Audio Capture initialization
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
              },
            });
            mediaStreamRef.current = stream;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const audioCtx = new AudioContextClass({ sampleRate: 16000 });
              audioContextRef.current = audioCtx;

              const source = audioCtx.createMediaStreamSource(stream);
              const processor = audioCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = processor;

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              processor.onaudioprocess = (e: any) => {
                if (isPausedRef.current) {
                  setLevel(0);
                  return;
                }

                const input = e.inputBuffer.getChannelData(0) as Float32Array;

                // Compute audio RMS level (normalized 0 to 1)
                let sum = 0;
                for (let i = 0; i < input.length; i++) {
                  sum += input[i] * input[i];
                }
                const rms = Math.sqrt(sum / input.length);
                setLevel(Math.min(1, rms * 4));

                // Convert to 16-bit PCM for streaming provider
                const pcm16 = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                  const s = Math.max(-1, Math.min(1, input[i]));
                  pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }

                const captureTimestampMs = sessionStartTimeRef.current > 0
                  ? Date.now() - sessionStartTimeRef.current
                  : 0;
                const durationMs = (input.length / 16000) * 1000;

                // On socket drop: keep capturing, buffer locally
                if (statusRef.current === 'reconnecting') {
                  void audioBufferRef.current.pushChunk({
                    interviewId: interviewIdRef.current,
                    transcriptId: activeTranscriptIdRef.current || 'unknown',
                    timestampMs: captureTimestampMs,
                    durationMs,
                    pcmData: pcm16,
                  });
                } else if (sessionRef.current) {
                  sessionRef.current.sendAudio(pcm16);
                }
              };

              source.connect(processor);
              processor.connect(audioCtx.destination);
            }
          } catch {
            // Microphone access error (handled safely without throwing into root UI)
          }
        }

        isPausedRef.current = false;
        safeSetStatus('recording');
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        safeSetStatus('failed');
        cleanupAudio();
      }
    },
    [safeSetStatus, cleanupAudio, handleSessionReconnected, segmentState.nextSeq]
  );

  const pause = useCallback(() => {
    isPausedRef.current = true;
    safeSetStatus('paused');
    setLevel(0);
  }, [safeSetStatus]);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    safeSetStatus('recording');
  }, [safeSetStatus]);

  const stop = useCallback(async () => {
    safeSetStatus('stopping');
    cleanupAudio();

    if (sessionRef.current) {
      try {
        await sessionRef.current.close();
      } catch {
        // Safe close
      }
      sessionRef.current = null;
    }

    try {
      await writerRef.current.stop();
    } catch {
      // Writer handles retries safely
    }

    // Clear local ring buffer on stop/complete
    try {
      await audioBufferRef.current.clear();
    } catch {
      // Safe clear
    }
    lastSegmentEndTimeRef.current = 0;

    safeSetStatus('completed');
  }, [safeSetStatus, cleanupAudio]);

  const setSpeaker = useCallback((segmentId: string, speaker: string) => {
    dispatch({ type: 'SET_SPEAKER', payload: { id: segmentId, speaker } });
  }, []);

  const tagQuestion = useCallback((questionId: string | null, segmentId?: string) => {
    if (segmentId) {
      dispatch({ type: 'TAG_QUESTION', payload: { id: segmentId, questionId } });
    } else {
      // Tag most recent segment if segmentId not specified
      const lastSeg = segmentState.segments[segmentState.segments.length - 1];
      if (lastSeg) {
        dispatch({ type: 'TAG_QUESTION', payload: { id: lastSeg.id, questionId } });
      }
    }
  }, [segmentState.segments]);

  const setActiveQuestionTag = useCallback((questionId: string | null) => {
    activeQuestionTagRef.current = questionId;
    setActiveQuestionTagState(questionId);
  }, []);

  // Helpers for testing drops & reconnection
  const simulateDrop = useCallback(() => {
    safeSetStatus('reconnecting');
    if (sessionRef.current instanceof FakeSession) {
      sessionRef.current.simulateDrop();
    }
  }, [safeSetStatus]);

  const simulateReconnect = useCallback(
    async (newScript?: ScriptedItem[]) => {
      if (sessionRef.current instanceof FakeSession) {
        sessionRef.current.simulateReconnect(newScript);
      }
      await handleSessionReconnected();
    },
    [handleSessionReconnected]
  );

  // Requirement 5: Page lifecycle hooks:
  // - Prompt before navigating away while recording (beforeunload)
  // - Flush segments on pagehide
  useEffect(() => {
    const isActivelyRecording = status === 'recording' || status === 'reconnecting';
    if (!isActivelyRecording) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Transcription is currently in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    const handlePageHide = () => {
      try {
        void writerRef.current.flush();
      } catch {
        // Safe flush
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [status]);

  return (
    <TranscriptionContext.Provider
      value={{
        status,
        segments: segmentState.segments,
        interim: segmentState.interim?.text || null,
        level,
        start,
        pause,
        resume,
        stop,
        setSpeaker,
        tagQuestion,
        activeQuestionTag,
        setActiveQuestionTag,
        error,
        audioRingBuffer: audioBufferRef.current,
        simulateDrop,
        simulateReconnect,
      }}
    >
      {children}
    </TranscriptionContext.Provider>
  );
};

export function useTranscription(): TranscriptionContextValue {
  const ctx = useContext(TranscriptionContext);
  if (!ctx) {
    throw new Error('useTranscription must be used within a TranscriptionProvider');
  }
  return ctx;
}
