/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInterviews } from '../context/InterviewContext';
import {
  AnalyticsDataset,
  AnalyticsFilters,
  fetchAnalyticsDataset,
} from '../lib/reportService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  dateRange: 'all',
  tier: 'All Tiers',
  status: 'All Statuses',
  department: 'All Departments',
  interviewerId: 'All Interviewers',
};

export function useAnalyticsData(initialFilters?: Partial<AnalyticsFilters>) {
  const { user, isAdmin } = useAuth();
  const { allInterviewsGlobal, notes } = useInterviews();

  const [filters, setFilters] = useState<AnalyticsFilters>({
    ...DEFAULT_ANALYTICS_FILTERS,
    ...initialFilters,
  });

  const [dataset, setDataset] = useState<AnalyticsDataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Keep ref of latest context data for fallback
  const fallbackInterviewsRef = useRef(allInterviewsGlobal);
  fallbackInterviewsRef.current = allInterviewsGlobal;
  const fallbackNotesRef = useRef(notes);
  fallbackNotesRef.current = notes;

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAnalyticsDataset(
        filters,
        user,
        isAdmin,
        fallbackInterviewsRef.current,
        fallbackNotesRef.current
      );
      setDataset(data);
    } catch (err: any) {
      console.error('Failed to load live analytics:', err);
      setError(err?.message || 'Failed to aggregate diagnostic analytics.');
    } finally {
      setLoading(false);
    }
  }, [filters, user, isAdmin]);

  // Refetch when filters or auth changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Realtime subscription: updates analytics automatically whenever an interview is completed, inserted, or updated
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime:analytics:all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interviews' },
        () => {
          loadAnalytics();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interviewer_notes' },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAnalytics]);

  const updateFilter = useCallback(<K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_ANALYTICS_FILTERS);
  }, []);

  return {
    filters,
    dataset,
    loading,
    error,
    updateFilter,
    resetFilters,
    refetch: loadAnalytics,
  };
}
