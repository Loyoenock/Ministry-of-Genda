/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useInterviews } from '../context/InterviewContext';
import { FileText, Search, Filter, CheckCircle2, Clock, Upload, ExternalLink } from 'lucide-react';
import { DocumentItem } from '../types';

export const DocumentsView: React.FC<{ onOpenInterview: (id: string) => void }> = ({
  onOpenInterview,
}) => {
  const { interviews, checklists, uploadDocumentFile } = useInterviews();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

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

  const filtered = allDocs.filter((doc) => {
    const matchesSearch =
      doc.document_title.toLowerCase().includes(search.toLowerCase()) ||
      doc.interview_name.toLowerCase().includes(search.toLowerCase()) ||
      doc.interview_dept.toLowerCase().includes(search.toLowerCase());

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

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents by title or department..."
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

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3 w-10">#</th>
                <th className="py-3.5 px-4 min-w-[260px]">Document Title</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-4">Source Interviewee</th>
                <th className="py-3.5 px-3">Exists?</th>
                <th className="py-3.5 px-3">Collection Status</th>
                <th className="py-3.5 px-4">Verification Notes</th>
                <th className="py-3.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc, idx) => (
                <tr key={`${doc.interview_id}-${doc.item_number}`} className="hover:bg-slate-50/70 transition">
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
                  <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]">
                    {doc.notes || '—'}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
