/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, UserProfile } from '../types';
import {
  Users,
  Shield,
  UserCheck,
  Plus,
  Check,
  Search,
  Building,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const {
    allUsers,
    user: currentUser,
    updateUserRole,
    addNewUser,
    adminUpdateUser,
    adminDeleteUser,
    authError,
  } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'interviewer' | 'admin'>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // New user form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('interviewer');
  const [newDept, setNewDept] = useState('Labour Directorate');
  const [newPhone, setNewPhone] = useState('');

  // Edit user form state
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('interviewer');
  const [editDept, setEditDept] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const triggerFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department_unit.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    await addNewUser({
      email: newEmail.trim(),
      full_name: newName.trim(),
      role: newRole,
      department_unit: newDept.trim() || 'Labour Directorate',
      phone_number: newPhone.trim() || undefined,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });

    setShowAddModal(false);
    setNewEmail('');
    setNewName('');
    setNewPhone('');
    triggerFeedback(`User ${newName.trim()} created successfully.`);
  };

  const handleOpenEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.full_name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditDept(user.department_unit || 'Labour Directorate');
    setEditPhone(user.phone_number || '');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim() || !editEmail.trim()) return;

    const res = await adminUpdateUser(editingUser.id, {
      full_name: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
      department_unit: editDept.trim() || 'Labour Directorate',
      phone_number: editPhone.trim() || undefined,
    });

    if (!res?.error) {
      triggerFeedback(`User profile for ${editName.trim()} updated successfully.`);
      setEditingUser(null);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    const userName = deletingUser.full_name;

    const res = await adminDeleteUser(deletingUser.id);
    if (!res?.error) {
      triggerFeedback(`User ${userName} deleted successfully.`);
      setDeletingUser(null);
    }
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

        <div className="flex flex-col sm:items-end gap-2">
          <button
            data-testid="add-user-btn"
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs min-h-[42px] bg-teal-700 hover:bg-teal-800 text-white"
          >
            <Plus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Action / Error Banners */}
      {feedbackMessage && (
        <div
          data-testid="user-management-feedback"
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between animate-in fade-in"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {authError && (
        <div
          data-testid="user-management-error"
          className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs flex items-center justify-between animate-in fade-in"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">{authError}</span>
          </div>
        </div>
      )}

      {/* Search and Role Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              data-testid="user-search-input"
              type="text"
              placeholder="Search by name, email or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[40px]"
            />
          </div>

          <select
            data-testid="user-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full sm:w-auto text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-teal-500 min-h-[40px]"
          >
            <option value="all">All Access Roles</option>
            <option value="interviewer">Interviewers Only</option>
            <option value="admin">Administrators Only</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium shrink-0">
          {filteredUsers.length} total active users
        </span>
      </div>

      {/* Mobile Users Card List */}
      <div className="block md:hidden space-y-3">
        {filteredUsers.map((u) => (
          <div
            key={u.id}
            data-testid={`user-card-${u.id}`}
            className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-3">
                <img
                  src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
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

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-2">
                <select
                  value={u.role}
                  onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                  className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-medium outline-none focus:ring-2 focus:ring-teal-500 min-h-[36px]"
                >
                  <option value="interviewer">Interviewer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  data-testid={`edit-user-btn-${u.id}`}
                  onClick={() => handleOpenEditModal(u)}
                  className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition"
                  title="Edit user"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  data-testid={`delete-user-btn-${u.id}`}
                  onClick={() => setDeletingUser(u)}
                  disabled={currentUser?.id === u.id}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                  title={currentUser?.id === u.id ? "Cannot delete your own account" : "Delete user"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
                <th className="py-3.5 px-4 text-center">Quick Role</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} data-testid={`user-row-${u.id}`} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
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
                  <td className="py-3.5 px-4 text-center">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                      className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white font-medium outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="interviewer">Interviewer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        data-testid={`edit-user-btn-${u.id}`}
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
                        title="Edit user profile"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        data-testid={`delete-user-btn-${u.id}`}
                        onClick={() => setDeletingUser(u)}
                        disabled={currentUser?.id === u.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title={currentUser?.id === u.id ? "Cannot delete your active account" : "Delete user"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No matching users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New User</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  data-testid="create-user-fullname"
                  type="text"
                  required
                  placeholder="e.g. Christine Akello"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Official Email <span className="text-red-500">*</span>
                </label>
                <input
                  data-testid="create-user-email"
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
                  data-testid="create-user-dept"
                  type="text"
                  placeholder="e.g. Dispute Settlement Unit"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Contact Phone Number</label>
                <input
                  data-testid="create-user-phone"
                  type="text"
                  placeholder="e.g. +256 700 000 000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">System Role</label>
                <select
                  data-testid="create-user-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                >
                  <option value="interviewer">Interviewer (Can conduct assigned interviews)</option>
                  <option value="admin">Administrator (Full oversight)</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2 pt-3 border-t border-slate-100">
                <button
                  data-testid="create-user-cancel-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium min-h-[42px]"
                >
                  Cancel
                </button>
                <button
                  data-testid="create-user-submit-btn"
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit User Details</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name</label>
                <input
                  data-testid="edit-user-fullname"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Official Email</label>
                <input
                  data-testid="edit-user-email"
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Department / Unit</label>
                <input
                  data-testid="edit-user-dept"
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Contact Phone Number</label>
                <input
                  data-testid="edit-user-phone"
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">System Role</label>
                <select
                  data-testid="edit-user-role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                >
                  <option value="interviewer">Interviewer (Can conduct assigned interviews)</option>
                  <option value="admin">Administrator (Full oversight)</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2 pt-3 border-t border-slate-100">
                <button
                  data-testid="edit-user-cancel-btn"
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-full sm:w-auto px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium min-h-[42px]"
                >
                  Cancel
                </button>
                <button
                  data-testid="edit-user-submit-btn"
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 min-h-[42px]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-3 text-red-600 border-b border-slate-100 pb-3">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete User Account</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{deletingUser.full_name}</strong> ({deletingUser.email})? This action will remove the user's profile and revoke access to the diagnostic workspace.
            </p>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2 pt-2">
              <button
                data-testid="cancel-delete-user-btn"
                type="button"
                onClick={() => setDeletingUser(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-xs min-h-[42px]"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-delete-user-btn"
                onClick={handleConfirmDeleteUser}
                className="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 text-xs min-h-[42px]"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
