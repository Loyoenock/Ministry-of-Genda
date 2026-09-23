/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useInterviews } from '../../context/InterviewContext';
import { useAuth } from '../../context/AuthContext';
import { parseInterviewDate } from '../../lib/interviewCalculations';
import { Interview, InterviewTier, InterviewStatus } from '../../types';
import { getTierBadge } from '../dashboard/badgeUtils';

export interface CalendarViewProps {
  onOpenInterview: (interviewId: string) => void;
  onOpenNewInterviewWithDate: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenInterview,
  onOpenNewInterviewWithDate,
}) => {
  const { interviews } = useInterviews();
  const { isAdmin, allUsers } = useAuth();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [interviewerFilter, setInterviewerFilter] = useState<string>('all');

  // Month navigation
  const prevPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const nextPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Filtered interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((it) => {
      if (tierFilter !== 'all' && it.tier !== tierFilter) return false;
      if (statusFilter !== 'all' && it.status !== statusFilter) return false;
      if (isAdmin && interviewerFilter !== 'all' && it.interviewer_id !== interviewerFilter) {
        return false;
      }
      return true;
    });
  }, [interviews, tierFilter, statusFilter, interviewerFilter, isAdmin]);

  // Calendar matrix calculation for month view
  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; isCurrentMonth: boolean; dateString: string }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateString: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`,
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      });
    }

    // Next month padding days to complete grid rows (multiple of 7)
    const remainder = days.length % 7;
    if (remainder > 0) {
      const daysToAdd = 7 - remainder;
      for (let day = 1; day <= daysToAdd; day++) {
        const d = new Date(year, month + 1, day);
        days.push({
          date: d,
          isCurrentMonth: false,
          dateString: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate()
          ).padStart(2, '0')}`,
        });
      }
    }

    return days;
  }, [currentDate]);

  // Week matrix calculation for week view
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day); // Start on Sunday

    const days: { date: Date; dateString: string; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      days.push({ date: d, dateString, label });
    }
    return days;
  }, [currentDate]);

  // Map dateString -> interviews[]
  const interviewsByDate = useMemo(() => {
    const map: Record<string, Interview[]> = {};
    filteredInterviews.forEach((it) => {
      const parsed = parseInterviewDate(it.interview_date);
      const dateStr = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(parsed.getDate()).padStart(2, '0')}`;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(it);
    });
    return map;
  }, [filteredInterviews]);

  const monthTitle = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-700/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Diagnostic Interview Calendar
            </h1>
            <p className="text-xs text-slate-500">
              MGLSD Labour Directorate • TRANSFORMATIVE Programme Schedule
            </p>
          </div>
        </div>

        {/* Navigation & View Mode */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === 'week'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={prevPeriod}
              title="Previous Period"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition"
            >
              Today
            </button>
            <button
              onClick={nextPeriod}
              title="Next Period"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 mr-2">
          <Filter className="w-4 h-4 text-teal-600" />
          <span>Filters:</span>
        </div>

        <div>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="all">All Tiers</option>
            <option value="Leadership">Leadership</option>
            <option value="Management">Management</option>
            <option value="Frontline">Frontline</option>
            <option value="Support/IT">Support/IT</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {isAdmin && (
          <div>
            <select
              value={interviewerFilter}
              onChange={(e) => setInterviewerFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="all">All Interviewers</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredInterviews.length}</span> interviews
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Calendar Title Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 capitalize">{monthTitle}</h2>
          <span className="text-xs text-slate-500">
            {viewMode === 'month' ? 'Month View' : 'Week View'}
          </span>
        </div>

        {viewMode === 'month' ? (
          <div>
            {/* Weekday Header */}
            <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider py-2.5">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
              {monthMatrix.map((cell, idx) => {
                const dayInterviews = interviewsByDate[cell.dateString] || [];
                const isToday =
                  cell.date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={idx}
                    onClick={() => onOpenNewInterviewWithDate(cell.dateString)}
                    className={`bg-white min-h-[110px] sm:min-h-[130px] p-2 flex flex-col transition hover:bg-slate-50/80 cursor-pointer group relative ${
                      !cell.isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-teal-700 text-white shadow-xs'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>
                      <button
                        title="Schedule Interview on this date"
                        className="opacity-0 group-hover:opacity-100 p-1 text-teal-600 hover:bg-teal-50 rounded transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Interviews List in Cell */}
                    <div className="space-y-1 overflow-y-auto flex-1 max-h-[90px]">
                      {dayInterviews.map((it) => (
                        <div
                          key={it.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInterview(it.id);
                          }}
                          className={`p-1.5 rounded-lg border text-[10px] shadow-2xs transition hover:scale-[1.01] ${
                            it.status === 'Completed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : it.status === 'In Progress'
                              ? 'bg-blue-50 border-blue-200 text-blue-900'
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold truncate">
                            <span className="truncate">{it.interviewee_name}</span>
                            <span className="text-[9px] opacity-75 shrink-0 ml-1">{it.interview_time}</span>
                          </div>
                          <div className="text-[9px] text-slate-600 truncate">{it.department_unit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Week View */
          <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-200 gap-px">
            {weekDays.map((wd, idx) => {
              const dayInterviews = interviewsByDate[wd.dateString] || [];
              const isToday = wd.date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={idx}
                  onClick={() => onOpenNewInterviewWithDate(wd.dateString)}
                  className="bg-white min-h-[350px] p-3 flex flex-col cursor-pointer hover:bg-slate-50 transition group"
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        isToday ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {wd.label}
                    </span>
                    <button
                      title="Schedule interview"
                      className="opacity-0 group-hover:opacity-100 p-1 text-teal-600 hover:bg-teal-50 rounded transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {dayInterviews.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-6">No interviews</p>
                    ) : (
                      dayInterviews.map((it) => (
                        <div
                          key={it.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInterview(it.id);
                          }}
                          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50/50 hover:border-teal-300 transition space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{it.interviewee_name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTierBadge(
                                it.tier as InterviewTier
                              )}`}
                            >
                              {it.tier}
                            </span>
                          </div>
                          <p className="text-[11px] text-teal-800 font-medium truncate">{it.role_title}</p>
                          <p className="text-[10px] text-slate-500">{it.department_unit}</p>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{it.interview_time}</span>
                            </span>
                            <span className="font-semibold text-slate-700">{it.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
