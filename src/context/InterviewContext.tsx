/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Interview,
  Answer,
  DocumentItem,
  InterviewerNote,
  RecentActivityItem,
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
import { isSupabaseConfigured } from '../lib/supabase';
import {
  isUuid,
  generateUuid,
  fetchInterviewsFromSupabase,
  fetchAllInterviewsGlobalFromSupabase,
  insertInterviewToSupabase,
  updateInterviewInSupabase,
  deleteInterviewFromSupabase,
  fetchAnswersFromSupabase,
  upsertAnswerInSupabase,
  fetchOrInitChecklistFromSupabase,
  updateChecklistItemInSupabase,
  fetchOrInitNotesFromSupabase,
  saveNotesToSupabase,
  uploadFileToSupabaseStorage,
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
  loading: boolean;
  error: string | null;
  refreshInterviews: () => Promise<void>;
  selectInterview: (id: string | null) => void;
  createInterview: (
    interviewData: Omit<Interview, 'id' | 'created_at' | 'updated_at' | 'completion_percentage'>
  ) => Interview;
  updateInterview: (id: string, updates: Partial<Interview>) => void | Promise<void>;
  deleteInterview: (id: string) => void | Promise<void>;
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

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();

  // Local caching & offline resilience state
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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync to localStorage as offline cache
  useEffect(() => {
    try {
      localStorage.setItem('mglsd_interviews', JSON.stringify(allInterviews));
    } catch {
      // quota or private mode guard
    }
  }, [allInterviews]);

  useEffect(() => {
    try {
      localStorage.setItem('mglsd_answers', JSON.stringify(answersMap));
    } catch {
      // quota guard
    }
  }, [answersMap]);

  useEffect(() => {
    try {
      localStorage.setItem('mglsd_checklists', JSON.stringify(checklistsMap));
    } catch {
      // quota guard
    }
  }, [checklistsMap]);

  useEffect(() => {
    try {
      localStorage.setItem('mglsd_notes', JSON.stringify(notesMap));
    } catch {
      // quota guard
    }
  }, [notesMap]);

  useEffect(() => {
    try {
      localStorage.setItem('mglsd_activities', JSON.stringify(recentActivities));
    } catch {
      // quota guard
    }
  }, [recentActivities]);

  /**
   * Primary data loader: Fetches user's interviews (or all if admin) from Supabase
   */
  const loadInterviews = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isAdmin) {
        const globalList = await fetchAllInterviewsGlobalFromSupabase();
        if (globalList.length > 0) {
          setAllInterviews(globalList);
        }
      } else if (user?.id) {
        const userList = await fetchInterviewsFromSupabase(user.id, false);
        if (userList.length > 0) {
          setAllInterviews(userList);
        }
      }
    } catch (err: any) {
      console.warn('Notice: Supabase interviews sync error:', err);
      setError(err?.message || 'Could not connect to database');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin]);

  // Load interviews when auth state changes
  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  // Load answers, checklist, and notes from Supabase when an interview is selected
  const loadInterviewSubData = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !isUuid(id)) {
      return;
    }

    try {
      // 1. Fetch answers
      const fetchedAnswers = await fetchAnswersFromSupabase(id);
      if (fetchedAnswers.length > 0) {
        setAnswersMap((prev) => ({
          ...prev,
          [id]: fetchedAnswers,
        }));
      }

      // 2. Fetch checklist
      const fetchedChecklist = await fetchOrInitChecklistFromSupabase(id);
      if (fetchedChecklist.length > 0) {
        setChecklistsMap((prev) => ({
          ...prev,
          [id]: fetchedChecklist,
        }));
      }

      // 3. Fetch notes
      const fetchedNotes = await fetchOrInitNotesFromSupabase(id);
      if (fetchedNotes) {
        setNotesMap((prev) => ({
          ...prev,
          [id]: fetchedNotes,
        }));
      }
    } catch (err) {
      console.warn('Notice: Error loading interview details from Supabase:', err);
    }
  }, []);

  // Row Level Security (RLS) Visibility:
  // - Admin sees everything
  // - Interviewer only sees interviews assigned to them
  const visibleInterviews = isAdmin
    ? allInterviews
    : allInterviews.filter((it) => (user?.id ? it.interviewer_id === user.id : true));

  const activeInterview =
    allInterviews.find((it) => it.id === activeInterviewId) || null;

  const selectInterview = (id: string | null) => {
    setActiveInterviewId(id);
    if (id) {
      // Ensure checklist and notes exist locally
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

      // Fetch fresh Supabase records if online
      loadInterviewSubData(id);
    }
  };

  /**
   * Create Interview:
   * Synchronously creates optimistic local record for instant UI navigation,
   * then asynchronously persists to Supabase 'interviews', 'documents_checklist',
   * and 'interviewer_notes' tables.
   */
  const createInterview = (
    data: Omit<Interview, 'id' | 'created_at' | 'updated_at' | 'completion_percentage'>
  ): Interview => {
    const newId = generateUuid();
    const nowIso = new Date().toISOString();

    const newInterview: Interview = {
      ...data,
      id: newId,
      completion_percentage: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 1. Optimistic local updates
    setAllInterviews((prev) => [newInterview, ...prev]);
    const initialChecklist = createInitialChecklist(newId);
    const initialNotes = createInitialNotes(newId);

    setChecklistsMap((prev) => ({
      ...prev,
      [newId]: initialChecklist,
    }));
    setNotesMap((prev) => ({
      ...prev,
      [newId]: initialNotes,
    }));
    setAnswersMap((prev) => ({
      ...prev,
      [newId]: [],
    }));

    // Record activity
    setRecentActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        description: `You scheduled an interview with ${data.interviewee_name} (${data.role_title})`,
        timestamp: 'Just now',
        type: 'started',
        interviewee: data.interviewee_name,
        organisation: data.department_unit,
      },
      ...prev.slice(0, 8),
    ]);

    // 2. Asynchronously persist to Supabase if configured
    if (isSupabaseConfigured && isUuid(newInterview.interviewer_id)) {
      insertInterviewToSupabase(newInterview)
        .then(() => {
          // Initialize statutory checklist in Supabase
          return fetchOrInitChecklistFromSupabase(newId);
        })
        .then(() => {
          // Initialize notes in Supabase
          return fetchOrInitNotesFromSupabase(newId);
        })
        .catch((err) => {
          console.warn('Notice: Background Supabase interview creation sync:', err);
        });
    }

    return newInterview;
  };

  /**
   * Update Interview:
   * Optimistically updates state, then persists to Supabase.
   */
  const updateInterview = (id: string, updates: Partial<Interview>) => {
    setAllInterviews((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, ...updates, updated_at: new Date().toISOString() } : it
      )
    );

    if (isSupabaseConfigured && isUuid(id)) {
      updateInterviewInSupabase(id, updates).catch((err) => {
        console.warn('Notice: Supabase interview update sync:', err);
      });
    }
  };

  /**
   * Delete Interview:
   * Optimistically removes interview, then calls Supabase delete.
   */
  const deleteInterview = (id: string) => {
    setAllInterviews((prev) => prev.filter((it) => it.id !== id));
    if (activeInterviewId === id) {
      setActiveInterviewId(null);
    }

    if (isSupabaseConfigured && isUuid(id)) {
      deleteInterviewFromSupabase(id).catch((err) => {
        console.warn('Notice: Supabase interview deletion sync:', err);
      });
    }
  };

  const getInterviewAnswers = (interviewId: string): Answer[] => {
    return answersMap[interviewId] || [];
  };

  // Debounce timers map for saving answers
  const saveAnswerTimers = useRef<Record<string, NodeJS.Timeout>>({});

  /**
   * Save Answer:
   * Optimistic instant in-memory update with debounced auto-save to Supabase.
   * Recalculates completion percentage and updates status dynamically.
   */
  const saveAnswer = (
    interviewId: string,
    questionId: string,
    text: string,
    structuredData?: Record<string, any>
  ) => {
    setAutoSaveStatus('saving');

    let updatedPct = 0;
    let nextStatus: InterviewStatus = 'In Progress';

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
        updatedPct = Math.min(100, Math.round((answeredCount / (applicableQuestions.length || 1)) * 100));

        nextStatus = targetInterview.status;
        if (updatedPct === 100) {
          nextStatus = 'Completed';
        } else if (updatedPct > 0 && targetInterview.status === 'Draft') {
          nextStatus = 'In Progress';
        }

        // Update local interview progress
        updateInterview(interviewId, {
          completion_percentage: updatedPct,
          status: nextStatus,
        });
      }

      return {
        ...prev,
        [interviewId]: updatedList,
      };
    });

    // Debounce Supabase persistence
    const key = `${interviewId}-${questionId}`;
    if (saveAnswerTimers.current[key]) {
      clearTimeout(saveAnswerTimers.current[key]);
    }

    saveAnswerTimers.current[key] = setTimeout(async () => {
      if (isSupabaseConfigured && isUuid(interviewId)) {
        try {
          await upsertAnswerInSupabase(
            interviewId,
            questionId,
            text,
            structuredData,
            user?.id
          );
          await updateInterviewInSupabase(interviewId, {
            completion_percentage: updatedPct,
            status: nextStatus,
          });
          setAutoSaveStatus('saved');
        } catch {
          setAutoSaveStatus('error');
        }
      } else {
        setAutoSaveStatus('saved');
      }
    }, 450);
  };

  const getInterviewChecklist = (interviewId: string): DocumentItem[] => {
    return checklistsMap[interviewId] || createInitialChecklist(interviewId);
  };

  /**
   * Update Checklist Item:
   * Optimistic update + Supabase sync.
   */
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

    if (isSupabaseConfigured && isUuid(interviewId)) {
      updateChecklistItemInSupabase(interviewId, itemNumber, updates)
        .then(() => setAutoSaveStatus('saved'))
        .catch(() => setAutoSaveStatus('error'));
    } else {
      setTimeout(() => setAutoSaveStatus('saved'), 300);
    }
  };

  const getInterviewNotes = (interviewId: string): InterviewerNote => {
    return notesMap[interviewId] || createInitialNotes(interviewId);
  };

  const saveNotesTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Save Notes:
   * Optimistic update + debounced Supabase sync.
   */
  const saveNotes = (interviewId: string, updates: Partial<InterviewerNote>) => {
    setAutoSaveStatus('saving');

    let updatedNote: InterviewerNote;
    setNotesMap((prev) => {
      const current = prev[interviewId] || createInitialNotes(interviewId);
      updatedNote = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return {
        ...prev,
        [interviewId]: updatedNote,
      };
    });

    if (saveNotesTimer.current) {
      clearTimeout(saveNotesTimer.current);
    }

    saveNotesTimer.current = setTimeout(async () => {
      if (isSupabaseConfigured && isUuid(interviewId)) {
        try {
          await saveNotesToSupabase(interviewId, updates);
          setAutoSaveStatus('saved');
        } catch {
          setAutoSaveStatus('error');
        }
      } else {
        setAutoSaveStatus('saved');
      }
    }, 450);
  };

  /**
   * Real file upload to Supabase Storage:
   * Handles File objects via uploadFileToSupabaseStorage and saves path/URL to documents_checklist.
   * Also accepts string filenames for backwards compatibility.
   */
  const uploadDocumentFile = async (
    interviewId: string,
    itemNumber: number,
    fileOrName: File | string
  ): Promise<string | void> => {
    setAutoSaveStatus('saving');

    const fileName = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;

    // 1. Optimistic checklist item update
    updateChecklistItem(interviewId, itemNumber, {
      collected_status: 'Collected',
      exists_status: 'Yes',
      file_name: fileName,
      file_url: `#${fileName}`,
    });

    // 2. Real upload to Supabase Storage if File instance
    let finalUrl = `#${fileName}`;
    if (fileOrName instanceof File && isSupabaseConfigured) {
      try {
        const uploadResult = await uploadFileToSupabaseStorage(
          interviewId,
          itemNumber,
          fileOrName,
          user?.id
        );
        finalUrl = uploadResult.url;

        // Update with permanent signed URL / storage path
        updateChecklistItem(interviewId, itemNumber, {
          file_url: uploadResult.url,
          file_name: uploadResult.fileName,
        });
      } catch (uploadErr) {
        console.warn('Storage upload notice:', uploadErr);
      }
    }

    setAutoSaveStatus('saved');

    // 3. Record recent activity item
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

    return finalUrl;
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
        loading,
        error,
        refreshInterviews: loadInterviews,
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
