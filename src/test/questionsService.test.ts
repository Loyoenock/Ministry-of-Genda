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
} from '../lib/questionsService';
import { Question } from '../types';
import * as supabaseModule from '../lib/supabase';

describe('Questions Service & Dynamic Database Loading Engine', () => {
  beforeEach(() => {
    clearQuestionsCache();
    localStorage.clear();
    vi.restoreAllMocks();
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

    updateQuestionsCache(mockQuestions);

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
