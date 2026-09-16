/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Interview, RecentActivityItem } from '../types';
import { INITIAL_INTERVIEWS, INITIAL_RECENT_ACTIVITIES } from '../lib/mockData';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  isUuid,
  generateUuid,
  fetchInterviewsFromSupabase,
  fetchAllInterviewsGlobalFromSupabase,
  insertInterviewToSupabase,
  updateInterviewInSupabase,
  deleteInterviewFromSupabase,
} from '../lib/interviewService';

interface UseInterviewRecordsOptions {
  userId?: string | null;
  isAdmin: boolean;
  onInterviewCreated?: (newInterview: Interview) => void;
  onInterviewSelected?: (id: string) => void;
}

export function useInterviewRecords({
  userId,
  isAdmin,
  onInterviewCreated,
  onInterviewSelected,
}: UseInterviewRecordsOptions) {
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';

  const [allInterviews, setAllInterviews] = useState<Interview[]>(() => {
    // In test environment, keep mock data for unit tests
    if (isTestEnv) {
      return INITIAL_INTERVIEWS;
    }
    // When Supabase is configured, prefer real database and never seed with mock demo interviews
    if (isSupabaseConfigured) {
      const saved = localStorage.getItem('mglsd_interviews');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Only keep real UUID interviews, purge mock demo items
            const realOnly = parsed.filter((it: Interview) => isUuid(it.id));
            if (realOnly.length > 0) return realOnly;
          }
        } catch {
          // ignore parse error
        }
      }
      return [];
    }
    // In pure demo mode, read saved demo interviews or fall back to INITIAL_INTERVIEWS
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

  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>(() => {
    if (isTestEnv) {
      return INITIAL_RECENT_ACTIVITIES;
    }
    if (isSupabaseConfigured) {
      return [];
    }
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

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      if (isSupabaseConfigured) {
        const realOnly = allInterviews.filter((it) => isUuid(it.id));
        if (realOnly.length > 0) {
          localStorage.setItem('mglsd_interviews', JSON.stringify(realOnly));
        } else {
          localStorage.removeItem('mglsd_interviews');
        }
      } else {
        localStorage.setItem('mglsd_interviews', JSON.stringify(allInterviews));
      }
    } catch {
      // quota or private mode guard
    }
  }, [allInterviews]);

  useEffect(() => {
    try {
      if (!isSupabaseConfigured) {
        localStorage.setItem('mglsd_activities', JSON.stringify(recentActivities));
      }
    } catch {
      // quota guard
    }
  }, [recentActivities]);

  // Primary data loader: Fetches user's interviews (or all if admin) from Supabase
  const loadInterviews = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isAdmin) {
        const globalList = await fetchAllInterviewsGlobalFromSupabase();
        setAllInterviews(globalList);
      } else if (userId) {
        const userList = await fetchInterviewsFromSupabase(userId, false);
        setAllInterviews(userList);
      }
    } catch (err: any) {
      console.warn('Notice: Supabase interviews sync error:', err);
      setError(err?.message || 'Could not connect to database');
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  // Load interviews when auth state changes
  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  // RLS Visibility
  const visibleInterviews = useMemo(() => {
    return isAdmin
      ? allInterviews
      : allInterviews.filter((it) => (userId ? it.interviewer_id === userId : true));
  }, [allInterviews, isAdmin, userId]);

  const activeInterview = useMemo(() => {
    return allInterviews.find((it) => it.id === activeInterviewId) || null;
  }, [allInterviews, activeInterviewId]);

  const selectInterview = useCallback((id: string | null) => {
    setActiveInterviewId(id);
    if (id && onInterviewSelected) {
      onInterviewSelected(id);
    }
  }, [onInterviewSelected]);

  const addRecentActivity = useCallback((item: RecentActivityItem) => {
    setRecentActivities((prev) => [item, ...prev.slice(0, 8)]);
  }, []);

  const createInterview = useCallback(
    (
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

      // Optimistic local update
      setAllInterviews((prev) => [newInterview, ...prev]);

      // Record activity
      addRecentActivity({
        id: `act-${Date.now()}`,
        description: `You scheduled an interview with ${data.interviewee_name} (${data.role_title})`,
        timestamp: 'Just now',
        type: 'started',
        interviewee: data.interviewee_name,
        organisation: data.department_unit,
      });

      // Callback to initialize related sub-data in memory & Supabase
      if (onInterviewCreated) {
        onInterviewCreated(newInterview);
      }

      // Persist to Supabase if configured
      if (isSupabaseConfigured && isUuid(newInterview.interviewer_id)) {
        insertInterviewToSupabase(newInterview).catch((err) => {
          console.warn('Notice: Background Supabase interview creation sync:', err);
        });
      }

      return newInterview;
    },
    [addRecentActivity, onInterviewCreated]
  );

  const updateInterview = useCallback((id: string, updates: Partial<Interview>) => {
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
  }, []);

  const deleteInterview = useCallback((id: string) => {
    setAllInterviews((prev) => prev.filter((it) => it.id !== id));
    setActiveInterviewId((curr) => (curr === id ? null : curr));

    if (isSupabaseConfigured && isUuid(id)) {
      deleteInterviewFromSupabase(id).catch((err) => {
        console.warn('Notice: Supabase interview deletion sync:', err);
      });
    }
  }, []);

  return {
    allInterviews,
    visibleInterviews,
    activeInterviewId,
    activeInterview,
    recentActivities,
    loading,
    error,
    refreshInterviews: loadInterviews,
    selectInterview,
    createInterview,
    updateInterview,
    deleteInterview,
    addRecentActivity,
  };
}
