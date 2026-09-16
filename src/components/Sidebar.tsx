/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  FileText,
  FileEdit,
  User,
  HelpCircle,
  BarChart3,
  Users,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewInterview: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewInterview,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { role, isAdmin } = useAuth();

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'interviews', label: 'Interviews', icon: ClipboardList },
    {
      id: 'new-interview',
      label: 'New Interview',
      icon: PlusCircle,
      action: onOpenNewInterview,
    },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'notes', label: 'Notes', icon: FileEdit },
  ];

  const adminItems = [
    { id: 'admin-analytics', label: 'Analytics Report', icon: BarChart3 },
    { id: 'admin-users', label: 'User Management', icon: Users },
  ];

  const bottomItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const handleItemClick = (id: string, action?: () => void) => {
    if (action) {
      action();
    } else {
      onSelectTab(id);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderNavContent = (isDrawer = false) => (
    <div className="flex flex-col justify-between h-full">
      <div className="py-4 px-3 overflow-y-auto">
        {/* Mobile Drawer Top Banner */}
        {isDrawer && (
          <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <img
                src="/Coat_of_arms_of_Uganda.svg"
                alt="Coat of Arms of Uganda"
                className="w-8 h-8 object-contain shrink-0 drop-shadow"
              />
              <div>
                <p className="font-bold text-xs text-white">MGLSD Navigation</p>
                <p className="text-[10px] text-amber-400 font-semibold tracking-wider">UGANDA</p>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 min-w-[44px] min-h-[44px] flex items-center justify-center transition"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id, item.action)}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600/90 to-teal-700/80 text-white font-semibold shadow-md shadow-teal-900/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-teal-200' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Admin Navigation Section */}
        {isAdmin && (
          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">
              National Oversight (Admin)
            </p>
            <div className="space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                      isActive
                        ? 'bg-purple-700 text-white font-semibold shadow-md shadow-purple-950/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive ? 'text-purple-200' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="my-4 border-t border-slate-800/80" />

        {/* Profile and Support */}
        <div className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-teal-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Transformed Uganda Branding */}
      <div className="p-4 border-t border-slate-800/60 bg-[#060c1b] shrink-0">
        <div className="flex items-center space-x-3">
          <img
            src="/Coat_of_arms_of_Uganda.svg"
            alt="National Coat of Arms"
            className="w-8 h-8 object-contain shrink-0 drop-shadow select-none"
          />
          <div>
            <p className="text-xs font-bold text-slate-200 leading-tight">
              Better Systems
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">
              Stronger Services
            </p>
            <p className="text-[10px] text-emerald-400 font-semibold tracking-tight">
              A Transformed Uganda
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop & Tablet Landscape Persistent Sidebar */}
      <aside className="hidden lg:flex w-60 xl:w-64 bg-[#091124] text-slate-300 flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800/80">
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile & Tablet Portrait Off-Canvas Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Drawer Surface */}
          <div className="relative w-72 sm:w-80 max-w-[85vw] bg-[#091124] text-slate-300 flex flex-col justify-between shadow-2xl z-50 animate-in slide-in-from-left duration-250 border-r border-slate-800">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
