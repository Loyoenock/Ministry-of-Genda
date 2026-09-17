/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  CircleDot,
  ArrowRight,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  ExternalLink,
  ChevronDown,
  Layers,
  BarChart2,
  FolderOpen,
  Filter,
  Play,
  FileCheck,
  CheckSquare,
  Square,
  Building,
  MapPin,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ministryHqImage from '../assets/images/ministry_headquarters_1789463353720.jpg';
import { useAuth } from '../context/AuthContext';
import { useInterviews } from '../context/InterviewContext';
import { InterviewTier, InterviewStatus, Interview } from '../types';
import { UPCOMING_SCHEDULE } from '../lib/mockData';

interface DashboardViewProps {
  onOpenInterview: (interviewId: string) => void;
  onOpenNewInterview: () => void;
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenInterview,
  onOpenNewInterview,
  onNavigate,
}) => {
  const { user, isAdmin } = useAuth();
  const {
    interviews,
    recentActivities,
    deleteInterview,
  } = useInterviews();

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('All Tiers');
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [selectedInterviewIds, setSelectedInterviewIds] = useState<string[]>([]);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [headquartersImgError, setHeadquartersImgError] = useState(false);

  // Compute metric numbers dynamically from visible interviews
  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter((i) => i.status === 'Completed').length;
  const inProgressInterviews = interviews.filter((i) => i.status === 'In Progress').length;
  const draftInterviews = interviews.filter((i) => i.status === 'Draft').length;
  const completionRate = totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0;

  // Donut chart counts by tier
  const tierCounts = useMemo(() => {
    const counts = {
      Leadership: 0,
      Management: 0,
      Frontline: 0,
      'Support/IT': 0,
    };
    interviews.forEach((i) => {
      if (counts[i.tier] !== undefined) {
        counts[i.tier]++;
      }
    });
    return counts;
  }, [interviews]);

  const tierChartData = [
    { name: 'Leadership', value: tierCounts.Leadership || 3, color: '#8b5cf6' }, // purple
    { name: 'Management', value: tierCounts.Management || 3, color: '#3b82f6' }, // blue
    { name: 'Frontline', value: tierCounts.Frontline || 4, color: '#0d9488' }, // teal
    { name: 'Support/IT', value: tierCounts['Support/IT'] || 2, color: '#06b6d4' }, // cyan
  ];

  // Filtered interviews for the data table
  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      const matchesSearch =
        interview.interviewee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.department_unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.role_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTier =
        tierFilter === 'All Tiers' || interview.tier === tierFilter;

      const matchesStatus =
        statusFilter === 'All Statuses' || interview.status === statusFilter;

      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [interviews, searchQuery, tierFilter, statusFilter]);

  const toggleSelectAll = () => {
    if (selectedInterviewIds.length === filteredInterviews.length) {
      setSelectedInterviewIds([]);
    } else {
      setSelectedInterviewIds(filteredInterviews.map((i) => i.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedInterviewIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTierFilter('All Tiers');
    setStatusFilter('All Statuses');
  };

  const getTierBadge = (tier: InterviewTier) => {
    switch (tier) {
      case 'Leadership':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Management':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Frontline':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'Support/IT':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: InterviewStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Draft':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header: Greeting & Date card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <img
            src="/Coat_of_arms_of_Uganda.svg"
            alt="National Coat of Arms"
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 drop-shadow-sm select-none"
          />
          <div>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Good morning, {user.full_name.split(' ')[0]}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Your Interview Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track your interviews, manage your schedule and capture accurate diagnostic data.
            </p>
          </div>
        </div>

        {/* Date / Last Updated Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-xs flex items-center space-x-3 shrink-0 self-start sm:self-auto">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Tue, 16 Sep 2025</p>
            <p className="text-[11px] text-slate-400">Last updated: 10:24 AM</p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Left Content (cards + charts + table) & Right Sidebar (Ministry info + quick actions + upcoming) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main 3 Columns */}
        <div className="xl:col-span-3 space-y-6">
          {/* 4 Metric Cards (2-column on mobile, 4-column on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total Interviews */}
            <div
              onClick={() => onNavigate('interviews')}
              className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 sm:mb-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {totalInterviews}
                </p>
                <div className="flex items-center space-x-1 text-xs font-semibold text-slate-700 mt-0.5">
                  <span className="truncate">Total Interviews</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Assigned to you</p>
            </div>

            {/* 2. Completed */}
            <div
              onClick={() => {
                setStatusFilter('Completed');
                onNavigate('interviews');
              }}
              className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 sm:mb-2">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {completedInterviews}
                </p>
                <div className="flex items-center space-x-1 text-xs font-semibold text-slate-700 mt-0.5">
                  <span className="truncate">Completed</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-1 truncate">{completionRate}% completion</p>
            </div>

            {/* 3. In Progress */}
            <div
              onClick={() => {
                setStatusFilter('In Progress');
                onNavigate('interviews');
              }}
              className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 sm:mb-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {inProgressInterviews}
                </p>
                <div className="flex items-center space-x-1 text-xs font-semibold text-slate-700 mt-0.5">
                  <span className="truncate">In Progress</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Active sessions</p>
            </div>

            {/* 4. Draft */}
            <div
              onClick={() => {
                setStatusFilter('Draft');
                onNavigate('interviews');
              }}
              className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mb-1.5 sm:mb-2">
                  <CircleDot className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {draftInterviews}
                </p>
                <div className="flex items-center space-x-1 text-xs font-semibold text-slate-700 mt-0.5">
                  <span className="truncate">Draft</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Saved, unsubmitted</p>
            </div>
          </div>

          {/* Middle Row: Interviews by Tier (Donut), Interview Status (Bars), Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Interviews by Tier (Donut Chart) */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Interviews by Tier</h3>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  4 Tiers
                </span>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                {/* Donut Chart with Centered Total */}
                <div className="relative w-28 h-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tierChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={48}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {tierChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          color: '#fff',
                          borderRadius: '8px',
                          fontSize: '11px',
                          border: 'none',
                          padding: '4px 8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Total in center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-extrabold text-slate-900 leading-none">{totalInterviews}</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Total</span>
                  </div>
                </div>

                {/* Legend list - Guaranteed no text overlap */}
                <div className="space-y-2 flex-1 min-w-0">
                  {tierChartData.map((entry) => {
                    const count = tierCounts[entry.name as keyof typeof tierCounts] ?? entry.value;
                    const pct = totalInterviews > 0 ? Math.round((count / totalInterviews) * 100) : 0;
                    return (
                      <div key={entry.name} className="flex items-center justify-between gap-1.5 min-w-0">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-slate-600 font-medium truncate text-xs">
                            {entry.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0 whitespace-nowrap text-xs leading-none">
                          <span className="font-bold text-slate-900 tabular-nums">{count}</span>
                          <span className="text-slate-400 font-normal ml-1 tabular-nums">
                            ({pct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Interview Status Progress Bars */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Interview Status</h3>

              <div className="space-y-4">
                {/* Completed */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">Completed</span>
                    <span className="text-slate-500 font-medium">
                      {completedInterviews} ({Math.round((completedInterviews / (totalInterviews || 1)) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((completedInterviews / (totalInterviews || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* In Progress */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">In Progress</span>
                    <span className="text-slate-500 font-medium">
                      {inProgressInterviews} ({Math.round((inProgressInterviews / (totalInterviews || 1)) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((inProgressInterviews / (totalInterviews || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Draft */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">Draft</span>
                    <span className="text-slate-500 font-medium">
                      {draftInterviews} ({Math.round((draftInterviews / (totalInterviews || 1)) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((draftInterviews / (totalInterviews || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Total</span>
                <span>{totalInterviews}</span>
              </div>
            </div>

            {/* 3. Recent Activity */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Activity</h3>

              <div className="space-y-3.5">
                {recentActivities.slice(0, 3).map((act, index) => {
                  let Icon = CheckCircle2;
                  let iconBg = 'bg-emerald-100 text-emerald-700';
                  if (act.type === 'started') {
                    Icon = Play;
                    iconBg = 'bg-blue-100 text-blue-700';
                  } else if (act.type === 'document') {
                    Icon = FileText;
                    iconBg = 'bg-teal-100 text-teal-700';
                  }

                  return (
                    <div key={act.id} className="flex items-start space-x-3">
                      <div className={`w-7 h-7 rounded-full ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-800 font-medium leading-tight">
                          {act.description}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{act.timestamp}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => onNavigate('notes')}
                  className="text-[11px] font-semibold text-teal-700 hover:text-teal-800"
                >
                  View full activity log →
                </button>
              </div>
            </div>
          </div>

          {/* Bottom: My Interviews Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Table Filter Controls */}
            <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900">My Interviews</h3>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Input */}
                <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    data-testid="dashboard-search-input"
                    placeholder="Search by interviewee, organisation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                  />
                </div>

                {/* Tier Filter */}
                <select
                  value={tierFilter}
                  data-testid="dashboard-tier-filter"
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="All Tiers">All Tiers</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Management">Management</option>
                  <option value="Frontline">Frontline</option>
                  <option value="Support/IT">Support/IT</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  data-testid="dashboard-status-filter"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Draft">Draft</option>
                </select>

                {(searchQuery || tierFilter !== 'All Tiers' || statusFilter !== 'All Statuses') && (
                  <button
                    onClick={clearFilters}
                    data-testid="dashboard-clear-filters-btn"
                    className="text-xs text-teal-700 hover:text-teal-900 font-semibold px-2 py-1.5"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Card List (visible on small screens < md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredInterviews.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No interviews match the current filter criteria.
                </div>
              ) : (
                filteredInterviews.map((item) => (
                  <div key={item.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition">
                    {/* Header: Name + Tier */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          onClick={() => onOpenInterview(item.id)}
                          className="text-left font-bold text-sm text-slate-900 hover:text-teal-700 transition leading-snug"
                        >
                          {item.interviewee_name}
                        </button>
                        <p className="text-xs text-slate-500 truncate">{item.role_title}</p>
                      </div>
                      <span
                        className={`inline-block shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getTierBadge(
                          item.tier
                        )}`}
                      >
                        {item.tier}
                      </span>
                    </div>

                    {/* Metadata: Organisation & Location */}
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.department_unit}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    </div>

                    {/* Status & Date */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {item.interview_date}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        By: <strong className="text-slate-700 font-semibold">{item.interviewer_name.split(' ')[0]}</strong>
                      </span>
                    </div>

                    {/* Prominent Touch Actions (min 44px height) */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => onOpenInterview(item.id)}
                        className="w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 min-h-[44px] shadow-xs"
                      >
                        <FileCheck className="w-4 h-4 text-teal-200" />
                        <span>Diagnostic Form</span>
                      </button>
                      <button
                        onClick={() => onOpenInterview(item.id)}
                        className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 min-h-[44px]"
                      >
                        <FolderOpen className="w-4 h-4 text-slate-500" />
                        <span>Checklist / Notes</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop / Tablet Table Content (hidden on small screens < md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600" data-testid="dashboard-interviews-table">
                <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <button onClick={toggleSelectAll} className="focus:outline-none">
                        {selectedInterviewIds.length === filteredInterviews.length && filteredInterviews.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-2 w-8">#</th>
                    <th className="py-3 px-4">Interviewee</th>
                    <th className="py-3 px-4">Organisation / Location</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Interviewer</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInterviews.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400" data-testid="no-interviews-matched">
                        No interviews match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInterviews.map((item, index) => {
                      const isSelected = selectedInterviewIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          data-testid={`interview-row-${item.id}`}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-teal-50/40' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <button onClick={() => toggleSelectRow(item.id)} className="focus:outline-none">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-teal-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-2 font-medium text-slate-500">{index + 1}</td>
                          <td className="py-3 px-4">
                            <button
                              data-testid={`open-interview-${item.id}`}
                              onClick={() => onOpenInterview(item.id)}
                              className="text-left font-bold text-slate-900 hover:text-teal-700 transition block"
                            >
                              {item.interviewee_name}
                            </button>
                            <span className="text-[11px] text-slate-500 block">{item.role_title}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800 block">{item.department_unit}</span>
                            <span className="text-[11px] text-slate-500 block">{item.location}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getTierBadge(
                                item.tier
                              )}`}
                            >
                              {item.tier}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-800 font-medium block">{item.interview_date}</span>
                            <span className="text-[11px] text-slate-400 block">{item.interview_time}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">{item.interviewer_name}</td>
                          <td className="py-3 px-3 text-right relative">
                            <button
                              onClick={() =>
                                setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)
                              }
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openActionMenuId === item.id && (
                              <div className="absolute right-3 top-8 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-40 text-left">
                                <button
                                  onClick={() => {
                                    onOpenInterview(item.id);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 font-medium"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Open Diagnostic Form</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onOpenInterview(item.id);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 font-medium"
                                >
                                  <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Checklist & Notes</span>
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      deleteInterview(item.id);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2 font-medium border-t border-slate-100 mt-1"
                                  >
                                    <span>Delete Interview</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Ministry Card + Quick Actions + Upcoming Interviews */}
        <div className="space-y-6">
          {/* Ministry of Gender, Labour and Social Development Card */}
          <div className="bg-[#0b132b] rounded-2xl overflow-hidden shadow-sm border border-slate-800 text-white group">
            <div className="relative h-44 overflow-hidden bg-slate-900">
              {!headquartersImgError ? (
                <img
                  src={ministryHqImage}
                  alt="Ministry Headquarters Building - Simbamanyo House, Kampala"
                  referrerPolicy="no-referrer"
                  onError={() => setHeadquartersImgError(true)}
                  className="w-full h-full object-cover brightness-90 group-hover:scale-105 transition duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-2">
                    <Building className="w-6 h-6 text-amber-400" />
                  </div>
                  <p className="text-xs font-bold text-white tracking-wide">Ministry Headquarters Building</p>
                  <p className="text-[11px] text-slate-300">Plot 2, Simbamanyo House, Kampala</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b132b] via-[#0b132b]/40 to-transparent pointer-events-none" />

              {/* Uganda Flag accent strip */}
              <div className="absolute top-3 left-3 flex items-center space-x-1 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20">
                <span className="w-2.5 h-2.5 rounded-full bg-black border border-white/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <span className="text-[10px] font-bold text-white tracking-wide ml-1">UGANDA</span>
              </div>

              {/* Building location tag */}
              <div className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-slate-300 font-medium flex items-center space-x-1">
                <Building className="w-3 h-3 text-amber-400" />
                <span>Simbamanyo House</span>
              </div>
            </div>

            <div className="p-4 space-y-2.5">
              <div className="flex items-center space-x-3 pb-2.5 border-b border-slate-800">
                <img
                  src="/Coat_of_arms_of_Uganda.svg"
                  alt="Republic of Uganda Coat of Arms"
                  className="w-9 h-9 object-contain shrink-0 drop-shadow"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                    The Republic of Uganda
                  </p>
                  <p className="text-xs font-bold text-white truncate">
                    Ministry of Gender, Labour and Social Dev.
                  </p>
                </div>
              </div>

              <div>
                <a
                  href="https://mglsd.go.ug"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-white hover:text-teal-300 transition group/link"
                  title="Visit official Ministry of Gender, Labour and Social Development portal (mglsd.go.ug)"
                >
                  <span>Ministry Headquarters Building</span>
                  <ExternalLink className="w-3.5 h-3.5 text-teal-400 group-hover/link:translate-x-0.5 transition shrink-0" />
                </a>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Plot 2, Simbamanyo House, George Street, Kampala
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  MGLSD • TRANSFORMATIVE
                </span>
                <a
                  href="https://mglsd.go.ug"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                >
                  <span>Official Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                "To promote gender equality, decent work, social protection and sustainable livelihoods for all."
              </p>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>

            {/* Big Primary New Interview Button */}
            <button
              data-testid="dashboard-new-interview-btn"
              onClick={onOpenNewInterview}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-2 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ New Interview</span>
            </button>

            {/* Quick Action Links */}
            <div className="space-y-1 pt-1">
              <button
                onClick={() => onNavigate('interviews')}
                className="w-full flex items-center space-x-3 p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                  <FileText className="w-4 h-4" />
                </div>
                <span>View All Interviews</span>
              </button>

              <button
                onClick={() => onNavigate('documents')}
                className="w-full flex items-center space-x-3 p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <span>Manage Documents</span>
              </button>

              <button
                onClick={() => onNavigate('admin-analytics')}
                className="w-full flex items-center space-x-3 p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <span>View Analytics Report</span>
              </button>
            </div>
          </div>

          {/* Upcoming Interviews Widget */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Upcoming Interviews</h3>
              <button
                onClick={() => onNavigate('interviews')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              {UPCOMING_SCHEDULE.map((sch) => (
                <div
                  key={sch.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/60 transition flex items-center justify-between"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{sch.department}</p>
                      <p className="text-[11px] text-slate-500">{sch.datetime}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierBadge(
                      sch.tier as InterviewTier
                    )}`}
                  >
                    {sch.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
