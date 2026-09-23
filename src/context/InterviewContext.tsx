/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useCallback } from 'react';
import {
  Interview,
  Answer,
  DocumentItem,
  InterviewerNote,
  RecentActivityItem,
} from '../types';
import { useAuth } from './AuthContext';
import { useAutoSaveStatus } from '../hooks/useAutoSaveStatus';
import { useInterviewRecords } from '../hooks/useInterviewRecords';
import { useAnswersState } from '../hooks/useAnswersState';
import { useChecklistState } from '../hooks/useChecklistState';
import { useNotesState } from '../hooks/useNotesState';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  isUuid,
  fetchOrInitChecklistFromSupabase,
  fetchOrInitNotesFromSupabase,
  completeInterviewInSupabase,
} from '../lib/interviewService';

export interface InterviewContextType {
  interviews: Interview[];
  allInterviewsGlobal: Interview[];
  activeInterviewId: string | null;
  activeInterview: Interview | null;
  recentActivities: RecentActivityItem[];
  answers: Record<string, Answer[]>;
  checklists: Record<string, DocumentItem[]>;
  notes: Record<string, InterviewerNote>;
  autoSaveStatus: 'saved' | 'saving' | 'error';
  setAutoSaveStatus: (status: 'saved' | 'saving' | 'error') => void;
  loading: boolean;
  error: string | null;
  refreshInterviews: () => Promise<void>;
  selectInterview: (id: string | null) => void;
  createInterview: (
    interviewData: Omit<Interview, 'id' | 'created_at' | 'updated_at' | 'completion_percentage'>
  ) => Interview;
  updateInterview: (id: string, updates: Partial<Interview>) => void | Promise<void>;
  deleteInterview: (id: string) => void | Promise<void>;
  completeInterview: (id: string, completionPercentage: number) => Promise<void>;
  flushAnswersSave: (interviewId: string) => Promise<void>;
  flushNotesSave: (interviewId?: string) => Promise<void>;
  getInterviewAnswers: (interviewId: string) => Answer[];
  saveAnswer: (
    interviewId: string,
    questionId: string,
    text: string,
    structuredData?: Record<string, any>
  ) => void | Promise<void>;
  getInterviewChecklist: (interviewId: string) => DocumentItem[];
  updateChecklistItem: (
    interviewId: string,
    itemNumber: number,
    updates: Partial<DocumentItem>
  ) => void | Promise<void>;
  getInterviewNotes: (interviewId: string) => InterviewerNote;
  saveNotes: (interviewId: string, updates: Partial<InterviewerNote>) => void | Promise<void>;
  uploadDocumentFile: (
    interviewId: string,
    itemNumber: number,
    fileOrName: File | string
  ) => Promise<string | void> | void;
}

export const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const { autoSaveStatus, setAutoSaveStatus } = useAutoSaveStatus('saved');

  // Sub-data managers initialized
  const checklistState = useChecklistState({
    userId: user?.id,
    setAutoSaveStatus,
  });

  const notesState = useNotesState({
    setAutoSaveStatus,
  });

  const handleInterviewCreated = useCallback(
    (newInterview: Interview) => {
      checklistState.initChecklistForInterview(newInterview.id);
      notesState.initNotesForInterview(newInterview.id);
      answersState.initAnswersForInterview(newInterview.id);

      if (isSupabaseConfigured && isUuid(newInterview.id)) {
        fetchOrInitChecklistFromSupabase(newInterview.id)
          .then(() => fetchOrInitNotesFromSupabase(newInterview.id))
          .catch((err) => {
            console.warn('Notice: Background Supabase sub-data initialization:', err);
          });
      }
    },
    [checklistState, notesState]
  );

  const handleInterviewSelected = useCallback(
    (id: string) => {
      checklistState.initChecklistForInterview(id);
      notesState.initNotesForInterview(id);

      if (isSupabaseConfigured && isUuid(id)) {
        answersState.loadAnswersFromSupabase(id);
        checklistState.loadChecklistFromSupabase(id);
        notesState.loadNotesFromSupabase(id);
      }
    },
    [checklistState, notesState]
  );

  const interviewRecords = useInterviewRecords({
    userId: user?.id,
    isAdmin,
    onInterviewCreated: handleInterviewCreated,
    onInterviewSelected: handleInterviewSelected,
  });

  const answersState = useAnswersState({
    userId: user?.id,
    allInterviews: interviewRecords.allInterviews,
    updateInterview: interviewRecords.updateInterview,
    setAutoSaveStatus,
  });

  const uploadDocumentFile = useCallback(
    async (interviewId: string, itemNumber: number, fileOrName: File | string) => {
      const url = await checklistState.uploadDocumentFile(interviewId, itemNumber, fileOrName);
      const fileName = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
      interviewRecords.addRecentActivity({
        id: `act-${Date.now()}`,
        description: `A document was uploaded: ${fileName}`,
        timestamp: 'Just now',
        type: 'document',
        organisation: 'MGLSD Labour Directorate',
      });
      return url;
    },
    [checklistState, interviewRecords]
  );

  const handleDeleteInterview = useCallback(
    (id: string) => {
      interviewRecords.deleteInterview(id);
      answersState.removeAnswersForInterview(id);
      checklistState.removeChecklistForInterview(id);
      notesState.removeNotesForInterview(id);
    },
    [interviewRecords, answersState, checklistState, notesState]
  );

  const completeInterview = useCallback(
    async (id: string, completionPercentage: number) => {
      // 1. Flush pending debounced answers and notes
      await Promise.all([
        answersState.flushAnswersSave(id),
        notesState.flushNotesSave(id),
      ]);

      // 2. Persist completed state to Supabase database FIRST
      if (isSupabaseConfigured && isUuid(id)) {
        await completeInterviewInSupabase(id, completionPercentage);
      }

      // 3. Update local state
      interviewRecords.updateInterview(id, {
        status: 'Completed',
        completion_percentage: Math.min(100, Math.max(0, completionPercentage)),
        updated_at: new Date().toISOString(),
      });
    },
    [answersState, notesState, interviewRecords]
  );

  return (
    <InterviewContext.Provider
      value={{
        interviews: interviewRecords.visibleInterviews,
        allInterviewsGlobal: interviewRecords.allInterviews,
        activeInterviewId: interviewRecords.activeInterviewId,
        activeInterview: interviewRecords.activeInterview,
        recentActivities: interviewRecords.recentActivities,
        answers: answersState.answersMap,
        checklists: checklistState.checklistsMap,
        notes: notesState.notesMap,
        autoSaveStatus,
        setAutoSaveStatus,
        loading: interviewRecords.loading,
        error: interviewRecords.error,
        refreshInterviews: interviewRecords.refreshInterviews,
        selectInterview: interviewRecords.selectInterview,
        createInterview: interviewRecords.createInterview,
        updateInterview: interviewRecords.updateInterview,
        deleteInterview: handleDeleteInterview,
        completeInterview,
        flushAnswersSave: answersState.flushAnswersSave,
        flushNotesSave: notesState.flushNotesSave,
        getInterviewAnswers: answersState.getInterviewAnswers,
        saveAnswer: answersState.saveAnswer,
        getInterviewChecklist: checklistState.getInterviewChecklist,
        updateChecklistItem: checklistState.updateChecklistItem,
        getInterviewNotes: notesState.getInterviewNotes,
        saveNotes: notesState.saveNotes,
        uploadDocumentFile,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterviews = () => {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterviews must be used within an InterviewProvider');
  }
  return context;
};
