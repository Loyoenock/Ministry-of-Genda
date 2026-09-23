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

export const QUESTIONS_DB_ERROR_MESSAGE =
  'Diagnostic questions could not be loaded from the database. Please contact the system administrator.';

export interface QuestionsCacheMetadata {
  timestamp: number | null;
  count: number;
  source: 'supabase' | 'cache' | 'fallback' | 'unseeded_error';
  isStale: boolean;
}

// In-memory cache for loaded questions
let inMemoryQuestionsCache: Question[] | null = null;
let inMemoryCacheSource: 'supabase' | 'cache' | 'fallback' | 'unseeded_error' = 'fallback';
let lastQuestionsDatabaseError: string | null = null;

export function getQuestionsDatabaseError(): string | null {
  return lastQuestionsDatabaseError;
}

export function setQuestionsDatabaseError(msg: string | null): void {
  lastQuestionsDatabaseError = msg;
}

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
 * In production when Supabase is configured, returns [] if unseeded rather than masking with mock data.
 */
export function getCachedOrFallbackQuestions(): Question[] {
  if (inMemoryQuestionsCache && inMemoryQuestionsCache.length > 0) {
    return inMemoryQuestionsCache;
  }

  try {
    const saved = localStorage.getItem(QUESTIONS_CACHE_KEY);
    const meta = getQuestionsCacheMetadata();
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If Supabase is configured and in production, only allow cache that was sourced from Supabase
        if (isSupabaseConfigured && import.meta.env.PROD && meta.source !== 'supabase') {
          return [];
        }
        inMemoryQuestionsCache = parsed;
        inMemoryCacheSource = meta.source === 'supabase' ? 'supabase' : 'cache';
        return parsed;
      }
    }
  } catch {
    // localStorage unavailable or corrupt
  }

  // If Supabase is configured and in production, do not silently inject MASTER_QUESTIONS
  if (isSupabaseConfigured && import.meta.env.PROD) {
    return [];
  }

  inMemoryCacheSource = 'fallback';
  return MASTER_QUESTIONS;
}

/**
 * Updates the in-memory and localStorage cache with canonical questions and records metadata.
 */
export function updateQuestionsCache(
  questions: Question[],
  source: 'supabase' | 'cache' | 'fallback' | 'unseeded_error' = 'supabase'
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
 * - When isSupabaseConfigured === true and the fetch returns 0 rows:
 *   Does NOT silently fall back to MASTER_QUESTIONS in production.
 *   Logs a clear error and surfaces/throws:
 *   "Diagnostic questions could not be loaded from the database. Please contact the system administrator."
 * - Only allows the hard-coded fallback in development / test environments if explicitly permitted.
 */
export async function fetchQuestionsFromSupabase(options?: {
  forceRefresh?: boolean;
  allowDevFallback?: boolean;
}): Promise<Question[]> {
  if (!isSupabaseConfigured) {
    lastQuestionsDatabaseError = null;
    return getCachedOrFallbackQuestions();
  }

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error(
        '[CRITICAL DATABASE ERROR] Failed to fetch diagnostic questions from Supabase (public.questions):',
        error.message
      );
      lastQuestionsDatabaseError = QUESTIONS_DB_ERROR_MESSAGE;

      // Check if we have previously cached data from Supabase for offline tolerance
      const meta = getQuestionsCacheMetadata();
      if (meta.source === 'supabase' && inMemoryQuestionsCache && inMemoryQuestionsCache.length > 0) {
        console.warn('Utilizing previously cached Supabase questions during temporary network failure.');
        return inMemoryQuestionsCache;
      }

      // Check if development/test environment explicitly permits static fallback
      const isDevOrTest = Boolean(import.meta.env.DEV || import.meta.env.MODE === 'test');
      if (isDevOrTest && options?.allowDevFallback) {
        console.warn('[DEV NOTICE] Supabase query failed; falling back to TypeScript catalogue in development/test environment.');
        return getCachedOrFallbackQuestions();
      }

      throw new Error(QUESTIONS_DB_ERROR_MESSAGE);
    }

    if (data && data.length > 0) {
      lastQuestionsDatabaseError = null;
      const mapped = data.map(mapRowToQuestion);
      updateQuestionsCache(mapped, 'supabase');
      return mapped;
    }

    // CRITICAL: Supabase public.questions returned 0 rows!
    console.error(
      '[CRITICAL DATABASE INTEGRITY ERROR] Supabase public.questions table returned 0 rows! ' +
      'The master diagnostic questions catalogue has not been seeded in the remote database. ' +
      'To resolve: execute `supabase/seed.sql` in the Supabase Dashboard SQL Editor or run `npm run db:seed`.'
    );
    lastQuestionsDatabaseError = QUESTIONS_DB_ERROR_MESSAGE;

    // Invalidate stale cache
    clearQuestionsCache();

    const isDevOrTest = Boolean(import.meta.env.DEV || import.meta.env.MODE === 'test');
    if (isDevOrTest && options?.allowDevFallback) {
      console.warn('Notice: public.questions returned 0 rows; using development fallback catalogue because allowDevFallback is true.');
      return getCachedOrFallbackQuestions();
    }

    // In production or default mode when Supabase is configured: strictly do NOT silently fall back!
    throw new Error(QUESTIONS_DB_ERROR_MESSAGE);
  } catch (err: any) {
    if (err?.message === QUESTIONS_DB_ERROR_MESSAGE) {
      throw err;
    }
    console.error('[CRITICAL] Exception loading diagnostic questions from Supabase:', err);
    lastQuestionsDatabaseError = QUESTIONS_DB_ERROR_MESSAGE;

    const isDevOrTest = Boolean(import.meta.env.DEV || import.meta.env.MODE === 'test');
    if (isDevOrTest && options?.allowDevFallback) {
      return getCachedOrFallbackQuestions();
    }
    throw new Error(QUESTIONS_DB_ERROR_MESSAGE);
  }
}

/**
 * Refreshes questions cache on-demand (used by operators/admins or 24-hour scheduler).
 */
export async function refreshQuestionsCache(): Promise<{
  success: boolean;
  count: number;
  source: 'supabase' | 'cache' | 'fallback' | 'unseeded_error';
  message: string;
  error?: string;
}> {
  try {
    const questions = await fetchQuestionsFromSupabase({ forceRefresh: true });
    const meta = getQuestionsCacheMetadata();
    const isDb = meta.source === 'supabase' && questions.length > 0;

    return {
      success: isDb,
      count: questions.length,
      source: meta.source,
      message: isDb
        ? `Successfully synchronized ${questions.length} diagnostic questions from Supabase (public.questions).`
        : `Loaded ${questions.length} questions from ${meta.source === 'cache' ? 'local cache' : 'catalogue'}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      source: 'unseeded_error',
      message: err?.message || QUESTIONS_DB_ERROR_MESSAGE,
      error: err?.message || QUESTIONS_DB_ERROR_MESSAGE,
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
