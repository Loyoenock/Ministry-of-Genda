/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, UserPlus, Check, ChevronRight, HelpCircle, Building2, Briefcase, MapPin, Calendar, Clock } from 'lucide-react';
import { InterviewTier, Interview } from '../types';
import { useAuth } from '../context/AuthContext';
import { useInterviews } from '../context/InterviewContext';

interface NewInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInterviewCreated: (interview: Interview) => void;
}

export const NewInterviewModal: React.FC<NewInterviewModalProps> = ({
  isOpen,
  onClose,
  onInterviewCreated,
}) => {
  const { user, allUsers, isAdmin } = useAuth();
  const { createInterview } = useInterviews();

  const [intervieweeName, setIntervieweeName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [departmentUnit, setDepartmentUnit] = useState('Labour Directorate');
  const [yearsInRole, setYearsInRole] = useState('2.5');
  const [tier, setTier] = useState<InterviewTier>('Management');
  const [interviewDate, setInterviewDate] = useState('16 Sep 2025');
  const [interviewTime, setInterviewTime] = useState('10:00 AM');
  const [location, setLocation] = useState('Ministry Headquarters, Kampala');
  const [assignedInterviewerId, setAssignedInterviewerId] = useState(user.id);
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const tierInfo: Record<
    InterviewTier,
    { title: string; subtitle: string; sections: string; badgeColor: string }
  > = {
    Leadership: {
      title: 'Leadership',
      subtitle: 'Minister / Permanent Secretary / Commissioners / Statutory Board Chairs',
      sections: 'Sections A, B, D, G, H (Strategy, Governance, HR, Stakeholders, Reforms)',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    Management: {
      title: 'Management',
      subtitle: 'Head of Department / Head of Unit / Principal Labour Officers',
      sections: 'Sections A (context), B, C, D, E, F, G, H (Comprehensive Operational Scope)',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    Frontline: {
      title: 'Frontline Staff',
      subtitle: 'Field Labour Inspectors, Dispute Mediators, OSH Officers, District Officers',
      sections: 'Sections C, E, F, H (Core Workflows, Field Tools, Bottlenecks & Reforms)',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    },
    'Support/IT': {
      title: 'Support / IT / Records',
      subtitle: 'Systems Administrators, Database Leads, Records Officers, Network Support',
      sections: 'Sections E, G, H + Live System Walkthrough (W1–W4 Live Demos)',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intervieweeName.trim()) {
      setValidationError('Please provide the Interviewee Name.');
      return;
    }
    if (!roleTitle.trim()) {
      setValidationError('Please provide the Role / Title.');
      return;
    }

    const assignedInterviewer = allUsers.find((u) => u.id === assignedInterviewerId) || user;

    const newInterview = createInterview({
      interviewee_name: intervieweeName.trim(),
      role_title: roleTitle.trim(),
      department_unit: departmentUnit.trim(),
      years_in_role: parseFloat(yearsInRole) || 1.0,
      interview_date: interviewDate,
      interview_time: interviewTime,
      location: location.trim(),
      interviewer_id: assignedInterviewer.id,
      interviewer_name: assignedInterviewer.full_name,
      tier,
      status: 'Draft',
      duration_min: 60,
    });

    onInterviewCreated(newInterview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0b132b] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Schedule New Diagnostic Interview</h2>
              <p className="text-xs text-slate-300">
                TRANSFORMATIVE Programme • MGLSD Labour Directorate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {validationError}
            </div>
          )}

          {/* Interviewee Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Interviewee Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Tumuhimbise"
                  value={intervieweeName}
                  onChange={(e) => {
                    setIntervieweeName(e.target.value);
                    setValidationError('');
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  Role / Official Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commissioner for Labour"
                  value={roleTitle}
                  onChange={(e) => {
                    setRoleTitle(e.target.value);
                    setValidationError('');
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  Department / Unit / Office
                </label>
                <input
                  type="text"
                  placeholder="e.g. Department of OSH"
                  value={departmentUnit}
                  onChange={(e) => setDepartmentUnit(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  Years in Current Role
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={yearsInRole}
                  onChange={(e) => setYearsInRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tier Selection - Core Dynamic Form Driver */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Interview Tier (Governs Dynamic Questions) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-teal-700 font-medium">Automatic section routing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(['Leadership', 'Management', 'Frontline', 'Support/IT'] as InterviewTier[]).map((t) => {
                const info = tierInfo[t];
                const isSelected = tier === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`p-3 text-left rounded-xl border-2 transition-all flex flex-col justify-between relative ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{info.title}</span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{info.subtitle}</p>
                    <div className="mt-2 text-[10px] font-medium text-teal-800 bg-teal-100/60 rounded px-2 py-0.5 w-fit">
                      {info.sections}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scheduling & Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              3. Logistics & Assignment
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">Date</label>
                <input
                  type="text"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">Time</label>
                <input
                  type="text"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="mt-3">
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  Assign Interviewer (Admin override)
                </label>
                <select
                  value={assignedInterviewerId}
                  onChange={(e) => setAssignedInterviewerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role}) — {u.department_unit}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition flex items-center space-x-1.5"
            >
              <span>Initialize Diagnostic Interview</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
