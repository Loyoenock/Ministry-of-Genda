/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchQuestionsFromSupabase,
  mapRowToQuestion,
  getCachedOrFallbackQuestions,
  updateQuestionsCache,
  clearQuestionsCache,
  getQuestionsForTier,
  getSectionsForTier,
  getQuestionsCacheMetadata,
  isQuestionsCacheStale,
  refreshQuestionsCache,
  QUESTIONS_DB_ERROR_MESSAGE,
} from '../lib/questionsService';
import { Question } from '../types';
import * as supabaseModule from '../lib/supabase';

describe('Questions Service & Dynamic Database Loading Engine', () => {
  beforeEach(() => {
    clearQuestionsCache();
    localStorage.clear();
    vi.restoreAllMocks();
    supabaseModule.setSupabaseConfiguredForTesting(false);
  });

  it('maps raw Supabase questions table row to frontend Question model', () => {
    const rawRow = {
      id: 'A99',
      section_code: 'A',
      section_title: 'Section A: Strategy & Policy',
      question_text: 'What are the strategic directives?',
      who_to_ask: 'Minister',
      prompt_hints: 'Probe policy goals',
      applicable_tiers: ['Leadership', 'Management'],
      response_type: 'text',
      sort_order: 10,
    };

    const question = mapRowToQuestion(rawRow);
    expect(question.id).toBe('A99');
    expect(question.section_code).toBe('A');
    expect(question.applicable_tiers).toEqual(['Leadership', 'Management']);
    expect(question.prompt_hints).toBe('Probe policy goals');
    expect(question.sort_order).toBe(10);
  });

  it('returns offline/demo fallback questions when Supabase is not configured', async () => {
    const questions = await fetchQuestionsFromSupabase();
    expect(questions.length).toBeGreaterThan(45);
    expect(questions.some((q) => q.id === 'A1')).toBe(true);
    expect(questions.some((q) => q.id === 'W1')).toBe(true);
  });

  it('correctly caches questions in memory and localStorage', () => {
    const mockQuestions: Question[] = [
      {
        id: 'CUSTOM-1',
        section_code: 'A',
        section_title: 'Custom Section A',
        question_text: 'Custom question loaded from db?',
        who_to_ask: 'Commissioner',
        applicable_tiers: ['Leadership'],
        response_type: 'text',
        sort_order: 1,
      },
    ];

    updateQuestionsCache(mockQuestions, 'supabase');

    const cached = getCachedOrFallbackQuestions();
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('CUSTOM-1');

    // Check localStorage
    const savedInStorage = JSON.parse(localStorage.getItem('mglsd_questions_cache') || '[]');
    expect(savedInStorage).toHaveLength(1);
    expect(savedInStorage[0].id).toBe('CUSTOM-1');

    // Clearing cache reverts to fallback
    clearQuestionsCache();
    const afterClear = getCachedOrFallbackQuestions();
    expect(afterClear.length).toBeGreaterThan(40);
  });

  it('mocks a successful Supabase response and asserts the cache is updated', async () => {
    supabaseModule.setSupabaseConfiguredForTesting(true);

    const mockDbRows = [
      {
        id: 'SUPA-1',
        section_code: 'A',
        section_title: 'Strategy & Mandate',
        question_text: 'Live question from Supabase public.questions table?',
        who_to_ask: 'Permanent Secretary',
        prompt_hints: 'Probe strategic plans',
        applicable_tiers: ['Leadership', 'Management'],
        response_type: 'text',
        sort_order: 1,
      },
      {
        id: 'SUPA-2',
        section_code: 'B',
        section_title: 'Dispute Resolution',
        question_text: 'Arbitration processes in Labour Directorate?',
        who_to_ask: 'Industrial Court Registrar',
        prompt_hints: 'Probe case backlog',
        applicable_tiers: ['Leadership'],
        response_type: 'text',
        sort_order: 2,
      },
    ];

    const fromSpy = vi.spyOn(supabaseModule.supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockDbRows,
          error: null,
        }),
      }),
    } as any);

    const questions = await fetchQuestionsFromSupabase();

    expect(fromSpy).toHaveBeenCalledWith('questions');
    expect(questions).toHaveLength(2);
    expect(questions[0].id).toBe('SUPA-1');
    expect(questions[1].id).toBe('SUPA-2');

    // Assert in-memory and localStorage cache are updated
    const cached = getCachedOrFallbackQuestions();
    expect(cached).toHaveLength(2);
    expect(cached[0].id).toBe('SUPA-1');

    const rawStorage = localStorage.getItem('mglsd_questions_cache');
    expect(rawStorage).toBeTruthy();
    const stored = JSON.parse(rawStorage!);
    expect(stored).toHaveLength(2);
    expect(stored[0].id).toBe('SUPA-1');

    const meta = getQuestionsCacheMetadata();
    expect(meta.source).toBe('supabase');
    expect(meta.count).toBe(2);
    expect(meta.timestamp).toBeGreaterThan(0);
    expect(meta.isStale).toBe(false);
  });

  it('strictly rejects silent fallback and throws QUESTIONS_DB_ERROR_MESSAGE on network failure when Supabase is configured', async () => {
    supabaseModule.setSupabaseConfiguredForTesting(true);

    // Mock network rejection
    vi.spyOn(supabaseModule.supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockRejectedValue(new Error('Network disconnected or offline')),
      }),
    } as any);

    // Default call must NOT silently mask the failure
    await expect(fetchQuestionsFromSupabase()).rejects.toThrow(QUESTIONS_DB_ERROR_MESSAGE);

    // When allowDevFallback is explicitly set, fallback is permitted
    const fallbackQuestions = await fetchQuestionsFromSupabase({ allowDevFallback: true });
    expect(fallbackQuestions.length).toBeGreaterThan(45);
    expect(fallbackQuestions.some((q) => q.id === 'A1')).toBe(true);
  });

  it('strictly throws QUESTIONS_DB_ERROR_MESSAGE when Supabase query returns an error payload', async () => {
    supabaseModule.setSupabaseConfiguredForTesting(true);

    vi.spyOn(supabaseModule.supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'relation "questions" does not exist', code: '42P01' },
        }),
      }),
    } as any);

    await expect(fetchQuestionsFromSupabase()).rejects.toThrow(QUESTIONS_DB_ERROR_MESSAGE);
  });

  it('strictly throws QUESTIONS_DB_ERROR_MESSAGE and purges cache when public.questions returns 0 rows', async () => {
    supabaseModule.setSupabaseConfiguredForTesting(true);

    vi.spyOn(supabaseModule.supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    } as any);

    await expect(fetchQuestionsFromSupabase()).rejects.toThrow(QUESTIONS_DB_ERROR_MESSAGE);
  });

  it('handles 24-hour cache expiry correctly via isQuestionsCacheStale', () => {
    updateQuestionsCache([
      {
        id: 'T1',
        section_code: 'A',
        section_title: 'Sec A',
        question_text: 'Text',
        who_to_ask: 'Anyone',
        applicable_tiers: ['Leadership'],
        response_type: 'text',
        sort_order: 1,
      },
    ]);

    expect(isQuestionsCacheStale()).toBe(false);

    // Simulate 25 hours elapsed
    const yesterday = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem(
      'mglsd_questions_cache_meta',
      JSON.stringify({
        timestamp: yesterday,
        count: 1,
        source: 'supabase',
      })
    );

    expect(isQuestionsCacheStale()).toBe(true);
  });

  it('refreshQuestionsCache returns structured status and updates cache', async () => {
    supabaseModule.setSupabaseConfiguredForTesting(true);

    const mockDbRows = [
      {
        id: 'SUPA-REFRESH-1',
        section_code: 'A',
        section_title: 'Strategy',
        question_text: 'Refreshed question?',
        who_to_ask: 'Director',
        applicable_tiers: ['Leadership'],
        response_type: 'text',
        sort_order: 1,
      },
    ];

    vi.spyOn(supabaseModule.supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockDbRows,
          error: null,
        }),
      }),
    } as any);

    const result = await refreshQuestionsCache();
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(result.source).toBe('supabase');
    expect(result.message).toContain('Successfully synchronized');
  });

  it('filters custom database questions by tier', () => {
    const customPool: Question[] = [
      {
        id: 'Q-LEAD',
        section_code: 'A',
        section_title: 'Strategy',
        question_text: 'Strategy Question',
        who_to_ask: 'Minister',
        applicable_tiers: ['Leadership'],
        response_type: 'text',
        sort_order: 1,
      },
      {
        id: 'Q-FRONT',
        section_code: 'C',
        section_title: 'Operations',
        question_text: 'Field inspection question',
        who_to_ask: 'Labour Officer',
        applicable_tiers: ['Frontline'],
        response_type: 'text',
        sort_order: 2,
      },
      {
        id: 'Q-BOTH',
        section_code: 'H',
        section_title: 'Summary',
        question_text: 'Closing reflection',
        who_to_ask: 'All',
        applicable_tiers: ['Leadership', 'Frontline'],
        response_type: 'text',
        sort_order: 3,
      },
    ];

    const leadershipQuestions = getQuestionsForTier('Leadership', customPool);
    expect(leadershipQuestions.map((q) => q.id)).toEqual(['Q-LEAD', 'Q-BOTH']);

    const frontlineQuestions = getQuestionsForTier('Frontline', customPool);
    expect(frontlineQuestions.map((q) => q.id)).toEqual(['Q-FRONT', 'Q-BOTH']);

    const managementQuestions = getQuestionsForTier('Management', customPool);
    expect(managementQuestions).toHaveLength(0);
  });

  it('generates section configuration counts from dynamic questions list', () => {
    const customPool: Question[] = [
      {
        id: 'Q1',
        section_code: 'A',
        section_title: 'Section A: Mandate',
        question_text: 'Q1 text',
        who_to_ask: 'Director',
        applicable_tiers: ['Leadership'],
        response_type: 'text',
        sort_order: 1,
      },
      {
        id: 'Q2',
        section_code: 'A',
        section_title: 'Section A: Mandate',
        question_text: 'Q2 text',
        who_to_ask: 'Director',
        applicable_tiers: ['Leadership'],
        response_type: 'text',
        sort_order: 2,
      },
      {
        id: 'Q3',
        section_code: 'B',
        section_title: 'Section B: Operations',
        question_text: 'Q3 text',
        who_to_ask: 'Director',
        applicable_tiers: ['Leadership'],
        response_type: 'text',
        sort_order: 3,
      },
    ];

    const sections = getSectionsForTier('Leadership', customPool);
    expect(sections).toHaveLength(2);
    expect(sections[0].code).toBe('A');
    expect(sections[0].count).toBe(2);
    expect(sections[1].code).toBe('B');
    expect(sections[1].count).toBe(1);
  });
});
