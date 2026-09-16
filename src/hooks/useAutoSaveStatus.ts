/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';

export type AutoSaveStatusType = 'saved' | 'saving' | 'error';

/**
 * Hook to manage auto-save status indicators with convenient helper setters.
 */
export function useAutoSaveStatus(initialStatus: AutoSaveStatusType = 'saved') {
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatusType>(initialStatus);

  const markSaving = useCallback(() => {
    setAutoSaveStatus('saving');
  }, []);

  const markSaved = useCallback(() => {
    setAutoSaveStatus('saved');
  }, []);

  const markError = useCallback(() => {
    setAutoSaveStatus('error');
  }, []);

  return {
    autoSaveStatus,
    setAutoSaveStatus,
    markSaving,
    markSaved,
    markError,
  };
}
