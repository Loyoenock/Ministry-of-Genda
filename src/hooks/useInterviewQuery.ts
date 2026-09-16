/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useInterviews } from '../context/InterviewContext';
import { Interview, Answer, DocumentItem, InterviewerNote } from '../types';

/**
 * Hook providing direct reactive access to a single interview and its related
 * answers, documents checklist, and interviewer notes.
 */
export function useInterviewDetail(interviewId: string | null) {
  const {
    interviews,
    getInterviewAnswers,
    saveAnswer,
    getInterviewChecklist,
    updateChecklistItem,
    getInterviewNotes,
    saveNotes,
    uploadDocumentFile,
    autoSaveStatus,
    loading,
    error,
  } = useInterviews();

  const interview = interviews.find((it) => it.id === interviewId) || null;
  const answers = interviewId ? getInterviewAnswers(interviewId) : [];
  const checklist = interviewId ? getInterviewChecklist(interviewId) : [];
  const notes = interviewId ? getInterviewNotes(interviewId) : null;

  return {
    interview,
    answers,
    checklist,
    notes,
    saveAnswer,
    updateChecklistItem,
    saveNotes,
    uploadDocumentFile,
    autoSaveStatus,
    loading,
    error,
  };
}

/**
 * Hook to manage debounced auto-saving for form inputs
 */
export function useDebouncedSave<T>(
  onSave: (val: T) => void | Promise<void>,
  delayMs: number = 400
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSave = useCallback(
    (value: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onSave(value);
      }, delayMs);
    },
    [onSave, delayMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return triggerSave;
}
