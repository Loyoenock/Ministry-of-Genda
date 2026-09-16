/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Download,
  FileCheck2,
  FileText,
  FileEdit,
  Save,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { InterviewStatus } from '../types';
import { DiagnosticExportModal } from './DiagnosticExportModal';
import { useInterviewFormState } from '../hooks/useInterviewFormState';
import { useSectionNavigation } from '../hooks/useSectionNavigation';
import { QuestionnaireTab } from './interview-form/QuestionnaireTab';
import { DocumentsTab } from './interview-form/DocumentsTab';
import { NotesTab } from './interview-form/NotesTab';

interface DynamicInterviewFormProps {
  interviewId: string;
  onBack: () => void;
}

export const DynamicInterviewForm: React.FC<DynamicInterviewFormProps> = ({
  interviewId,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'questionnaire' | 'documents' | 'notes'>('questionnaire');
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  const {
    interview,
    checklist,
    applicableQuestions,
    applicableSections,
    localAnswers,
    handleAnswerChange,
    localNotes,
    handleNoteFieldChange,
    handleNumbersCapturedChange,
    handleMaturityScoreChange,
    answeredCount,
    overallPercentage,
    collectedDocsCount,
    updateChecklistItem,
    uploadDocumentFile,
    updateInterview,
    autoSaveStatus,
  } = useInterviewFormState(interviewId);

  const {
    activeSectionCode,
    setActiveSectionCode,
    currentSectionIndex,
    prevSection,
    nextSection,
    goToPrevSection,
    goToNextSection,
  } = useSectionNavigation(applicableSections);

  if (!interview) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-600 mb-4 font-semibold">Interview record not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-teal-700 text-white text-xs font-bold rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Diagnostic PDF/Word/Excel Export Modal */}
      {exportModalOpen && (
        <DiagnosticExportModal
          interviewId={interviewId}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {/* Sticky Top Header Banner with Session Info & Status */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 sticky top-20 z-10 backdrop-blur-md bg-white/95">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left info */}
          <div className="flex items-start space-x-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Return to Directory"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  Tier: {interview.tier}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    interview.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : interview.status === 'In Progress'
                      ? 'bg-sky-50 text-sky-800 border border-sky-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {interview.status}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                {interview.interviewee_name}
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                {interview.role_title} &bull; {interview.department_unit}
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{interview.interview_date}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{interview.interview_time || '10:00 AM'}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{interview.location || 'Ministry HQ'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Tools: Auto-save status, status toggle, print/export */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3">
            {/* Auto-save Status Indicator */}
            <div className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span className="font-semibold text-teal-700">Saving changes...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <Save className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-600 font-medium">Saved</span>
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-rose-600 font-semibold">Sync issue</span>
                </>
              )}
            </div>

            {/* Status Selector Dropdown */}
            <select
              value={interview.status}
              aria-label="Interview status"
              onChange={(e) =>
                updateInterview(interview.id, { status: e.target.value as InterviewStatus })
              }
              className="text-xs font-semibold px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[40px]"
            >
              <option value="Draft">Draft</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Export / Print Button */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Dossier</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700">
                Diagnostic Questions Progress
              </span>
              <span className="font-bold text-teal-700">
                {answeredCount} of {applicableQuestions.length} answered ({overallPercentage}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-700 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <FileCheck2 className="w-4 h-4 text-teal-700 shrink-0" />
            <div className="text-xs truncate">
              <span className="text-slate-500">Statutory Docs: </span>
              <span className="font-bold text-slate-800">
                {collectedDocsCount} of {checklist.length} collected
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <FileEdit className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-xs truncate">
              <span className="text-slate-500">Field Synthesis: </span>
              <span className="font-bold text-slate-800">
                {localNotes.observations?.trim() ? 'Notes Captured' : 'Pending Notes'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation: Questions, Documents, Interviewer Notes */}
      <div className="flex items-center space-x-1 bg-slate-200/70 p-1 rounded-2xl max-w-lg">
        <button
          onClick={() => setActiveTab('questionnaire')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 min-h-[42px] ${
            activeTab === 'questionnaire'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-teal-700" />
          <span>Diagnostic Questions</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 min-h-[42px] ${
            activeTab === 'documents'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-teal-700" />
          <span>Evidentiary Checklist</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 min-h-[42px] ${
            activeTab === 'notes'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileEdit className="w-4 h-4 text-amber-600" />
          <span>Interviewer Notes</span>
        </button>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'questionnaire' && (
        <QuestionnaireTab
          tier={interview.tier}
          applicableQuestions={applicableQuestions}
          applicableSections={applicableSections}
          localAnswers={localAnswers}
          onAnswerChange={handleAnswerChange}
          activeSectionCode={activeSectionCode}
          onSelectSection={(code) => setActiveSectionCode(code)}
          onPrevSection={goToPrevSection}
          onNextSection={goToNextSection}
          hasPrevSection={!!prevSection}
          hasNextSection={!!nextSection}
          prevSectionCode={prevSection?.code}
          nextSectionCode={nextSection?.code}
          currentSectionIndex={currentSectionIndex}
        />
      )}

      {activeTab === 'documents' && (
        <DocumentsTab
          interviewId={interview.id}
          checklist={checklist}
          onUpdateChecklistItem={updateChecklistItem}
          onUploadDocumentFile={uploadDocumentFile}
        />
      )}

      {activeTab === 'notes' && (
        <NotesTab
          interviewId={interview.id}
          localNotes={localNotes}
          onNoteFieldChange={handleNoteFieldChange}
          onNumbersCapturedChange={handleNumbersCapturedChange}
          onMaturityScoreChange={handleMaturityScoreChange}
        />
      )}
    </div>
  );
};
