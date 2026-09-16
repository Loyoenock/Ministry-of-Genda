/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Answer, DocumentItem, InterviewStatus, Question } from '../types';

/**
 * Calculates how many applicable questions have been answered and the resulting completion percentage.
 */
export function calculateInterviewProgress(
  answers: Answer[],
  applicableQuestionsCount: number
): { answeredCount: number; totalQuestions: number; completionPercentage: number } {
  const answeredCount = answers.filter((a) => a.answer_text && a.answer_text.trim().length > 0).length;
  const totalQuestions = Math.max(applicableQuestionsCount, 1);
  const completionPercentage = Math.min(100, Math.round((answeredCount / totalQuestions) * 100));
  return { answeredCount, totalQuestions, completionPercentage };
}

/**
 * Calculates interview progress from a map of questionId -> answer text.
 */
export function calculateProgressFromMap(
  answersMap: Record<string, string>,
  applicableQuestions: Question[]
): { answeredCount: number; totalQuestions: number; completionPercentage: number } {
  const answeredCount = applicableQuestions.filter(
    (q) => (answersMap[q.id] || '').trim().length > 0
  ).length;
  const totalQuestions = Math.max(applicableQuestions.length, 1);
  const completionPercentage = Math.min(100, Math.round((answeredCount / totalQuestions) * 100));
  return { answeredCount, totalQuestions, completionPercentage };
}

/**
 * Determines the next interview status based on completion percentage and existing status.
 */
export function calculateNextStatus(
  completionPercentage: number,
  currentStatus: InterviewStatus
): InterviewStatus {
  if (completionPercentage === 100) {
    return 'Completed';
  }
  if (completionPercentage > 0 && currentStatus === 'Draft') {
    return 'In Progress';
  }
  return currentStatus;
}

/**
 * Calculates section-level progress for a given set of questions in that section.
 */
export function calculateSectionProgress(
  sectionQuestions: Question[],
  answersMap: Record<string, string>
): { answeredCount: number; totalCount: number; isComplete: boolean } {
  const totalCount = sectionQuestions.length;
  const answeredCount = sectionQuestions.filter(
    (q) => (answersMap[q.id] || '').trim().length > 0
  ).length;
  const isComplete = totalCount > 0 && answeredCount === totalCount;
  return { answeredCount, totalCount, isComplete };
}

/**
 * Counts how many statutory documents have been collected.
 */
export function countCollectedDocuments(checklist: DocumentItem[]): number {
  return checklist.filter((item) => item.collected_status === 'Collected').length;
}
