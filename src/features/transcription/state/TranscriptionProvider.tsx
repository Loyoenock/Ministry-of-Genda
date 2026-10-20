/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useReducer, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { LiveTranscriptionStatus, TranscriptSegment } from '../types';
import { segmentReducer, initialSegmentState, FinalSegmentPayload } from './segmentReducer';
import { TranscriptionProvider as ITranscriptionProvider, Session, FakeProvider } from '../providers/types';
import { DeepgramProvider } from '../providers/deepgram';
import { SegmentWriter } from '../persistence/segmentWriter';
import { createTranscriptSession } from '../api/createSession';

export const VALID_TRANSITIONS: Record<LiveTranscriptionStatus, LiveTranscriptionStatus[]> = {
  idle: ['consent', 'connecting', 'failed'],
  consent: ['connecting', 'idle', 'failed'],
  connecting: ['recording', 'failed'],
  recording: ['paused', 'stopping', 'failed'],
  paused: ['recording', 'stopping', 'failed'],
  stopping: ['completed', 'failed'],
  completed: ['idle'],
  failed: ['idle', 'connecting'],
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

export interface TranscriptionContextValue {
  status: LiveTranscriptionStatus;
  segments: TranscriptSegment[];
  interim: string | null;
  level: number;
  start: (options: { interviewId: string; language?: string; transcriptId?: string; skipConsentCreation?: boolean }) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  setSpeaker: (segmentId: string, speaker: string) => void;
  tagQuestion: (questionId: string | null, segmentId?: string) => void;
  activeQuestionTag?: string | null;
  setActiveQuestionTag?: (questionId: string | null) => void;
  error: Error | string | null;
}

const TranscriptionContext = createContext<TranscriptionContextValue | undefined>(undefined);

export interface TranscriptionProviderProps {
  children: ReactNode;
  provider?: ITranscriptionProvider;
  segmentWriter?: SegmentWriter;
}

export const TranscriptionProvider: React.FC<TranscriptionProviderProps> = ({
  children,
  provider: customProvider,
  segmentWriter: customWriter,
}) => {
  const [status, setStatus] = useState<LiveTranscriptionStatus>('idle');
  const [level, setLevel] = useState<number>(0);
  const [error, setError] = useState<Error | string | null>(null);
  const [activeQuestionTag, setActiveQuestionTagState] = useState<string | null>(null);
  const activeQuestionTagRef = useRef<string | null>(null);
  const [segmentState, dispatch] = useReducer(segmentReducer, initialSegmentState);

  const activeTranscriptIdRef = useRef<string | null>(null);
  const providerRef = useRef<ITranscriptionProvider>(customProvider || new DeepgramProvider());
  const writerRef = useRef<SegmentWriter>(customWriter || new SegmentWriter());
  const sessionRef = useRef<Session | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioContextRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scriptProcessorRef = useRef<any>(null);
  const isPausedRef = useRef<boolean>(false);

  // Sync custom provider and writer when updated via props
  useEffect(() => {
    if (customProvider) providerRef.current = customProvider;
  }, [customProvider]);

  useEffect(() => {
    if (customWriter) writerRef.current = customWriter;
  }, [customWriter]);

  const safeSetStatus = useCallback((next: LiveTranscriptionStatus) => {
    setStatus((prev) => transitionStatus(prev, next));
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

  const start = useCallback(
    async (options: {
      interviewId: string;
      language?: string;
      transcriptId?: string;
      skipConsentCreation?: boolean;
    }) => {
      try {
        setError(null);

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

        // If using FakeProvider (tests and demos), kickstart audio playback
        if (providerRef.current instanceof FakeProvider) {
          session.sendAudio(new Int16Array(1024));
        }

        // Wire session events
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
          const finalPayload: FinalSegmentPayload = {
            transcriptId: activeTranscriptIdRef.current || 'unknown',
            text: evt.text,
            startTime: evt.startMs / 1000,
            endTime: evt.endMs / 1000,
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
          setError(err.message || 'Transcription error occurred');
          safeSetStatus('failed');
          cleanupAudio();
        });

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

                if (sessionRef.current) {
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
    [safeSetStatus, cleanupAudio, segmentState.nextSeq]
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
