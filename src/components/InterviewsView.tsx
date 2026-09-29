/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useInterviews } from '../context/InterviewContext';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  Search,
  PlusCircle,
  Building,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  FileText,
  User,
  ChevronRight,
  Filter,
  X,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { Interview, InterviewTier, InterviewStatus } from '../types';
import { getTierBadge, getStatusBadge } from './dashboard/badgeUtils';

interface InterviewsViewProps {
  onOpenInterview: (interviewId: string) => void;
  onOpenNewInterview: () => void;
}

export const InterviewsView: React.FC<InterviewsViewProps> = ({
  onOpenInterview,
  onOpenNewInterview,
}) => {
  const { interviews, deleteInterview, completeInterview } = useInterviews();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Extract departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    interviews.forEach((i) => {
      if (i.department_unit) set.add(i.department_unit);
    });
    return Array.from(set).sort();
  }, [interviews]);

  // Filtered interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      const query = search.toLowerCase();
      const matchesSearch =
        interview.interviewee_name.toLowerCase().includes(query) ||
        interview.role_title.toLowerCase().includes(query) ||
        interview.department_unit.toLowerCase().includes(query) ||
        interview.location.toLowerCase().includes(query) ||
        interview.interviewer_name.toLowerCase().includes(query);

      const matchesTier = tierFilter === 'All' || interview.tier === tierFilter;
      const matchesStatus = statusFilter === 'All' || interview.status === statusFilter;
      const matchesDept = departmentFilter === 'All' || interview.department_unit === departmentFilter;

      return matchesSearch && matchesTier && matchesStatus && matchesDept;
    });
  }, [interviews, search, tierFilter, statusFilter, departmentFilter]);

  const isAllSelected =
    filteredInterviews.length > 0 && selectedIds.length === filteredInterviews.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInterviews.map((i) => i.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedIds.length} selected interview record(s)?`
      )
    ) {
      return;
    }
    try {
      for (const id of selectedIds) {
        await deleteInterview(id);
      }
      setSelectedIds([]);
      setActionToast({
        type: 'success',
        message: 'Selected interview records successfully deleted.',
      });
      setTimeout(() => setActionToast(null), 4000);
    } catch (err: any) {
      setActionToast({
        type: 'error',
        message: err?.message || 'Failed to delete selected interviews.',
      });
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Interviewee Name',
      'Role Title',
      'Department / Unit',
      'Tier',
      'Status',
      'Date',
      'Location',
      'Interviewer Name',
      'Completion %',
    ];
    const rows = filteredInterviews.map((i) => [
      i.id,
      `"${i.interviewee_name}"`,
      `"${i.role_title}"`,
      `"${i.department_unit}"`,
      i.tier,
      i.status,
      i.interview_date,
      `"${i.location}"`,
      `"${i.interviewer_name}"`,
      i.completion_percentage || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mglsd_diagnostic_interviews_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <ClipboardList className="w-3.5 h-3.5 mr-1" />
              <span>Diagnostic Roster</span>
            </span>
            <span className="text-xs text-slate-500">• {filteredInterviews.length} Sessions Listed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Diagnostic Interviews Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Comprehensive oversight and management of all field diagnostic interview sessions across MGLSD directorates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenNewInterview}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Schedule Interview</span>
          </button>
        </div>
      </div>

      {/* Action Toast */}
      {actionToast && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            actionToast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionToast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{actionToast.message}</span>
          </div>
          <button onClick={() => setActionToast(null)} className="text-current opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by interviewee name, role, department, location or interviewer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
          />
        </div>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All Tiers</option>
          <option value="Leadership">Leadership</option>
          <option value="Management">Management</option>
          <option value="Frontline">Frontline</option>
          <option value="Support/IT">Support / IT</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Interviews Table / Card List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Mobile List (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredInterviews.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No interview sessions matched your search criteria.
            </div>
          ) : (
            filteredInterviews.map((item) => (
              <div key={item.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition">
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

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{item.interview_date}</span>
                  </div>
                  <button
                    onClick={() => onOpenInterview(item.id)}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-teal-800 text-white rounded-lg font-bold text-[11px]"
                  >
                    <span>Open</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-10 text-center">
                  <button onClick={handleToggleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-teal-700" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Interviewee & Role</th>
                <th className="py-3 px-4">Department & Tier</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Status & Progress</th>
                <th className="py-3 px-4">Interviewer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInterviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No diagnostic interview records matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredInterviews.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const progress = item.completion_percentage || 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <button onClick={() => handleToggleRow(item.id)} className="text-slate-400 hover:text-slate-600">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-teal-700" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onOpenInterview(item.id)}
                          className="font-extrabold text-slate-900 hover:text-teal-700 transition text-left block"
                        >
                          {item.interviewee_name}
                        </button>
                        <p className="text-slate-500 text-[11px] truncate max-w-[220px]">
                          {item.role_title}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 truncate max-w-[200px]">
                          {item.department_unit}
                        </p>
                        <span
                          className={`inline-block mt-1 px-2.5 py-0.2 rounded-full text-[10px] font-bold border ${getTierBadge(
                            item.tier
                          )}`}
                        >
                          {item.tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1 text-slate-800 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.interview_date}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-slate-400 text-[11px] mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{item.interview_time || '10:00 AM'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-teal-600 h-full rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{item.interviewer_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onOpenInterview(item.id)}
                            className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold transition shadow-2xs flex items-center space-x-1"
                          >
                            <span>Open</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
  );
};
