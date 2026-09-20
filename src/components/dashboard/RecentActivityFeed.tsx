/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Play, FileText } from 'lucide-react';
import { RecentActivityItem } from '../../types';

export interface RecentActivityFeedProps {
  recentActivities: RecentActivityItem[];
  onNavigate: (view: string) => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  recentActivities,
  onNavigate,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
      <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Activity</h3>

      <div className="space-y-3.5">
        {recentActivities.slice(0, 3).map((act) => {
          let Icon = CheckCircle2;
          let iconBg = 'bg-emerald-100 text-emerald-700';
          if (act.type === 'started') {
            Icon = Play;
            iconBg = 'bg-blue-100 text-blue-700';
          } else if (act.type === 'document') {
            Icon = FileText;
            iconBg = 'bg-teal-100 text-teal-700';
          }

          return (
            <div key={act.id} className="flex items-start space-x-3">
              <div
                className={`w-7 h-7 rounded-full ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-800 font-medium leading-tight">
                  {act.description}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{act.timestamp}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 text-right">
        <button
          onClick={() => onNavigate('notes')}
          className="text-[11px] font-semibold text-teal-700 hover:text-teal-800"
        >
          View full activity log →
        </button>
      </div>
    </div>
  );
};
