/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { InterviewerNote } from '../types';
import { useQuestions } from './useQuestions';
import { useInterviews } from '../context/InterviewContext';
import { calculateProgressFromMap, countCollectedDocuments } from '../lib/interviewCalculations';

export function useInterviewFormState(interviewId: string) {
  const {
    interviews,
    getInterviewAnswers,
    saveAnswer,
    flushAnswersSave: contextFlushAnswersSave,
    getInterviewChecklist,
    updateChecklistItem,
    getInterviewNotes,
    saveNotes,
    flushNotesSave: contextFlushNotesSave,
    uploadDocumentFile,
    updateInterview,
    deleteInterview,
    completeInterview: contextCompleteInterview,
    autoSaveStatus: contextAutoSaveStatus,
    setAutoSaveStatus,
  } = useInterviews();

  const {
    questions,
    loading: questionsLoading,
    error: questionsError,
    refreshQuestions,
    getQuestionsForTier,
    getSectionsForTier,
  } = useQuestions();

  const interview = useMemo(() => {
    return interviews.find((i) => i.id === interviewId);
  }, [interviews, interviewId]);

  const answers = useMemo(() => {
    return getInterviewAnswers(interviewId);
  }, [getInterviewAnswers, interviewId]);

  const checklist = useMemo(() => {
    return getInterviewChecklist(interviewId);
  }, [getInterviewChecklist, interviewId]);

  const notes = useMemo(() => {
    return getInterviewNotes(interviewId);
  }, [getInterviewNotes, interviewId]);

  const applicableQuestions = useMemo(() => {
    if (!interview) return [];
    return getQuestionsForTier(interview.tier);
  }, [interview, getQuestionsForTier]);

  const applicableSections = useMemo(() => {
    if (!interview) return [];
    return getSectionsForTier(interview.tier);
  }, [interview, getSectionsForTier]);

  // Local answers state for snappy UI updates before debounced auto-save completes
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    answers.forEach((a) => {
      initial[a.question_id] = a.answer_text;
    });
    setLocalAnswers(initial);
  }, [interviewId, answers]);

  const handleAnswerChange = useCallback(
    (questionId: string, text: string) => {
      setLocalAnswers((prev) => ({ ...prev, [questionId]: text }));
      saveAnswer(interviewId, questionId, text);
    },
    [interviewId, saveAnswer]
  );

  // =========================================================================
  // Hardened Notes Auto-Save & State Management
  // =========================================================================
  const [localNotes, setLocalNotes] = useState<InterviewerNote>(notes);
  const lastSavedNotesRef = useRef<InterviewerNote>(notes);
  const pendingUpdatesRef = useRef<Partial<InterviewerNote>>({});
  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [localAutoSaveStatus, setLocalAutoSaveStatus] = useState<
    'saved' | 'saving' | 'error' | null
  >(null);

  // Sync state when switching interviews or when fresh external notes are loaded
  useEffect(() => {
    if (Object.keys(pendingUpdatesRef.current).length === 0) {
      setLocalNotes(notes);
      lastSavedNotesRef.current = notes;
    }
  }, [notes]);

  // Handle switching interviewId
  useEffect(() => {
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = null;
    }
    pendingUpdatesRef.current = {};
    setLocalNotes(notes);
    lastSavedNotesRef.current = notes;
  }, [interviewId]);

  // Flushes pending questionnaire answers immediately
  const flushAnswersSave = useCallback(
    async (targetInterviewId?: string) => {
      const idToFlush = targetInterviewId || interviewId;
      if (idToFlush && contextFlushAnswersSave) {
        await contextFlushAnswersSave(idToFlush);
      }
    },
    [interviewId, contextFlushAnswersSave]
  );

  // Flushes pending notes updates immediately with error rollback
  const flushNotesSave = useCallback(async () => {
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = null;
    }

    const updatesToSave = { ...pendingUpdatesRef.current };
    if (Object.keys(updatesToSave).length === 0) {
      if (contextFlushNotesSave) {
        await contextFlushNotesSave(interviewId);
      }
      return;
    }

    pendingUpdatesRef.current = {};

    try {
      setAutoSaveStatus?.('saving');
      setLocalAutoSaveStatus('saving');

      await saveNotes(interviewId, updatesToSave);

      if (contextFlushNotesSave) {
        await contextFlushNotesSave(interviewId);
      }

      // On successful save: update last saved baseline
      lastSavedNotesRef.current = {
        ...lastSavedNotesRef.current,
        ...updatesToSave,
      };
      setAutoSaveStatus?.('saved');
      setLocalAutoSaveStatus('saved');
    } catch (err) {
      console.error('Failed to auto-save notes:', err);
      // On error: roll the local state back to the last successfully saved version
      setLocalNotes(lastSavedNotesRef.current);
      pendingUpdatesRef.current = {};
      setAutoSaveStatus?.('error');
      setLocalAutoSaveStatus('error');
      throw err;
    }
  }, [interviewId, saveNotes, contextFlushNotesSave, setAutoSaveStatus]);

  // Combined helper flushing both answers and notes before interview completion
  const flushAllPendingSaves = useCallback(
    async (targetInterviewId?: string) => {
      const idToFlush = targetInterviewId || interviewId;
      await Promise.all([
        flushAnswersSave(idToFlush),
        flushNotesSave(),
      ]);
    },
    [interviewId, flushAnswersSave, flushNotesSave]
  );

  // Debounces note updates by 700ms (within 600–800ms)
  const scheduleNotesSave = useCallback(
    (newUpdates: Partial<InterviewerNote>) => {
      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        ...newUpdates,
      };

      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
      }

      setAutoSaveStatus?.('saving');
      setLocalAutoSaveStatus('saving');

      saveDebounceTimerRef.current = setTimeout(() => {
        flushNotesSave().catch(() => {});
      }, 700);
    },
    [flushNotesSave, setAutoSaveStatus]
  );

  // Cancel / flush debounced updates on unmount or navigation
  useEffect(() => {
    return () => {
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
        saveDebounceTimerRef.current = null;
      }
      const pending = { ...pendingUpdatesRef.current };
      if (Object.keys(pending).length > 0) {
        pendingUpdatesRef.current = {};
        saveNotes(interviewId, pending).catch((err) => {
          console.warn('Notice: Failed flushing notes on unmount:', err);
        });
      }
    };
  }, [interviewId, saveNotes]);

  const handleNoteFieldChange = useCallback(
    (field: keyof InterviewerNote, value: any) => {
      setLocalNotes((prev) => ({ ...prev, [field]: value }));
      scheduleNotesSave({ [field]: value });
    },
    [scheduleNotesSave]
  );

  const handleNumbersCapturedChange = useCallback(
    (metricKey: string, val: any) => {
      setLocalNotes((prev) => {
        const updatedNumbers = {
          ...(prev.numbers_captured || {}),
          [metricKey]: val,
        };
        return { ...prev, numbers_captured: updatedNumbers };
      });
      const updatedNumbers = {
        ...(localNotes.numbers_captured || {}),
        [metricKey]: val,
      };
      scheduleNotesSave({ numbers_captured: updatedNumbers });
    },
    [localNotes.numbers_captured, scheduleNotesSave]
  );

  const handleMaturityScoreChange = useCallback(
    (domain: string, score: number) => {
      setLocalNotes((prev) => {
        const updatedMaturity = {
          ...(prev.maturity_signals || {}),
          [domain]: score,
        };
        return { ...prev, maturity_signals: updatedMaturity };
      });
      const updatedMaturity = {
        ...(localNotes.maturity_signals || {}),
        [domain]: score,
      };
      scheduleNotesSave({ maturity_signals: updatedMaturity });
    },
    [localNotes.maturity_signals, scheduleNotesSave]
  );

  // Metrics
  const { answeredCount, completionPercentage: overallPercentage } = useMemo(() => {
    return calculateProgressFromMap(localAnswers, applicableQuestions);
  }, [localAnswers, applicableQuestions]);

  const collectedDocsCount = useMemo(() => {
    return countCollectedDocuments(checklist);
  }, [checklist]);

  const effectiveAutoSaveStatus = localAutoSaveStatus ?? contextAutoSaveStatus;

  return {
    interview,
    answers,
    checklist,
    notes,
    applicableQuestions,
    applicableSections,
    localAnswers,
    handleAnswerChange,
    localNotes,
    handleNoteFieldChange,
    handleNumbersCapturedChange,
    handleMaturityScoreChange,
    flushAnswersSave,
    flushNotesSave,
    flushAllPendingSaves,
    answeredCount,
    overallPercentage,
    collectedDocsCount,
    updateChecklistItem,
    uploadDocumentFile,
    updateInterview,
    deleteInterview,
    completeInterview: contextCompleteInterview,
    autoSaveStatus: effectiveAutoSaveStatus,
    questionsLoading,
    questionsError,
    refreshQuestions,
  };
}
