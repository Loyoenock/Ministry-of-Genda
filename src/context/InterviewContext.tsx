/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Interview,
  Answer,
  DocumentItem,
  InterviewerNote,
  RecentActivityItem,
  InterviewTier,
  InterviewStatus,
} from '../types';
import {
  INITIAL_INTERVIEWS,
  INITIAL_RECENT_ACTIVITIES,
  SAMPLE_ANSWERS_INT_001,
  createInitialChecklist,
  createInitialNotes,
} from '../lib/mockData';
import { getQuestionsForTier } from '../lib/questionsData';
import { useAuth } from './AuthContext';

interface InterviewContextType {
  interviews: Interview[];
  allInterviewsGlobal: Interview[];
  activeInterviewId: string | null;
  activeInterview: Interview | null;
  recentActivities: RecentActivityItem[];
  answers: Record<string, Answer[]>;
  checklists: Record<string, DocumentItem[]>;
  notes: Record<string, InterviewerNote>;
  autoSaveStatus: 'saved' | 'saving' | 'error';
  selectInterview: (id: string | null) => void;
  createInterview: (interviewData: Omit<Interview, 'id' | 'created_at' | 'updated_at' | 'completion_percentage'>) => Interview;
  updateInterview: (id: string, updates: Partial<Interview>) => void;
  deleteInterview: (id: string) => void;
  getInterviewAnswers: (interviewId: string) => Answer[];
  saveAnswer: (interviewId: string, questionId: string, text: string, structuredData?: Record<string, any>) => void;
  getInterviewChecklist: (interviewId: string) => DocumentItem[];
  updateChecklistItem: (interviewId: string, itemNumber: number, updates: Partial<DocumentItem>) => void;
  getInterviewNotes: (interviewId: string) => InterviewerNote;
  saveNotes: (interviewId: string, updates: Partial<InterviewerNote>) => void;
  uploadDocumentFile: (interviewId: string, itemNumber: number, fileName: string) => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();

  const [allInterviews, setAllInterviews] = useState<Interview[]>(() => {
    const saved = localStorage.getItem('mglsd_interviews');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_INTERVIEWS;
  });

  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);

  const [answersMap, setAnswersMap] = useState<Record<string, Answer[]>>(() => {
    const saved = localStorage.getItem('mglsd_answers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      'int-001': SAMPLE_ANSWERS_INT_001,
    };
  });

  const [checklistsMap, setChecklistsMap] = useState<Record<string, DocumentItem[]>>(() => {
    const saved = localStorage.getItem('mglsd_checklists');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    const initial: Record<string, DocumentItem[]> = {};
    INITIAL_INTERVIEWS.forEach((it) => {
      initial[it.id] = createInitialChecklist(it.id);
    });
    return initial;
  });

  const [notesMap, setNotesMap] = useState<Record<string, InterviewerNote>>(() => {
    const saved = localStorage.getItem('mglsd_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    const initial: Record<string, InterviewerNote> = {};
    INITIAL_INTERVIEWS.forEach((it) => {
      initial[it.id] = createInitialNotes(it.id);
    });
    return initial;
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>(() => {
    const saved = localStorage.getItem('mglsd_activities');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_RECENT_ACTIVITIES;
  });

  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mglsd_interviews', JSON.stringify(allInterviews));
  }, [allInterviews]);

  useEffect(() => {
    localStorage.setItem('mglsd_answers', JSON.stringify(answersMap));
  }, [answersMap]);

  useEffect(() => {
    localStorage.setItem('mglsd_checklists', JSON.stringify(checklistsMap));
  }, [checklistsMap]);

  useEffect(() => {
    localStorage.setItem('mglsd_notes', JSON.stringify(notesMap));
  }, [notesMap]);

  useEffect(() => {
    localStorage.setItem('mglsd_activities', JSON.stringify(recentActivities));
  }, [recentActivities]);

  // RLS Enforcement:
  // If Interviewer: only sees interviews where interviewer_id matches user.id
  // If Admin: sees everything
  const visibleInterviews = isAdmin
    ? allInterviews
    : allInterviews.filter((it) => it.interviewer_id === user.id);

  const activeInterview =
    allInterviews.find((it) => it.id === activeInterviewId) || null;

  const selectInterview = (id: string | null) => {
    setActiveInterviewId(id);
    if (id) {
      // Ensure checklist and notes exist
      if (!checklistsMap[id]) {
        setChecklistsMap((prev) => ({
          ...prev,
          [id]: createInitialChecklist(id),
        }));
      }
      if (!notesMap[id]) {
        setNotesMap((prev) => ({
          ...prev,
          [id]: createInitialNotes(id),
        }));
      }
    }
  };

  const createInterview = (
    data: Omit<Interview, 'id' | 'created_at' | 'updated_at' | 'completion_percentage'>
  ): Interview => {
    const newId = `int-${Date.now().toString().slice(-4)}`;
    const newInterview: Interview = {
      ...data,
      id: newId,
      completion_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setAllInterviews((prev) => [newInterview, ...prev]);
    setChecklistsMap((prev) => ({
      ...prev,
      [newId]: createInitialChecklist(newId),
    }));
    setNotesMap((prev) => ({
      ...prev,
      [newId]: createInitialNotes(newId),
    }));
    setAnswersMap((prev) => ({
      ...prev,
      [newId]: [],
    }));

    // Record activity
    setRecentActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        description: `You started an interview with ${data.interviewee_name} (${data.role_title})`,
        timestamp: 'Just now',
        type: 'started',
        interviewee: data.interviewee_name,
        organisation: data.department_unit,
      },
      ...prev.slice(0, 8),
    ]);

    return newInterview;
  };

  const updateInterview = (id: string, updates: Partial<Interview>) => {
    setAllInterviews((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updates, updated_at: new Date().toISOString() } : it))
    );
  };

  const deleteInterview = (id: string) => {
    setAllInterviews((prev) => prev.filter((it) => it.id !== id));
    if (activeInterviewId === id) {
      setActiveInterviewId(null);
    }
  };

  const getInterviewAnswers = (interviewId: string): Answer[] => {
    return answersMap[interviewId] || [];
  };

  const saveAnswer = (
    interviewId: string,
    questionId: string,
    text: string,
    structuredData?: Record<string, any>
  ) => {
    setAutoSaveStatus('saving');
    setAnswersMap((prev) => {
      const currentList = prev[interviewId] || [];
      const existingIdx = currentList.findIndex((a) => a.question_id === questionId);
      let updatedList: Answer[];

      if (existingIdx >= 0) {
        updatedList = [...currentList];
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          answer_text: text,
          structured_data: structuredData || updatedList[existingIdx].structured_data,
          updated_at: new Date().toISOString(),
        };
      } else {
        const newAns: Answer = {
          id: `ans-${interviewId}-${questionId}`,
          interview_id: interviewId,
          question_id: questionId,
          answer_text: text,
          structured_data: structuredData,
          updated_at: new Date().toISOString(),
        };
        updatedList = [...currentList, newAns];
      }

      // Recalculate completion percentage for this interview
      const targetInterview = allInterviews.find((it) => it.id === interviewId);
      if (targetInterview) {
        const applicableQuestions = getQuestionsForTier(targetInterview.tier);
        const answeredCount = updatedList.filter((a) => a.answer_text.trim().length > 0).length;
        const pct = Math.min(100, Math.round((answeredCount / (applicableQuestions.length || 1)) * 100));
        
        let nextStatus: InterviewStatus = targetInterview.status;
        if (pct === 100) {
          nextStatus = 'Completed';
        } else if (pct > 0 && targetInterview.status === 'Draft') {
          nextStatus = 'In Progress';
        }

        updateInterview(interviewId, {
          completion_percentage: pct,
          status: nextStatus,
        });
      }

      return {
        ...prev,
        [interviewId]: updatedList,
      };
    });

    setTimeout(() => {
      setAutoSaveStatus('saved');
    }, 400);
  };

  const getInterviewChecklist = (interviewId: string): DocumentItem[] => {
    return checklistsMap[interviewId] || createInitialChecklist(interviewId);
  };

  const updateChecklistItem = (
    interviewId: string,
    itemNumber: number,
    updates: Partial<DocumentItem>
  ) => {
    setAutoSaveStatus('saving');
    setChecklistsMap((prev) => {
      const current = prev[interviewId] || createInitialChecklist(interviewId);
      const updated = current.map((item) =>
        item.item_number === itemNumber ? { ...item, ...updates } : item
      );
      return {
        ...prev,
        [interviewId]: updated,
      };
    });
    setTimeout(() => setAutoSaveStatus('saved'), 300);
  };

  const getInterviewNotes = (interviewId: string): InterviewerNote => {
    return notesMap[interviewId] || createInitialNotes(interviewId);
  };

  const saveNotes = (interviewId: string, updates: Partial<InterviewerNote>) => {
    setAutoSaveStatus('saving');
    setNotesMap((prev) => {
      const current = prev[interviewId] || createInitialNotes(interviewId);
      return {
        ...prev,
        [interviewId]: {
          ...current,
          ...updates,
          updated_at: new Date().toISOString(),
        },
      };
    });
    setTimeout(() => setAutoSaveStatus('saved'), 300);
  };

  const uploadDocumentFile = (interviewId: string, itemNumber: number, fileName: string) => {
    updateChecklistItem(interviewId, itemNumber, {
      collected_status: 'Collected',
      exists_status: 'Yes',
      file_name: fileName,
      file_url: `#${fileName}`,
    });

    setRecentActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        description: `A document was uploaded: ${fileName}`,
        timestamp: 'Just now',
        type: 'document',
        organisation: 'MGLSD Labour Directorate',
      },
      ...prev.slice(0, 8),
    ]);
  };

  return (
    <InterviewContext.Provider
      value={{
        interviews: visibleInterviews,
        allInterviewsGlobal: allInterviews,
        activeInterviewId,
        activeInterview,
        recentActivities,
        answers: answersMap,
        checklists: checklistsMap,
        notes: notesMap,
        autoSaveStatus,
        selectInterview,
        createInterview,
        updateInterview,
        deleteInterview,
        getInterviewAnswers,
        saveAnswer,
        getInterviewChecklist,
        updateChecklistItem,
        getInterviewNotes,
        saveNotes,
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
