/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef } from 'react';
import { Answer, Interview, InterviewStatus } from '../types';
import { getQuestionsForTier } from '../lib/questionsService';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  isUuid,
  fetchAnswersFromSupabase,
  upsertAnswerInSupabase,
  updateInterviewInSupabase,
  ensureInterviewPersisted,
} from '../lib/interviewService';
import { calculateInterviewProgress, calculateNextStatus } from '../lib/interviewCalculations';
import { AutoSaveStatusType } from './useAutoSaveStatus';

interface PendingSaveItem {
  interviewId: string;
  questionId: string;
  text: string;
  structuredData?: Record<string, any>;
  updatedPct: number;
  nextStatus: InterviewStatus;
}

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
  // Pure Supabase-driven in-memory cache for active interview sessions
  const [answersMap, setAnswersMap] = useState<Record<string, Answer[]>>({});

  // Debounce timers map for saving answers
  const saveAnswerTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingSaves = useRef<Record<string, PendingSaveItem>>({});

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

  const removeAnswersForInterview = useCallback((interviewId: string) => {
    // Clear any timers for this interview
    Object.keys(saveAnswerTimers.current).forEach((key) => {
      if (key.startsWith(`${interviewId}-`)) {
        clearTimeout(saveAnswerTimers.current[key]);
        delete saveAnswerTimers.current[key];
        delete pendingSaves.current[key];
      }
    });

    setAnswersMap((prev) => {
      const copy = { ...prev };
      delete copy[interviewId];
      return copy;
    });
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

  /**
   * Flushes all pending debounced answers for an interview to Supabase immediately.
   */
  const flushAnswersSave = useCallback(
    async (interviewId: string): Promise<void> => {
      const keysToFlush = Object.keys(pendingSaves.current).filter((k) =>
        k.startsWith(`${interviewId}-`)
      );

      if (keysToFlush.length === 0) return;

      const savesToExecute: PendingSaveItem[] = [];
      keysToFlush.forEach((k) => {
        if (saveAnswerTimers.current[k]) {
          clearTimeout(saveAnswerTimers.current[k]);
          delete saveAnswerTimers.current[k];
        }
        savesToExecute.push(pendingSaves.current[k]);
        delete pendingSaves.current[k];
      });

      if (!isSupabaseConfigured || !isUuid(interviewId)) {
        setAutoSaveStatus('saved');
        return;
      }

      try {
        await ensureInterviewPersisted(interviewId);
        const failedSaves: PendingSaveItem[] = [];
        for (const item of savesToExecute) {
          try {
            const saved = await upsertAnswerInSupabase(
              item.interviewId,
              item.questionId,
              item.text,
              item.structuredData,
              userId || undefined
            );
            if (!saved) throw new Error('Answer upsert returned no data');
          } catch (err) {
            console.error('[answers] flush item failed', err);
            failedSaves.push(item);
            const fKey = `${item.interviewId}-${item.questionId}`;
            pendingSaves.current[fKey] = item;
          }
        }

        if (failedSaves.length > 0) {
          setAutoSaveStatus('error');
          throw new Error(`Failed to persist ${failedSaves.length} answers during flush.`);
        }

        if (savesToExecute.length > 0) {
          const latest = savesToExecute[savesToExecute.length - 1];
          await updateInterviewInSupabase(interviewId, {
            completion_percentage: latest.updatedPct,
            status: latest.nextStatus,
          });
        }
        setAutoSaveStatus('saved');
      } catch (err) {
        setAutoSaveStatus('error');
        console.error('Error flushing pending answers:', err);
        throw err;
      }
    },
    [userId, setAutoSaveStatus]
  );

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

      const key = `${interviewId}-${questionId}`;
      pendingSaves.current[key] = {
        interviewId,
        questionId,
        text,
        structuredData,
        updatedPct,
        nextStatus,
      };

      if (saveAnswerTimers.current[key]) {
        clearTimeout(saveAnswerTimers.current[key]);
      }

      saveAnswerTimers.current[key] = setTimeout(async () => {
        delete saveAnswerTimers.current[key];
        delete pendingSaves.current[key];

        if (isSupabaseConfigured && isUuid(interviewId)) {
          try {
            await ensureInterviewPersisted(interviewId);
            const saved = await upsertAnswerInSupabase(
              interviewId,
              questionId,
              text,
              structuredData,
              userId || undefined
            );
            if (!saved) throw new Error('Answer upsert returned no data');
            await updateInterviewInSupabase(interviewId, {
              completion_percentage: updatedPct,
              status: nextStatus,
            });
            setAutoSaveStatus('saved');
          } catch (err) {
            console.error('[answers] persist failed', err);
            setAutoSaveStatus('error');
            pendingSaves.current[key] = {
              interviewId,
              questionId,
              text,
              structuredData,
              updatedPct,
              nextStatus,
            };
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
    flushAnswersSave,
    loadAnswersFromSupabase,
    initAnswersForInterview,
    removeAnswersForInterview,
  };
}
