/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ShieldCheck,
  Download,
  Printer,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  Users,
  Building,
  Scale,
  Award,
  RefreshCw,
  Filter,
  Calendar,
  Layers,
  CheckSquare,
  AlertCircle,
  FolderOpen,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { refreshQuestionsCache } from '../lib/questionsService';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { InterviewTier, InterviewStatus } from '../types';

export const AdminAnalyticsDashboard: React.FC<{ onOpenInterview: (id: string) => void }> = ({
  onOpenInterview,
}) => {
  const { user, isAdmin } = useAuth();
  const { filters, dataset, loading, error, updateFilter, resetFilters, refetch } =
    useAnalyticsData();

  const [isRefreshingQuestions, setIsRefreshingQuestions] = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleRefreshQuestions = async () => {
    setIsRefreshingQuestions(true);
    setRefreshFeedback(null);
    try {
      const res = await refreshQuestionsCache();
      setRefreshFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      setTimeout(() => {
        setRefreshFeedback(null);
      }, 6000);
    } catch (err: any) {
      setRefreshFeedback({
        type: 'error',
        message: err?.message || 'Failed to refresh questions cache',
      });
    } finally {
      setIsRefreshingQuestions(false);
    }
  };

  const handleExportJSON = () => {
    if (!dataset) return;
    const exportData = {
      programme: 'TRANSFORMATIVE Programme - MGLSD Uganda',
      exported_at: new Date().toISOString(),
      filters_applied: filters,
      kpis: dataset.kpis,
      quantitative_baseline: dataset.quantitativeMetrics,
      tier_data: dataset.tierData,
      maturity_scores: dataset.maturityScores,
      interviewer_workload: dataset.interviewerWorkload,
      department_distribution: dataset.departmentDistribution,
      interviews_count: dataset.filteredInterviews.length,
      interviews: dataset.filteredInterviews,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MGLSD_Live_Diagnostic_Analytics_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <img
            src="/Coat_of_arms_of_Uganda.svg"
            alt="National Coat of Arms"
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 drop-shadow-sm select-none"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isAdmin ? 'National Oversight Suite' : 'Field Officer Analytics'}</span>
              </span>
              <span className="text-xs text-slate-500">MGLSD Uganda • Live Supabase</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              TRANSFORMATIVE Diagnostic Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Cross-departmental current-state diagnostic synthesis, quantitative baselines, and maturity signals.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-2xs min-h-[42px] cursor-pointer"
            title="Force refresh analytics from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Querying...' : 'Sync Live Data'}</span>
          </button>

          {isAdmin && (
            <button
              id="admin-refresh-questions-btn"
              data-testid="admin-refresh-questions-btn"
              onClick={handleRefreshQuestions}
              disabled={isRefreshingQuestions}
              className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs min-h-[42px] cursor-pointer"
              title="Force synchronization with Supabase public.questions table"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingQuestions ? 'animate-spin' : ''}`} />
              <span>{isRefreshingQuestions ? 'Refreshing Cache...' : 'Refresh Questions Cache'}</span>
            </button>
          )}

          <button
            id="admin-export-json-btn"
            onClick={handleExportJSON}
            disabled={!dataset || dataset.filteredInterviews.length === 0}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs min-h-[42px] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Report (JSON)</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {refreshFeedback && (
        <div
          data-testid="refresh-questions-feedback"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between transition ${
            refreshFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {refreshFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{refreshFeedback.message}</span>
          </div>
          <button
            onClick={() => setRefreshFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Filter className="w-4 h-4 text-purple-600" />
            <span>Live Analytics Query Filters</span>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs text-purple-700 hover:text-purple-900 font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Interview Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:outline-purple-600"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Completed">Completed Only (Official)</option>
              <option value="In Progress">In Progress Only</option>
              <option value="Draft">Draft Only</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Diagnostic Tier
            </label>
            <select
              value={filters.tier}
              onChange={(e) => updateFilter('tier', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:outline-purple-600"
            >
              <option value="All Tiers">All Tiers</option>
              <option value="Leadership">Leadership</option>
              <option value="Management">Management</option>
              <option value="Frontline">Frontline</option>
              <option value="Support/IT">Support / IT</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Department / Unit
            </label>
            <select
              value={filters.department}
              onChange={(e) => updateFilter('department', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:outline-purple-600"
            >
              <option value="All Departments">All Departments</option>
              {dataset?.availableDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Time Period
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => updateFilter('dateRange', e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:outline-purple-600"
            >
              <option value="all">All Available Records</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="last90days">Last 90 Days</option>
            </select>
          </div>

          {/* Interviewer Filter (Admin only) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Field Officer
            </label>
            {isAdmin ? (
              <select
                value={filters.interviewerId}
                onChange={(e) => updateFilter('interviewerId', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:outline-purple-600"
              >
                <option value="All Interviewers">All Officers</option>
                {dataset?.availableInterviewers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                disabled
                value={user?.full_name || 'Current Officer'}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-medium text-slate-500 cursor-not-allowed text-xs"
              />
            )}
          </div>
        </div>
      </div>

      {/* Aggregate Quantitative Baseline Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Interviews */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Interviews
            </span>
            <Building className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {dataset ? dataset.kpis.totalInterviews : 0}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 mt-1">
            <span className="text-emerald-600 font-bold">
              {dataset ? dataset.kpis.completedCount : 0} Completed
            </span>
            <span>•</span>
            <span className="text-blue-600 font-bold">
              {dataset ? dataset.kpis.inProgressCount : 0} Active
            </span>
            {dataset && dataset.kpis.draftCount > 0 && (
              <>
                <span>•</span>
                <span className="text-slate-500">{dataset.kpis.draftCount} Draft</span>
              </>
            )}
          </div>
        </div>

        {/* Staff Count (Live from notes) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Staff Count
            </span>
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {dataset && dataset.quantitativeMetrics.hasData
              ? dataset.quantitativeMetrics.totalStaffCount.toLocaleString()
              : 0}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">
            {dataset && dataset.quantitativeMetrics.totalStaffCount > 0
              ? 'Captured in field diagnostic notes'
              : 'No staff count recorded in selection'}
          </p>
        </div>

        {/* Annual Inspections (Live from notes) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Inspections
            </span>
            <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {dataset && dataset.quantitativeMetrics.hasData
              ? dataset.quantitativeMetrics.totalInspections.toLocaleString()
              : 0}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">
            {dataset && dataset.quantitativeMetrics.totalInspections > 0
              ? 'Annual inspections baseline'
              : 'No inspection count logged in selection'}
          </p>
        </div>

        {/* Dispute Resolution Rate (Live from notes) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Dispute Resolution
            </span>
            <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {dataset && dataset.quantitativeMetrics.disputesLogged > 0
              ? `${Math.round(
                  (dataset.quantitativeMetrics.disputesResolved /
                    dataset.quantitativeMetrics.disputesLogged) *
                    100
                )}%`
              : '0%'}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">
            {dataset && dataset.quantitativeMetrics.disputesLogged > 0
              ? `${dataset.quantitativeMetrics.disputesResolved} of ${dataset.quantitativeMetrics.disputesLogged} resolved`
              : 'No dispute statistics logged in selection'}
          </p>
        </div>
      </div>

      {/* Empty State when no data matches current filters */}
      {dataset && dataset.filteredInterviews.length === 0 && (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Interview Records Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No diagnostic sessions in the database match your currently applied query filters. Try
            adjusting the status, tier, or date filters to view live data.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Reset Query Filters
          </button>
        </div>
      )}

      {/* Analytics Charts Grid */}
      {dataset && dataset.filteredInterviews.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tier Completion Performance */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Interviews Conducted by Tier
                </h3>
                <p className="text-xs text-slate-500">
                  Live breakdown of assigned and completed sessions from Supabase
                </p>
              </div>
              <span className="text-[11px] sm:text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-semibold shrink-0">
                4 Tiers
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataset.tierData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="tier" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="total" fill="#94a3b8" name="Total In Filter" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="completed"
                    fill="#0d9488"
                    name="Completed"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Institutional Maturity Signals (Radar Chart) */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Institutional Maturity Signals (1–5)
                </h3>
                <p className="text-xs text-slate-500">
                  Averaged from {dataset.filteredInterviews.length} diagnostic sessions in selection
                </p>
              </div>
              <span className="text-[11px] sm:text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg font-bold shrink-0">
                Live Evidence
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full min-w-0">
              {dataset.maturityScores.some((m) => m.score > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={dataset.maturityScores} cx="50%" cy="50%" outerRadius="68%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 9, fill: '#475569' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9 }} />
                    <Radar
                      name="Maturity Rating"
                      dataKey="score"
                      stroke="#7c3aed"
                      fill="#7c3aed"
                      fillOpacity={0.4}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Award className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No Maturity Signals Recorded</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                    Maturity scores will appear here once interview notes with ratings are saved in
                    Supabase.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interviewer Workload & Activity (Live Supabase) */}
      {dataset && dataset.interviewerWorkload.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Field Officer Engagement & Workload
              </h3>
              <p className="text-xs text-slate-500">
                Interviews conducted and completed per registered officer
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {dataset.interviewerWorkload.length} Officer(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dataset.interviewerWorkload.map((officer) => (
              <div
                key={officer.interviewerId}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">{officer.interviewerName}</p>
                  <p className="text-[11px] text-slate-500">{officer.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{officer.total} Sessions</p>
                  <p className="text-[10px] font-bold text-emerald-700">
                    {officer.completed} Completed
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Synthesized Diagnostic Bottlenecks (Generated from live notes observations) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Synthesized Field Bottlenecks & Institutional Evidence
            </h3>
            <p className="text-xs text-slate-500">
              Live observations and operational contradictions extracted from interviewer notes
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {dataset ? dataset.synthesizedBottlenecks.length : 0} Evidence Signals
          </span>
        </div>

        {dataset && dataset.synthesizedBottlenecks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {dataset.synthesizedBottlenecks.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border space-y-2 ${
                  item.severity === 'high'
                    ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        item.severity === 'high' ? 'bg-amber-500' : 'bg-teal-500'
                      }`}
                    />
                    <span className="truncate">{item.topic}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    {item.tier}
                  </span>
                </div>

                <p className="text-slate-700 leading-relaxed font-serif">"{item.content}"</p>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="truncate">{item.department}</span>
                  <button
                    onClick={() => onOpenInterview(item.interviewId)}
                    className="font-bold text-purple-700 hover:text-purple-900 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View Session</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2 text-slate-500">
            <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              No Qualitative Bottlenecks Recorded
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Observations or contradiction notes added to interview sessions will automatically
              synthesize into this panel in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
