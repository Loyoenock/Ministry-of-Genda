/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  Layers,
  ShieldCheck,
  Phone,
  Mail,
  FileQuestion,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useQuestions } from '../hooks/useQuestions';
import { refreshQuestionsCache } from '../lib/questionsService';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const SupportView: React.FC = () => {
  const { questions, loading, error, cacheMeta, refreshQuestions } = useQuestions();
  const { isAdmin } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFeedback(null);
    try {
      const res = await refreshQuestionsCache();
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      await refreshQuestions(true);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to refresh questions cache',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interviewer Field Manual & Support</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Operational methodology for the TRANSFORMATIVE Labour Directorate Diagnostic Exercise.
        </p>
      </div>

      {/* Database & Master Questionnaire Health Check */}
      <div
        data-testid="questions-health-panel"
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database & Master Catalogue Health Check</h3>
              <p className="text-xs text-slate-500">
                Single source of truth diagnostics for <code>public.questions</code> table.
              </p>
            </div>
          </div>

          <button
            data-testid="support-refresh-questions-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer min-h-[38px] self-start sm:self-auto"
            title="Force synchronization with Supabase questions catalogue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
            <span>{isRefreshing || loading ? 'Synchronizing...' : 'Refresh Questions Cache'}</span>
          </button>
        </div>

        {/* Status Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] text-slate-500 font-medium">Database Target</span>
            <div className="flex items-center space-x-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-bold text-slate-800">
                {isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Local Offline Mode'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] text-slate-500 font-medium">Catalogue Active Questions</span>
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-xs font-bold ${
                  questions.length > 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {questions.length} Questions Loaded
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] text-slate-500 font-medium">Provenance Source</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-slate-800 capitalize">
                {cacheMeta.source === 'supabase'
                  ? 'Supabase Live Table'
                  : cacheMeta.source === 'cache'
                  ? 'Encrypted Local Cache'
                  : cacheMeta.source === 'unseeded_error'
                  ? 'Database Unseeded'
                  : 'Safety Net Catalogue'}
              </span>
            </div>
          </div>
        </div>

        {/* Warning if unseeded or empty */}
        {(error || (isSupabaseConfigured && questions.length === 0)) && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold">
                Diagnostic questions could not be loaded from the database. Please contact the system administrator.
              </p>
              <p className="text-red-700">
                The <code>public.questions</code> table has 0 rows. To seed the master questions, run{' '}
                <code>supabase/seed.sql</code> in the Supabase SQL Editor or execute <code>npm run db:seed</code>.
              </p>
            </div>
          </div>
        )}

        {/* Live Feedback Toast */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Dynamic Tier-Based Routing</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            The interview application automatically adapts questions according to the interviewee's role:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
            <li><strong>Leadership:</strong> Focuses on mandate, strategy, budget, and cross-sectoral governance (Sections A, B, D, G, H).</li>
            <li><strong>Management:</strong> Covers comprehensive operational and department oversight (Sections A through H).</li>
            <li><strong>Frontline Staff:</strong> Focuses on actual field tools, daily casework, inspection logistics, and pain points (Sections C, E, F, H).</li>
            <li><strong>Support / IT / Records:</strong> Detailed technical systems, registries, and the 4 live system demonstrations (Sections E, G, H + W1–W4).</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Document Verification Protocol</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Verify each of the 20 statutory documents against physical ledgers or digital copies. Mark both the <em>Exists</em> status (Yes, No, Partial, Unknown) and the <em>Collected</em> status (Collected, Pending, Refused, N/A). Attach verified PDF/image scans where available.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Data Integrity & Offline Resilience</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            All typed responses and numbers auto-save seamlessly. Even during intermittent connectivity at regional labour offices, records are securely persisted in local encrypted storage and synced back automatically.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">MGLSD Diagnostic Helpdesk</h3>
          <div className="text-xs text-slate-600 space-y-1">
            <p><strong>TRANSFORMATIVE Project Management Unit:</strong></p>
            <p>Ministry of Gender, Labour and Social Development</p>
            <p>Plot 2, Simbamanyo House, George Street, Kampala</p>
            <p className="pt-1"><strong>Support Hotline:</strong> +256 414 347 854 / +256 701 445 678</p>
            <p><strong>Technical Email:</strong> diagnostic-support@mglsd.go.ug</p>
          </div>
        </div>
      </div>
    </div>
  );
};
