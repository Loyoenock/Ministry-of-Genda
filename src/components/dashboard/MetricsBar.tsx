/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  CircleDot,
  ArrowRight,
} from 'lucide-react';

export interface MetricsBarProps {
  totalInterviews: number;
  completedInterviews: number;
  inProgressInterviews: number;
  draftInterviews: number;
  completionRate: number;
  onNavigate: (view: string) => void;
  onSelectStatusFilter: (status: string) => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  totalInterviews,
  completedInterviews,
  inProgressInterviews,
  draftInterviews,
  completionRate,
  onNavigate,
  onSelectStatusFilter,
}) => {
  return (
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
          onSelectStatusFilter('Completed');
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
        <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-1 truncate">
          {completionRate}% completion
        </p>
      </div>

      {/* 3. In Progress */}
      <div
        onClick={() => {
          onSelectStatusFilter('In Progress');
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
          onSelectStatusFilter('Draft');
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
  );
};
