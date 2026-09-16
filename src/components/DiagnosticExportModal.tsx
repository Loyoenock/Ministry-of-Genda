/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Printer, Download, CheckCircle, FileText } from 'lucide-react';
import { useInterviews } from '../context/InterviewContext';
import { getQuestionsForTier } from '../lib/questionsService';

interface DiagnosticExportModalProps {
  interviewId: string;
  onClose: () => void;
}

export const DiagnosticExportModal: React.FC<DiagnosticExportModalProps> = ({
  interviewId,
  onClose,
}) => {
  const { interviews, getInterviewAnswers, getInterviewChecklist, getInterviewNotes } = useInterviews();

  const interview = interviews.find((i) => i.id === interviewId);
  const answers = getInterviewAnswers(interviewId);
  const checklist = getInterviewChecklist(interviewId);
  const notes = getInterviewNotes(interviewId);

  if (!interview) return null;

  const applicableQuestions = getQuestionsForTier(interview.tier);
  const answerMap = new Map(answers.map((a) => [a.question_id, a.answer_text]));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 rounded-t-2xl print:hidden shrink-0">
          <div className="flex items-center space-x-2 text-xs font-bold min-w-0">
            <FileText className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="truncate">Ministry Diagnostic Brief Preview</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition min-h-[38px]"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Diagnostic Brief</span>
              <span className="sm:hidden">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-6 text-slate-800 bg-white font-serif print:p-0 flex-1">
          {/* Official Letterhead */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-2">
            <div className="flex justify-center">
              <img
                src="/Coat_of_arms_of_Uganda.svg"
                alt="Coat of Arms of Uganda"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain print:w-16 print:h-16"
              />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-600">
                The Republic of Uganda
              </p>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-950">
                Ministry of Gender, Labour and Social Development
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-teal-900">
                TRANSFORMATIVE Programme • Current-State Diagnostic Interview Report
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Official Record of Field Evidence & Institutional Current-State Assessment
              </p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <p><strong>Interviewee:</strong> {interview.interviewee_name}</p>
              <p><strong>Official Title:</strong> {interview.role_title}</p>
              <p><strong>Department/Unit:</strong> {interview.department_unit}</p>
              <p><strong>Location:</strong> {interview.location}</p>
            </div>
            <div className="space-y-1">
              <p><strong>Interview Tier:</strong> {interview.tier}</p>
              <p><strong>Field Interviewer:</strong> {interview.interviewer_name}</p>
              <p><strong>Date & Time:</strong> {interview.interview_date} at {interview.interview_time}</p>
              <p><strong>Completion Status:</strong> {interview.status} ({interview.completion_percentage}%)</p>
            </div>
          </div>

          {/* Maturity Ratings Summary */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1 mb-2">
              1. Institutional Maturity Diagnostic Score (1 to 5)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 border rounded-lg bg-slate-50/50">
                <span className="text-slate-500 block text-[10px]">Governance</span>
                <span className="text-lg font-bold text-teal-800">{notes.maturity_signals.governance_score || 3}/5</span>
              </div>
              <div className="p-2 border rounded-lg bg-slate-50/50">
                <span className="text-slate-500 block text-[10px]">IT & Systems</span>
                <span className="text-lg font-bold text-teal-800">{notes.maturity_signals.technology_score || 2}/5</span>
              </div>
              <div className="p-2 border rounded-lg bg-slate-50/50">
                <span className="text-slate-500 block text-[10px]">Workflows</span>
                <span className="text-lg font-bold text-teal-800">{notes.maturity_signals.process_score || 3}/5</span>
              </div>
              <div className="p-2 border rounded-lg bg-slate-50/50">
                <span className="text-slate-500 block text-[10px]">Staff Capabilities</span>
                <span className="text-lg font-bold text-teal-800">{notes.maturity_signals.people_skills_score || 3}/5</span>
              </div>
              <div className="p-2 border rounded-lg bg-slate-50/50 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-[10px]">Data & Reporting</span>
                <span className="text-lg font-bold text-teal-800">{notes.maturity_signals.data_reporting_score || 2}/5</span>
              </div>
            </div>
          </div>

          {/* Key Diagnostic Answers */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1 mb-3">
              2. Key Diagnostic Responses ({applicableQuestions.length} Questions)
            </h3>
            <div className="space-y-4 text-xs leading-relaxed">
              {applicableQuestions.map((q) => {
                const ans = answerMap.get(q.id);
                if (!ans) return null;
                return (
                  <div key={q.id} className="border-b border-slate-100 pb-2">
                    <p className="font-bold text-slate-900">
                      [{q.id}] {q.question_text}
                    </p>
                    <p className="text-slate-700 italic mt-1 bg-slate-50/70 p-2 rounded">
                      "{ans}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collected Statutory Documents */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1 mb-2">
              3. Supporting Documents Status
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {checklist.slice(0, 10).map((d) => (
                <div key={d.id} className="flex items-center justify-between p-1.5 border-b border-slate-100">
                  <span className="truncate max-w-[280px]">{d.document_title}</span>
                  <span className={`text-[10px] font-bold ${d.collected_status === 'Collected' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {d.collected_status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="font-bold">Field Diagnostic Interviewer:</p>
              <div className="mt-8 border-b border-slate-400 w-48" />
              <p className="mt-1">{interview.interviewer_name}</p>
              <p className="text-[10px] text-slate-500">MGLSD Diagnostic Field Team</p>
            </div>
            <div>
              <p className="font-bold">Interviewee Verification:</p>
              <div className="mt-8 border-b border-slate-400 w-48" />
              <p className="mt-1">{interview.interviewee_name}</p>
              <p className="text-[10px] text-slate-500">{interview.role_title}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
