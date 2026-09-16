/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { InterviewerNote } from '../types';
import { useQuestions } from './useQuestions';
import { useInterviews } from '../context/InterviewContext';
import { calculateProgressFromMap, countCollectedDocuments } from '../lib/interviewCalculations';

export function useInterviewFormState(interviewId: string) {
  const {
    interviews,
    getInterviewAnswers,
    saveAnswer,
    getInterviewChecklist,
    updateChecklistItem,
    getInterviewNotes,
    saveNotes,
    uploadDocumentFile,
    updateInterview,
    autoSaveStatus,
  } = useInterviews();

  const { questions, getQuestionsForTier, getSectionsForTier, loading: questionsLoading } = useQuestions();

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

  // Local notes state
  const [localNotes, setLocalNotes] = useState<InterviewerNote>(notes);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleNoteFieldChange = useCallback(
    (field: keyof InterviewerNote, value: any) => {
      const updated = { ...localNotes, [field]: value };
      setLocalNotes(updated);
      saveNotes(interviewId, { [field]: value });
    },
    [interviewId, localNotes, saveNotes]
  );

  const handleNumbersCapturedChange = useCallback(
    (metricKey: string, val: any) => {
      const updatedNumbers = {
        ...localNotes.numbers_captured,
        [metricKey]: val,
      };
      const updated = { ...localNotes, numbers_captured: updatedNumbers };
      setLocalNotes(updated);
      saveNotes(interviewId, { numbers_captured: updatedNumbers });
    },
    [interviewId, localNotes, saveNotes]
  );

  const handleMaturityScoreChange = useCallback(
    (domain: string, score: number) => {
      const updatedMaturity = {
        ...localNotes.maturity_signals,
        [domain]: score,
      };
      const updated = { ...localNotes, maturity_signals: updatedMaturity };
      setLocalNotes(updated);
      saveNotes(interviewId, { maturity_signals: updatedMaturity });
    },
    [interviewId, localNotes, saveNotes]
  );

  // Metrics
  const { answeredCount, completionPercentage: overallPercentage } = useMemo(() => {
    return calculateProgressFromMap(localAnswers, applicableQuestions);
  }, [localAnswers, applicableQuestions]);

  const collectedDocsCount = useMemo(() => {
    return countCollectedDocuments(checklist);
  }, [checklist]);

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
    answeredCount,
    overallPercentage,
    collectedDocsCount,
    updateChecklistItem,
    uploadDocumentFile,
    updateInterview,
    autoSaveStatus,
  };
}
