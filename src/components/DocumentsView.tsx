/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useInterviews } from '../context/InterviewContext';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Upload,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  X,
  FileCheck,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { getDocumentSignedUrl } from '../lib/interviewService';

export const DocumentsView: React.FC<{ onOpenInterview: (id: string) => void }> = ({
  onOpenInterview,
}) => {
  const { interviews, checklists } = useInterviews();
  const { isSupabaseConfigured } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [activeRetrievalKey, setActiveRetrievalKey] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<{
    type: 'info' | 'success' | 'error';
    message: string;
    submessage?: string;
  } | null>(null);

  // Flatten all documents across visible interviews
  const allDocs = interviews.flatMap((interview) => {
    const list = checklists[interview.id] || [];
    return list.map((doc) => ({
      ...doc,
      interview_name: interview.interviewee_name,
      interview_role: interview.role_title,
      interview_dept: interview.department_unit,
      interview_id: interview.id,
    }));
  });

  const handleDownloadOrView = async (doc: DocumentItem & { interview_id: string }) => {
    const fileRef = doc.file_url || doc.storage_path;
    if (!fileRef || fileRef.startsWith('#')) return;

    const docKey = `${doc.interview_id}-${doc.item_number}`;

    try {
      setActiveRetrievalKey(docKey);
      setActionToast(null);
      const signedUrl = await getDocumentSignedUrl(fileRef, 3600);
      if (signedUrl && !signedUrl.startsWith('#')) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
        setActionToast({
          type: 'success',
          message: `Opened "${doc.file_name || 'Document'}" via secure signed URL`,
          submessage: 'Generated fresh 1-hour time-limited access URL from private repository.',
        });
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Access denied by security policy.';
      setActionToast({
        type: 'error',
        message: errMsg,
        submessage: 'You may not have the required interviewer or admin permissions for this interview file.',
      });
    } finally {
      setActiveRetrievalKey(null);
    }
  };

  const filtered = allDocs.filter((doc) => {
    const matchesSearch =
      doc.document_title.toLowerCase().includes(search.toLowerCase()) ||
      doc.interview_name.toLowerCase().includes(search.toLowerCase()) ||
      doc.interview_dept.toLowerCase().includes(search.toLowerCase()) ||
      (doc.file_name && doc.file_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'All' || doc.collected_status === statusFilter;

    const matchesCategory =
      categoryFilter === 'All' || doc.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Statutory Document Repository
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Central repository of all 20 statutory and operational documents tracked across diagnostic interviews.
          </p>
        </div>
      </div>

      {/* Notification Toast / Alert */}
      {actionToast && (
        <div
          role="alert"
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs shadow-2xs transition animate-in fade-in duration-200 ${
            actionToast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : actionToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {actionToast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : actionToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{actionToast.message}</p>
              {actionToast.submessage && (
                <p className="mt-0.5 text-[11px] opacity-90">{actionToast.submessage}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setActionToast(null)}
            className="p-1 hover:bg-black/5 rounded text-current opacity-70 hover:opacity-100 transition"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents by title, department, or file name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 outline-none"
        >
          <option value="All">All Collected Statuses</option>
          <option value="Collected">Collected</option>
          <option value="Pending">Pending</option>
          <option value="Refused">Refused</option>
          <option value="N/A">N/A</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 outline-none"
        >
          <option value="All">All Categories</option>
          <option value="Strategy & Policy">Strategy & Policy</option>
          <option value="Legislation">Legislation</option>
          <option value="Reports">Reports</option>
          <option value="HR & Finance">HR & Finance</option>
          <option value="Technical">Technical</option>
          <option value="Systems & IT">Systems & IT</option>
        </select>
      </div>

      {/* Documents Container: Mobile Cards (< md) + Desktop Table (>= md) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Mobile Card List (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No statutory documents match the current filters.
            </div>
          ) : (
            filtered.map((doc) => {
              const docKey = `${doc.interview_id}-${doc.item_number}`;
              const hasFile = Boolean(doc.file_name || doc.file_url);

              return (
                <div key={docKey} className="p-4 space-y-3 hover:bg-slate-50/70 transition">
                  {/* Header: Item #, Title, Category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {doc.item_number}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {doc.document_title}
                        </h3>
                        <span className="inline-block text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1">
                          {doc.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        doc.exists_status === 'Yes'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : doc.exists_status === 'Partial'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      Exists: {doc.exists_status}
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        doc.collected_status === 'Collected'
                          ? 'bg-emerald-100 text-emerald-800'
                          : doc.collected_status === 'Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Status: {doc.collected_status}
                    </span>
                  </div>

                  {/* Attached File Card if present */}
                  {hasFile && (
                    <div className="p-2.5 bg-emerald-50/90 border border-emerald-200/90 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5 truncate min-w-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-mono font-bold text-emerald-950 truncate text-[11px]" title={doc.file_name}>
                            {doc.file_name || 'Attached Evidence'}
                          </span>
                        </div>
                        <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded shrink-0">
                          Vault
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadOrView(doc)}
                        disabled={activeRetrievalKey === docKey}
                        className="w-full py-1.5 px-3 bg-white hover:bg-teal-50 border border-teal-300 rounded-lg text-teal-800 font-bold text-[11px] flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        {activeRetrievalKey === docKey ? (
                          <Loader2 className="w-3 h-3 animate-spin text-teal-700" />
                        ) : (
                          <ExternalLink className="w-3 h-3 text-teal-700" />
                        )}
                        <span>Download / View Document</span>
                      </button>
                    </div>
                  )}

                  {/* Source Interviewee & Dept */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Source Interview</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-semibold text-slate-800">{doc.interview_name}</span>
                      <span className="text-slate-500 text-[11px]">{doc.interview_dept}</span>
                    </div>
                    {doc.notes && (
                      <p className="text-slate-600 text-[11px] mt-1 italic border-t border-slate-200/60 pt-1">
                        "{doc.notes}"
                      </p>
                    )}
                  </div>

                  {/* Touch Action Button (min 44px height) */}
                  <button
                    onClick={() => onOpenInterview(doc.interview_id)}
                    className="w-full py-2.5 px-4 bg-teal-50 hover:bg-teal-100 active:bg-teal-200 text-teal-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 min-h-[44px] border border-teal-200"
                  >
                    <span>Open in Diagnostic Form</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet Table (hidden on < md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3 w-10">#</th>
                <th className="py-3.5 px-4 min-w-[240px]">Document Title</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-4">Source Interviewee</th>
                <th className="py-3.5 px-3">Exists?</th>
                <th className="py-3.5 px-3">Collection Status</th>
                <th className="py-3.5 px-4 min-w-[160px]">Attached Evidence</th>
                <th className="py-3.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => {
                const docKey = `${doc.interview_id}-${doc.item_number}`;
                const hasFile = Boolean(doc.file_name || doc.file_url);

                return (
                  <tr key={docKey} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-400">{doc.item_number}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{doc.document_title}</td>
                    <td className="py-3 px-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px]">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onOpenInterview(doc.interview_id)}
                        className="font-semibold text-teal-700 hover:underline block text-left"
                      >
                        {doc.interview_name}
                      </button>
                      <span className="text-[11px] text-slate-400">{doc.interview_dept}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          doc.exists_status === 'Yes'
                            ? 'bg-emerald-50 text-emerald-700'
                            : doc.exists_status === 'Partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {doc.exists_status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          doc.collected_status === 'Collected'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.collected_status === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {doc.collected_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {hasFile ? (
                        <div className="space-y-1 max-w-[200px]">
                          <div className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-mono font-bold text-emerald-950 truncate text-[11px]" title={doc.file_name}>
                              {doc.file_name || 'Evidence Attached'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadOrView(doc)}
                              disabled={activeRetrievalKey === docKey}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 underline disabled:opacity-50"
                              title="Download / View document with fresh 1-hour signed URL"
                            >
                              {activeRetrievalKey === docKey ? (
                                <Loader2 className="w-3 h-3 animate-spin text-teal-700" />
                              ) : (
                                <ExternalLink className="w-3 h-3" />
                              )}
                              <span>Download / View</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No file attached</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onOpenInterview(doc.interview_id)}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                      >
                        View in Form →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

