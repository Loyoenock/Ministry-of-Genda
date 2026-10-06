/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  savePendingOfflineDocument,
  getPendingOfflineDocuments,
  getPendingOfflineDocumentsCount,
  removePendingOfflineDocument,
  syncPendingOfflineDocuments,
  MAX_OFFLINE_BLOB_SIZE,
} from '../lib/offlineDocumentStorage';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

vi.mock('../lib/supabase', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, any>;
  return {
    ...actual,
    supabase: {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: { path: 'path/doc.pdf' }, error: null }),
          createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null }),
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'doc-123' }, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      })),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-456' } } }),
      },
    },
  };
});

describe('Offline Document Persistence & Sync (IndexedDB)', () => {
  beforeEach(async () => {
    setSupabaseConfiguredForTesting(false);
    vi.clearAllMocks();

    // Clear IndexedDB store
    const list = await getPendingOfflineDocuments();
    for (const item of list) {
      await removePendingOfflineDocument(item.id);
    }
  });

  it('stores binary blob in IndexedDB when file size <= 2MB', async () => {
    const smallFile = new File(['test binary content'], 'small_doc.pdf', { type: 'application/pdf' });
    const saved = await savePendingOfflineDocument('int-1', 1, smallFile);

    expect(saved).toBe(true);

    const count = await getPendingOfflineDocumentsCount();
    expect(count).toBe(1);

    const list = await getPendingOfflineDocuments();
    expect(list.length).toBe(1);
    expect(list[0].fileName).toBe('small_doc.pdf');
    expect(list[0].blob).toBeDefined();
  });

  it('stores metadata only without binary blob when file size exceeds 2MB', async () => {
    const largeContent = new ArrayBuffer(MAX_OFFLINE_BLOB_SIZE + 1024);
    const largeFile = new File([largeContent], 'large_manual.pdf', { type: 'application/pdf' });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const saved = await savePendingOfflineDocument('int-2', 2, largeFile);
    expect(saved).toBe(true);

    const list = await getPendingOfflineDocuments();
    expect(list.length).toBe(1);
    expect(list[0].fileName).toBe('large_manual.pdf');
    expect(list[0].blob).toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('exceeds 2 MB offline quota'));
    warnSpy.mockRestore();
  });

  it('automatically uploads pending documents to Supabase Storage when online and clears queue', async () => {
    const file = new File(['doc content'], 'sync_target.pdf', { type: 'application/pdf' });
    await savePendingOfflineDocument('int-3', 3, file);

    let count = await getPendingOfflineDocumentsCount();
    expect(count).toBe(1);

    // Switch Supabase to configured mode
    setSupabaseConfiguredForTesting(true);

    const result = await syncPendingOfflineDocuments('user-789');
    expect(result.syncedCount).toBe(1);

    count = await getPendingOfflineDocumentsCount();
    expect(count).toBe(0);
  });
});
