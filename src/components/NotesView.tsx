/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useInterviews } from '../context/InterviewContext';
import { useAuth } from '../context/AuthContext';
import {
  FileEdit,
  Search,
  Filter,
  AlertTriangle,
  Lightbulb,
  Hash,
  Activity,
  Quote,
  Clock,
  ArrowRight,
  ExternalLink,
  Download,
  CheckCircle2,
  X,
  Building,
  User,
  Calendar,
  Save,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Interview, InterviewerNote, InterviewTier } from '../types';
import { getTierBadge } from './dashboard/badgeUtils';

interface NotesViewProps {
  onOpenInterview: (interviewId: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ onOpenInterview }) => {
  const { interviews, notes, getInterviewNotes, saveNotes, loadNotesForInterviews } = useInterviews();
  const { isSupabaseConfigured } = useAuth();

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [contentFilter, setContentFilter] = useState('All');

  // Modal editing state
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<InterviewerNote | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Load notes in batch for all interviews on mount
  useEffect(() => {
    if (loadNotesForInterviews && interviews.length > 0) {
      loadNotesForInterviews(interviews.map((i) => i.id));
    }
  }, [loadNotesForInterviews, interviews]);

  // Extract unique departments for filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    interviews.forEach((i) => {
      if (i.department_unit) set.add(i.department_unit);
    });
    return Array.from(set).sort();
  }, [interviews]);

  // Merge interview with its corresponding note
  const interviewNotesList = useMemo(() => {
    return interviews.map((interview) => {
      const note = notes[interview.id] || getInterviewNotes(interview.id);
      return {
        interview,
        note,
      };
    });
  }, [interviews, notes, getInterviewNotes]);

  // Compute summary metrics
  const stats = useMemo(() => {
    let totalWithObservations = 0;
    let totalWithBottlenecks = 0;
    let totalWithQuotes = 0;
    let totalWithNumbers = 0;

    interviewNotesList.forEach(({ note }) => {
      if (note.observations && note.observations.trim().length > 0) {
        totalWithObservations++;
      }
      if (
        (note.contradictions && note.contradictions.trim().length > 0) ||
        ((note as any).critical_bottlenecks && (note as any).critical_bottlenecks.trim().length > 0)
      ) {
        totalWithBottlenecks++;
      }
      if ((note as any).direct_quotes && (note as any).direct_quotes.trim().length > 0) {
        totalWithQuotes++;
      }
      if (
        note.numbers_captured &&
        Object.values(note.numbers_captured).some((val) => val !== null && val !== '')
      ) {
        totalWithNumbers++;
      }
    });

    return {
      totalInterviews: interviews.length,
      totalWithObservations,
      totalWithBottlenecks,
      totalWithQuotes,
      totalWithNumbers,
    };
  }, [interviewNotesList, interviews.length]);

  // Filtered list
  const filteredList = useMemo(() => {
    return interviewNotesList.filter(({ interview, note }) => {
      const query = search.toLowerCase();
      const matchesSearch =
        interview.interviewee_name.toLowerCase().includes(query) ||
        interview.role_title.toLowerCase().includes(query) ||
        interview.department_unit.toLowerCase().includes(query) ||
        (note.observations && note.observations.toLowerCase().includes(query)) ||
        (note.contradictions && note.contradictions.toLowerCase().includes(query)) ||
        ((note as any).critical_bottlenecks &&
          (note as any).critical_bottlenecks.toLowerCase().includes(query)) ||
        ((note as any).direct_quotes && (note as any).direct_quotes.toLowerCase().includes(query)) ||
        (note.follow_ups && note.follow_ups.toLowerCase().includes(query));

      const matchesDept =
        departmentFilter === 'All' || interview.department_unit === departmentFilter;

      const matchesTier = tierFilter === 'All' || interview.tier === tierFilter;

      let matchesContent = true;
      if (contentFilter === 'observations') {
        matchesContent = Boolean(note.observations && note.observations.trim().length > 0);
      } else if (contentFilter === 'bottlenecks') {
        matchesContent = Boolean(
          (note.contradictions && note.contradictions.trim().length > 0) ||
            ((note as any).critical_bottlenecks &&
              (note as any).critical_bottlenecks.trim().length > 0)
        );
      } else if (contentFilter === 'quotes') {
        matchesContent = Boolean(
          (note as any).direct_quotes && (note as any).direct_quotes.trim().length > 0
        );
      } else if (contentFilter === 'numbers') {
        matchesContent = Boolean(
          note.numbers_captured &&
            Object.values(note.numbers_captured).some((val) => val !== null && val !== '')
        );
      }

      return matchesSearch && matchesDept && matchesTier && matchesContent;
    });
  }, [interviewNotesList, search, departmentFilter, tierFilter, contentFilter]);

  // Handle open inline edit modal
  const handleStartEdit = (interviewId: string) => {
    const currentNote = notes[interviewId] || getInterviewNotes(interviewId);
    setEditFormData(JSON.parse(JSON.stringify(currentNote)));
    setEditingInterviewId(interviewId);
  };

  // Handle save from modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInterviewId || !editFormData) return;
    setIsSaving(true);
    try {
      await saveNotes(editingInterviewId, editFormData);
      setToastMessage({
        type: 'success',
        text: 'Interviewer notes successfully updated and synced.',
      });
      setEditingInterviewId(null);
      setEditFormData(null);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage({
        type: 'info',
        text: err?.message || 'Notes updated in session memory.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Export all notes as JSON
  const handleExportJSON = () => {
    const exportData = {
      programme: 'TRANSFORMATIVE Programme - MGLSD Uganda',
      export_date: new Date().toISOString(),
      interviews_count: filteredList.length,
      records: filteredList.map(({ interview, note }) => ({
        interview_id: interview.id,
        interviewee_name: interview.interviewee_name,
        role_title: interview.role_title,
        department_unit: interview.department_unit,
        tier: interview.tier,
        date: interview.interview_date,
        interviewer: interview.interviewer_name,
        notes: note,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mglsd_interviewer_notes_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <FileEdit className="w-3.5 h-3.5 mr-1" />
              <span>Diagnostic Field Notes</span>
            </span>
            <span className="text-xs text-slate-500">• {filteredList.length} Sessions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Interviewer Synthesis & Operational Notes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Central repository of qualitative field observations, non-verbal cues, bottlenecks, administrative metrics, and institutional maturity ratings.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Notes (JSON)</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <FileEdit className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Sessions
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.totalInterviews}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Observations Logged
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.totalWithObservations}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Bottlenecks Flagged
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.totalWithBottlenecks}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Hash className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Administrative Metrics
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.totalWithNumbers}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by interviewee, department, observations, bottlenecks or quotes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
          />
        </div>

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

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All Tiers</option>
          <option value="Leadership">Leadership</option>
          <option value="Management">Management</option>
          <option value="Frontline">Frontline Staff</option>
          <option value="Support/IT">Support / IT</option>
        </select>

        <select
          value={contentFilter}
          onChange={(e) => setContentFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All Content Types</option>
          <option value="observations">Has Field Observations</option>
          <option value="bottlenecks">Has Bottlenecks / Pain Points</option>
          <option value="quotes">Has Direct Quotes</option>
          <option value="numbers">Has Administrative Numbers</option>
        </select>
      </div>

      {/* Notes Feed Container */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <FileEdit className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Interview Notes Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No diagnostic interview notes matched your current search filters. Try clearing filters or open an interview to record new field observations.
            </p>
          </div>
        ) : (
          filteredList.map(({ interview, note }) => {
            const hasObservations = Boolean(note.observations && note.observations.trim().length > 0);
            const bottlenecks =
              note.contradictions || (note as any).critical_bottlenecks || '';
            const quotes = (note as any).direct_quotes || '';
            const cues = (note as any).non_verbal_cues || '';
            const hasBottlenecks = Boolean(bottlenecks.trim().length > 0);
            const hasQuotes = Boolean(quotes.trim().length > 0);
            const hasCues = Boolean(cues.trim().length > 0);
            const hasFollowUps = Boolean(note.follow_ups && note.follow_ups.trim().length > 0);

            // Numbers captured
            const numbers = note.numbers_captured || ({} as any);
            const hasNumbers = Object.values(numbers).some((v) => v !== null && v !== '');

            // Maturity signals
            const signals = note.maturity_signals || ({} as any);

            return (
              <div
                key={interview.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-800 text-white font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                      {interview.interviewee_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                          {interview.interviewee_name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierBadge(
                            interview.tier as InterviewTier
                          )}`}
                        >
                          {interview.tier}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        {interview.role_title} • <span className="font-semibold text-teal-800">{interview.department_unit}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{interview.interview_date}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Interviewer: {interview.interviewer_name}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleStartEdit(interview.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Notes</span>
                    </button>
                    <button
                      onClick={() => onOpenInterview(interview.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      <span>Open Interview</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* General Observations */}
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      <span>General Observations & Atmosphere</span>
                    </div>
                    {hasObservations ? (
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">
                        {note.observations}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-slate-50/40 p-3 rounded-xl border border-dashed border-slate-200">
                        No general observations recorded yet for this session.
                      </p>
                    )}
                  </div>

                  {/* Bottlenecks and Direct Quotes Grid */}
                  {(hasBottlenecks || hasQuotes) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                      {hasBottlenecks && (
                        <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-1">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-900">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Critical Bottlenecks & Operational Pain Points</span>
                          </div>
                          <p className="text-xs text-rose-950 leading-relaxed whitespace-pre-wrap">
                            {bottlenecks}
                          </p>
                        </div>
                      )}

                      {hasQuotes && (
                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                            <Quote className="w-3.5 h-3.5 text-amber-600" />
                            <span>Notable Direct Quotation</span>
                          </div>
                          <p className="text-xs text-amber-950 italic font-serif leading-relaxed">
                            &ldquo;{quotes}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Non-verbal Cues & Reluctance */}
                  {hasCues && (
                    <div className="p-3 rounded-xl bg-slate-100/60 border border-slate-200/60 text-xs text-slate-700 space-y-1">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                        Non-verbal Cues & Hesitation Points
                      </span>
                      <p className="text-slate-600 leading-snug">{cues}</p>
                    </div>
                  )}

                  {/* Follow-up Actions */}
                  {hasFollowUps && (
                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900 flex items-start space-x-2">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-[11px] uppercase tracking-wider text-blue-800">
                          Follow-up Actions Required
                        </span>
                        <p className="text-blue-950 leading-snug mt-0.5">{note.follow_ups}</p>
                      </div>
                    </div>
                  )}

                  {/* Quantitative Baseline Metrics */}
                  {hasNumbers && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Hash className="w-3 h-3 text-teal-700" />
                        <span>Captured Administrative Metrics</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                        {(numbers.staff_approved || numbers.total_staff) && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 block truncate">Staff Approved</span>
                            <span className="font-mono font-bold text-slate-800">
                              {numbers.staff_approved || numbers.total_staff}
                            </span>
                          </div>
                        )}
                        {(numbers.staff_actual || numbers.labour_officers_count) && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 block truncate">Staff Actual</span>
                            <span className="font-mono font-bold text-slate-800">
                              {numbers.staff_actual || numbers.labour_officers_count}
                            </span>
                          </div>
                        )}
                        {(numbers.inspections_conducted || numbers.annual_inspections) && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 block truncate">Inspections</span>
                            <span className="font-mono font-bold text-slate-800">
                              {numbers.inspections_conducted || numbers.annual_inspections}
                            </span>
                          </div>
                        )}
                        {(numbers.disputes_handled || numbers.disputes_logged) && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 block truncate">Disputes Handled</span>
                            <span className="font-mono font-bold text-slate-800">
                              {numbers.disputes_handled || numbers.disputes_logged}
                            </span>
                          </div>
                        )}
                        {numbers.prosecutions !== undefined && numbers.prosecutions !== null && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 block truncate">Prosecutions</span>
                            <span className="font-mono font-bold text-slate-800">{numbers.prosecutions}</span>
                          </div>
                        )}
                        {(numbers.annual_budget_ugx || numbers.budget_allocated_ugx) && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 block truncate">Budget (UGX)</span>
                            <span className="font-mono font-bold text-slate-800 truncate block">
                              {numbers.annual_budget_ugx || numbers.budget_allocated_ugx}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Institutional Maturity Ratings */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                      <Activity className="w-3 h-3 text-indigo-600 mr-1" />
                      <span>Maturity Signals:</span>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px]">
                      Governance: <strong className="text-teal-800">{signals.governance_score || 3}/5</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px]">
                      Technology: <strong className="text-teal-800">{signals.technology_score || 2}/5</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px]">
                      Process: <strong className="text-teal-800">{signals.process_score || 2}/5</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px]">
                      People: <strong className="text-teal-800">{signals.people_skills_score || 3}/5</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px]">
                      Reporting: <strong className="text-teal-800">{signals.data_reporting_score || 2}/5</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Notes Modal */}
      {editingInterviewId && editFormData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#0b132b] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Edit Interviewer Field Notes</h3>
                  <p className="text-[11px] text-slate-300">
                    Update confidential reflections and operational numbers for this session
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingInterviewId(null);
                  setEditFormData(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Overall Interview Atmosphere & Observations
                </label>
                <textarea
                  rows={4}
                  value={editFormData.observations || ''}
                  onChange={(e) =>
                    setEditFormData((prev) => (prev ? { ...prev, observations: e.target.value } : null))
                  }
                  placeholder="Record confidential interviewer reflections, context, and operational nuances..."
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Critical Bottlenecks & Pain Points</span>
                  </label>
                  <textarea
                    rows={3}
                    value={
                      editFormData.contradictions ||
                      (editFormData as any).critical_bottlenecks ||
                      ''
                    }
                    onChange={(e) =>
                      setEditFormData((prev) =>
                        prev
                          ? {
                              ...prev,
                              contradictions: e.target.value,
                              critical_bottlenecks: e.target.value,
                            }
                          : null
                      )
                    }
                    placeholder="Log key institutional bottlenecks, fuel shortages, staffing gaps..."
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-y"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <Quote className="w-3.5 h-3.5 text-amber-500" />
                    <span>Notable Direct Quotations</span>
                  </label>
                  <textarea
                    rows={3}
                    value={(editFormData as any).direct_quotes || ''}
                    onChange={(e) =>
                      setEditFormData((prev) =>
                        prev ? { ...prev, direct_quotes: e.target.value } as any : null
                      )
                    }
                    placeholder="Exact verbal quote reflecting ground realities..."
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-y font-serif italic"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Follow-Up Actions Required
                </label>
                <input
                  type="text"
                  value={editFormData.follow_ups || ''}
                  onChange={(e) =>
                    setEditFormData((prev) => (prev ? { ...prev, follow_ups: e.target.value } : null))
                  }
                  placeholder="e.g. Request quarterly registry report from Assistant Commissioner by Friday"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Numbers Captured Form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Hash className="w-3.5 h-3.5 text-teal-700" />
                  <span>Administrative Statistics Captured</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Staff Approved</label>
                    <input
                      type="number"
                      value={
                        (editFormData.numbers_captured as any)?.staff_approved ||
                        editFormData.numbers_captured?.total_staff ||
                        ''
                      }
                      onChange={(e) =>
                        setEditFormData((prev) => {
                          if (!prev) return null;
                          const val = e.target.value ? parseInt(e.target.value) : null;
                          return {
                            ...prev,
                            numbers_captured: {
                              ...prev.numbers_captured,
                              staff_approved: val,
                              total_staff: val,
                            } as any,
                          };
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Staff Actual</label>
                    <input
                      type="number"
                      value={
                        (editFormData.numbers_captured as any)?.staff_actual ||
                        editFormData.numbers_captured?.labour_officers_count ||
                        ''
                      }
                      onChange={(e) =>
                        setEditFormData((prev) => {
                          if (!prev) return null;
                          const val = e.target.value ? parseInt(e.target.value) : null;
                          return {
                            ...prev,
                            numbers_captured: {
                              ...prev.numbers_captured,
                              staff_actual: val,
                              labour_officers_count: val,
                            } as any,
                          };
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Annual Inspections</label>
                    <input
                      type="number"
                      value={
                        (editFormData.numbers_captured as any)?.inspections_conducted ||
                        editFormData.numbers_captured?.annual_inspections ||
                        ''
                      }
                      onChange={(e) =>
                        setEditFormData((prev) => {
                          if (!prev) return null;
                          const val = e.target.value ? parseInt(e.target.value) : null;
                          return {
                            ...prev,
                            numbers_captured: {
                              ...prev.numbers_captured,
                              inspections_conducted: val,
                              annual_inspections: val,
                            } as any,
                          };
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Disputes Handled</label>
                    <input
                      type="number"
                      value={
                        (editFormData.numbers_captured as any)?.disputes_handled ||
                        editFormData.numbers_captured?.disputes_logged ||
                        ''
                      }
                      onChange={(e) =>
                        setEditFormData((prev) => {
                          if (!prev) return null;
                          const val = e.target.value ? parseInt(e.target.value) : null;
                          return {
                            ...prev,
                            numbers_captured: {
                              ...prev.numbers_captured,
                              disputes_handled: val,
                              disputes_logged: val,
                            } as any,
                          };
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Prosecutions</label>
                    <input
                      type="number"
                      value={(editFormData.numbers_captured as any)?.prosecutions || ''}
                      onChange={(e) =>
                        setEditFormData((prev) => {
                          if (!prev) return null;
                          const val = e.target.value ? parseInt(e.target.value) : null;
                          return {
                            ...prev,
                            numbers_captured: {
                              ...prev.numbers_captured,
                              prosecutions: val,
                            } as any,
                          };
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Annual Budget (UGX)</label>
                    <input
                      type="text"
                      value={
                        (editFormData.numbers_captured as any)?.annual_budget_ugx ||
                        editFormData.numbers_captured?.budget_allocated_ugx ||
                        ''
                      }
                      onChange={(e) =>
                        setEditFormData((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            numbers_captured: {
                              ...prev.numbers_captured,
                              annual_budget_ugx: e.target.value,
                              budget_allocated_ugx: e.target.value,
                            } as any,
                          };
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingInterviewId(null);
                    setEditFormData(null);
                  }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Notes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
