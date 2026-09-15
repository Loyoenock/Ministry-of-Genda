/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Mail, Phone, Building, Save, Check } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, updateProfile, role, switchRole } = useAuth();
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone_number || '+256 772 458 921');
  const [department, setDepartment] = useState(user.department_unit);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      full_name: fullName,
      phone_number: phone,
      department_unit: department,
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interviewer Profile & Credentials</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official accreditation for the MGLSD Current-State Diagnostic field exercise.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
          <img
            src={user.avatar_url}
            alt={user.full_name}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full object-cover ring-4 ring-teal-500/20"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user.full_name}</h2>
            <p className="text-xs text-slate-500">{user.email}</p>
            <div className="mt-1 flex items-center space-x-2">
              <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded-full capitalize">
                {role} Role Active
              </span>
              <span className="text-[11px] text-slate-400">ID: {user.id}</span>
            </div>
          </div>
        </div>

        {savedMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>Profile credentials successfully updated.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
              <input
                type="text"
                disabled
                value={user.email}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department / Outpost</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold flex items-center space-x-2 transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Role Demonstration Switcher Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          <h3 className="font-bold text-sm">Security & Demonstration Persona Switcher</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Switch roles to experience how Row Level Security (RLS) dynamically filters the interface:
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => switchRole('interviewer')}
            className={`p-3 rounded-xl text-left border transition ${
              role === 'interviewer'
                ? 'bg-teal-800/80 border-teal-400 text-white font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <p className="text-xs font-bold">Interviewer Mode (John Okello)</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Views & manages only his assigned interviews.</p>
          </button>

          <button
            onClick={() => switchRole('admin')}
            className={`p-3 rounded-xl text-left border transition ${
              role === 'admin'
                ? 'bg-purple-800/80 border-purple-400 text-white font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <p className="text-xs font-bold">Admin Mode (Florence Nsubuga)</p>
            <p className="text-[11px] text-slate-400 mt-0.5">National oversight, all interviews, analytics & user management.</p>
          </button>
        </div>
      </div>
    </div>
  );
};
