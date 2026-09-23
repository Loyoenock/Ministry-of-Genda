/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInterviews } from '../context/InterviewContext';
import {
  MetricsBar,
  InterviewFilters,
  InterviewTable,
  RecentActivityFeed,
  TierDistributionChart,
  StatusDistributionBars,
  MinistryCard,
  QuickActions,
  UpcomingInterviews,
} from './dashboard';

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
  const { interviews, recentActivities, deleteInterview } = useInterviews();

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('All Tiers');
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [selectedInterviewIds, setSelectedInterviewIds] = useState<string[]>([]);
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dateFormatted = currentDateTime.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = currentDateTime.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Compute dynamic metric metrics
  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter((i) => i.status === 'Completed').length;
  const inProgressInterviews = interviews.filter((i) => i.status === 'In Progress').length;
  const draftInterviews = interviews.filter((i) => i.status === 'Draft').length;
  const completionRate =
    totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0;

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
    { name: 'Leadership', value: tierCounts.Leadership || 3, color: '#8b5cf6' },
    { name: 'Management', value: tierCounts.Management || 3, color: '#3b82f6' },
    { name: 'Frontline', value: tierCounts.Frontline || 4, color: '#0d9488' },
    { name: 'Support/IT', value: tierCounts['Support/IT'] || 2, color: '#06b6d4' },
  ];

  // Filtered interviews for the data table
  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        interview.interviewee_name.toLowerCase().includes(query) ||
        interview.department_unit.toLowerCase().includes(query) ||
        interview.role_title.toLowerCase().includes(query) ||
        interview.location.toLowerCase().includes(query);

      const matchesTier = tierFilter === 'All Tiers' || interview.tier === tierFilter;
      const matchesStatus = statusFilter === 'All Statuses' || interview.status === statusFilter;

      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [interviews, searchQuery, tierFilter, statusFilter]);

  const toggleSelectAll = useCallback(() => {
    if (selectedInterviewIds.length === filteredInterviews.length) {
      setSelectedInterviewIds([]);
    } else {
      setSelectedInterviewIds(filteredInterviews.map((i) => i.id));
    }
  }, [selectedInterviewIds.length, filteredInterviews]);

  const toggleSelectRow = useCallback((id: string) => {
    setSelectedInterviewIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTierFilter('All Tiers');
    setStatusFilter('All Statuses');
  }, []);

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
            <p className="text-xs font-bold text-slate-800">{dateFormatted}</p>
            <p className="text-[11px] text-slate-400">Live: {timeFormatted}</p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Left Content & Right Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main 3 Columns */}
        <div className="xl:col-span-3 space-y-6">
          {/* Extracted Metrics Bar */}
          <MetricsBar
            totalInterviews={totalInterviews}
            completedInterviews={completedInterviews}
            inProgressInterviews={inProgressInterviews}
            draftInterviews={draftInterviews}
            completionRate={completionRate}
            onNavigate={onNavigate}
            onSelectStatusFilter={(status) => {
              setStatusFilter(status);
            }}
          />

          {/* Middle Row: Donut Chart, Status Progress Bars, Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TierDistributionChart
              totalInterviews={totalInterviews}
              tierCounts={tierCounts}
              tierChartData={tierChartData}
            />

            <StatusDistributionBars
              totalInterviews={totalInterviews}
              completedInterviews={completedInterviews}
              inProgressInterviews={inProgressInterviews}
              draftInterviews={draftInterviews}
            />

            <RecentActivityFeed
              recentActivities={recentActivities}
              onNavigate={onNavigate}
            />
          </div>

          {/* Bottom: My Interviews Table with Filter Controls */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <InterviewFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              tierFilter={tierFilter}
              onTierChange={setTierFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              onClearFilters={clearFilters}
            />

            <InterviewTable
              interviews={filteredInterviews}
              selectedInterviewIds={selectedInterviewIds}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelectRow={toggleSelectRow}
              onOpenInterview={onOpenInterview}
              onDeleteInterview={deleteInterview}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {/* Right Column: Ministry Card + Quick Actions + Upcoming Interviews */}
        <div className="space-y-6">
          <MinistryCard />

          <QuickActions
            onOpenNewInterview={onOpenNewInterview}
            onNavigate={onNavigate}
          />

          <UpcomingInterviews onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
};
