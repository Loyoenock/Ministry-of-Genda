/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, ChevronDown, ShieldCheck, UserCheck, LogOut, Sparkles, CheckCircle2, Menu, X } from 'lucide-react';

interface HeaderProps {
  onNavigate: (view: string) => void;
  onToggleMobileNav?: () => void;
  isMobileNavOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onToggleMobileNav,
  isMobileNavOpen = false,
}) => {
  const { user, role, actualRole, switchRole, logout, isDemoMode, isSupabaseConfigured } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-[#0b132b] text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 h-16">
        {/* Left: Hamburger (mobile/tablet) + Uganda Coat of Arms + Ministry Branding */}
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0">
          {/* Hamburger Menu button for mobile and tablet portrait */}
          {onToggleMobileNav && (
            <button
              onClick={onToggleMobileNav}
              type="button"
              aria-label={isMobileNavOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center transition shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {isMobileNavOpen ? (
                <X className="w-5 h-5 text-teal-400" />
              ) : (
                <Menu className="w-5 h-5 text-slate-300" />
              )}
            </button>
          )}

          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            {/* Official Coat of Arms of Uganda Logo */}
            <img
              src="/Coat_of_arms_of_Uganda.svg"
              alt="Coat of Arms of Uganda"
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain shrink-0 drop-shadow select-none"
            />

            <div className="min-w-0">
              <h1 className="font-bold text-xs sm:text-sm tracking-tight text-white leading-tight truncate">
                <span className="sm:hidden">MGLSD Labour Directorate</span>
                <span className="hidden sm:inline">Ministry of Gender, Labour and Social Development</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-amber-400 font-semibold tracking-wider uppercase truncate">
                UGANDA <span className="sm:hidden text-emerald-400 font-normal ml-1">• Phase 1</span>
              </p>
            </div>
          </div>

          <div className="hidden lg:block h-7 w-px bg-slate-700 shrink-0" />

          {/* TRANSFORMATIVE Programme Subtitle (Desktop / Large screen) */}
          <div className="hidden lg:block shrink-0">
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
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setDropdownOpen(false);
              }}
              className="p-2.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition relative focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0b132b] animate-pulse" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-2xl border border-slate-200 py-2 text-slate-800 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
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
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setShowNotifications(false);
              }}
              data-testid="header-user-menu-btn"
              aria-label="User profile and role menu"
              className="flex items-center space-x-1.5 sm:space-x-2.5 p-1 rounded-lg hover:bg-slate-800/80 transition focus:outline-none min-h-[44px]"
            >
              <img
                src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user.full_name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
              />
              <div className="text-left hidden md:block max-w-[140px] truncate" data-testid="header-user-role-badge">
                <div className="text-xs font-semibold text-white flex items-center space-x-1.5 truncate">
                  <span className="truncate">{user.full_name.split(' ')[0]}</span>
                  {role === 'admin' ? (
                    <span className="bg-purple-900/60 text-purple-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-purple-500/40 shrink-0">
                      ADMIN
                    </span>
                  ) : (
                    <span className="bg-teal-900/60 text-teal-300 text-[10px] font-medium px-1.5 py-0.2 rounded border border-teal-500/40 shrink-0">
                      Interviewer
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 capitalize truncate">{role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-2xl border border-slate-200 py-2 text-slate-800 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{user.department_unit}</p>
                </div>

                {/* Role Switcher or Role Display */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>{isSupabaseConfigured && actualRole !== 'admin' ? 'Account Role' : 'Active Role'}</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                      {isSupabaseConfigured ? 'Verified' : 'RLS Active'}
                    </span>
                  </div>

                  {isSupabaseConfigured && actualRole !== 'admin' ? (
                    <div className="flex items-center space-x-2 py-1.5 px-2 bg-teal-50 border border-teal-100 rounded-lg">
                      <UserCheck className="w-4 h-4 text-teal-700 shrink-0" />
                      <span className="text-xs font-semibold text-teal-900">Interviewer Access</span>
                      <span className="text-[10px] text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded ml-auto">Standard</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        data-testid="header-switch-role-interviewer"
                        onClick={() => {
                          switchRole('interviewer');
                          setDropdownOpen(false);
                        }}
                        className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition min-h-[38px] ${
                          role === 'interviewer'
                            ? 'bg-teal-700 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Interviewer</span>
                      </button>
                      <button
                        data-testid="header-switch-role-admin"
                        onClick={() => {
                          switchRole('admin');
                          setDropdownOpen(false);
                        }}
                        className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition min-h-[38px] ${
                          role === 'admin'
                            ? 'bg-purple-700 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Admin</span>
                      </button>
                    </div>
                  )}

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
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between min-h-[40px]"
                  >
                    <span>My Profile & Credentials</span>
                  </button>
                  {role === 'admin' && (
                    <button
                      data-testid="header-user-management-btn"
                      onClick={() => {
                        onNavigate('admin-users');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-purple-700 font-medium flex items-center justify-between min-h-[40px]"
                    >
                      <span>User Management</span>
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-100 px-4 pt-2 pb-1 space-y-1">
                  <button
                    data-testid="header-sign-out-btn"
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold flex items-center space-x-1.5 w-full px-2 py-2 rounded-lg min-h-[36px] transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                  {isDemoMode && (
                    <button
                      onClick={() => {
                        switchRole('interviewer');
                        setDropdownOpen(false);
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center space-x-1.5 w-full px-2 py-1.5 min-h-[30px]"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Reset to John Okello</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

