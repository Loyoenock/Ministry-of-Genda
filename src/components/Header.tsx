/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, ChevronDown, ShieldCheck, UserCheck, LogOut, Sparkles, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { user, role, switchRole, allUsers, login } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="bg-[#0b132b] text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Left: Uganda Coat of Arms and Ministry Branding */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-3">
            {/* Stylized Uganda Coat of Arms Crest */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 via-red-600 to-black p-0.5 shadow flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0b132b] rounded-full flex items-center justify-center p-1">
                <svg viewBox="0 0 100 100" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 10 L80 30 L80 65 L50 90 L20 65 L20 30 Z" fill="#D97706" stroke="#FEF3C7" strokeWidth="3" />
                  <path d="M50 20 L70 35 L70 60 L50 78 L30 60 L30 35 Z" fill="#DC2626" />
                  <circle cx="50" cy="48" r="10" fill="#1E293B" stroke="#FDE047" strokeWidth="2" />
                  <path d="M47 43 L53 43 L50 53 Z" fill="#FDE047" />
                  <rect x="25" y="85" width="50" height="5" rx="2" fill="#FDE047" />
                </svg>
              </div>
            </div>

            <div>
              <h1 className="font-bold text-xs sm:text-sm tracking-tight text-white leading-tight">
                Ministry of Gender, Labour and Social Development
              </h1>
              <p className="text-[10px] sm:text-xs text-amber-400 font-semibold tracking-wider uppercase">
                UGANDA
              </p>
            </div>
          </div>

          <div className="hidden md:block h-7 w-px bg-slate-700" />

          {/* TRANSFORMATIVE Programme Subtitle */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-xs text-emerald-400 tracking-wide">
                TRANSFORMATIVE Programme
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                Phase 1
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Current-State Diagnostic Interview Application
            </p>
          </div>
        </div>

        {/* Right: Notifications, Role Pill & User Profile */}
        <div className="flex items-center space-x-3 sm:space-x-5">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition relative focus:outline-none"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0b132b] animate-pulse" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 py-2 text-slate-800 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900">System Notifications</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">3 New</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  <div className="px-4 py-2.5 hover:bg-slate-50 text-xs">
                    <p className="font-medium text-slate-800">Interview Scheduled</p>
                    <p className="text-slate-500 text-[11px]">Labour Directorate session confirmed for today at 2:30 PM.</p>
                    <span className="text-[10px] text-slate-400">10 mins ago</span>
                  </div>
                  <div className="px-4 py-2.5 hover:bg-slate-50 text-xs">
                    <p className="font-medium text-slate-800">Document Uploaded</p>
                    <p className="text-slate-500 text-[11px]">Strategic Plan 2020-2025 verified by Registry.</p>
                    <span className="text-[10px] text-slate-400">2 hours ago</span>
                  </div>
                  <div className="px-4 py-2.5 hover:bg-slate-50 text-xs">
                    <p className="font-medium text-slate-800">Diagnostic Sync</p>
                    <p className="text-slate-500 text-[11px]">Master catalogue v2.4 initialized with 56 diagnostic questions.</p>
                    <span className="text-[10px] text-slate-400">1 day ago</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Role Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 sm:space-x-3 p-1.5 rounded-lg hover:bg-slate-800/80 transition focus:outline-none"
            >
              <img
                src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user.full_name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/40"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                  <span>{user.full_name}</span>
                  {role === 'admin' ? (
                    <span className="bg-purple-900/60 text-purple-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-purple-500/40">
                      ADMIN
                    </span>
                  ) : (
                    <span className="bg-teal-900/60 text-teal-300 text-[10px] font-medium px-1.5 py-0.2 rounded border border-teal-500/40">
                      Interviewer
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 capitalize">{role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 text-slate-800 z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{user.department_unit}</p>
                </div>

                {/* Role Switcher */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Active Role</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                      RLS Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        switchRole('interviewer');
                        setDropdownOpen(false);
                      }}
                      className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                        role === 'interviewer'
                          ? 'bg-teal-700 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Interviewer</span>
                    </button>
                    <button
                      onClick={() => {
                        switchRole('admin');
                        setDropdownOpen(false);
                      }}
                      className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                        role === 'admin'
                          ? 'bg-purple-700 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    {role === 'interviewer'
                      ? '• Interviewers only see & edit their assigned interviews.'
                      : '• Admins can view all interviews, manage users & access national analytics.'}
                  </p>
                </div>

                {/* Navigation options */}
                <div className="py-1 text-xs">
                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>My Profile & Credentials</span>
                  </button>
                  {role === 'admin' && (
                    <button
                      onClick={() => {
                        onNavigate('admin-users');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-purple-700 font-medium flex items-center justify-between"
                    >
                      <span>User Management</span>
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-100 px-4 pt-2 pb-1">
                  <button
                    onClick={() => {
                      switchRole('interviewer');
                      setDropdownOpen(false);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center space-x-1.5 w-full py-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Reset to John Okello</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
