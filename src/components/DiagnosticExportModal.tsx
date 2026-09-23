/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Printer,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Building,
  Calendar,
  Clock,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { useInterviewReport } from '../hooks/useInterviewReport';
import { getQuestionsForTier } from '../lib/questionsService';

interface DiagnosticExportModalProps {
  interviewId: string;
  onClose: () => void;
}

export const DiagnosticExportModal: React.FC<DiagnosticExportModalProps> = ({
  interviewId,
  onClose,
}) => {
  const { reportData, loading, error, refetch } = useInterviewReport(interviewId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostic-export-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 rounded-t-2xl print:hidden shrink-0">
          <div className="flex items-center space-x-2.5 text-xs font-bold min-w-0">
            <FileText className="w-4 h-4 text-teal-400 shrink-0" />
            <span id="diagnostic-export-title" className="truncate">
              Official Ministry Diagnostic Dossier Preview
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => refetch()}
              disabled={loading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition min-h-[38px] cursor-pointer"
              title="Re-query latest data from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading || !reportData}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition min-h-[38px] cursor-pointer shadow-xs"
              title="Print official dossier or save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Diagnostic Brief</span>
              <span className="sm:hidden">Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg hover:bg-slate-800 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="overflow-y-auto flex-1 bg-slate-100/60 p-3 sm:p-6 print:p-0 print:bg-white">
          {/* Loading State */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">
                Loading verified diagnostic evidence from database...
              </p>
              <p className="text-xs text-slate-500">
                Fetching latest interview responses, checklist, and institutional notes.
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-6 bg-white rounded-xl border border-rose-200 text-center space-y-3 my-6">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Unable to Generate Diagnostic Brief</h3>
              <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">{error}</p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800"
              >
                Close Report
              </button>
            </div>
          )}

          {/* Valid Report Document */}
          {!loading && reportData && (
            <div className="space-y-4">
              {/* Status Warning Banner (Hidden in Print) */}
              {!reportData.isValidForOfficialReport && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl print:hidden flex items-start space-x-3 text-amber-900 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Informal Draft / In-Progress Preview</p>
                    <p className="text-amber-800 leading-relaxed">
                      This interview is currently marked as{' '}
                      <span className="font-bold">{reportData.interview.status}</span> with{' '}
                      <span className="font-bold">{reportData.interview.completion_percentage}%</span>{' '}
                      completion. Official Ministry Diagnostic Briefs should only be exported once the
                      session has been marked as <strong>Completed</strong>.
                    </p>
                    {reportData.validationWarnings.length > 0 && (
                      <ul className="list-disc list-inside space-y-0.5 pt-1 text-amber-700">
                        {reportData.validationWarnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Printable Official Paper Document */}
              <div className="p-6 sm:p-10 text-slate-800 bg-white rounded-xl shadow-xs font-serif print:shadow-none print:p-0 space-y-6">
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
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-600 font-sans">
                      The Republic of Uganda
                    </p>
                    <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-950 font-sans">
                      Ministry of Gender, Labour and Social Development
                    </h1>
                    <p className="text-[11px] sm:text-xs font-semibold text-teal-900 font-sans">
                      Labour Directorate • TRANSFORMATIVE Programme Diagnostic Brief
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-sans">
                      Official Record of Field Evidence & Institutional Current-State Assessment • Verified Supabase Record
                    </p>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs p-4 bg-slate-50 rounded-xl border border-slate-200 font-sans">
                  <div className="space-y-1.5">
                    <p>
                      <strong className="text-slate-900">Interviewee:</strong>{' '}
                      {reportData.interview.interviewee_name || 'Not provided'}
                    </p>
                    <p>
                      <strong className="text-slate-900">Official Title:</strong>{' '}
                      {reportData.interview.role_title || 'Not provided'}
                    </p>
                    <p>
                      <strong className="text-slate-900">Department / Unit:</strong>{' '}
                      {reportData.interview.department_unit || 'Labour Directorate'}
                    </p>
                    <p>
                      <strong className="text-slate-900">Duty Location:</strong>{' '}
                      {reportData.interview.location || 'Headquarters, Kampala'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p>
                      <strong className="text-slate-900">Interview Tier:</strong>{' '}
                      <span className="font-bold text-teal-800">{reportData.interview.tier}</span>
                    </p>
                    <p>
                      <strong className="text-slate-900">Field Interviewer:</strong>{' '}
                      {reportData.interviewerProfile?.full_name || reportData.interview.interviewer_name || 'Assigned Officer'}
                    </p>
                    <p>
                      <strong className="text-slate-900">Session Date & Time:</strong>{' '}
                      {reportData.interview.interview_date || 'N/A'} at {reportData.interview.interview_time || '10:00 AM'}
                    </p>
                    <p>
                      <strong className="text-slate-900">Dossier Status:</strong>{' '}
                      <span
                        className={`font-bold ${
                          reportData.interview.status === 'Completed'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {reportData.interview.status} ({reportData.interview.completion_percentage}%)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Section 1: Institutional Maturity Diagnostic Score */}
                <div className="space-y-2">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1 font-sans">
                    1. Institutional Maturity Diagnostic Scores (1 to 5)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-sans">
                    <div className="p-2.5 border rounded-lg bg-slate-50">
                      <span className="text-slate-500 block text-[10px]">Governance</span>
                      <span className="text-base font-bold text-teal-900">
                        {reportData.notes.maturity_signals?.governance_score
                          ? `${reportData.notes.maturity_signals.governance_score}/5`
                          : 'Not scored'}
                      </span>
                    </div>

                    <div className="p-2.5 border rounded-lg bg-slate-50">
                      <span className="text-slate-500 block text-[10px]">IT & Systems</span>
                      <span className="text-base font-bold text-teal-900">
                        {reportData.notes.maturity_signals?.technology_score
                          ? `${reportData.notes.maturity_signals.technology_score}/5`
                          : 'Not scored'}
                      </span>
                    </div>

                    <div className="p-2.5 border rounded-lg bg-slate-50">
                      <span className="text-slate-500 block text-[10px]">Workflows & SOPs</span>
                      <span className="text-base font-bold text-teal-900">
                        {reportData.notes.maturity_signals?.process_score
                          ? `${reportData.notes.maturity_signals.process_score}/5`
                          : 'Not scored'}
                      </span>
                    </div>

                    <div className="p-2.5 border rounded-lg bg-slate-50">
                      <span className="text-slate-500 block text-[10px]">Staff Capabilities</span>
                      <span className="text-base font-bold text-teal-900">
                        {reportData.notes.maturity_signals?.people_skills_score
                          ? `${reportData.notes.maturity_signals.people_skills_score}/5`
                          : 'Not scored'}
                      </span>
                    </div>

                    <div className="p-2.5 border rounded-lg bg-slate-50 col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block text-[10px]">Data & Reporting</span>
                      <span className="text-base font-bold text-teal-900">
                        {reportData.notes.maturity_signals?.data_reporting_score
                          ? `${reportData.notes.maturity_signals.data_reporting_score}/5`
                          : 'Not scored'}
                      </span>
                    </div>
                  </div>

                  {reportData.notes.maturity_signals?.justification && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                      <strong>Score Justification:</strong> {reportData.notes.maturity_signals.justification}
                    </p>
                  )}
                </div>

                {/* Section 2: Key Diagnostic Responses */}
                {(() => {
                  const applicableQuestions = getQuestionsForTier(reportData.interview.tier);
                  const answerMap = new Map<string, string>(reportData.answers.map((a) => [a.question_id, a.answer_text]));

                  return (
                    <div className="space-y-3">
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1 font-sans">
                        2. Key Diagnostic Responses ({reportData.answers.length} Responses Logged)
                      </h3>

                      {reportData.answers.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded">
                          No questionnaire responses recorded in database.
                        </p>
                      ) : (
                        <div className="space-y-3 text-xs leading-relaxed">
                          {applicableQuestions.map((q) => {
                            const ans = answerMap.get(q.id);
                            if (!ans || !ans.trim()) return null;

                            return (
                              <div key={q.id} className="border-b border-slate-100 pb-2">
                                <p className="font-bold text-slate-900 font-sans">
                                  [{q.id}] {q.question_text}
                                </p>
                                <p className="text-slate-700 italic mt-1 bg-slate-50/70 p-2 rounded border border-slate-100">
                                  "{ans}"
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Section 3: Statutory Supporting Documents Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-950 font-sans">
                      3. Statutory Supporting Evidence Status
                    </h3>
                    <span className="text-[11px] font-sans text-slate-500">
                      {reportData.checklist.filter((d) => d.collected_status === 'Collected').length} of{' '}
                      {reportData.checklist.length} Verified
                    </span>
                  </div>

                  {reportData.checklist.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded">
                      Document checklist not initialized.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                      {reportData.checklist.slice(0, 14).map((d) => (
                        <div
                          key={d.id || d.item_number}
                          className="flex items-center justify-between p-2 border rounded-lg bg-slate-50/60"
                        >
                          <span className="truncate max-w-[260px] text-slate-800 font-medium">
                            {d.item_number}. {d.document_title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              d.collected_status === 'Collected'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {d.collected_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 4: Quantitative Baselines & Field Observations */}
                <div className="space-y-3 font-sans">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1">
                    4. Field Observations & Quantitative Baselines
                  </h3>

                  {/* Quantitative Baseline Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 border rounded-lg bg-slate-50">
                      <span className="text-[10px] text-slate-500 block">Annual Inspections</span>
                      <span className="font-bold text-slate-900">
                        {reportData.notes.numbers_captured?.annual_inspections != null
                          ? reportData.notes.numbers_captured.annual_inspections.toLocaleString()
                          : 'Not reported'}
                      </span>
                    </div>

                    <div className="p-2 border rounded-lg bg-slate-50">
                      <span className="text-[10px] text-slate-500 block">Disputes Logged</span>
                      <span className="font-bold text-slate-900">
                        {reportData.notes.numbers_captured?.disputes_logged != null
                          ? reportData.notes.numbers_captured.disputes_logged.toLocaleString()
                          : 'Not reported'}
                      </span>
                    </div>

                    <div className="p-2 border rounded-lg bg-slate-50">
                      <span className="text-[10px] text-slate-500 block">Disputes Resolved</span>
                      <span className="font-bold text-slate-900">
                        {reportData.notes.numbers_captured?.disputes_resolved != null
                          ? reportData.notes.numbers_captured.disputes_resolved.toLocaleString()
                          : 'Not reported'}
                      </span>
                    </div>

                    <div className="p-2 border rounded-lg bg-slate-50">
                      <span className="text-[10px] text-slate-500 block">Unit Staff Count</span>
                      <span className="font-bold text-slate-900">
                        {reportData.notes.numbers_captured?.total_staff != null
                          ? reportData.notes.numbers_captured.total_staff.toLocaleString()
                          : 'Not reported'}
                      </span>
                    </div>
                  </div>

                  {/* Field Observations */}
                  {reportData.notes.observations && (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-900">Interviewer Qualitative Observations:</p>
                      <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed font-serif">
                        {reportData.notes.observations}
                      </p>
                    </div>
                  )}

                  {/* Contradictions & Bottlenecks */}
                  {reportData.notes.contradictions && (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-900">Reported Operational Friction / Contradictions:</p>
                      <p className="text-slate-700 bg-amber-50/50 p-2.5 rounded border border-amber-200 leading-relaxed font-serif">
                        {reportData.notes.contradictions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 5: Official Signatures & Verification */}
                <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs font-sans">
                  <div>
                    <p className="font-bold text-slate-900">Field Diagnostic Interviewer:</p>
                    <div className="mt-8 border-b border-slate-400 w-48" />
                    <p className="mt-1 font-bold">
                      {reportData.interviewerProfile?.full_name || reportData.interview.interviewer_name || 'Assigned Officer'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {reportData.interviewerProfile?.department_unit || 'MGLSD Labour Directorate'}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">Interviewee Verification:</p>
                    <div className="mt-8 border-b border-slate-400 w-48" />
                    <p className="mt-1 font-bold">{reportData.interview.interviewee_name || 'Interviewee'}</p>
                    <p className="text-[10px] text-slate-500">{reportData.interview.role_title || 'Officer'}</p>
                  </div>
                </div>

                {/* Footer Watermark */}
                <div className="text-[9px] text-slate-400 text-center pt-4 border-t border-slate-200 font-sans flex items-center justify-between">
                  <span>TRANSFORMATIVE Diagnostic Suite • System Timestamp: {reportData.fetchedAt}</span>
                  <span>CONFIDENTIAL • FOR OFFICIAL GOVERNMENT USE ONLY</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
