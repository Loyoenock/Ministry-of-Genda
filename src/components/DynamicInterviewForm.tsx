/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Save,
  FileText,
  FileCheck,
  FolderOpen,
  ClipboardList,
  Layers,
  AlertTriangle,
  Upload,
  Sparkles,
  Printer,
  Share2,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  BarChart,
  Sliders,
  Check,
} from 'lucide-react';
import { Interview, Question, Answer, DocumentItem, InterviewerNote, ExistsStatus, CollectedStatus } from '../types';
import { getQuestionsForTier, getSectionsForTier } from '../lib/questionsData';
import { useInterviews } from '../context/InterviewContext';
import { useAuth } from '../context/AuthContext';

interface DynamicInterviewFormProps {
  interviewId: string;
  onBack: () => void;
  onOpenExport?: () => void;
}

export const DynamicInterviewForm: React.FC<DynamicInterviewFormProps> = ({
  interviewId,
  onBack,
  onOpenExport,
}) => {
  const {
    interviews,
    getInterviewAnswers,
    saveAnswer,
    getInterviewChecklist,
    updateChecklistItem,
    getInterviewNotes,
    saveNotes,
    uploadDocumentFile,
    updateInterview,
    autoSaveStatus,
  } = useInterviews();

  const { user, isAdmin } = useAuth();

  const interview = interviews.find((i) => i.id === interviewId);
  const answers = getInterviewAnswers(interviewId);
  const checklist = getInterviewChecklist(interviewId);
  const notes = getInterviewNotes(interviewId);

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<'questionnaire' | 'documents' | 'notes'>('questionnaire');

  // Active section inside the questionnaire
  const applicableQuestions = useMemo(() => {
    if (!interview) return [];
    return getQuestionsForTier(interview.tier);
  }, [interview]);

  const applicableSections = useMemo(() => {
    if (!interview) return [];
    return getSectionsForTier(interview.tier);
  }, [interview]);

  const [activeSectionCode, setActiveSectionCode] = useState<string>(() => {
    return applicableSections[0]?.code || 'A';
  });

  // Ensure activeSectionCode belongs to applicable sections
  useEffect(() => {
    if (applicableSections.length > 0 && !applicableSections.some((s) => s.code === activeSectionCode)) {
      setActiveSectionCode(applicableSections[0].code);
    }
  }, [applicableSections, activeSectionCode]);

  // Local answers state for snappy editing with debounce auto-save
  const answerMap = useMemo(() => {
    const map = new Map<string, string>();
    answers.forEach((a) => map.set(a.question_id, a.answer_text));
    return map;
  }, [answers]);

  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    answers.forEach((a) => {
      initial[a.question_id] = a.answer_text;
    });
    setLocalAnswers(initial);
  }, [interviewId, answers]);

  // Handle answer change with immediate local update and debounced save
  const handleAnswerChange = (questionId: string, text: string) => {
    setLocalAnswers((prev) => ({ ...prev, [questionId]: text }));
    saveAnswer(interviewId, questionId, text);
  };

  // Notes state
  const [localNotes, setLocalNotes] = useState<InterviewerNote>(notes);
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleNoteFieldChange = (field: keyof InterviewerNote, value: any) => {
    const updated = { ...localNotes, [field]: value };
    setLocalNotes(updated);
    saveNotes(interviewId, { [field]: value });
  };

  const handleNumbersCapturedChange = (metricKey: string, val: any) => {
    const updatedNumbers = {
      ...localNotes.numbers_captured,
      [metricKey]: val,
    };
    const updated = { ...localNotes, numbers_captured: updatedNumbers };
    setLocalNotes(updated);
    saveNotes(interviewId, { numbers_captured: updatedNumbers });
  };

  const handleMaturityScoreChange = (domain: string, score: number) => {
    const updatedMaturity = {
      ...localNotes.maturity_signals,
      [domain]: score,
    };
    const updated = { ...localNotes, maturity_signals: updatedMaturity };
    setLocalNotes(updated);
    saveNotes(interviewId, { maturity_signals: updatedMaturity });
  };

  if (!interview) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-600">Interview record not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Filter questions for active section
  const sectionQuestions = applicableQuestions.filter((q) => q.section_code === activeSectionCode);

  // Overall answered metrics
  const answeredCount = applicableQuestions.filter(
    (q) => (localAnswers[q.id] || '').trim().length > 0
  ).length;
  const overallPercentage = Math.round((answeredCount / (applicableQuestions.length || 1)) * 100);

  // Documents metrics
  const collectedDocsCount = checklist.filter((d) => d.collected_status === 'Collected').length;

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
      {/* Sticky Header Banner: Interviewee Details, Tier Badge, Auto-Save Status, Progress */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 sm:p-6 sticky top-16 z-20 backdrop-blur-md bg-white/95">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start space-x-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0 mt-0.5 min-h-[42px] min-w-[42px] flex items-center justify-center"
              title="Return to list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                  {interview.interviewee_name}
                </h1>
                <span className="text-[11px] sm:text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                  {interview.role_title}
                </span>
                <span className="text-[11px] sm:text-xs bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
                  Tier: {interview.tier}
                </span>
                <span
                  className={`text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    interview.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : interview.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {interview.status}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                {interview.department_unit} • {interview.location} • Conducted by {interview.interviewer_name} ({interview.interview_date})
              </p>
            </div>
          </div>

          {/* Right Action Tools: Auto-save status, status toggle, print/export */}
          <div className="flex flex-wrap items-center gap-2 sm:space-x-3 shrink-0">
            {/* Auto Save Indicator */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 min-h-[38px]">
              {autoSaveStatus === 'saving' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span className="text-amber-700 font-medium">Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Saved</span>
                </>
              )}
            </div>

            {/* Status Selector */}
            <select
              value={interview.status}
              onChange={(e) => updateInterview(interview.id, { status: e.target.value as any })}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 min-h-[38px]"
            >
              <option value="Draft">Draft</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Mark as Completed</option>
            </select>

            {onOpenExport && (
              <button
                onClick={onOpenExport}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Export / Print Diagnostic Brief"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Diagnostic Progress Bar */}
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-bold text-slate-700">Form Progress:</span>
            <span className="text-slate-600">
              {answeredCount}/{applicableQuestions.length} answered ({overallPercentage}%)
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-slate-500">
              {collectedDocsCount}/20 docs
            </span>
          </div>

          <div className="w-full sm:w-64 h-2.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                overallPercentage === 100
                  ? 'bg-emerald-600'
                  : overallPercentage > 50
                  ? 'bg-teal-600'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>

        {/* Top-Level Tabs: Questionnaire | Documents Checklist (20 items) | Interviewer Notes */}
        <div className="flex space-x-1.5 sm:space-x-2 mt-3 sm:mt-4 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('questionnaire')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 min-h-[40px] ${
              activeTab === 'questionnaire'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Diagnostic Questions ({applicableQuestions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 min-h-[40px] ${
              activeTab === 'documents'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileCheck className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Supporting Documents ({collectedDocsCount}/20)</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 min-h-[40px] ${
              activeTab === 'notes'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Notes & Maturity</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QUESTIONNAIRE VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'questionnaire' && (
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-6 items-start">
          {/* Mobile / Tablet Horizontal Section Picker (< lg) */}
          <div className="block lg:hidden bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Jump to Section
              </span>
              <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded">
                Section {applicableSections.findIndex((s) => s.code === activeSectionCode) + 1} of {applicableSections.length}
              </span>
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
              {applicableSections.map((sec) => {
                const isCurrent = sec.code === activeSectionCode;
                const secQuestions = applicableQuestions.filter((q) => q.section_code === sec.code);
                const secAnswered = secQuestions.filter(
                  (q) => (localAnswers[q.id] || '').trim().length > 0
                ).length;
                const isComplete = secAnswered === secQuestions.length && secQuestions.length > 0;
                return (
                  <button
                    key={sec.code}
                    onClick={() => setActiveSectionCode(sec.code)}
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
                Tier: {interview.tier}
              </span>
            </div>

            <div className="space-y-1">
              {applicableSections.map((sec) => {
                const isCurrent = sec.code === activeSectionCode;
                const secQuestions = applicableQuestions.filter((q) => q.section_code === sec.code);
                const secAnswered = secQuestions.filter(
                  (q) => (localAnswers[q.id] || '').trim().length > 0
                ).length;
                const isComplete = secAnswered === secQuestions.length && secQuestions.length > 0;

                return (
                  <button
                    key={sec.code}
                    onClick={() => setActiveSectionCode(sec.code)}
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
                    {applicableSections.find((s) => s.code === activeSectionCode)?.title || 'Section'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Showing {sectionQuestions.length} diagnostic questions tailored for {interview.tier} tier.
                  </p>
                </div>
              </div>
            </div>

            {/* Questions Form Cards */}
            <div className="space-y-5">
              {sectionQuestions.map((q, idx) => {
                const currentAnswer = localAnswers[q.id] || '';
                const isAnswered = currentAnswer.trim().length > 0;

                return (
                  <div
                    key={q.id}
                    id={`question-${q.id}`}
                    className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all shadow-xs ${
                      isAnswered
                        ? 'border-slate-200'
                        : 'border-slate-300 ring-1 ring-slate-100'
                    }`}
                  >
                    {/* Question Header: Code, WHO TO ASK badge, Answered Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded-lg">
                          {q.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">Question {idx + 1} of {sectionQuestions.length}</span>
                      </div>

                      {/* Who to ask guidance pill */}
                      <div className="text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                        <span className="font-bold">WHO TO ASK:</span> {q.who_to_ask}
                      </div>
                    </div>

                    {/* Question Text */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mb-2">
                      {q.question_text}
                    </h3>

                    {/* Probe / Prompt hints box */}
                    {q.prompt_hints && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed mb-4">
                        <span className="font-bold text-slate-700 block mb-0.5">INTERVIEWER PROMPTS & EVIDENCE TO PROBE:</span>
                        {q.prompt_hints}
                      </div>
                    )}

                    {/* Response Area: Large Textarea */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Interviewee Response & Detailed Findings</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {currentAnswer.length} characters
                        </span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Record detailed response, direct quotes, statutory references, or observed operational bottlenecks..."
                        value={currentAnswer}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
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
              {(() => {
                const currentIdx = applicableSections.findIndex((s) => s.code === activeSectionCode);
                const prevSec = applicableSections[currentIdx - 1];
                const nextSec = applicableSections[currentIdx + 1];

                return (
                  <>
                    <button
                      disabled={!prevSec}
                      onClick={() => prevSec && setActiveSectionCode(prevSec.code)}
                      className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition min-h-[40px] ${
                        prevSec
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'opacity-40 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous: {prevSec ? prevSec.code : 'Start'}</span>
                    </button>

                    <span className="text-xs font-semibold text-slate-500 order-last sm:order-none w-full sm:w-auto text-center sm:text-left py-1 sm:py-0">
                      Section {currentIdx + 1} of {applicableSections.length}
                    </span>

                    <button
                      disabled={!nextSec}
                      onClick={() => nextSec && setActiveSectionCode(nextSec.code)}
                      className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition min-h-[40px] ${
                        nextSec
                          ? 'bg-teal-700 text-white hover:bg-teal-800'
                          : 'opacity-40 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <span>Next: {nextSec ? nextSec.code : 'End'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUPPORTING DOCUMENTS CHECKLIST (20 STATUTORY ITEMS) */}
      {/* ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Statutory Supporting Documents Checklist
              </h2>
              <p className="text-xs text-slate-500">
                Track all 20 primary statutory and operational records required for the diagnostic report.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                {collectedDocsCount} Collected
              </span>
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold">
                {20 - collectedDocsCount} Pending
              </span>
            </div>
          </div>

          {/* Mobile Card Checklist (< md) */}
          <div className="block md:hidden space-y-3">
            {checklist.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 space-y-3 hover:bg-slate-50/80 transition">
                {/* Header: Item # + Title */}
                <div className="flex items-start space-x-2.5">
                  <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {item.item_number}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.document_title}
                    </h3>
                    <span className="inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Status Dropdowns: Exists & Collected (42px min height) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Exists?
                    </label>
                    <select
                      value={item.exists_status}
                      onChange={(e) =>
                        updateChecklistItem(interview.id, item.item_number, {
                          exists_status: e.target.value as ExistsStatus,
                        })
                      }
                      className="w-full text-xs border border-slate-300 rounded-xl px-2.5 py-2.5 bg-white font-medium outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Partial">Partial</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Collected?
                    </label>
                    <select
                      value={item.collected_status}
                      onChange={(e) =>
                        updateChecklistItem(interview.id, item.item_number, {
                          collected_status: e.target.value as CollectedStatus,
                        })
                      }
                      className={`w-full text-xs border rounded-xl px-2.5 py-2.5 font-bold outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px] ${
                        item.collected_status === 'Collected'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : item.collected_status === 'Pending'
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-slate-50 border-slate-300 text-slate-700'
                      }`}
                    >
                      <option value="Collected">Collected</option>
                      <option value="Pending">Pending</option>
                      <option value="Refused">Refused</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>
                </div>

                {/* Verification Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Verification Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Reviewed 2024 annual copy..."
                    value={item.notes}
                    onChange={(e) =>
                      updateChecklistItem(interview.id, item.item_number, { notes: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Follow-up Action */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Follow-up Action
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Request stamped copy from Commissioner..."
                    value={item.follow_up_action}
                    onChange={(e) =>
                      updateChecklistItem(interview.id, item.item_number, {
                        follow_up_action: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* File Attachment / Upload */}
                <div className="pt-1">
                  {item.file_name ? (
                    <div className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate flex-1" title={item.file_name}>
                        {item.file_name}
                      </span>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex items-center justify-center space-x-2 w-full py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition min-h-[42px] shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Attach Document File</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadDocumentFile(interview.id, item.item_number, file.name);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10">#</th>
                  <th className="py-3 px-4 min-w-[240px]">Document Title</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Exists?</th>
                  <th className="py-3 px-3">Collected?</th>
                  <th className="py-3 px-4 min-w-[200px]">Notes / Verification</th>
                  <th className="py-3 px-4 min-w-[180px]">Follow-up Action</th>
                  <th className="py-3 px-3 text-right">Upload / File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checklist.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-500">{item.item_number}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {item.document_title}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    {/* Exists status dropdown */}
                    <td className="py-3.5 px-3">
                      <select
                        value={item.exists_status}
                        onChange={(e) =>
                          updateChecklistItem(interview.id, item.item_number, {
                            exists_status: e.target.value as ExistsStatus,
                          })
                        }
                        className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-medium outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Partial">Partial</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </td>

                    {/* Collected status dropdown */}
                    <td className="py-3.5 px-3">
                      <select
                        value={item.collected_status}
                        onChange={(e) =>
                          updateChecklistItem(interview.id, item.item_number, {
                            collected_status: e.target.value as CollectedStatus,
                          })
                        }
                        className={`text-xs border rounded-lg px-2 py-1 font-bold outline-none focus:ring-2 focus:ring-teal-500 ${
                          item.collected_status === 'Collected'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : item.collected_status === 'Pending'
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        <option value="Collected">Collected</option>
                        <option value="Pending">Pending</option>
                        <option value="Refused">Refused</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        placeholder="Verification notes..."
                        value={item.notes}
                        onChange={(e) =>
                          updateChecklistItem(interview.id, item.item_number, { notes: e.target.value })
                        }
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </td>

                    {/* Follow-up Action */}
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        placeholder="Action item..."
                        value={item.follow_up_action}
                        onChange={(e) =>
                          updateChecklistItem(interview.id, item.item_number, {
                            follow_up_action: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </td>

                    {/* File Upload / Attachment */}
                    <td className="py-3.5 px-3 text-right">
                      {item.file_name ? (
                        <div className="flex items-center justify-end space-x-1 text-emerald-700 font-medium text-xs">
                          <Check className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[100px]" title={item.file_name}>
                            {item.file_name}
                          </span>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition">
                          <Upload className="w-3 h-3" />
                          <span>Attach</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                uploadDocumentFile(interview.id, item.item_number, file.name);
                              }
                            }}
                          />
                        </label>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POST-INTERVIEW NOTES & MATURITY SIGNALS */}
      {/* ========================================================================= */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Numbers Captured (Structured metrics from original materials) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Structured Numbers & Hard Metrics Captured
                </h3>
                <p className="text-xs text-slate-500">
                  Critical quantitative figures reported by the interviewee during the session.
                </p>
              </div>
              <span className="text-xs bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full font-bold">
                MGLSD Baseline Data
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Staff in Unit / Directorate
                </label>
                <input
                  type="number"
                  placeholder="e.g. 142"
                  value={localNotes.numbers_captured.total_staff || ''}
                  onChange={(e) =>
                    handleNumbersCapturedChange('total_staff', parseInt(e.target.value) || null)
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Labour Officers / Inspectors
                </label>
                <input
                  type="number"
                  placeholder="e.g. 58"
                  value={localNotes.numbers_captured.labour_officers_count || ''}
                  onChange={(e) =>
                    handleNumbersCapturedChange(
                      'labour_officers_count',
                      parseInt(e.target.value) || null
                    )
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Annual Workplace Inspections
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1240"
                  value={localNotes.numbers_captured.annual_inspections || ''}
                  onChange={(e) =>
                    handleNumbersCapturedChange(
                      'annual_inspections',
                      parseInt(e.target.value) || null
                    )
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disputes Logged Annually
                </label>
                <input
                  type="number"
                  placeholder="e.g. 890"
                  value={localNotes.numbers_captured.disputes_logged || ''}
                  onChange={(e) =>
                    handleNumbersCapturedChange(
                      'disputes_logged',
                      parseInt(e.target.value) || null
                    )
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disputes Resolved Annually
                </label>
                <input
                  type="number"
                  placeholder="e.g. 612"
                  value={localNotes.numbers_captured.disputes_resolved || ''}
                  onChange={(e) =>
                    handleNumbersCapturedChange(
                      'disputes_resolved',
                      parseInt(e.target.value) || null
                    )
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Annual Budget Allocated (UGX)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14.8 Billion UGX"
                  value={localNotes.numbers_captured.budget_allocated_ugx || ''}
                  onChange={(e) =>
                    handleNumbersCapturedChange('budget_allocated_ugx', e.target.value)
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Budget Released (% of Approved)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 68"
                  value={localNotes.numbers_captured.budget_released_pct || ''}
                  onChange={(e) =>
                    handleNumbersCapturedChange(
                      'budget_released_pct',
                      parseInt(e.target.value) || null
                    )
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unresolved Backlog Cases
                </label>
                <input
                  type="number"
                  placeholder="e.g. 278"
                  value={localNotes.numbers_captured.backlog_cases || ''}
                  onChange={(e) =>
                    handleNumbersCapturedChange(
                      'backlog_cases',
                      parseInt(e.target.value) || null
                    )
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Maturity Signals (1 to 5 scoring across 5 institutional domains) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Institutional Maturity Signals (Diagnostic Scoring 1–5)
                </h3>
                <p className="text-xs text-slate-500">
                  Interviewer qualitative assessment based on interviewee evidence and documentation.
                </p>
              </div>
              <div className="text-xs text-slate-500 flex items-center space-x-2">
                <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded">1: Ad-hoc</span>
                <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded">3: Defined</span>
                <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded">5: Optimized</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {[
                { key: 'governance_score', label: '1. Governance & Oversight' },
                { key: 'technology_score', label: '2. Information Systems & IT' },
                { key: 'process_score', label: '3. Workflows & Standard SOPs' },
                { key: 'people_skills_score', label: '4. Staffing & Capabilities' },
                { key: 'data_reporting_score', label: '5. Data & Reporting Rigor' },
              ].map((domain) => {
                const currentScore = (localNotes.maturity_signals as any)[domain.key] || 3;
                return (
                  <div key={domain.key} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-800">{domain.label}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-extrabold text-teal-800">{currentScore}/5</span>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleMaturityScoreChange(domain.key, num)}
                            className={`w-7 h-7 sm:w-6 sm:h-6 rounded text-xs font-bold transition flex items-center justify-center min-h-[28px] min-w-[28px] ${
                              currentScore === num
                                ? 'bg-teal-700 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maturity Scoring Justification & Technical Observations
              </label>
              <textarea
                rows={2}
                value={localNotes.maturity_signals.justification}
                onChange={(e) =>
                  handleNoteFieldChange('maturity_signals', {
                    ...localNotes.maturity_signals,
                    justification: e.target.value,
                  })
                }
                placeholder="Detail the rationale for these maturity ratings..."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          {/* Qualitative Post-Interview Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Observations */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Overall Context & Demeanor Observations
              </label>
              <textarea
                rows={4}
                value={localNotes.observations}
                onChange={(e) => handleNoteFieldChange('observations', e.target.value)}
                placeholder="Note non-verbal cues, candor, institutional pride, hesitation, or political tensions..."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {/* Contradictions & Inconsistencies */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Contradictions & Discrepancies Noted</span>
              </label>
              <textarea
                rows={4}
                value={localNotes.contradictions}
                onChange={(e) => handleNoteFieldChange('contradictions', e.target.value)}
                placeholder="Log contradictions with other interviewees, official statistics, or audit findings..."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {/* Documents Collected Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Physical / Digital Documents Collected Summary
              </label>
              <textarea
                rows={3}
                value={localNotes.documents_collected_summary}
                onChange={(e) => handleNoteFieldChange('documents_collected_summary', e.target.value)}
                placeholder="List key records, handbooks, or statutory instruments handed over..."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {/* Follow-up Actions Required */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Interviewer Follow-up Actions & Pending Re-interviews
              </label>
              <textarea
                rows={3}
                value={localNotes.follow_ups}
                onChange={(e) => handleNoteFieldChange('follow_ups', e.target.value)}
                placeholder="Specific tasks, letters to dispatch, or files to request from other departments..."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
