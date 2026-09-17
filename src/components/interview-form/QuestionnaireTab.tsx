/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
} from 'lucide-react';
import { Question, InterviewTier } from '../../types';
import { SectionConfig } from '../../lib/questionsData';
import { calculateSectionProgress } from '../../lib/interviewCalculations';

interface QuestionnaireTabProps {
  tier: InterviewTier;
  applicableQuestions: Question[];
  applicableSections: SectionConfig[];
  localAnswers: Record<string, string>;
  onAnswerChange: (questionId: string, text: string) => void;
  activeSectionCode: string;
  onSelectSection: (sectionCode: string) => void;
  onPrevSection: () => void;
  onNextSection: () => void;
  hasPrevSection: boolean;
  hasNextSection: boolean;
  prevSectionCode?: string;
  nextSectionCode?: string;
  currentSectionIndex: number;
}

export const QuestionnaireTab: React.FC<QuestionnaireTabProps> = ({
  tier,
  applicableQuestions,
  applicableSections,
  localAnswers,
  onAnswerChange,
  activeSectionCode,
  onSelectSection,
  onPrevSection,
  onNextSection,
  hasPrevSection,
  hasNextSection,
  prevSectionCode,
  nextSectionCode,
  currentSectionIndex,
}) => {
  const sectionQuestions = applicableQuestions.filter((q) => q.section_code === activeSectionCode);
  const activeSection = applicableSections.find((s) => s.code === activeSectionCode);

  return (
    <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-6 items-start">
      {/* Mobile / Tablet Horizontal Section Picker (< lg) */}
      <div className="block lg:hidden bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Jump to Section
          </span>
          <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded">
            Section {currentSectionIndex + 1} of {applicableSections.length}
          </span>
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {applicableSections.map((sec) => {
            const isCurrent = sec.code === activeSectionCode;
            const secQuestions = applicableQuestions.filter((q) => q.section_code === sec.code);
            const { answeredCount: secAnswered, isComplete } = calculateSectionProgress(
              secQuestions,
              localAnswers
            );

            return (
              <button
                key={sec.code}
                data-testid={`mobile-section-nav-${sec.code}`}
                onClick={() => onSelectSection(sec.code)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 min-h-[42px] ${
                  isCurrent
                    ? 'bg-teal-700 text-white shadow-xs'
                    : isComplete
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Sec {sec.code}</span>
                <span className={`text-[10px] ${isCurrent ? 'text-teal-200' : 'text-slate-500'}`}>
                  ({secAnswered}/{secQuestions.length})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Left Column: Sticky Section Navigation (Desktop >= lg) */}
      <div className="hidden lg:block lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sticky top-60 space-y-2">
        <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Sections ({applicableSections.length})
          </span>
          <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded">
            Tier: {tier}
          </span>
        </div>

        <div className="space-y-1">
          {applicableSections.map((sec) => {
            const isCurrent = sec.code === activeSectionCode;
            const secQuestions = applicableQuestions.filter((q) => q.section_code === sec.code);
            const { answeredCount: secAnswered, isComplete } = calculateSectionProgress(
              secQuestions,
              localAnswers
            );

            return (
              <button
                key={sec.code}
                data-testid={`section-nav-${sec.code}`}
                onClick={() => onSelectSection(sec.code)}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                  isCurrent
                    ? 'bg-teal-700 text-white font-bold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-teal-800 text-teal-100'
                        : isComplete
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {sec.code}
                  </span>
                  <span className="truncate">{sec.title.split(':')[1]?.trim() || sec.title}</span>
                </div>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isCurrent
                      ? 'bg-teal-800 text-teal-200'
                      : isComplete
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {secAnswered}/{secQuestions.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Questions List for the active section */}
      <div className="w-full lg:col-span-3 space-y-6">
        {/* Active Section Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 font-black text-base flex items-center justify-center border border-teal-200">
              {activeSectionCode}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {activeSection?.title || 'Section'}
              </h2>
              <p className="text-xs text-slate-500">
                Showing {sectionQuestions.length} diagnostic questions tailored for {tier} tier.
              </p>
            </div>
          </div>
        </div>

        {/* Questions Form Cards */}
        <div className="space-y-5">
          {sectionQuestions.map((q) => {
            const currentAnswer = localAnswers[q.id] || '';
            const isAnswered = currentAnswer.trim().length > 0;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border p-4 sm:p-6 transition shadow-xs ${
                  isAnswered
                    ? 'border-emerald-200/90 bg-emerald-50/10'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {q.id}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {q.statutory_reference || 'Statutory Review'}
                    </span>
                  </div>
                  {isAnswered && (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Captured</span>
                    </span>
                  )}
                </div>

                {/* Question Prompt */}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mb-2">
                  {q.question_text}
                </h3>

                {/* Prompt Hints / Guidance */}
                {q.prompt_hints && (
                  <div className="mb-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center space-x-1.5 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                      <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
                      <span>Interviewer Guidance & Inquiries to Probe:</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 italic">
                      {q.prompt_hints}
                    </p>
                  </div>
                )}

                {/* Answer Textarea */}
                <div>
                  <label htmlFor={`answer-${q.id}`} className="sr-only">
                    Answer for {q.id}
                  </label>
                  <textarea
                    id={`answer-${q.id}`}
                    data-testid={`question-input-${q.id}`}
                    rows={4}
                    placeholder="Record detailed response, direct quotes, statutory references, or observed operational bottlenecks..."
                    value={currentAnswer}
                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
                    className="w-full p-3.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none leading-relaxed transition resize-y shadow-2xs"
                  />
                </div>

                {/* Structured Demonstrations for W1-W4 */}
                {q.section_code === 'W' && (
                  <div className="mt-3 p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center space-x-2 text-teal-900 font-bold">
                      <CheckCircle className="w-4 h-4 text-teal-700" />
                      <span>Live Technical Verification Checklist</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700">
                      <label className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-teal-100">
                        <input type="checkbox" className="rounded text-teal-600" defaultChecked />
                        <span>System screen observed</span>
                      </label>
                      <label className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-teal-100">
                        <input type="checkbox" className="rounded text-teal-600" />
                        <span>Log entry verified</span>
                      </label>
                      <label className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-teal-100">
                        <input type="checkbox" className="rounded text-teal-600" />
                        <span>Evidence screenshot taken</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Section Pagination Buttons */}
        <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            disabled={!hasPrevSection}
            onClick={onPrevSection}
            className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition min-h-[40px] ${
              hasPrevSection
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'opacity-40 text-slate-400 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous: {prevSectionCode || 'Start'}</span>
          </button>

          <span className="text-xs font-semibold text-slate-500 order-last sm:order-none w-full sm:w-auto text-center sm:text-left py-1 sm:py-0">
            Section {currentSectionIndex + 1} of {applicableSections.length}
          </span>

          <button
            disabled={!hasNextSection}
            onClick={onNextSection}
            className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition min-h-[40px] ${
              hasNextSection
                ? 'bg-teal-700 text-white hover:bg-teal-800'
                : 'opacity-40 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Next: {nextSectionCode || 'End'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
