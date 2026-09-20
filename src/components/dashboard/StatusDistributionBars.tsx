/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface StatusDistributionBarsProps {
  totalInterviews: number;
  completedInterviews: number;
  inProgressInterviews: number;
  draftInterviews: number;
}

export const StatusDistributionBars: React.FC<StatusDistributionBarsProps> = ({
  totalInterviews,
  completedInterviews,
  inProgressInterviews,
  draftInterviews,
}) => {
  const denominator = totalInterviews || 1;
  const completedPct = Math.round((completedInterviews / denominator) * 100);
  const inProgressPct = Math.round((inProgressInterviews / denominator) * 100);
  const draftPct = Math.round((draftInterviews / denominator) * 100);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
      <h3 className="text-sm font-bold text-slate-900 mb-3">Interview Status</h3>

      <div className="space-y-4">
        {/* Completed */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-700">Completed</span>
            <span className="text-slate-500 font-medium">
              {completedInterviews} ({completedPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${completedPct}%` }}
            />
          </div>
        </div>

        {/* In Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-700">In Progress</span>
            <span className="text-slate-500 font-medium">
              {inProgressInterviews} ({inProgressPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${inProgressPct}%` }}
            />
          </div>
        </div>

        {/* Draft */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-700">Draft</span>
            <span className="text-slate-500 font-medium">
              {draftInterviews} ({draftPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-500 rounded-full transition-all duration-500"
              style={{ width: `${draftPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
        <span>Total</span>
        <span>{totalInterviews}</span>
      </div>
    </div>
  );
};
