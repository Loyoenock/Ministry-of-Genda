/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Clock, MapPin, ChevronRight, User } from 'lucide-react';
import { useUpcomingInterviews } from '../../hooks/useUpcomingInterviews';
import { getTierBadge } from './badgeUtils';
import { InterviewTier } from '../../types';

export interface UpcomingInterviewsProps {
  onNavigate: (view: string) => void;
  onOpenInterview: (interviewId: string) => void;
  onOpenNewInterview?: () => void;
}

export const UpcomingInterviews: React.FC<UpcomingInterviewsProps> = ({
  onNavigate,
  onOpenInterview,
  onOpenNewInterview,
}) => {
  const upcomingList = useUpcomingInterviews();
  const displayList = upcomingList.slice(0, 5);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Upcoming Interviews</h3>
          <p className="text-[11px] text-slate-500">Live scheduled sessions</p>
        </div>
        <button
          onClick={() => onNavigate('calendar')}
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer flex items-center space-x-1"
        >
          <span>View calendar</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {displayList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 my-auto">
          <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-2">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-800">No upcoming interviews scheduled</p>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-[200px]">
            Schedule a new interview to populate your active schedule and calendar.
          </p>
          {onOpenNewInterview && (
            <button
              onClick={onOpenNewInterview}
              className="mt-3 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition shadow-xs"
            >
              Schedule Interview
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 overflow-y-auto max-h-[340px] pr-1">
          {displayList.map((interview) => (
            <div
              key={interview.id}
              onClick={() => onOpenInterview(interview.id)}
              className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/60 hover:bg-teal-50/40 hover:border-teal-300 transition cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-start space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-teal-700 shrink-0 mt-0.5 group-hover:border-teal-400 group-hover:bg-teal-50 transition">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-teal-900 transition">
                    {interview.interviewee_name}
                  </p>
                  <p className="text-[11px] text-slate-600 truncate">
                    {interview.role_title} • <span className="text-teal-700 font-medium">{interview.department_unit}</span>
                  </p>
                  <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{interview.interview_date}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{interview.interview_time}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-1.5 shrink-0 ml-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierBadge(
                    interview.tier as InterviewTier
                  )}`}
                >
                  {interview.tier}
                </span>
                <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  {interview.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
