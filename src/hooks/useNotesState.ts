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

interface PendingNotesSaveItem {
  interviewId: string;
  updates: Partial<InterviewerNote>;
  version: number;
}

interface UseNotesStateOptions {
  setAutoSaveStatus: (status: AutoSaveStatusType) => void;
}

export function useNotesState({ setAutoSaveStatus }: UseNotesStateOptions) {
  // Pure Supabase-driven in-memory cache for active interview notes
  const [notesMap, setNotesMap] = useState<Record<string, InterviewerNote>>({});

  const saveNotesTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingNotesSave = useRef<PendingNotesSaveItem | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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
    if (pendingNotesSave.current?.interviewId === interviewId) {
      if (saveNotesTimer.current) {
        clearTimeout(saveNotesTimer.current);
        saveNotesTimer.current = null;
      }
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

    const itemToFlush = pendingNotesSave.current;
    const targetId = itemToFlush.interviewId;
    const updatesToPersist = { ...itemToFlush.updates };

    if (!isSupabaseConfigured || !isUuid(targetId)) {
      if (pendingNotesSave.current?.version === itemToFlush.version) {
        pendingNotesSave.current = null;
      }
      setAutoSaveStatus('saved');
      return;
    }

    setAutoSaveStatus('saving');
    try {
      await saveNotesToSupabase(targetId, updatesToPersist);

      if (pendingNotesSave.current?.version === itemToFlush.version) {
        pendingNotesSave.current = null;
      } else if (pendingNotesSave.current?.interviewId === targetId) {
        const remaining: Partial<InterviewerNote> = {};
        let hasRemaining = false;
        for (const [k, v] of Object.entries(pendingNotesSave.current.updates)) {
          if (updatesToPersist[k as keyof InterviewerNote] !== v) {
            (remaining as any)[k] = v;
            hasRemaining = true;
          }
        }
        pendingNotesSave.current = hasRemaining
          ? { ...pendingNotesSave.current, updates: remaining }
          : null;
      }
      setAutoSaveStatus('saved');
    } catch (err) {
      console.error('[notes] flush failed', err);
      setAutoSaveStatus('error');
      throw err;
    }
  }, [setAutoSaveStatus]);

  const saveNotes = useCallback(
    async (interviewId: string, updates: Partial<InterviewerNote>): Promise<void> => {
      setAutoSaveStatus('saving');

      setNotesMap((prev) => {
        const previousNote = prev[interviewId] || createInitialNotes(interviewId);
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

      const currentPending =
        pendingNotesSave.current?.interviewId === interviewId
          ? pendingNotesSave.current.updates
          : {};
      const currentVersion =
        pendingNotesSave.current?.interviewId === interviewId
          ? pendingNotesSave.current.version
          : 0;
      const nextVersion = currentVersion + 1;
      const mergedUpdates = { ...currentPending, ...updates };

      const saveItem: PendingNotesSaveItem = {
        interviewId,
        updates: mergedUpdates,
        version: nextVersion,
      };
      pendingNotesSave.current = saveItem;

      if (saveNotesTimer.current) {
        clearTimeout(saveNotesTimer.current);
        saveNotesTimer.current = null;
      }

      saveNotesTimer.current = setTimeout(async () => {
        saveNotesTimer.current = null;
        if (!isMountedRef.current) return;

        if (!isSupabaseConfigured || !isUuid(interviewId)) {
          // Local/demo mode: save succeeds in memory after debounce window
          if (pendingNotesSave.current?.version === saveItem.version) {
            pendingNotesSave.current = null;
          }
          setAutoSaveStatus('saved');
          return;
        }

        const updatesToPersist = { ...saveItem.updates };

        try {
          await saveNotesToSupabase(interviewId, updatesToPersist);
          if (!isMountedRef.current) return;

          if (pendingNotesSave.current?.version === saveItem.version) {
            pendingNotesSave.current = null;
            setAutoSaveStatus('saved');
          } else if (pendingNotesSave.current?.interviewId === interviewId) {
            // Remove persisted keys while retaining any newer edits
            const remaining: Partial<InterviewerNote> = {};
            let hasRemaining = false;
            for (const [k, v] of Object.entries(pendingNotesSave.current.updates)) {
              if (updatesToPersist[k as keyof InterviewerNote] !== v) {
                (remaining as any)[k] = v;
                hasRemaining = true;
              }
            }
            pendingNotesSave.current = hasRemaining
              ? { ...pendingNotesSave.current, updates: remaining }
              : null;
            if (!pendingNotesSave.current) {
              setAutoSaveStatus('saved');
            }
          }
        } catch (err) {
          console.error('[notes] persist failed', err);
          if (isMountedRef.current) {
            setAutoSaveStatus('error');
          }
          // pendingNotesSave.current is kept for retry!
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
