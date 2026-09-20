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
  QuestionsCacheMetadata,
  SectionConfig,
} from '../lib/questionsService';

/**
 * Hook providing reactive access to the master questions catalogue.
 * Automatically loads from the Supabase database at runtime when configured,
 * caches in memory & localStorage, checks 24-hour freshness, and seamlessly
 * falls back to the offline/cached catalogue when offline or in demo mode.
 */
export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>(() => getCachedOrFallbackQuestions());
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
      }
      return data;
    } catch (err: any) {
      setError(err?.message || 'Error loading questions from database');
      const fallback = getCachedOrFallbackQuestions();
      setQuestions(fallback);
      setCacheMeta(getQuestionsCacheMetadata());
      return fallback;
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
