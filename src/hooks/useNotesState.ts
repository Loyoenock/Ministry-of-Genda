/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { InterviewerNote } from '../types';
import { INITIAL_INTERVIEWS, createInitialNotes } from '../lib/mockData';
import { isSupabaseConfigured } from '../lib/supabase';
import { isUuid, fetchOrInitNotesFromSupabase, saveNotesToSupabase } from '../lib/interviewService';
import { AutoSaveStatusType } from './useAutoSaveStatus';

interface UseNotesStateOptions {
  setAutoSaveStatus: (status: AutoSaveStatusType) => void;
}

export function useNotesState({ setAutoSaveStatus }: UseNotesStateOptions) {
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';

  const [notesMap, setNotesMap] = useState<Record<string, InterviewerNote>>(() => {
    if (isTestEnv) {
      const initial: Record<string, InterviewerNote> = {};
      INITIAL_INTERVIEWS.forEach((it) => {
        initial[it.id] = createInitialNotes(it.id);
      });
      return initial;
    }
    if (isSupabaseConfigured) {
      const saved = localStorage.getItem('mglsd_notes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const realNotes: Record<string, InterviewerNote> = {};
          Object.keys(parsed).forEach((k) => {
            if (isUuid(k)) {
              realNotes[k] = parsed[k];
            }
          });
          return realNotes;
        } catch {
          // ignore
        }
      }
      return {};
    }
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

  const saveNotesTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      if (isSupabaseConfigured) {
        const realOnly: Record<string, InterviewerNote> = {};
        Object.keys(notesMap).forEach((k) => {
          if (isUuid(k)) {
            realOnly[k] = notesMap[k];
          }
        });
        localStorage.setItem('mglsd_notes', JSON.stringify(realOnly));
      } else {
        localStorage.setItem('mglsd_notes', JSON.stringify(notesMap));
      }
    } catch {
      // quota guard
    }
  }, [notesMap]);

  const getInterviewNotes = useCallback(
    (interviewId: string): InterviewerNote => {
      return notesMap[interviewId] || createInitialNotes(interviewId);
    },
    [notesMap]
  );

  const initNotesForInterview = useCallback((interviewId: string) => {
    setNotesMap((prev) => {
      if (prev[interviewId]) return prev;
      return {
        ...prev,
        [interviewId]: createInitialNotes(interviewId),
      };
    });
  }, []);

  const loadNotesFromSupabase = useCallback(async (interviewId: string) => {
    if (!isSupabaseConfigured || !isUuid(interviewId)) return;
    try {
      const fetchedNotes = await fetchOrInitNotesFromSupabase(interviewId);
      if (fetchedNotes) {
        setNotesMap((prev) => ({
          ...prev,
          [interviewId]: fetchedNotes,
        }));
      }
    } catch (err) {
      console.warn('Notice: Error loading notes from Supabase:', err);
    }
  }, []);

  const saveNotes = useCallback(
    (interviewId: string, updates: Partial<InterviewerNote>) => {
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
    },
    [setAutoSaveStatus]
  );

  return {
    notesMap,
    getInterviewNotes,
    initNotesForInterview,
    loadNotesFromSupabase,
    saveNotes,
  };
}
