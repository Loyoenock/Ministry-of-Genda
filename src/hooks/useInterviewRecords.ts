/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Interview, RecentActivityItem } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  // Pure Supabase-driven interviews state; single source of truth
  const [allInterviews, setAllInterviews] = useState<Interview[]>([]);
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [sessionActivities, setSessionActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Primary data loader: Fetches user's interviews (or all if admin) directly from Supabase
  const loadInterviews = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Database configuration missing. Please connect Supabase.');
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
      } else {
        const allList = await fetchInterviewsFromSupabase();
        setAllInterviews(allList);
      }
    } catch (err: any) {
      console.error('Supabase interviews fetch failed:', err);
      setError(err?.message || 'Failed to load interviews from Supabase database.');
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  // Load interviews on auth state change
  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  // Supabase Realtime subscription: keep interviews synchronized across tabs and users
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime:public:interviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interviews' },
        () => {
          loadInterviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadInterviews]);

  // Derived real activities: combines live session actions with real Supabase interview records
  const recentActivities = useMemo(() => {
    const interviewActivities: RecentActivityItem[] = allInterviews.slice(0, 5).map((it) => {
      const isCompleted = it.status === 'Completed';
      return {
        id: `act-${it.id}`,
        description: isCompleted
          ? `Interview completed: ${it.interviewee_name} (${it.role_title})`
          : `Interview scheduled: ${it.interviewee_name} (${it.department_unit})`,
        timestamp: it.updated_at ? new Date(it.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        type: isCompleted ? 'completed' : 'started',
        interviewee: it.interviewee_name,
        organisation: it.department_unit,
      };
    });

    const combined = [...sessionActivities, ...interviewActivities];
    // De-duplicate by id
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 10);
  }, [allInterviews, sessionActivities]);

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
    setSessionActivities((prev) => [item, ...prev.slice(0, 7)]);
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

      // Persist to Supabase
      if (isSupabaseConfigured) {
        insertInterviewToSupabase(newInterview)
          .then((inserted) => {
            if (inserted) {
              setAllInterviews((prev) =>
                prev.map((it) => (it.id === newId ? inserted : it))
              );
            }
          })
          .catch((err) => {
            console.error('Supabase interview creation failed:', err);
            setError('Failed to persist new interview to database.');
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
        console.error('Supabase interview update sync failed:', err);
        setError('Failed to update interview in database.');
      });
    }
  }, []);

  const deleteInterview = useCallback((id: string) => {
    setAllInterviews((prev) => prev.filter((it) => it.id !== id));
    setActiveInterviewId((curr) => (curr === id ? null : curr));

    if (isSupabaseConfigured && isUuid(id)) {
      deleteInterviewFromSupabase(id).catch((err) => {
        console.error('Supabase interview deletion sync failed:', err);
        setError('Failed to delete interview from database.');
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
