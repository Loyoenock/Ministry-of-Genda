/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic,
  Pause,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Tag,
  AlertCircle,
  Loader2,
  FileText,
  BookmarkPlus,
  CheckSquare,
  Square as SquareIcon,
  Filter,
  X,
} from 'lucide-react';
import {
  TranscriptionProvider,
  useTranscription,
} from '../state/TranscriptionProvider';
import { TranscriptionProvider as ITranscriptionProvider } from '../providers/types';
import { SegmentWriter } from '../persistence/segmentWriter';
import { AudioRingBuffer } from '../persistence/audioBuffer';
import { ConsentModal } from './ConsentModal';
import { AudioLevelMeter } from './AudioLevelMeter';
import { TranscriptionErrorBoundary } from './TranscriptionErrorBoundary';
import { TranscriptSegment } from '../types';
import { useInterviews } from '../../../context/InterviewContext';
import { useQuestions } from '../../../hooks/useQuestions';
import { Answer, Interview, InterviewerNote, Question } from '../../../types';

export interface LiveTranscriptionPanelProps {
  interviewId: string;
  activeSectionCode?: string;
  onInsertNote?: (text: string) => void;
  customProvider?: ITranscriptionProvider;
  customWriter?: SegmentWriter;
  customAudioBuffer?: AudioRingBuffer;
  // Test injection / overrides
  interviewsOverride?: Interview[];
  tierQuestionsOverride?: Question[];
  answersOverride?: Answer[];
  notesOverride?: InterviewerNote;
  saveAnswerOverride?: (interviewId: string, questionId: string, text: string) => Promise<void> | void;
  saveNotesOverride?: (interviewId: string, updates: Partial<InterviewerNote>) => Promise<void> | void;
  autoSaveStatusOverride?: 'saved' | 'saving' | 'error';
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats the short [Transcript mm:ss] marker required for transcript citations.
 */
export function formatTranscriptMarker(startTimeSeconds: number): string {
  const mins = Math.floor(startTimeSeconds / 60);
  const secs = Math.floor(startTimeSeconds % 60);
  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');
  return `[Transcript ${mm}:${ss}]`;
}

/**
 * Formats a gap marker segment when an outage exceeds the local ring buffer capacity.
 */
export function formatGapMarker(startTimeSeconds: number, endTimeSeconds: number): string {
  const startStr = formatTime(Math.floor(startTimeSeconds));
  const endStr = formatTime(Math.ceil(endTimeSeconds));
  return `[audio not transcribed: ${startStr}–${endStr}]`;
}

/**
 * Formats one or multiple segments with [Transcript mm:ss] markers in chronological order.
 */
export function formatSegmentsWithMarkers(segments: TranscriptSegment[]): string {
  const sorted = [...segments].sort((a, b) => {
    if (a.seq !== b.seq) return a.seq - b.seq;
    return a.start_time - b.start_time;
  });

  return sorted
    .map((s) => {
      const marker = formatTranscriptMarker(s.start_time);
      const text = (s.edited_text || s.raw_text).trim();
      return `${marker} ${text}`;
    })
    .join('\n');
}

/**
 * Safely appends transcript text to an answer without overwriting.
 */
export function appendTranscriptToAnswer(
  existingAnswerText: string | null | undefined,
  formattedSnippet: string
): string {
  const trimmed = existingAnswerText?.trim() || '';
  if (trimmed.length > 0) {
    return `${trimmed}\n\n${formattedSnippet}`;
  }
  return formattedSnippet;
}

/**
 * Safely appends transcript text to interviewer observations without overwriting.
 */
export function appendTranscriptToObservations(
  existingObservations: string | null | undefined,
  formattedSnippet: string
): string {
  const trimmed = existingObservations?.trim() || '';
  if (trimmed.length > 0) {
    return `${trimmed}\n\n${formattedSnippet}`;
  }
  return formattedSnippet;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-UG', label: 'English (Uganda)' },
  { code: 'sw-UG', label: 'Swahili (East Africa)' },
  { code: 'lg', label: 'Luganda' },
];

const SPEAKER_OPTIONS = ['Interviewer', 'Participant', 'Technical Lead', 'Permanent Secretary'];

function useSafeInterviewContext() {
  try {
    return useInterviews();
  } catch {
    return null;
  }
}

function useSafeQuestions() {
  try {
    return useQuestions();
  } catch {
    return null;
  }
}

export const LiveTranscriptionInner: React.FC<LiveTranscriptionPanelProps> = ({
  interviewId,
  activeSectionCode,
  onInsertNote,
  interviewsOverride,
  tierQuestionsOverride,
  answersOverride,
  notesOverride,
  saveAnswerOverride,
  saveNotesOverride,
  autoSaveStatusOverride,
}) => {
  const {
    status,
    segments,
    interim,
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
  } = useTranscription();

  const interviewContext = useSafeInterviewContext();
  const questionsContext = useSafeQuestions();

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-UG');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  // Multi-segment selection
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<string>>(new Set());

  // Question Picker modal state for "Add to answer"
  const [questionPickerSegments, setQuestionPickerSegments] = useState<TranscriptSegment[] | null>(null);
  const [targetQuestionId, setTargetQuestionId] = useState<string>('');

  // Filtering segments by question ("jump to what was said for A3")
  const [questionFilter, setQuestionFilter] = useState<string | null>(null);

  // Panel-only notification banner (success / error)
  const [panelBanner, setPanelBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Effective data access (supporting context or props overrides)
  const effectiveInterviews = interviewsOverride || interviewContext?.interviews || [];
  const currentInterview = effectiveInterviews.find((i) => i.id === interviewId);

  const effectiveTierQuestions = useMemo(() => {
    if (tierQuestionsOverride) return tierQuestionsOverride;
    if (currentInterview && questionsContext?.getQuestionsForTier) {
      return questionsContext.getQuestionsForTier(currentInterview.tier);
    }
    return [];
  }, [tierQuestionsOverride, currentInterview, questionsContext]);

  const effectiveAutoSaveStatus =
    autoSaveStatusOverride || interviewContext?.autoSaveStatus || 'saved';

  const effectiveGetAnswers = useCallback(
    (id: string): Answer[] => {
      if (answersOverride) return answersOverride;
      if (interviewContext?.getInterviewAnswers) {
        return interviewContext.getInterviewAnswers(id);
      }
      return [];
    },
    [answersOverride, interviewContext]
  );

  const effectiveGetNotes = useCallback(
    (id: string): InterviewerNote => {
      if (notesOverride) return notesOverride;
      if (interviewContext?.getInterviewNotes) {
        return interviewContext.getInterviewNotes(id);
      }
      return {
        id: `note-${id}`,
        interview_id: id,
        observations: '',
        contradictions: '',
        documents_collected_summary: '',
        follow_ups: '',
        numbers_captured: {
          total_staff: null,
          labour_officers_count: null,
          annual_inspections: null,
          disputes_logged: null,
          disputes_resolved: null,
          budget_allocated_ugx: null,
          budget_released_pct: null,
          backlog_cases: null,
        },
        maturity_signals: {
          governance_score: 3,
          technology_score: 3,
          process_score: 3,
          people_skills_score: 3,
          data_reporting_score: 3,
          justification: '',
        },
        updated_at: new Date().toISOString(),
      };
    },
    [notesOverride, interviewContext]
  );

  const effectiveSaveAnswer = useCallback(
    async (intId: string, qId: string, text: string) => {
      if (saveAnswerOverride) {
        await saveAnswerOverride(intId, qId, text);
        return;
      }
      if (interviewContext?.saveAnswer) {
        await interviewContext.saveAnswer(intId, qId, text);
      }
    },
    [saveAnswerOverride, interviewContext]
  );

  const effectiveSaveNotes = useCallback(
    async (intId: string, updates: Partial<InterviewerNote>) => {
      if (saveNotesOverride) {
        await saveNotesOverride(intId, updates);
        return;
      }
      if (interviewContext?.saveNotes) {
        await interviewContext.saveNotes(intId, updates);
      }
    },
    [saveNotesOverride, interviewContext]
  );

  // Auto scroll to latest segment when new segments arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [segments.length, interim]);

  const setTimedBanner = useCallback((type: 'success' | 'error', message: string) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setPanelBanner({ type, message });
    bannerTimerRef.current = setTimeout(() => {
      setPanelBanner(null);
    }, 4000);
  }, []);

  const handleStartRequest = () => {
    setShowConsentModal(true);
  };

  const handleConsentConfirmed = async () => {
    setIsStarting(true);
    try {
      await start({
        interviewId,
        language: selectedLanguage,
      });
      setShowConsentModal(false);
    } catch {
      // Error is stored safely in context
    } finally {
      setIsStarting(false);
    }
  };

  const handleCopyText = (segment: TranscriptSegment) => {
    const textToCopy = segment.edited_text || segment.raw_text;
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(textToCopy);
      setCopiedId(segment.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const toggleSelectSegment = (id: string) => {
    setSelectedSegmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllSegments = () => {
    if (selectedSegmentIds.size === segments.length) {
      setSelectedSegmentIds(new Set());
    } else {
      setSelectedSegmentIds(new Set(segments.map((s) => s.id)));
    }
  };

  /**
   * Guard checking:
   * - If interview is Completed / locked -> surfaces failure in panel only, leaves original untouched
   * - If autoSaveStatus is 'saving' -> queues and retries; surfaces failure in panel only if timeout
   */
  const executeWithGuard = async (action: () => Promise<void> | void): Promise<boolean> => {
    if (currentInterview?.status === 'Completed') {
      setTimedBanner('error', 'Interview is completed and locked from modifications.');
      return false;
    }

    let retries = 5;
    while (effectiveAutoSaveStatus === 'saving' && retries > 0) {
      await new Promise((r) => setTimeout(r, 60));
      retries--;
    }

    if (effectiveAutoSaveStatus === 'saving') {
      setTimedBanner('error', 'Auto-save was busy. Action queued and timed out. Original text left untouched.');
      return false;
    }

    try {
      await action();
      return true;
    } catch (err: any) {
      setTimedBanner('error', err?.message || 'Failed to update interview record.');
      return false;
    }
  };

  // Open question picker for segment(s)
  const openQuestionPickerForSegments = (segs: TranscriptSegment[]) => {
    if (segs.length === 0) return;
    setQuestionPickerSegments(segs);

    // Preselect tag if segment already has a question_id matching tier questions
    const firstWithTag = segs.find((s) => s.question_id);
    if (firstWithTag?.question_id) {
      const found = effectiveTierQuestions.find(
        (q) => q.id === firstWithTag.question_id || q.code === firstWithTag.question_id
      );
      if (found) {
        setTargetQuestionId(found.id);
        return;
      }
    }
    // Preselect activeQuestionTag if set
    if (activeQuestionTag) {
      const found = effectiveTierQuestions.find((q) => q.id === activeQuestionTag);
      if (found) {
        setTargetQuestionId(found.id);
        return;
      }
    }
    if (effectiveTierQuestions.length > 0) {
      setTargetQuestionId(effectiveTierQuestions[0].id);
    } else {
      setTargetQuestionId('');
    }
  };

  // Confirm appending to answer
  const handleConfirmAddToAnswer = async () => {
    if (!targetQuestionId || !questionPickerSegments || questionPickerSegments.length === 0) return;

    const targetQuestion = effectiveTierQuestions.find((q) => q.id === targetQuestionId);
    const formattedSnippet = formatSegmentsWithMarkers(questionPickerSegments);

    const success = await executeWithGuard(async () => {
      const existingAnswers = effectiveGetAnswers(interviewId);
      const existingAnswer = existingAnswers.find((a) => a.question_id === targetQuestionId);
      const currentAnswerText = existingAnswer?.answer_text || '';
      const updatedText = appendTranscriptToAnswer(currentAnswerText, formattedSnippet);

      await effectiveSaveAnswer(interviewId, targetQuestionId, updatedText);
    });

    if (success) {
      setQuestionPickerSegments(null);
      setSelectedSegmentIds(new Set());
      setTimedBanner('success', `Appended to answer for ${targetQuestion?.code || targetQuestionId}!`);
    }
  };

  // Append to observations
  const handleAddToObservations = async (segs: TranscriptSegment[]) => {
    if (segs.length === 0) return;
    const formattedSnippet = formatSegmentsWithMarkers(segs);

    const success = await executeWithGuard(async () => {
      const existingNotes = effectiveGetNotes(interviewId);
      const currentObs = existingNotes?.observations || '';
      const updatedObs = appendTranscriptToObservations(currentObs, formattedSnippet);

      await effectiveSaveNotes(interviewId, { observations: updatedObs });
    });

    if (success) {
      setSelectedSegmentIds(new Set());
      setTimedBanner('success', 'Appended transcript to interviewer observations!');
    }
  };

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const isConnecting = status === 'connecting';
  const isStopping = status === 'stopping';
  const isReconnecting = status === 'reconnecting';
  const isBusy = isConnecting || isStopping || isStarting;

  const displayedSegments = questionFilter
    ? segments.filter((s) => s.question_id === questionFilter)
    : segments;

  const selectedSegmentsList = segments.filter((s) => selectedSegmentIds.has(s.id));

  return (
    <>
      <ConsentModal
        isOpen={showConsentModal}
        onConfirm={handleConsentConfirmed}
        onCancel={() => setShowConsentModal(false)}
        isSubmitting={isStarting}
      />

      <div
        data-testid="live-transcription-widget"
        className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 max-w-[calc(100%-1.5rem)] sm:max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transition-all duration-200 select-none text-slate-800"
      >
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* Status indicator pill */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRecording
                    ? 'bg-rose-500 animate-pulse'
                    : isPaused
                    ? 'bg-amber-400'
                    : isConnecting
                    ? 'bg-sky-400 animate-ping'
                    : isReconnecting
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-xs font-semibold capitalize tracking-wide">
                {status === 'idle'
                  ? 'Live Transcription'
                  : status === 'connecting'
                  ? 'Connecting...'
                  : status === 'recording'
                  ? 'Recording Live'
                  : status === 'paused'
                  ? 'Paused'
                  : status === 'reconnecting'
                  ? 'Reconnecting, audio is being kept'
                  : status === 'completed'
                  ? 'Finished'
                  : status === 'failed'
                  ? 'Service Alert'
                  : status}
              </span>
            </div>

            {/* Audio level meter when recording or reconnecting */}
            {(isRecording || isReconnecting) && (
              <AudioLevelMeter level={level} isRecording={isRecording || isReconnecting} />
            )}
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {/* Language Selector (only selectable before start) */}
            {status === 'idle' && (
              <select
                data-testid="transcription-language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-slate-800 text-slate-200 text-[11px] rounded-lg px-2 py-1 border border-slate-700 outline-none hover:bg-slate-700 transition cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            )}

            {/* Minimize / Expand Toggle */}
            <button
              type="button"
              data-testid="transcription-toggle-expand"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isMinimized ? 'Expand transcription panel' : 'Minimize transcription panel'}
              aria-label={isMinimized ? 'Expand transcription panel' : 'Minimize transcription panel'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Body */}
        {!isMinimized && (
          <div className="flex flex-col max-h-[440px] bg-slate-50">
            {/* Tag Current Question Bar in Dock */}
            <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700 text-slate-200 flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                <Tag className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-slate-400 shrink-0">Tag current question:</span>
                <select
                  data-testid="tag-current-question-select"
                  aria-label="Tag current question"
                  value={activeQuestionTag || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    if (setActiveQuestionTag) {
                      setActiveQuestionTag(val);
                    }
                  }}
                  className="bg-slate-900 text-slate-200 text-[11px] rounded px-1.5 py-0.5 border border-slate-700 outline-none cursor-pointer truncate max-w-[170px] sm:max-w-[210px]"
                >
                  <option value="">None (untagged)</option>
                  {effectiveTierQuestions.map((q) => {
                    const qCode = (q as any).code || q.id;
                    const qText = q.question_text || (q as any).text || '';
                    return (
                      <option key={q.id} value={q.id}>
                        {qCode} - {qText.slice(0, 32)}...
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Filter indicator */}
              {questionFilter && (
                <button
                  type="button"
                  onClick={() => setQuestionFilter(null)}
                  className="ml-1 text-[10px] text-teal-300 hover:text-white flex items-center space-x-0.5 underline shrink-0 cursor-pointer"
                >
                  <span>Clear filter</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Panel-only Notification / Failure Banner */}
            {panelBanner && (
              <div
                data-testid="panel-notification-banner"
                className={`p-2 px-3 text-xs flex items-center justify-between border-b ${
                  panelBanner.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-teal-50 border-teal-200 text-teal-900'
                }`}
              >
                <div className="flex items-center space-x-1.5 min-w-0">
                  <AlertCircle
                    className={`w-3.5 h-3.5 shrink-0 ${
                      panelBanner.type === 'error' ? 'text-rose-600' : 'text-teal-700'
                    }`}
                  />
                  <span className="truncate text-[11px] font-medium">{panelBanner.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelBanner(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Context Error Banner (Non-blocking) */}
            {error && (
              <div
                data-testid="transcription-error-banner"
                className="p-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-[11px] flex items-center justify-between"
              >
                <div className="flex items-center space-x-1.5 min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span className="truncate">
                    {typeof error === 'string' ? error : error.message}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStartRequest}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold shrink-0 cursor-pointer ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Bulk Action Toolbar if segments are selected */}
            {selectedSegmentIds.size > 0 && (
              <div
                data-testid="selection-action-bar"
                className="px-3 py-1.5 bg-teal-50 border-b border-teal-200 flex items-center justify-between text-xs text-teal-950"
              >
                <span className="font-semibold text-[11px]">
                  {selectedSegmentIds.size} segment{selectedSegmentIds.size > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    data-testid="bulk-add-to-answer-btn"
                    onClick={() => openQuestionPickerForSegments(selectedSegmentsList)}
                    className="px-2 py-0.5 bg-teal-800 hover:bg-teal-900 text-white rounded text-[10px] font-semibold flex items-center space-x-1 transition cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Add to answer</span>
                  </button>
                  <button
                    type="button"
                    data-testid="bulk-add-to-obs-btn"
                    onClick={() => handleAddToObservations(selectedSegmentsList)}
                    className="px-2 py-0.5 bg-white hover:bg-teal-100 text-teal-800 border border-teal-300 rounded text-[10px] font-semibold flex items-center space-x-1 transition cursor-pointer"
                  >
                    <BookmarkPlus className="w-3 h-3" />
                    <span>Add to observations</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSegmentIds(new Set())}
                    className="text-[10px] text-slate-500 hover:text-slate-800 px-1 py-0.5 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable Transcript Feed */}
            <div
              ref={scrollContainerRef}
              data-testid="transcript-segment-feed"
              className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[160px] text-xs"
            >
              {displayedSegments.length === 0 && !interim && (
                <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400 space-y-1.5 p-4">
                  <Mic className="w-7 h-7 text-slate-300" />
                  <p className="font-medium text-slate-600">
                    {questionFilter
                      ? 'No segments tagged for this question'
                      : 'No transcription segments yet'}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    {questionFilter
                      ? 'Select another question or clear filter to view the entire transcript stream.'
                      : 'Start live transcription to capture speech-to-text in real time with speaker and question tagging.'}
                  </p>
                </div>
              )}

              {displayedSegments.map((seg) => {
                const isSelected = selectedSegmentIds.has(seg.id);
                const matchingQ = effectiveTierQuestions.find(
                  (q) => q.id === seg.question_id || q.code === seg.question_id
                );

                return (
                  <div
                    key={seg.id}
                    data-testid={`segment-item-${seg.id}`}
                    className={`rounded-xl p-2.5 border transition shadow-2xs space-y-1.5 ${
                      isSelected
                        ? 'bg-teal-50/60 border-teal-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Segment Meta Header */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        {/* Checkbox for selection */}
                        <input
                          type="checkbox"
                          aria-label={`Select segment ${seg.id}`}
                          data-testid={`select-segment-${seg.id}`}
                          checked={isSelected}
                          onChange={() => toggleSelectSegment(seg.id)}
                          className="h-3.5 w-3.5 text-teal-700 rounded border-slate-300 cursor-pointer"
                        />

                        {/* Speaker Badge */}
                        <select
                          aria-label="Assign speaker"
                          value={seg.speaker_label || 'Speaker'}
                          onChange={(e) => setSpeaker(seg.id, e.target.value)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200 text-[10px] outline-none cursor-pointer"
                        >
                          {SPEAKER_OPTIONS.map((spk) => (
                            <option key={spk} value={spk}>
                              {spk}
                            </option>
                          ))}
                        </select>

                        {/* Time Range */}
                        <span className="font-mono text-[10px] text-slate-400">
                          {formatTime(seg.start_time)} - {formatTime(seg.end_time)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {/* Question Tag / Jump to what was said */}
                        {seg.question_id ? (
                          <button
                            type="button"
                            data-testid={`jump-to-q-${seg.question_id}`}
                            onClick={() => setQuestionFilter(seg.question_id || null)}
                            className="bg-teal-50 hover:bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-teal-200 cursor-pointer transition flex items-center space-x-0.5"
                            title={`Jump to / filter what was said for ${matchingQ?.code || seg.question_id}`}
                          >
                            <span>Q: {matchingQ?.code || seg.question_id}</span>
                          </button>
                        ) : activeSectionCode ? (
                          <button
                            type="button"
                            onClick={() => tagQuestion(activeSectionCode, seg.id)}
                            title={`Tag segment with active section ${activeSectionCode}`}
                            className="text-[10px] text-slate-400 hover:text-teal-700 px-1 py-0.5 rounded hover:bg-slate-100 transition flex items-center space-x-0.5 cursor-pointer"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            <span>Tag {activeSectionCode}</span>
                          </button>
                        ) : null}

                        {/* Copy Text */}
                        <button
                          type="button"
                          onClick={() => handleCopyText(seg)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="Copy segment text"
                          aria-label="Copy segment text"
                        >
                          {copiedId === seg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Individual "Add to answer" */}
                        <button
                          type="button"
                          data-testid={`add-to-answer-${seg.id}`}
                          onClick={() => openQuestionPickerForSegments([seg])}
                          className="px-1.5 py-0.5 text-[10px] text-teal-800 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 font-semibold transition cursor-pointer flex items-center space-x-0.5"
                          title="Append this segment to a diagnostic answer"
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span>Add to answer</span>
                        </button>

                        {/* Individual "Add to observations" */}
                        <button
                          type="button"
                          data-testid={`add-to-obs-${seg.id}`}
                          onClick={() => handleAddToObservations([seg])}
                          className="px-1.5 py-0.5 text-[10px] text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 font-semibold transition cursor-pointer flex items-center space-x-0.5"
                          title="Append this segment to interviewer observations"
                        >
                          <BookmarkPlus className="w-2.5 h-2.5" />
                          <span>Add to obs</span>
                        </button>
                      </div>
                    </div>

                    {/* Transcript Content */}
                    <p className="text-slate-800 leading-snug font-normal text-xs">
                      {seg.edited_text || seg.raw_text}
                    </p>
                  </div>
                );
              })}

              {/* Real-time Interim Streaming Preview */}
              {interim && (
                <div
                  data-testid="interim-text-preview"
                  className="bg-teal-50/90 border border-teal-200/80 rounded-xl p-2.5 text-xs text-teal-950 italic animate-pulse"
                >
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-ping" />
                    <span>Transcribing...</span>
                  </div>
                  <p className="leading-snug">{interim}</p>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {status === 'idle' || status === 'completed' || status === 'failed' ? (
                  <button
                    type="button"
                    data-testid="transcription-start-btn"
                    onClick={handleStartRequest}
                    disabled={isBusy}
                    className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
                  >
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-teal-300" />
                    )}
                    <span>{status === 'completed' ? 'Transcribe Again' : 'Start Live Transcription'}</span>
                  </button>
                ) : (
                  <>
                    {/* Pause / Resume */}
                    {(isRecording || isReconnecting) && (
                      <button
                        type="button"
                        data-testid="transcription-pause-btn"
                        onClick={pause}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    )}

                    {isPaused && (
                      <button
                        type="button"
                        data-testid="transcription-resume-btn"
                        onClick={resume}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                    )}

                    {/* Stop */}
                    <button
                      type="button"
                      data-testid="transcription-stop-btn"
                      onClick={() => void stop()}
                      disabled={isStopping}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs cursor-pointer"
                    >
                      {isStopping ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      <span>Finish</span>
                    </button>
                  </>
                )}
              </div>

              {/* Tag active section button */}
              {isRecording && activeSectionCode && (
                <button
                  type="button"
                  data-testid="transcription-tag-active-btn"
                  onClick={() => tagQuestion(activeSectionCode)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 rounded-xl text-[11px] font-semibold border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
                  title={`Tag current speech to section ${activeSectionCode}`}
                >
                  <Tag className="w-3 h-3" />
                  <span>Tag #{activeSectionCode}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Question Picker Modal for "Add to answer" */}
      {questionPickerSegments && questionPickerSegments.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="question-picker-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 id="question-picker-title" className="text-sm font-bold text-slate-900">
                  Add to Diagnostic Answer
                </h3>
              </div>
              <button
                type="button"
                data-testid="question-picker-close-btn"
                onClick={() => setQuestionPickerSegments(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 space-y-3">
              {/* Formatted snippet preview */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Selected Transcript ({questionPickerSegments.length} segment{questionPickerSegments.length > 1 ? 's' : ''}):
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 max-h-24 overflow-y-auto leading-relaxed select-text">
                  {formatSegmentsWithMarkers(questionPickerSegments)}
                </div>
              </div>

              {/* Tier Question Select Picker */}
              <div>
                <label
                  htmlFor="question-picker-select"
                  className="text-[11px] font-semibold text-slate-700 block mb-1"
                >
                  Select Question ({currentInterview?.tier || 'Current Tier'} Questions):
                </label>
                <select
                  id="question-picker-select"
                  data-testid="question-picker-select"
                  aria-label="Select Question"
                  value={targetQuestionId}
                  onChange={(e) => setTargetQuestionId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-600 font-medium cursor-pointer"
                >
                  {effectiveTierQuestions.length === 0 && (
                    <option value="">No tier questions available</option>
                  )}
                  {effectiveTierQuestions.map((q) => {
                    const qCode = (q as any).code || q.id;
                    const qText = q.question_text || (q as any).text || '';
                    return (
                      <option key={q.id} value={q.id}>
                        {qCode} — {qText.slice(0, 50)}...
                      </option>
                    );
                  })}
                </select>
              </div>

              <p className="text-[11px] text-slate-500 bg-teal-50/60 p-2 rounded-lg border border-teal-100">
                <strong>Append Guarantee:</strong> The transcript text will be appended with citation marker <code>[Transcript mm:ss]</code> without overwriting existing answer content.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                data-testid="question-picker-cancel-btn"
                onClick={() => setQuestionPickerSegments(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="question-picker-confirm-btn"
                disabled={!targetQuestionId}
                onClick={handleConfirmAddToAnswer}
                className="px-4 py-1.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Append to Answer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const LiveTranscriptionPanel: React.FC<LiveTranscriptionPanelProps> = (props) => {
  return (
    <TranscriptionErrorBoundary>
      <TranscriptionProvider
        provider={props.customProvider}
        segmentWriter={props.customWriter}
        audioBuffer={props.customAudioBuffer}
      >
        <LiveTranscriptionInner {...props} />
      </TranscriptionProvider>
    </TranscriptionErrorBoundary>
  );
};

export const TranscriptPanel = LiveTranscriptionPanel;
export default LiveTranscriptionPanel;
