/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Question, InterviewTier } from '../types';
import {
  fetchQuestionsFromSupabase,
  getQuestionsForTier as filterQuestionsForTier,
  getSectionsForTier as filterSectionsForTier,
  getCachedOrFallbackQuestions,
  getQuestionsCacheMetadata,
  isQuestionsCacheStale,
  QUESTIONS_DB_ERROR_MESSAGE,
  QuestionsCacheMetadata,
  SectionConfig,
} from '../lib/questionsService';
import { isSupabaseConfigured } from '../lib/supabase';

/**
 * Hook providing reactive access to the master questions catalogue.
 * Automatically loads from the Supabase database at runtime when configured,
 * caches in memory & localStorage, checks 24-hour freshness, and exposes clear
 * error state when the remote database catalogue is unseeded.
 */
export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>(() => {
    const meta = getQuestionsCacheMetadata();
    // If Supabase is configured and questions have not been verified from Supabase, start empty
    if (isSupabaseConfigured && meta.source !== 'supabase') {
      return [];
    }
    return getCachedOrFallbackQuestions();
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheMeta, setCacheMeta] = useState<QuestionsCacheMetadata>(() => getQuestionsCacheMetadata());

  const loadQuestions = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuestionsFromSupabase({ forceRefresh });
      if (data && data.length > 0) {
        setQuestions(data);
        setCacheMeta(getQuestionsCacheMetadata());
        setError(null);
      } else {
        setQuestions([]);
        setError(QUESTIONS_DB_ERROR_MESSAGE);
      }
      return data;
    } catch (err: any) {
      const errorMsg = err?.message || QUESTIONS_DB_ERROR_MESSAGE;
      setError(errorMsg);
      const meta = getQuestionsCacheMetadata();
      if (meta.source === 'supabase') {
        const cached = getCachedOrFallbackQuestions();
        setQuestions(cached);
      } else {
        if (isSupabaseConfigured) {
          setQuestions([]);
        } else {
          setQuestions(getCachedOrFallbackQuestions());
        }
      }
      setCacheMeta(getQuestionsCacheMetadata());
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // On first use or app start, attempt fetchQuestionsFromSupabase()
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Automatic periodic check: if cache is older than 24 hours, re-fetch
  useEffect(() => {
    if (isQuestionsCacheStale()) {
      loadQuestions(true);
    }
  }, [loadQuestions]);

  const getQuestionsForTier = useCallback(
    (tier: InterviewTier): Question[] => {
      return filterQuestionsForTier(tier, questions);
    },
    [questions]
  );

  const getSectionsForTier = useCallback(
    (tier: InterviewTier): SectionConfig[] => {
      return filterSectionsForTier(tier, questions);
    },
    [questions]
  );

  return {
    questions,
    loading,
    error,
    cacheMeta,
    refreshQuestions: loadQuestions,
    getQuestionsForTier,
    getSectionsForTier,
  };
}
