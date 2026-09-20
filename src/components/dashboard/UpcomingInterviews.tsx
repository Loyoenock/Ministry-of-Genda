/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar } from 'lucide-react';
import { UPCOMING_SCHEDULE } from '../../lib/mockData';
import { getTierBadge } from './badgeUtils';
import { InterviewTier } from '../../types';

export interface UpcomingInterviewsProps {
  onNavigate: (view: string) => void;
}

export const UpcomingInterviews: React.FC<UpcomingInterviewsProps> = ({ onNavigate }) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Upcoming Interviews</h3>
        <button
          onClick={() => onNavigate('interviews')}
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
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
  );
};
