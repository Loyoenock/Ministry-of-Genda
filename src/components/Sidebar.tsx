/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewInterview: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewInterview,
}) => {
  const { role, isAdmin } = useAuth();

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

  return (
    <aside className="w-64 bg-[#091124] text-slate-300 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800/80">
      <div className="py-5 px-3">
        {/* Navigation Items */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    onSelectTab(item.id);
                  }
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600/90 to-teal-700/80 text-white font-semibold shadow-md shadow-teal-900/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isActive ? 'text-teal-200' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Admin Navigation Section */}
        {isAdmin && (
          <div className="mt-6 pt-4 border-t border-slate-800">
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
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-purple-700 text-white font-semibold shadow-md shadow-purple-950/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        isActive ? 'text-purple-200' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="my-5 border-t border-slate-800/80" />

        {/* Profile and Support */}
        <div className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isActive ? 'text-teal-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Transformed Uganda Branding */}
      <div className="p-4 border-t border-slate-800/60 bg-[#060c1b]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center p-1.5 shadow-sm shrink-0">
            <Layers className="w-5 h-5 text-slate-950 font-bold" />
          </div>
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
    </aside>
  );
};
