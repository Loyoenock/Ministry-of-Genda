/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { Question, InterviewTier } from '../types';
import { MASTER_QUESTIONS } from './questionsData';

export interface SectionConfig {
  code: string;
  title: string;
  count: number;
}

// In-memory cache for loaded questions
let inMemoryQuestionsCache: Question[] | null = null;

/**
 * Maps a raw database row from public.questions to the frontend Question domain model.
 */
export function mapRowToQuestion(row: any): Question {
  return {
    id: row.id,
    section_code: row.section_code,
    section_title: row.section_title,
    question_text: row.question_text,
    who_to_ask: row.who_to_ask,
    prompt_hints: row.prompt_hints || '',
    applicable_tiers: (row.applicable_tiers || []) as InterviewTier[],
    response_type: row.response_type || 'text',
    sort_order: Number(row.sort_order) || 0,
    statutory_reference: row.statutory_reference,
  };
}

/**
 * Retrieves cached questions from memory or localStorage, falling back to the demo/offline catalogue.
 */
export function getCachedOrFallbackQuestions(): Question[] {
  if (inMemoryQuestionsCache && inMemoryQuestionsCache.length > 0) {
    return inMemoryQuestionsCache;
  }

  try {
    const saved = localStorage.getItem('mglsd_questions_cache');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryQuestionsCache = parsed;
        return parsed;
      }
    }
  } catch {
    // localStorage unavailable or corrupt
  }

  return MASTER_QUESTIONS;
}

/**
 * Updates the in-memory and localStorage cache with canonical questions.
 */
export function updateQuestionsCache(questions: Question[]): void {
  inMemoryQuestionsCache = questions;
  try {
    localStorage.setItem('mglsd_questions_cache', JSON.stringify(questions));
  } catch {
    // localStorage quota guard
  }
}

/**
 * Clears cached questions.
 */
export function clearQuestionsCache(): void {
  inMemoryQuestionsCache = null;
  try {
    localStorage.removeItem('mglsd_questions_cache');
  } catch {
    // ignore
  }
}

/**
 * Fetches the master diagnostic questions catalogue from the Supabase public.questions table.
 * If Supabase is unconfigured, unreachable, or returns no rows, falls back gracefully to the
 * offline/demo master catalogue.
 */
export async function fetchQuestionsFromSupabase(): Promise<Question[]> {
  if (!isSupabaseConfigured) {
    return getCachedOrFallbackQuestions();
  }

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Notice: Failed to fetch questions from Supabase, falling back to cache:', error.message);
      return getCachedOrFallbackQuestions();
    }

    if (data && data.length > 0) {
      const mapped = data.map(mapRowToQuestion);
      updateQuestionsCache(mapped);
      return mapped;
    }

    // If table exists but is empty, fallback to demo questions
    return getCachedOrFallbackQuestions();
  } catch (err) {
    console.warn('Notice: Exception fetching questions from Supabase, using fallback:', err);
    return getCachedOrFallbackQuestions();
  }
}

/**
 * Filters questions for a given institutional tier.
 * Accepts an optional array of questions; otherwise uses the active database/cached questions.
 */
export function getQuestionsForTier(
  tier: InterviewTier,
  sourceQuestions?: Question[]
): Question[] {
  const pool = sourceQuestions && sourceQuestions.length > 0
    ? sourceQuestions
    : getCachedOrFallbackQuestions();

  return pool.filter((q) => q.applicable_tiers.includes(tier));
}

/**
 * Generates section configuration and counts for a given institutional tier.
 * Accepts an optional array of questions; otherwise uses the active database/cached questions.
 */
export function getSectionsForTier(
  tier: InterviewTier,
  sourceQuestions?: Question[]
): SectionConfig[] {
  const questions = getQuestionsForTier(tier, sourceQuestions);
  const sectionMap = new Map<string, SectionConfig>();

  for (const q of questions) {
    if (!sectionMap.has(q.section_code)) {
      sectionMap.set(q.section_code, {
        code: q.section_code,
        title: q.section_title,
        count: 0,
      });
    }
    sectionMap.get(q.section_code)!.count++;
  }

  return Array.from(sectionMap.values());
}
