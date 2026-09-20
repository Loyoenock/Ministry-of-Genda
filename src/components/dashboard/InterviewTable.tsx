/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Building,
  MapPin,
  FileCheck,
  FolderOpen,
  CheckSquare,
  Square,
  MoreVertical,
} from 'lucide-react';
import { Interview } from '../../types';
import { getTierBadge, getStatusBadge } from './badgeUtils';
import { EmptyState } from './EmptyState';

export interface InterviewTableProps {
  interviews: Interview[];
  selectedInterviewIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectRow: (id: string) => void;
  onOpenInterview: (interviewId: string) => void;
  onDeleteInterview?: (interviewId: string) => void;
  isAdmin?: boolean;
}

export const InterviewTable: React.FC<InterviewTableProps> = ({
  interviews,
  selectedInterviewIds,
  onToggleSelectAll,
  onToggleSelectRow,
  onOpenInterview,
  onDeleteInterview,
  isAdmin = false,
}) => {
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const isAllSelected =
    interviews.length > 0 && selectedInterviewIds.length === interviews.length;

  return (
    <>
      {/* Mobile Card List (visible on small screens < md) */}
      <div className="block md:hidden divide-y divide-slate-100">
        {interviews.length === 0 ? (
          <EmptyState isTableRow={false} />
        ) : (
          interviews.map((item) => (
            <div key={item.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition">
              {/* Header: Name + Tier */}
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

              {/* Metadata: Organisation & Location */}
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

              {/* Status & Date */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {item.interview_date}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  By: <strong className="text-slate-700 font-semibold">{item.interviewer_name.split(' ')[0]}</strong>
                </span>
              </div>

              {/* Prominent Touch Actions (min 44px height) */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => onOpenInterview(item.id)}
                  className="w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 min-h-[44px] shadow-xs"
                >
                  <FileCheck className="w-4 h-4 text-teal-200" />
                  <span>Diagnostic Form</span>
                </button>
                <button
                  onClick={() => onOpenInterview(item.id)}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 min-h-[44px]"
                >
                  <FolderOpen className="w-4 h-4 text-slate-500" />
                  <span>Checklist / Notes</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop / Tablet Table Content (hidden on small screens < md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600" data-testid="dashboard-interviews-table">
          <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
            <tr>
              <th className="p-3.5 w-10 text-center">
                <button onClick={onToggleSelectAll} className="focus:outline-none">
                  {isAllSelected ? (
                    <CheckSquare className="w-4 h-4 text-teal-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </th>
              <th className="py-3 px-2 w-8">#</th>
              <th className="py-3 px-4">Interviewee</th>
              <th className="py-3 px-4">Organisation / Location</th>
              <th className="py-3 px-4">Tier</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Interviewer</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {interviews.length === 0 ? (
              <EmptyState isTableRow colSpan={9} />
            ) : (
              interviews.map((item, index) => {
                const isSelected = selectedInterviewIds.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    data-testid={`interview-row-${item.id}`}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-teal-50/40' : ''
                    }`}
                  >
                    <td className="p-3.5 text-center">
                      <button onClick={() => onToggleSelectRow(item.id)} className="focus:outline-none">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-2 font-medium text-slate-500">{index + 1}</td>
                    <td className="py-3 px-4">
                      <button
                        data-testid={`open-interview-${item.id}`}
                        onClick={() => onOpenInterview(item.id)}
                        className="text-left font-bold text-slate-900 hover:text-teal-700 transition block"
                      >
                        {item.interviewee_name}
                      </button>
                      <span className="text-[11px] text-slate-500 block">{item.role_title}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{item.department_unit}</span>
                      <span className="text-[11px] text-slate-500 block">{item.location}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getTierBadge(
                          item.tier
                        )}`}
                      >
                        {item.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-800 font-medium block">{item.interview_date}</span>
                      <span className="text-[11px] text-slate-400 block">{item.interview_time}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{item.interviewer_name}</td>
                    <td className="py-3 px-3 text-right relative">
                      <button
                        onClick={() =>
                          setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)
                        }
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openActionMenuId === item.id && (
                        <div className="absolute right-3 top-8 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-40 text-left">
                          <button
                            onClick={() => {
                              onOpenInterview(item.id);
                              setOpenActionMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 font-medium"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                            <span>Open Diagnostic Form</span>
                          </button>
                          <button
                            onClick={() => {
                              onOpenInterview(item.id);
                              setOpenActionMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 font-medium"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                            <span>Checklist & Notes</span>
                          </button>
                          {isAdmin && onDeleteInterview && (
                            <button
                              onClick={() => {
                                onDeleteInterview(item.id);
                                setOpenActionMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2 font-medium border-t border-slate-100 mt-1"
                            >
                              <span>Delete Interview</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};
