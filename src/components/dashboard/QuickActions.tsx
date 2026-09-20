/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, FileText, FolderOpen, BarChart2 } from 'lucide-react';

export interface QuickActionsProps {
  onOpenNewInterview: () => void;
  onNavigate: (view: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onOpenNewInterview,
  onNavigate,
}) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>

      {/* Big Primary New Interview Button */}
      <button
        data-testid="dashboard-new-interview-btn"
        onClick={onOpenNewInterview}
        className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>+ New Interview</span>
      </button>

      {/* Quick Action Links */}
      <div className="space-y-1 pt-1">
        <button
          onClick={() => onNavigate('interviews')}
          className="w-full flex items-center space-x-3 p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
            <FileText className="w-4 h-4" />
          </div>
          <span>View All Interviews</span>
        </button>

        <button
          onClick={() => onNavigate('documents')}
          className="w-full flex items-center space-x-3 p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
            <FolderOpen className="w-4 h-4" />
          </div>
          <span>Manage Documents</span>
        </button>

        <button
          onClick={() => onNavigate('admin-analytics')}
          className="w-full flex items-center space-x-3 p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
            <BarChart2 className="w-4 h-4" />
          </div>
          <span>View Analytics Report</span>
        </button>
      </div>
    </div>
  );
};
