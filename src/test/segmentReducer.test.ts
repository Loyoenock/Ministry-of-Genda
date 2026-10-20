/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  segmentReducer,
  initialSegmentState,
  SegmentState,
} from '../features/transcription/state/segmentReducer';

describe('segmentReducer', () => {
  it('handles interim replace and clearance', () => {
    let state = segmentReducer(initialSegmentState, {
      type: 'SET_INTERIM',
      payload: {
        text: 'Hello world',
        startMs: 0,
        endMs: 500,
        speaker: 'Interviewer',
      },
    });

    expect(state.interim?.text).toBe('Hello world');
    expect(state.interim?.speaker).toBe('Interviewer');

    // Replace interim
    state = segmentReducer(state, {
      type: 'SET_INTERIM',
      payload: {
        text: 'Hello world this is a test',
        startMs: 0,
        endMs: 1200,
        speaker: 'Interviewer',
      },
    });
    expect(state.interim?.text).toBe('Hello world this is a test');

    // Clear interim with null or empty text
    state = segmentReducer(state, { type: 'SET_INTERIM', payload: null });
    expect(state.interim).toBeNull();

    state = segmentReducer(state, {
      type: 'SET_INTERIM',
      payload: { text: '   ', startMs: 0, endMs: 100 },
    });
    expect(state.interim).toBeNull();
  });

  it('handles final append, sequence assignment, and clears interim', () => {
    let state = segmentReducer(initialSegmentState, {
      type: 'SET_INTERIM',
      payload: { text: 'Interim text', startMs: 0, endMs: 500 },
    });
    expect(state.interim).not.toBeNull();

    state = segmentReducer(state, {
      type: 'APPEND_FINAL',
      payload: {
        transcriptId: 'trans-1',
        text: 'First final segment.',
        startTime: 0.0,
        endTime: 2.1,
        speakerLabel: 'Interviewer',
        confidence: 0.98,
      },
    });

    expect(state.segments).toHaveLength(1);
    expect(state.segments[0].seq).toBe(0);
    expect(state.segments[0].raw_text).toBe('First final segment.');
    expect(state.segments[0].speaker_label).toBe('Interviewer');
    expect(state.segments[0].confidence).toBe(0.98);
    expect(state.interim).toBeNull();
    expect(state.nextSeq).toBe(1);

    // Second final append
    state = segmentReducer(state, {
      type: 'APPEND_FINAL',
      payload: {
        transcriptId: 'trans-1',
        text: 'Second final segment.',
        startTime: 2.2,
        endTime: 4.5,
        speakerLabel: 'Respondent',
      },
    });

    expect(state.segments).toHaveLength(2);
    expect(state.segments[1].seq).toBe(1);
    expect(state.segments[1].speaker_label).toBe('Respondent');
    expect(state.nextSeq).toBe(2);
  });

  it('ignores duplicate finals after reconnect or network re-transmission', () => {
    let state = segmentReducer(initialSegmentState, {
      type: 'APPEND_FINAL',
      payload: {
        transcriptId: 'trans-1',
        text: 'Idempotent segment text',
        startTime: 1.0,
        endTime: 3.0,
        seq: 0,
      },
    });

    expect(state.segments).toHaveLength(1);

    // Replay identical segment after reconnect
    state = segmentReducer(state, {
      type: 'APPEND_FINAL',
      payload: {
        transcriptId: 'trans-1',
        text: 'Idempotent segment text',
        startTime: 1.0,
        endTime: 3.0,
        seq: 0,
      },
    });

    // Should not create duplicate
    expect(state.segments).toHaveLength(1);
  });

  it('corrects out-of-order events by sequence and timestamp', () => {
    let state = segmentReducer(initialSegmentState, {
      type: 'APPEND_FINAL',
      payload: {
        transcriptId: 'trans-1',
        text: 'Segment two',
        startTime: 3.0,
        endTime: 5.0,
        seq: 2,
      },
    });

    state = segmentReducer(state, {
      type: 'APPEND_FINAL',
      payload: {
        transcriptId: 'trans-1',
        text: 'Segment zero',
        startTime: 0.0,
        endTime: 1.5,
        seq: 0,
      },
    });

    state = segmentReducer(state, {
      type: 'APPEND_FINAL',
      payload: {
        transcriptId: 'trans-1',
        text: 'Segment one',
        startTime: 1.6,
        endTime: 2.9,
        seq: 1,
      },
    });

    expect(state.segments.map((s) => s.seq)).toEqual([0, 1, 2]);
    expect(state.segments.map((s) => s.raw_text)).toEqual([
      'Segment zero',
      'Segment one',
      'Segment two',
    ]);
  });

  it('handles speaker toggle and explicit speaker assignment', () => {
    let state: SegmentState = {
      segments: [
        {
          id: 'seg-1',
          transcript_id: 'trans-1',
          seq: 0,
          start_time: 0,
          end_time: 1,
          raw_text: 'Hello',
          speaker_label: 'Interviewer',
          is_final: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      interim: null,
      nextSeq: 1,
    };

    // Toggle speaker
    state = segmentReducer(state, { type: 'TOGGLE_SPEAKER', payload: { id: 'seg-1' } });
    expect(state.segments[0].speaker_label).toBe('Respondent');

    state = segmentReducer(state, { type: 'TOGGLE_SPEAKER', payload: { id: 'seg-1' } });
    expect(state.segments[0].speaker_label).toBe('Interviewer');

    // Explicit speaker
    state = segmentReducer(state, {
      type: 'SET_SPEAKER',
      payload: { id: 'seg-1', speaker: 'Chief Information Officer' },
    });
    expect(state.segments[0].speaker_label).toBe('Chief Information Officer');
  });

  it('handles manual text edits without altering raw_text', () => {
    let state: SegmentState = {
      segments: [
        {
          id: 'seg-1',
          transcript_id: 'trans-1',
          seq: 0,
          start_time: 0,
          end_time: 2,
          raw_text: 'we using oracle db',
          edited_text: null,
          speaker_label: 'Respondent',
          is_final: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      interim: null,
      nextSeq: 1,
    };

    state = segmentReducer(state, {
      type: 'EDIT_TEXT',
      payload: { id: 'seg-1', text: 'We are using an Oracle database.' },
    });

    expect(state.segments[0].raw_text).toBe('we using oracle db');
    expect(state.segments[0].edited_text).toBe('We are using an Oracle database.');
  });

  it('handles question tagging and un-tagging', () => {
    let state: SegmentState = {
      segments: [
        {
          id: 'seg-1',
          transcript_id: 'trans-1',
          seq: 0,
          start_time: 0,
          end_time: 2,
          raw_text: 'Yes, our primary servers are hosted in Kampala.',
          question_id: null,
          speaker_label: 'Respondent',
          is_final: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      interim: null,
      nextSeq: 1,
    };

    state = segmentReducer(state, {
      type: 'TAG_QUESTION',
      payload: { id: 'seg-1', questionId: 'inf-infra-01' },
    });
    expect(state.segments[0].question_id).toBe('inf-infra-01');

    // Un-tag
    state = segmentReducer(state, {
      type: 'TAG_QUESTION',
      payload: { id: 'seg-1', questionId: null },
    });
    expect(state.segments[0].question_id).toBeNull();
  });
});
