/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TranscriptSegment } from '../types';

export interface InterimPayload {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;
  confidence?: number;
}

export interface FinalSegmentPayload {
  id?: string;
  transcriptId: string;
  text: string;
  startTime: number;
  endTime: number;
  speakerLabel?: string;
  confidence?: number;
  seq?: number;
  questionId?: string | null;
}

export interface SegmentState {
  segments: TranscriptSegment[];
  interim: InterimPayload | null;
  nextSeq: number;
}

export const initialSegmentState: SegmentState = {
  segments: [],
  interim: null,
  nextSeq: 0,
};

export type SegmentAction =
  | { type: 'SET_INTERIM'; payload: InterimPayload | null }
  | { type: 'APPEND_FINAL'; payload: FinalSegmentPayload }
  | { type: 'SET_SPEAKER'; payload: { id?: string; seq?: number; speaker: string } }
  | { type: 'TOGGLE_SPEAKER'; payload: { id?: string; seq?: number } }
  | { type: 'EDIT_TEXT'; payload: { id?: string; seq?: number; text: string } }
  | { type: 'TAG_QUESTION'; payload: { id?: string; seq?: number; questionId: string | null } }
  | { type: 'RESET' };

function isDuplicateFinal(
  existingSegments: TranscriptSegment[],
  payload: FinalSegmentPayload,
  assignedSeq: number
): boolean {
  return existingSegments.some((s) => {
    // Check 1: exact same transcript, start, end, and raw text
    if (
      s.transcript_id === payload.transcriptId &&
      Math.abs(s.start_time - payload.startTime) < 0.05 &&
      Math.abs(s.end_time - payload.endTime) < 0.05 &&
      s.raw_text.trim() === payload.text.trim()
    ) {
      return true;
    }
    // Check 2: exact same sequence number and text (e.g. re-sent after reconnect)
    if (s.transcript_id === payload.transcriptId && s.seq === assignedSeq && s.raw_text.trim() === payload.text.trim()) {
      return true;
    }
    return false;
  });
}

function sortSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  return [...segments].sort((a, b) => {
    if (a.seq !== b.seq) {
      return a.seq - b.seq;
    }
    return a.start_time - b.start_time;
  });
}

export function segmentReducer(state: SegmentState, action: SegmentAction): SegmentState {
  switch (action.type) {
    case 'SET_INTERIM': {
      if (!action.payload || !action.payload.text || action.payload.text.trim() === '') {
        return {
          ...state,
          interim: null,
        };
      }
      return {
        ...state,
        interim: action.payload,
      };
    }

    case 'APPEND_FINAL': {
      const payload = action.payload;
      if (!payload.text || payload.text.trim() === '') {
        return {
          ...state,
          interim: null,
        };
      }

      const assignedSeq = payload.seq !== undefined && payload.seq !== null ? payload.seq : state.nextSeq;

      // Duplicate check for reconnections / re-transmissions
      if (isDuplicateFinal(state.segments, payload, assignedSeq)) {
        return {
          ...state,
          interim: null,
        };
      }

      const nowIso = new Date().toISOString();
      const newSegment: TranscriptSegment = {
        id: payload.id || `seg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        transcript_id: payload.transcriptId,
        seq: assignedSeq,
        start_time: payload.startTime,
        end_time: payload.endTime,
        raw_text: payload.text.trim(),
        edited_text: null,
        speaker_label: payload.speakerLabel || 'Speaker',
        confidence: payload.confidence ?? null,
        is_final: true,
        question_id: payload.questionId ?? null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const updatedSegments = sortSegments([...state.segments, newSegment]);
      const nextSeq = Math.max(state.nextSeq, assignedSeq + 1);

      return {
        ...state,
        segments: updatedSegments,
        interim: null,
        nextSeq,
      };
    }

    case 'SET_SPEAKER': {
      const { id, seq, speaker } = action.payload;
      const updatedSegments = state.segments.map((s) => {
        if ((id && s.id === id) || (seq !== undefined && s.seq === seq)) {
          return {
            ...s,
            speaker_label: speaker,
            updated_at: new Date().toISOString(),
          };
        }
        return s;
      });

      return {
        ...state,
        segments: updatedSegments,
      };
    }

    case 'TOGGLE_SPEAKER': {
      const { id, seq } = action.payload;
      const updatedSegments = state.segments.map((s) => {
        if ((id && s.id === id) || (seq !== undefined && s.seq === seq)) {
          const nextSpeaker = s.speaker_label.toLowerCase().includes('interviewer')
            ? 'Respondent'
            : 'Interviewer';
          return {
            ...s,
            speaker_label: nextSpeaker,
            updated_at: new Date().toISOString(),
          };
        }
        return s;
      });

      return {
        ...state,
        segments: updatedSegments,
      };
    }

    case 'EDIT_TEXT': {
      const { id, seq, text } = action.payload;
      const updatedSegments = state.segments.map((s) => {
        if ((id && s.id === id) || (seq !== undefined && s.seq === seq)) {
          return {
            ...s,
            edited_text: text,
            updated_at: new Date().toISOString(),
          };
        }
        return s;
      });

      return {
        ...state,
        segments: updatedSegments,
      };
    }

    case 'TAG_QUESTION': {
      const { id, seq, questionId } = action.payload;
      const updatedSegments = state.segments.map((s) => {
        if ((id && s.id === id) || (seq !== undefined && s.seq === seq)) {
          return {
            ...s,
            question_id: questionId,
            updated_at: new Date().toISOString(),
          };
        }
        return s;
      });

      return {
        ...state,
        segments: updatedSegments,
      };
    }

    case 'RESET':
      return initialSegmentState;

    default:
      return state;
  }
}
