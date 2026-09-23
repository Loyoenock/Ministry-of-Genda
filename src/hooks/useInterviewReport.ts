/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DiagnosticBriefData, fetchInterviewReportData } from '../lib/reportService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid } from '../lib/interviewService';

export function useInterviewReport(interviewId: string | null) {
  const { user, isAdmin } = useAuth();
  const [reportData, setReportData] = useState<DiagnosticBriefData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!interviewId) {
      setReportData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchInterviewReportData(interviewId, user, isAdmin);
      if (res.error) {
        setError(res.error);
        setReportData(null);
      } else {
        setReportData(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate diagnostic brief data.');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [interviewId, user, isAdmin]);

  // Initial load
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Realtime subscription for this specific interview
  useEffect(() => {
    if (!isSupabaseConfigured || !interviewId || !isUuid(interviewId)) return;

    const channel = supabase
      .channel(`realtime:report:${interviewId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interviews', filter: `id=eq.${interviewId}` },
        () => {
          loadReport();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interviewer_notes', filter: `interview_id=eq.${interviewId}` },
        () => {
          loadReport();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers', filter: `interview_id=eq.${interviewId}` },
        () => {
          loadReport();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interviewId, loadReport]);

  return {
    reportData,
    loading,
    error,
    refetch: loadReport,
  };
}
