/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_CURRENT_USER, ADMIN_USER } from '../lib/mockData';

interface AuthContextType {
  user: UserProfile;
  role: UserRole;
  isAdmin: boolean;
  allUsers: UserProfile[];
  login: (email: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  addNewUser: (newUser: Omit<UserProfile, 'id'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_USERS: UserProfile[] = [
  INITIAL_CURRENT_USER,
  ADMIN_USER,
  {
    id: 'usr-charles-003',
    email: 'charles.kato@mglsd.go.ug',
    full_name: 'Charles Kato',
    role: 'interviewer',
    department_unit: 'Labour Inspectorate – Western Region',
    phone_number: '+256 782 119 402',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-mary-004',
    email: 'mary.ayebare@mglsd.go.ug',
    full_name: 'Mary Ayebare',
    role: 'interviewer',
    department_unit: 'OSH Department – Eastern Region',
    phone_number: '+256 752 901 223',
    avatar_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('mglsd_app_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedId = localStorage.getItem('mglsd_active_user_id');
    if (savedId) {
      const found = users.find((u) => u.id === savedId);
      if (found) return found;
    }
    return INITIAL_CURRENT_USER;
  });

  useEffect(() => {
    localStorage.setItem('mglsd_app_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('mglsd_active_user_id', currentUser.id);
  }, [currentUser]);

  const switchRole = (newRole: UserRole) => {
    if (newRole === 'admin') {
      const admin = users.find((u) => u.role === 'admin') || ADMIN_USER;
      setCurrentUser(admin);
    } else {
      const interviewer = users.find((u) => u.id === 'usr-john-okello-001') || INITIAL_CURRENT_USER;
      setCurrentUser(interviewer);
    }
  };

  const login = async (email: string, role: UserRole = 'interviewer') => {
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setCurrentUser(existing);
      return true;
    }
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email,
      full_name: email.split('@')[0].replace('.', ' '),
      role,
      department_unit: 'Labour Directorate',
      avatar_url: INITIAL_CURRENT_USER.avatar_url,
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    return true;
  };

  const logout = () => {
    // Return to default demo interviewer John Okello
    setCurrentUser(INITIAL_CURRENT_USER);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...updates };
      setUsers((all) => all.map((u) => (u.id === prev.id ? updated : u)));
      return updated;
    });
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, role: newRole }));
    }
  };

  const addNewUser = (newUser: Omit<UserProfile, 'id'>) => {
    const user: UserProfile = {
      ...newUser,
      id: `usr-${Date.now()}`,
    };
    setUsers((prev) => [...prev, user]);
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        role: currentUser.role,
        isAdmin: currentUser.role === 'admin',
        allUsers: users,
        login,
        logout,
        switchRole,
        updateProfile,
        updateUserRole,
        addNewUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
