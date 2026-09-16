/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Answer, Interview, InterviewStatus } from '../types';
import { SAMPLE_ANSWERS_INT_001 } from '../lib/mockData';
import { getQuestionsForTier } from '../lib/questionsService';
import { isSupabaseConfigured } from '../lib/supabase';
import { isUuid, fetchAnswersFromSupabase, upsertAnswerInSupabase, updateInterviewInSupabase } from '../lib/interviewService';
import { calculateInterviewProgress, calculateNextStatus } from '../lib/interviewCalculations';
import { AutoSaveStatusType } from './useAutoSaveStatus';

interface UseAnswersStateOptions {
  userId?: string | null;
  allInterviews: Interview[];
  updateInterview: (id: string, updates: Partial<Interview>) => void;
  setAutoSaveStatus: (status: AutoSaveStatusType) => void;
}

export function useAnswersState({
  userId,
  allInterviews,
  updateInterview,
  setAutoSaveStatus,
}: UseAnswersStateOptions) {
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';

  const [answersMap, setAnswersMap] = useState<Record<string, Answer[]>>(() => {
    if (isTestEnv) {
      return {
        'int-001': SAMPLE_ANSWERS_INT_001,
      };
    }
    if (isSupabaseConfigured) {
      const saved = localStorage.getItem('mglsd_answers');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const realAnswers: Record<string, Answer[]> = {};
          Object.keys(parsed).forEach((k) => {
            if (isUuid(k)) {
              realAnswers[k] = parsed[k];
            }
          });
          return realAnswers;
        } catch {
          // ignore
        }
      }
      return {};
    }
    const saved = localStorage.getItem('mglsd_answers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      'int-001': SAMPLE_ANSWERS_INT_001,
    };
  });

  // Debounce timers map for saving answers
  const saveAnswerTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Sync to localStorage
  useEffect(() => {
    try {
      if (isSupabaseConfigured) {
        const realOnly: Record<string, Answer[]> = {};
        Object.keys(answersMap).forEach((k) => {
          if (isUuid(k)) {
            realOnly[k] = answersMap[k];
          }
        });
        localStorage.setItem('mglsd_answers', JSON.stringify(realOnly));
      } else {
        localStorage.setItem('mglsd_answers', JSON.stringify(answersMap));
      }
    } catch {
      // quota guard
    }
  }, [answersMap]);

  const getInterviewAnswers = useCallback(
    (interviewId: string): Answer[] => {
      return answersMap[interviewId] || [];
    },
    [answersMap]
  );

  const initAnswersForInterview = useCallback((interviewId: string) => {
    setAnswersMap((prev) => ({
      ...prev,
      [interviewId]: prev[interviewId] || [],
    }));
  }, []);

  const loadAnswersFromSupabase = useCallback(async (interviewId: string) => {
    if (!isSupabaseConfigured || !isUuid(interviewId)) return;
    try {
      const fetchedAnswers = await fetchAnswersFromSupabase(interviewId);
      setAnswersMap((prev) => ({
        ...prev,
        [interviewId]: fetchedAnswers || [],
      }));
    } catch (err) {
      console.warn('Notice: Error loading answers from Supabase:', err);
    }
  }, []);

  const saveAnswer = useCallback(
    (
      interviewId: string,
      questionId: string,
      text: string,
      structuredData?: Record<string, any>
    ) => {
      setAutoSaveStatus('saving');

      let updatedPct = 0;
      let nextStatus: InterviewStatus = 'In Progress';

      setAnswersMap((prev) => {
        const currentList = prev[interviewId] || [];
        const existingIdx = currentList.findIndex((a) => a.question_id === questionId);
        let updatedList: Answer[];

        if (existingIdx >= 0) {
          updatedList = [...currentList];
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            answer_text: text,
            structured_data: structuredData || updatedList[existingIdx].structured_data,
            updated_at: new Date().toISOString(),
          };
        } else {
          const newAns: Answer = {
            id: `ans-${interviewId}-${questionId}`,
            interview_id: interviewId,
            question_id: questionId,
            answer_text: text,
            structured_data: structuredData,
            updated_at: new Date().toISOString(),
          };
          updatedList = [...currentList, newAns];
        }

        // Recalculate completion percentage for this interview
        const targetInterview = allInterviews.find((it) => it.id === interviewId);
        if (targetInterview) {
          const applicableQuestions = getQuestionsForTier(targetInterview.tier);
          const progress = calculateInterviewProgress(updatedList, applicableQuestions.length);
          updatedPct = progress.completionPercentage;
          nextStatus = calculateNextStatus(updatedPct, targetInterview.status);

          // Update local interview progress
          updateInterview(interviewId, {
            completion_percentage: updatedPct,
            status: nextStatus,
          });
        }

        return {
          ...prev,
          [interviewId]: updatedList,
        };
      });

      // Debounce Supabase persistence
      const key = `${interviewId}-${questionId}`;
      if (saveAnswerTimers.current[key]) {
        clearTimeout(saveAnswerTimers.current[key]);
      }

      saveAnswerTimers.current[key] = setTimeout(async () => {
        if (isSupabaseConfigured && isUuid(interviewId)) {
          try {
            await upsertAnswerInSupabase(
              interviewId,
              questionId,
              text,
              structuredData,
              userId || undefined
            );
            await updateInterviewInSupabase(interviewId, {
              completion_percentage: updatedPct,
              status: nextStatus,
            });
            setAutoSaveStatus('saved');
          } catch {
            setAutoSaveStatus('error');
          }
        } else {
          setAutoSaveStatus('saved');
        }
      }, 450);
    },
    [allInterviews, updateInterview, userId, setAutoSaveStatus]
  );

  return {
    answersMap,
    getInterviewAnswers,
    saveAnswer,
    loadAnswersFromSupabase,
    initAnswersForInterview,
  };
}
