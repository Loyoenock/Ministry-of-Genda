/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  MASTER_QUESTIONS,
  STATUTORY_DOCUMENTS_CATALOGUE,
  getQuestionsForTier,
  getSectionsForTier,
} from '../lib/questionsData';

describe('Questionnaire Engine & Tier Routing Logic', () => {
  it('contains the complete master diagnostic question catalogue', () => {
    expect(MASTER_QUESTIONS.length).toBeGreaterThan(45);
    // Sections A through H plus W must all be represented
    const sectionCodes = new Set(MASTER_QUESTIONS.map((q) => q.section_code));
    expect(sectionCodes.has('A')).toBe(true);
    expect(sectionCodes.has('B')).toBe(true);
    expect(sectionCodes.has('C')).toBe(true);
    expect(sectionCodes.has('D')).toBe(true);
    expect(sectionCodes.has('E')).toBe(true);
    expect(sectionCodes.has('F')).toBe(true);
    expect(sectionCodes.has('G')).toBe(true);
    expect(sectionCodes.has('H')).toBe(true);
    expect(sectionCodes.has('W')).toBe(true);
  });

  it('contains exactly 20 statutory document checklist items', () => {
    expect(STATUTORY_DOCUMENTS_CATALOGUE.length).toBe(20);
    expect(STATUTORY_DOCUMENTS_CATALOGUE[0].document_title).toContain('Strategic Plan');
    expect(STATUTORY_DOCUMENTS_CATALOGUE[19].document_title).toContain('Development Partner');
  });

  it('correctly filters sections for Leadership tier (A, B, D, G, H)', () => {
    const sections = getSectionsForTier('Leadership');
    const codes = sections.map((s) => s.code);
    expect(codes).toContain('A');
    expect(codes).toContain('B');
    expect(codes).toContain('D');
    expect(codes).toContain('G');
    expect(codes).toContain('H');
    expect(codes).not.toContain('C');
    expect(codes).not.toContain('W');
  });

  it('correctly filters sections for Management tier (A, B, C, D, E, F, G, H)', () => {
    const sections = getSectionsForTier('Management');
    const codes = sections.map((s) => s.code);
    expect(codes).toContain('A');
    expect(codes).toContain('B');
    expect(codes).toContain('C');
    expect(codes).toContain('D');
    expect(codes).toContain('E');
    expect(codes).toContain('F');
    expect(codes).toContain('G');
    expect(codes).toContain('H');
    expect(codes).not.toContain('W');
  });

  it('correctly filters sections for Frontline Staff tier (C, E, F, H)', () => {
    const sections = getSectionsForTier('Frontline');
    const codes = sections.map((s) => s.code);
    expect(codes).toContain('C');
    expect(codes).toContain('E');
    expect(codes).toContain('F');
    expect(codes).toContain('H');
    expect(codes).not.toContain('A');
    expect(codes).not.toContain('B');
    expect(codes).not.toContain('D');
  });

  it('correctly filters sections for Support/IT tier (E, G, H, W)', () => {
    const sections = getSectionsForTier('Support/IT');
    const codes = sections.map((s) => s.code);
    expect(codes).toContain('E');
    expect(codes).toContain('G');
    expect(codes).toContain('H');
    expect(codes).toContain('W');
    expect(codes).not.toContain('A');
    expect(codes).not.toContain('B');
    expect(codes).not.toContain('C');
  });

  it('returns valid non-empty questions for each tier', () => {
    const leadershipQuestions = getQuestionsForTier('Leadership');
    const managementQuestions = getQuestionsForTier('Management');
    const frontlineQuestions = getQuestionsForTier('Frontline');
    const itQuestions = getQuestionsForTier('Support/IT');

    expect(leadershipQuestions.length).toBeGreaterThan(15);
    expect(managementQuestions.length).toBeGreaterThan(25);
    expect(frontlineQuestions.length).toBeGreaterThan(15);
    expect(itQuestions.length).toBeGreaterThan(10);
  });
});
