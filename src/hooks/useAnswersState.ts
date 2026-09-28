/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
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
  version: number;
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
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear timers on unmount to prevent stale background saves from falsely reporting success
      Object.keys(saveAnswerTimers.current).forEach((key) => {
        clearTimeout(saveAnswerTimers.current[key]);
        delete saveAnswerTimers.current[key];
      });
    };
  }, []);

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
      }
    });

    Object.keys(pendingSaves.current).forEach((key) => {
      if (key.startsWith(`${interviewId}-`)) {
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

      // Clear any pending timers for these items
      keysToFlush.forEach((k) => {
        if (saveAnswerTimers.current[k]) {
          clearTimeout(saveAnswerTimers.current[k]);
          delete saveAnswerTimers.current[k];
        }
      });

      if (keysToFlush.length === 0) return;

      if (!isSupabaseConfigured || !isUuid(interviewId)) {
        // Local/demo mode: mark pending items as saved in memory
        keysToFlush.forEach((k) => {
          delete pendingSaves.current[k];
        });
        if (Object.keys(pendingSaves.current).length === 0) {
          setAutoSaveStatus('saved');
        }
        return;
      }

      setAutoSaveStatus('saving');
      const itemsToFlush = keysToFlush.map((k) => ({
        key: k,
        item: pendingSaves.current[k],
      }));

      try {
        await ensureInterviewPersisted(interviewId);
        const failedKeys: string[] = [];

        for (const { key, item } of itemsToFlush) {
          try {
            const saved = await upsertAnswerInSupabase(
              item.interviewId,
              item.questionId,
              item.text,
              item.structuredData,
              userId || undefined
            );
            if (!saved) throw new Error('Answer upsert returned no data');

            // Only delete from pendingSaves if a newer edit hasn't been scheduled while in-flight
            if (pendingSaves.current[key]?.version === item.version) {
              delete pendingSaves.current[key];
            }
          } catch (itemErr) {
            console.error('[answers] flush item failed', itemErr);
            failedKeys.push(key);
            // Failed item remains in pendingSaves for subsequent retry
          }
        }

        if (failedKeys.length > 0) {
          setAutoSaveStatus('error');
          throw new Error(`Failed to persist ${failedKeys.length} answers during flush.`);
        }

        if (itemsToFlush.length > 0) {
          const latest = itemsToFlush[itemsToFlush.length - 1].item;
          await updateInterviewInSupabase(interviewId, {
            completion_percentage: latest.updatedPct,
            status: latest.nextStatus,
          });
        }

        if (Object.keys(pendingSaves.current).length === 0) {
          setAutoSaveStatus('saved');
        }
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
      const nextVersion = (pendingSaves.current[key]?.version || 0) + 1;
      const saveItem: PendingSaveItem = {
        interviewId,
        questionId,
        text,
        structuredData,
        updatedPct,
        nextStatus,
        version: nextVersion,
      };
      pendingSaves.current[key] = saveItem;

      if (saveAnswerTimers.current[key]) {
        clearTimeout(saveAnswerTimers.current[key]);
      }

      saveAnswerTimers.current[key] = setTimeout(async () => {
        delete saveAnswerTimers.current[key];
        if (!isMountedRef.current) return;

        if (!isSupabaseConfigured || !isUuid(interviewId)) {
          // Local/demo mode: success after debounce window
          if (pendingSaves.current[key]?.version === saveItem.version) {
            delete pendingSaves.current[key];
          }
          if (Object.keys(pendingSaves.current).length === 0) {
            setAutoSaveStatus('saved');
          }
          return;
        }

        // Supabase mode
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

          if (!isMountedRef.current) return;

          // Only delete if user hasn't made a newer edit in the meantime
          if (pendingSaves.current[key]?.version === saveItem.version) {
            delete pendingSaves.current[key];
          }

          // Only report 'saved' if no pending writes remain across any question
          if (Object.keys(pendingSaves.current).length === 0) {
            setAutoSaveStatus('saved');
          }
        } catch (err) {
          console.error('[answers] persist failed', err);
          if (isMountedRef.current) {
            setAutoSaveStatus('error');
          }
          // The item remains in pendingSaves.current[key] for retry via flushAnswersSave
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
