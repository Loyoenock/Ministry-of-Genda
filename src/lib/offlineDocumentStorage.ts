/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isSupabaseConfigured } from './supabase';
import { uploadFileToSupabaseStorage } from './interviewService';

export interface PendingOfflineDocument {
  id: string; // `${interviewId}_${itemNumber}`
  interviewId: string;
  itemNumber: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  timestamp: number;
  blob?: Blob;
}

const DB_NAME = 'MGLSD_Offline_Docs';
const STORE_NAME = 'pending_documents';
const DB_VERSION = 1;
export const MAX_OFFLINE_BLOB_SIZE = 2 * 1024 * 1024; // 2 MB

const inMemoryFallbackStore = new Map<string, PendingOfflineDocument>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a document file for offline persistence.
 * If file size <= 2MB, stores binary Blob in IndexedDB (or fallback in-memory store).
 * If file size > 2MB or if IndexedDB fails/quota exceeded, falls back gracefully to metadata-only with a console warning.
 */
export async function savePendingOfflineDocument(
  interviewId: string,
  itemNumber: number,
  file: File
): Promise<boolean> {
  let blobToStore: Blob | undefined = undefined;

  if (file.size <= MAX_OFFLINE_BLOB_SIZE) {
    blobToStore = file;
  } else {
    console.warn(
      `[OfflineDocStorage] File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(
        2
      )} MB) exceeds 2 MB offline quota. Storing metadata only.`
    );
  }

  const record: PendingOfflineDocument = {
    id: `${interviewId}_${itemNumber}`,
    interviewId,
    itemNumber,
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    timestamp: Date.now(),
    blob: blobToStore,
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    return true;
  } catch (err) {
    console.warn(
      '[OfflineDocStorage] IndexedDB unavailable or quota exceeded. Falling back to in-memory queue:',
      err
    );
    inMemoryFallbackStore.set(record.id, record);
    return true;
  }
}

/**
 * Retrieves the count of pending offline documents in IndexedDB / in-memory store.
 */
export async function getPendingOfflineDocumentsCount(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const count = await new Promise<number>((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return count + inMemoryFallbackStore.size;
  } catch {
    return inMemoryFallbackStore.size;
  }
}

/**
 * Retrieves all pending offline documents from IndexedDB / in-memory store.
 */
export async function getPendingOfflineDocuments(): Promise<PendingOfflineDocument[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const idbItems = await new Promise<PendingOfflineDocument[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    return [...idbItems, ...Array.from(inMemoryFallbackStore.values())];
  } catch {
    return Array.from(inMemoryFallbackStore.values());
  }
}

/**
 * Removes a pending document record from IndexedDB / in-memory store by key.
 */
export async function removePendingOfflineDocument(id: string): Promise<void> {
  inMemoryFallbackStore.delete(id);
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[OfflineDocStorage] Could not remove pending document ID "${id}":`, err);
  }
}

/**
 * Synchronizes any pending offline documents stored in IndexedDB to Supabase Storage when online.
 */
export async function syncPendingOfflineDocuments(
  userId?: string,
  onCountChange?: (count: number) => void
): Promise<{ syncedCount: number; failedCount: number }> {
  if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const pendingList = await getPendingOfflineDocuments();
  if (pendingList.length === 0) {
    if (onCountChange) onCountChange(0);
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of pendingList) {
    if (item.blob) {
      try {
        const fileObj = new File([item.blob], item.fileName, { type: item.fileType });
        await uploadFileToSupabaseStorage(
          item.interviewId,
          item.itemNumber,
          fileObj,
          userId
        );
        await removePendingOfflineDocument(item.id);
        syncedCount++;
      } catch (err) {
        console.warn(`[OfflineDocStorage] Sync failed for "${item.fileName}":`, err);
        failedCount++;
      }
    } else {
      // Metadata-only item; remove from queue
      await removePendingOfflineDocument(item.id);
    }
  }

  const remaining = await getPendingOfflineDocumentsCount();
  if (onCountChange) onCountChange(remaining);

  return { syncedCount, failedCount };
}
