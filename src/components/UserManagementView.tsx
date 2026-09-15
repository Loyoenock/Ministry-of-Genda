/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, UserProfile } from '../types';
import { Users, Shield, UserCheck, Plus, Check, Search, Building } from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { allUsers, updateUserRole, addNewUser, role } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');

  // New user form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('interviewer');
  const [newDept, setNewDept] = useState('Labour Directorate');
  const [newPhone, setNewPhone] = useState('+256 700 000 000');

  const filteredUsers = allUsers.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department_unit.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    addNewUser({
      email: newEmail,
      full_name: newName,
      role: newRole,
      department_unit: newDept,
      phone_number: newPhone,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });
    setShowAddModal(false);
    setNewEmail('');
    setNewName('');
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              System Administration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Interviewer & Staff Access Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage authenticated users, assign regional interviewer roles, and audit security permissions.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Field Interviewer</span>
        </button>
      </div>

      {/* Search and filter */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[40px]"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {filteredUsers.length} total active users
        </span>
      </div>

      {/* Mobile Users Card List */}
      <div className="block md:hidden space-y-3">
        {filteredUsers.map((u) => (
          <div
            key={u.id}
            className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-3">
                <img
                  src={u.avatar_url}
                  alt={u.full_name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{u.full_name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                </div>
              </div>
              <span
                className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  u.role === 'admin'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-teal-100 text-teal-800 border border-teal-200'
                }`}
              >
                {u.role.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Department</span>
                <span className="font-medium text-slate-800 text-[11px]">{u.department_unit}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Phone</span>
                <span className="text-slate-600 text-[11px]">{u.phone_number || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">Access Role:</span>
              <select
                value={u.role}
                onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium outline-none focus:ring-2 focus:ring-teal-500 min-h-[38px]"
              >
                <option value="interviewer">Interviewer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No matching users found.
          </div>
        )}
      </div>

      {/* Desktop Users Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase text-slate-600 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Department / Unit</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Current Role</th>
                <th className="py-3.5 px-4">Access Scope (RLS)</th>
                <th className="py-3.5 px-4 text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={u.avatar_url}
                        alt={u.full_name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{u.full_name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{u.department_unit}</td>
                  <td className="py-3.5 px-4 text-slate-500">{u.phone_number || 'N/A'}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-teal-100 text-teal-800 border border-teal-200'
                      }`}
                    >
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] text-slate-500">
                    {u.role === 'admin' ? (
                      <span className="text-purple-700 font-semibold">
                        Full National Access (View/Edit all, export, users)
                      </span>
                    ) : (
                      <span className="text-teal-700 font-semibold">
                        Assigned Interviews Only (RLS Enforced)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                      className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white font-medium outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="interviewer">Interviewer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Add Field Interviewer</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Christine Akello"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. christine.akello@mglsd.go.ug"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Department / Unit</label>
                <input
                  type="text"
                  placeholder="e.g. Dispute Settlement Unit"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">System Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                >
                  <option value="interviewer">Interviewer (Can conduct assigned interviews)</option>
                  <option value="admin">Administrator (Full oversight)</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium min-h-[42px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 min-h-[42px]"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
