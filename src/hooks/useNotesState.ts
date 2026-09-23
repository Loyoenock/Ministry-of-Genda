/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { InterviewerNote } from '../types';
import { createInitialNotes } from '../lib/mockData';
import { isSupabaseConfigured } from '../lib/supabase';
import { isUuid, fetchOrInitNotesFromSupabase, saveNotesToSupabase } from '../lib/interviewService';
import { AutoSaveStatusType } from './useAutoSaveStatus';

interface UseNotesStateOptions {
  setAutoSaveStatus: (status: AutoSaveStatusType) => void;
}

export function useNotesState({ setAutoSaveStatus }: UseNotesStateOptions) {
  // Pure Supabase-driven in-memory cache for active interview notes
  const [notesMap, setNotesMap] = useState<Record<string, InterviewerNote>>({});

  const saveNotesTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingNotesSave = useRef<{ interviewId: string; updates: Partial<InterviewerNote> } | null>(null);

  useEffect(() => {
    return () => {
      if (saveNotesTimer.current) {
        clearTimeout(saveNotesTimer.current);
        saveNotesTimer.current = null;
      }
    };
  }, []);

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

  const removeNotesForInterview = useCallback((interviewId: string) => {
    if (saveNotesTimer.current) {
      clearTimeout(saveNotesTimer.current);
      saveNotesTimer.current = null;
      pendingNotesSave.current = null;
    }
    setNotesMap((prev) => {
      const copy = { ...prev };
      delete copy[interviewId];
      return copy;
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

  const flushNotesSave = useCallback(async (interviewId?: string): Promise<void> => {
    if (!pendingNotesSave.current) return;
    if (interviewId && pendingNotesSave.current.interviewId !== interviewId) return;

    if (saveNotesTimer.current) {
      clearTimeout(saveNotesTimer.current);
      saveNotesTimer.current = null;
    }

    const { interviewId: targetId, updates } = pendingNotesSave.current;
    pendingNotesSave.current = null;

    if (isSupabaseConfigured && isUuid(targetId)) {
      try {
        await saveNotesToSupabase(targetId, updates);
        setAutoSaveStatus('saved');
      } catch (err) {
        setAutoSaveStatus('error');
        throw err;
      }
    } else {
      setAutoSaveStatus('saved');
    }
  }, [setAutoSaveStatus]);

  const saveNotes = useCallback(
    async (interviewId: string, updates: Partial<InterviewerNote>): Promise<void> => {
      setAutoSaveStatus('saving');

      let previousNote: InterviewerNote | undefined;
      setNotesMap((prev) => {
        previousNote = prev[interviewId] || createInitialNotes(interviewId);
        const updatedNote: InterviewerNote = {
          ...previousNote,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return {
          ...prev,
          [interviewId]: updatedNote,
        };
      });

      pendingNotesSave.current = { interviewId, updates };

      if (saveNotesTimer.current) {
        clearTimeout(saveNotesTimer.current);
      }

      saveNotesTimer.current = setTimeout(async () => {
        saveNotesTimer.current = null;
        pendingNotesSave.current = null;

        if (isSupabaseConfigured && isUuid(interviewId)) {
          try {
            await saveNotesToSupabase(interviewId, updates);
            setAutoSaveStatus('saved');
          } catch (err) {
            if (previousNote) {
              setNotesMap((prev) => ({
                ...prev,
                [interviewId]: previousNote!,
              }));
            }
            setAutoSaveStatus('error');
          }
        } else {
          setAutoSaveStatus('saved');
        }
      }, 500);
    },
    [setAutoSaveStatus]
  );

  return {
    notesMap,
    getInterviewNotes,
    initNotesForInterview,
    removeNotesForInterview,
    loadNotesFromSupabase,
    saveNotes,
    flushNotesSave,
  };
}
