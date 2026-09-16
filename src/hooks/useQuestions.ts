/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Question, InterviewTier } from '../types';
import {
  fetchQuestionsFromSupabase,
  getQuestionsForTier as filterQuestionsForTier,
  getSectionsForTier as filterSectionsForTier,
  getCachedOrFallbackQuestions,
  SectionConfig,
} from '../lib/questionsService';

/**
 * Hook providing reactive access to the master questions catalogue.
 * Automatically loads from the Supabase database at runtime when configured,
 * and seamlessly falls back to the offline/cached catalogue when offline or in demo mode.
 */
export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>(() => getCachedOrFallbackQuestions());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuestionsFromSupabase();
      if (data && data.length > 0) {
        setQuestions(data);
      }
      return data;
    } catch (err: any) {
      setError(err?.message || 'Error loading questions from database');
      return getCachedOrFallbackQuestions();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
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
    refreshQuestions: loadQuestions,
    getQuestionsForTier,
    getSectionsForTier,
  };
}
