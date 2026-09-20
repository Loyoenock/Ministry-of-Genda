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

export const QUESTIONS_CACHE_KEY = 'mglsd_questions_cache';
export const QUESTIONS_CACHE_META_KEY = 'mglsd_questions_cache_meta';
export const QUESTIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24-hour cache TTL

export interface QuestionsCacheMetadata {
  timestamp: number | null;
  count: number;
  source: 'supabase' | 'cache' | 'fallback';
  isStale: boolean;
}

// In-memory cache for loaded questions
let inMemoryQuestionsCache: Question[] | null = null;
let inMemoryCacheSource: 'supabase' | 'cache' | 'fallback' = 'fallback';

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
 * Retrieves cache metadata including timestamp, row count, and provenance source.
 */
export function getQuestionsCacheMetadata(): QuestionsCacheMetadata {
  try {
    const raw = localStorage.getItem(QUESTIONS_CACHE_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const timestamp = parsed.timestamp || null;
      const age = timestamp ? Date.now() - timestamp : Infinity;
      return {
        timestamp,
        count: typeof parsed.count === 'number' ? parsed.count : 0,
        source: parsed.source || 'cache',
        isStale: age > QUESTIONS_CACHE_TTL_MS,
      };
    }
  } catch {
    // localStorage unavailable
  }

  return {
    timestamp: null,
    count: inMemoryQuestionsCache ? inMemoryQuestionsCache.length : 0,
    source: inMemoryQuestionsCache ? inMemoryCacheSource : 'fallback',
    isStale: true,
  };
}

/**
 * Checks if the questions cache is expired (>24 hours) or uninitialized.
 */
export function isQuestionsCacheStale(): boolean {
  return getQuestionsCacheMetadata().isStale;
}

/**
 * Retrieves cached questions from memory or localStorage, falling back to the demo/offline catalogue.
 */
export function getCachedOrFallbackQuestions(): Question[] {
  if (inMemoryQuestionsCache && inMemoryQuestionsCache.length > 0) {
    return inMemoryQuestionsCache;
  }

  try {
    const saved = localStorage.getItem(QUESTIONS_CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryQuestionsCache = parsed;
        inMemoryCacheSource = 'cache';
        return parsed;
      }
    }
  } catch {
    // localStorage unavailable or corrupt
  }

  inMemoryCacheSource = 'fallback';
  return MASTER_QUESTIONS;
}

/**
 * Updates the in-memory and localStorage cache with canonical questions and records metadata.
 */
export function updateQuestionsCache(
  questions: Question[],
  source: 'supabase' | 'cache' | 'fallback' = 'supabase'
): void {
  inMemoryQuestionsCache = questions;
  inMemoryCacheSource = source;
  try {
    localStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify(questions));
    localStorage.setItem(
      QUESTIONS_CACHE_META_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        count: questions.length,
        source,
      })
    );
  } catch {
    // localStorage quota guard
  }
}

/**
 * Clears cached questions and associated metadata from memory and localStorage.
 */
export function clearQuestionsCache(): void {
  inMemoryQuestionsCache = null;
  inMemoryCacheSource = 'fallback';
  try {
    localStorage.removeItem(QUESTIONS_CACHE_KEY);
    localStorage.removeItem(QUESTIONS_CACHE_META_KEY);
  } catch {
    // ignore
  }
}

/**
 * Fetches the master diagnostic questions catalogue from the Supabase public.questions table.
 * Supabase is the primary single source of truth:
 * - On success: Caches in memory and localStorage (key `mglsd_questions_cache`) with 24-hour timestamp metadata.
 * - On failure, timeout, or zero rows: Falls back to cached questions, or the offline MASTER_QUESTIONS catalogue.
 */
export async function fetchQuestionsFromSupabase(options?: {
  forceRefresh?: boolean;
}): Promise<Question[]> {
  if (!isSupabaseConfigured) {
    return getCachedOrFallbackQuestions();
  }

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Notice: Failed to fetch questions from Supabase, falling back to cache/catalogue:', error.message);
      return getCachedOrFallbackQuestions();
    }

    if (data && data.length > 0) {
      const mapped = data.map(mapRowToQuestion);
      updateQuestionsCache(mapped, 'supabase');
      return mapped;
    }

    // If table exists but returns 0 rows, log and fall back
    console.warn('Notice: Supabase public.questions table returned 0 rows, using fallback catalogue.');
    return getCachedOrFallbackQuestions();
  } catch (err) {
    console.warn('Notice: Exception fetching questions from Supabase, using fallback:', err);
    return getCachedOrFallbackQuestions();
  }
}

/**
 * Refreshes questions cache on-demand (used by operators/admins or 24-hour scheduler).
 */
export async function refreshQuestionsCache(): Promise<{
  success: boolean;
  count: number;
  source: 'supabase' | 'cache' | 'fallback';
  message: string;
}> {
  try {
    const questions = await fetchQuestionsFromSupabase({ forceRefresh: true });
    const meta = getQuestionsCacheMetadata();
    const isDb = meta.source === 'supabase';

    return {
      success: isDb,
      count: questions.length,
      source: meta.source,
      message: isDb
        ? `Successfully synchronized ${questions.length} diagnostic questions from Supabase (public.questions).`
        : `Loaded ${questions.length} questions from ${meta.source === 'cache' ? 'local cache' : 'offline fallback catalogue'}.`,
    };
  } catch (err: any) {
    const fallback = getCachedOrFallbackQuestions();
    return {
      success: false,
      count: fallback.length,
      source: 'fallback',
      message: `Failed to refresh from database: ${err?.message || 'Network error'}. Using offline safety net.`,
    };
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
