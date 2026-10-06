/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { DocumentItem, RecentActivityItem } from '../types';
import { createInitialChecklist } from '../lib/mockData';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  isUuid,
  fetchOrInitChecklistFromSupabase,
  updateChecklistItemInSupabase,
  uploadFileToSupabaseStorage,
} from '../lib/interviewService';
import {
  savePendingOfflineDocument,
  getPendingOfflineDocumentsCount,
  syncPendingOfflineDocuments,
} from '../lib/offlineDocumentStorage';
import { AutoSaveStatusType } from './useAutoSaveStatus';

interface UseChecklistStateOptions {
  userId?: string | null;
  setAutoSaveStatus: (status: AutoSaveStatusType) => void;
  addRecentActivity?: (item: RecentActivityItem) => void;
}

export function useChecklistState({
  userId,
  setAutoSaveStatus,
  addRecentActivity,
}: UseChecklistStateOptions) {
  // Pure Supabase-driven in-memory cache for active interview checklists
  const [checklistsMap, setChecklistsMap] = useState<Record<string, DocumentItem[]>>({});
  const [pendingDocsCount, setPendingDocsCount] = useState<number>(0);

  // Auto-sync pending offline documents when connection / Supabase is active
  useEffect(() => {
    let isMounted = true;

    const triggerSync = async () => {
      if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
        const { syncedCount } = await syncPendingOfflineDocuments(userId || undefined, (count) => {
          if (isMounted) setPendingDocsCount(count);
        });
        if (syncedCount > 0) {
          setAutoSaveStatus('saved');
        }
      } else {
        const count = await getPendingOfflineDocumentsCount();
        if (isMounted) setPendingDocsCount(count);
      }
    };

    triggerSync();

    const handleOnline = () => {
      triggerSync();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
    };
  }, [userId, setAutoSaveStatus]);

  const getInterviewChecklist = useCallback(
    (interviewId: string): DocumentItem[] => {
      return checklistsMap[interviewId] || createInitialChecklist(interviewId);
    },
    [checklistsMap]
  );

  const initChecklistForInterview = useCallback((interviewId: string) => {
    setChecklistsMap((prev) => {
      if (prev[interviewId]) return prev;
      return {
        ...prev,
        [interviewId]: createInitialChecklist(interviewId),
      };
    });
  }, []);

  const removeChecklistForInterview = useCallback((interviewId: string) => {
    setChecklistsMap((prev) => {
      const copy = { ...prev };
      delete copy[interviewId];
      return copy;
    });
  }, []);

  const loadChecklistFromSupabase = useCallback(async (interviewId: string) => {
    if (!isSupabaseConfigured || !isUuid(interviewId)) return;
    try {
      const fetchedChecklist = await fetchOrInitChecklistFromSupabase(interviewId);
      if (fetchedChecklist && fetchedChecklist.length > 0) {
        setChecklistsMap((prev) => ({
          ...prev,
          [interviewId]: fetchedChecklist,
        }));
      }
    } catch (err) {
      console.warn('Notice: Error loading checklist from Supabase:', err);
    }
  }, []);

  const updateChecklistItem = useCallback(
    (interviewId: string, itemNumber: number, updates: Partial<DocumentItem>) => {
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
    },
    [setAutoSaveStatus]
  );

  const uploadDocumentFile = useCallback(
    async (
      interviewId: string,
      itemNumber: number,
      fileOrName: File | string
    ): Promise<string | void> => {
      setAutoSaveStatus('saving');

      const fileName = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;

      // 1. Snapshot previous item for optimistic rollback on error
      const currentItems = checklistsMap[interviewId] || [];
      const previousItem = currentItems.find((i) => i.item_number === itemNumber);
      const previousSnapshot = previousItem ? { ...previousItem } : null;

      // 2. Optimistic checklist item update
      const initialFileUrl = `#file-${fileName}`;
      updateChecklistItem(interviewId, itemNumber, {
        collected_status: 'Collected',
        exists_status: 'Yes',
        file_name: fileName,
        file_url: initialFileUrl,
        storage_path: initialFileUrl,
      });

      // 3. Real upload to Supabase Storage if File instance and Supabase is configured
      let finalUrl = initialFileUrl;
      if (fileOrName instanceof File && isSupabaseConfigured) {
        try {
          const uploadResult = await uploadFileToSupabaseStorage(
            interviewId,
            itemNumber,
            fileOrName,
            userId || undefined
          );
          finalUrl = uploadResult.url;

          // Update with persistent storage path and file_name
          updateChecklistItem(interviewId, itemNumber, {
            file_url: uploadResult.storagePath,
            file_name: uploadResult.fileName,
            storage_path: uploadResult.storagePath,
            collected_status: 'Collected',
            exists_status: 'Yes',
          });
          setAutoSaveStatus('saved');
        } catch (uploadErr: any) {
          // Rollback optimistic UI on failure
          if (previousSnapshot) {
            updateChecklistItem(interviewId, itemNumber, {
              collected_status: previousSnapshot.collected_status,
              exists_status: previousSnapshot.exists_status,
              file_name: previousSnapshot.file_name,
              file_url: previousSnapshot.file_url,
              storage_path: previousSnapshot.storage_path,
              notes: previousSnapshot.notes,
              follow_up_action: previousSnapshot.follow_up_action,
            });
          }
          setAutoSaveStatus('error');
          throw uploadErr;
        }
      } else {
        if (fileOrName instanceof File) {
          savePendingOfflineDocument(interviewId, itemNumber, fileOrName)
            .then(() => getPendingOfflineDocumentsCount().then(setPendingDocsCount))
            .catch((err) => console.warn('Notice: Offline document storage:', err));
        } else {
          console.info('Demo mode stores metadata only; binary upload requires live Supabase');
        }
        setAutoSaveStatus('saved');
      }

      // 4. Record recent activity item
      if (addRecentActivity) {
        addRecentActivity({
          id: `act-${Date.now()}`,
          description: `A document was uploaded: ${fileName}`,
          timestamp: 'Just now',
          type: 'document',
          organisation: 'MGLSD Labour Directorate',
        });
      }

      return finalUrl;
    },
    [addRecentActivity, checklistsMap, setAutoSaveStatus, updateChecklistItem, userId]
  );

  return {
    checklistsMap,
    pendingDocsCount,
    getInterviewChecklist,
    initChecklistForInterview,
    removeChecklistForInterview,
    loadChecklistFromSupabase,
    updateChecklistItem,
    uploadDocumentFile,
  };
}
