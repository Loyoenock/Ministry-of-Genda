/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
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
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
} from 'lucide-react';
import { InterviewStatus, Interview } from '../types';
import { DiagnosticExportModal } from './DiagnosticExportModal';
import { useInterviewFormState } from '../hooks/useInterviewFormState';
import { useSectionNavigation } from '../hooks/useSectionNavigation';
import { QuestionnaireTab } from './interview-form/QuestionnaireTab';
import { DocumentsTab } from './interview-form/DocumentsTab';
import { NotesTab } from './interview-form/NotesTab';
import { useAuth } from '../context/AuthContext';
import { removeDemoStorageEntriesForInterview } from '../lib/interviewService';

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
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [statusToast, setStatusToast] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { user, isAdmin } = useAuth();

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
    deleteInterview,
    autoSaveStatus,
  } = useInterviewFormState(interviewId);

  // Role validation: Only the assigned interviewer (owner) or an administrator can modify status or delete
  const isOwner = Boolean(user && interview && interview.interviewer_id === user.id);
  const canModify = Boolean(isAdmin || isOwner);

  const showToast = (type: 'success' | 'warning' | 'error', message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setStatusToast({ type, message });
    toastTimerRef.current = setTimeout(() => {
      setStatusToast(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleStatusChange = async (newStatus: InterviewStatus) => {
    if (!interview) return;

    if (!canModify) {
      showToast('warning', 'Only the assigned interviewer or an administrator can modify status.');
      return;
    }

    if (newStatus === interview.status) return;

    try {
      const updates: Partial<Interview> = {
        status: newStatus,
        ...(newStatus === 'Completed' ? { completion_percentage: 100 } : {}),
      };
      await updateInterview(interview.id, updates);
      if (newStatus === 'Completed' && overallPercentage < 100) {
        showToast(
          'warning',
          `Status updated to Completed (forced final completion from ${overallPercentage}%).`
        );
      } else {
        showToast('success', `Status successfully updated to ${newStatus}`);
      }
    } catch (err: any) {
      showToast('error', `Failed to update status: ${err?.message || 'Error occurred'}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!interview || !canModify) return;
    setIsDeleting(true);
    try {
      deleteInterview(interview.id);
      removeDemoStorageEntriesForInterview(interview.id);
      setDeleteModalOpen(false);
      onBack();
    } catch (err: any) {
      setIsDeleting(false);
      showToast('error', `Failed to delete interview: ${err?.message || 'Error occurred'}`);
    }
  };

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

  const isCompletedOptionDisabled = !canModify;

  return (
    <div className="space-y-6 pb-20">
      {/* Diagnostic PDF/Word/Excel Export Modal */}
      {exportModalOpen && (
        <DiagnosticExportModal
          interviewId={interviewId}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-interview-title"
          data-testid="confirm-delete-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3
                  id="delete-interview-title"
                  data-testid="confirm-delete-title"
                  className="text-base font-bold text-slate-900"
                >
                  Permanently delete this interview?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  This will remove the interview, all answers, checklist items, notes and uploaded files. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Target Interview Record Details */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <div>
                <strong className="text-slate-800">Participant:</strong> {interview.interviewee_name}
              </div>
              <div>
                <strong className="text-slate-800">Role & Department:</strong> {interview.role_title} ({interview.department_unit})
              </div>
              <div>
                <strong className="text-slate-800">Tier & Status:</strong> {interview.tier} &bull; {interview.status}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                data-testid="cancel-delete-btn"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition min-h-[42px]"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition flex items-center space-x-2 min-h-[42px] shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Delete permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Top Header Banner with Session Info & Status */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 sticky top-20 z-10 backdrop-blur-md bg-white/95">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left info */}
          <div className="flex items-start space-x-3">
            <button
              onClick={onBack}
              data-testid="back-to-dashboard-btn"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Return to Directory"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200" data-testid="interview-tier-badge">
                  Tier: {interview.tier}
                </span>

                {/* Status Badge with consistent colours matching DashboardView */}
                <span
                  data-testid="status-badge"
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                    interview.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : interview.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {interview.status}
                </span>

                {/* Status Segmented Controls: Draft | In Progress | Completed */}
                <div
                  role="group"
                  aria-label="Interview status controls"
                  className="inline-flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs"
                >
                  <button
                    type="button"
                    data-testid="status-btn-draft"
                    onClick={() => handleStatusChange('Draft')}
                    disabled={!canModify}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      interview.status === 'Draft'
                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200/70'
                        : 'text-slate-500 hover:text-slate-800'
                    } ${!canModify ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={
                      !canModify
                        ? 'Only assigned interviewer or admin can modify status'
                        : 'Set status to Draft'
                    }
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    data-testid="status-btn-in-progress"
                    onClick={() => handleStatusChange('In Progress')}
                    disabled={!canModify}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      interview.status === 'In Progress'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-blue-700'
                    } ${!canModify ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={
                      !canModify
                        ? 'Only assigned interviewer or admin can modify status'
                        : 'Set status to In Progress'
                    }
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    data-testid="status-btn-completed"
                    onClick={() => handleStatusChange('Completed')}
                    disabled={isCompletedOptionDisabled}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      interview.status === 'Completed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : !canModify
                        ? 'text-slate-400 opacity-60 cursor-not-allowed'
                        : 'text-slate-500 hover:text-emerald-700 cursor-pointer'
                    }`}
                    title={
                      !canModify
                        ? 'Only assigned interviewer or admin can modify status'
                        : 'Mark interview as Completed'
                    }
                  >
                    Completed
                  </button>
                </div>

                {!canModify && (
                  <span
                    data-testid="readonly-badge"
                    className="inline-flex items-center space-x-1 text-[11px] text-slate-400 font-medium ml-1"
                    title="Only the assigned interviewer or an administrator can modify status or delete"
                  >
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span className="hidden sm:inline">Read-only</span>
                  </span>
                )}
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

          {/* Right Action Tools: Auto-save status, Delete action, Export dossier */}
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

            {/* Delete Interview Action (Danger Style) */}
            {canModify && (
              <button
                type="button"
                data-testid="delete-interview-btn"
                onClick={() => setDeleteModalOpen(true)}
                className="px-3 py-2 bg-white hover:bg-rose-50 active:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200/90 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition min-h-[40px] shadow-2xs"
                title="Permanently delete this interview"
                aria-label="Delete interview"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Delete Interview</span>
              </button>
            )}

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

        {/* Feedback / Notification Toast Banner */}
        {statusToast && (
          <div
            role="status"
            aria-live="polite"
            data-testid="status-toast"
            className={`mt-3 flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold border shadow-2xs transition-all ${
              statusToast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : statusToast.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusToast.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              {statusToast.type === 'warning' && (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              {statusToast.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusToast.message}</span>
            </div>
            <button
              onClick={() => setStatusToast(null)}
              className="ml-3 p-1 text-slate-400 hover:text-slate-600 rounded-md"
              aria-label="Close message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Diagnostic Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700">
                Diagnostic Questions Progress
              </span>
              <span className="font-bold text-teal-700" data-testid="progress-percentage-text">
                {answeredCount} of {applicableQuestions.length} answered ({overallPercentage}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                data-testid="progress-bar"
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
          data-testid="tab-questionnaire"
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
          data-testid="tab-documents"
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
          data-testid="tab-notes"
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
