/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_CURRENT_USER, ADMIN_USER } from '../lib/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  actualRole: UserRole;
  isAdmin: boolean;
  loading: boolean;
  session: Session | null;
  isDemoMode: boolean;
  isSupabaseConfigured: boolean;
  allUsers: UserProfile[];
  authError: string | null;
  login: (email: string, password?: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, department?: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  demoLogin: (role?: UserRole) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void> | void;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void> | void;
  addNewUser: (newUser: Omit<UserProfile, 'id'>) => Promise<void> | void;
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
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';

  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    // In test environment, keep default John Okello for existing test suite
    if (isTestEnv) {
      return INITIAL_CURRENT_USER;
    }
    // In real Supabase mode, never allow localStorage demo users to override or seed authentication
    if (isSupabaseConfigured) {
      try {
        localStorage.removeItem('mglsd_demo_user');
        localStorage.removeItem('mglsd_active_user_id');
      } catch {
        // storage guard
      }
      return null;
    }
    // In pure demo mode, check saved demo user in localStorage
    const savedDemo = localStorage.getItem('mglsd_demo_user');
    if (savedDemo) {
      try {
        return JSON.parse(savedDemo);
      } catch {
        // ignore parse error
      }
    }
    return null;
  });

  const [actualRole, setActualRole] = useState<UserRole>(() => {
    return currentUser?.role || 'interviewer';
  });

  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    return currentUser?.role || 'interviewer';
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (isTestEnv && !isSupabaseConfigured) return true;
    if (isSupabaseConfigured) return false;
    return true;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (isTestEnv) return false;
    return isSupabaseConfigured;
  });

  const [authError, setAuthError] = useState<string | null>(null);

  // Log clear warning to console when running in demo mode
  useEffect(() => {
    if (isDemoMode && !isTestEnv) {
      console.warn(
        '⚠️ [MGLSD Diagnostic] Application is running in DEMO MODE.\n' +
        'Authentication and persistence are simulated using local in-memory state and browser storage.\n' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to run against real Supabase.'
      );
    }
  }, [isDemoMode, isTestEnv]);

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

  // Sync users to localStorage in demo mode
  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem('mglsd_app_users', JSON.stringify(users));
    }
  }, [users, isDemoMode]);

  // Sync active user to localStorage when in demo mode
  useEffect(() => {
    if (isDemoMode && currentUser) {
      localStorage.setItem('mglsd_demo_user', JSON.stringify(currentUser));
      localStorage.setItem('mglsd_active_user_id', currentUser.id);
    }
  }, [currentUser, isDemoMode]);

  /**
   * Fetch or auto-create profile row from Supabase public.profiles table
   */
  const fetchOrCreateProfile = useCallback(async (authUser: User) => {
    try {
      // 1. Check if profile exists
      const { data: profileRow, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (fetchErr && fetchErr.code !== 'PGRST116') {
        console.warn('Notice: Could not fetch profile from Supabase:', fetchErr.message);
      }

      if (profileRow) {
        const mappedRole = (profileRow.role === 'admin' ? 'admin' : 'interviewer') as UserRole;
        const profile: UserProfile = {
          id: profileRow.id,
          email: profileRow.email,
          full_name: profileRow.full_name,
          role: mappedRole,
          department_unit: profileRow.department_unit || 'Labour Directorate',
          phone_number: profileRow.phone_number || undefined,
          avatar_url:
            profileRow.avatar_url ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        };
        setCurrentUser(profile);
        setActualRole(mappedRole);
        setActiveRole(mappedRole);
      } else {
        // 2. Auto-create profile if missing on first login
        const fallbackName =
          authUser.user_metadata?.full_name ||
          authUser.email?.split('@')[0]?.replace(/[._]/g, ' ') ||
          'Labour Officer';

        const rawRole = authUser.user_metadata?.role;
        const defaultRole: UserRole = rawRole === 'admin' ? 'admin' : 'interviewer';

        const newProfile: UserProfile = {
          id: authUser.id,
          email: authUser.email || '',
          full_name: fallbackName,
          role: defaultRole,
          department_unit: authUser.user_metadata?.department_unit || 'Labour Directorate',
          phone_number: authUser.user_metadata?.phone_number || undefined,
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        };

        const { error: insertErr } = await supabase.from('profiles').insert([
          {
            id: newProfile.id,
            email: newProfile.email,
            full_name: newProfile.full_name,
            role: newProfile.role,
            department_unit: newProfile.department_unit,
            phone_number: newProfile.phone_number || null,
            avatar_url: newProfile.avatar_url || null,
          },
        ]);

        if (insertErr) {
          console.warn('Profile creation fallback warning:', insertErr.message);
        }

        setCurrentUser(newProfile);
        setActualRole(newProfile.role);
        setActiveRole(newProfile.role);
      }

      // Try fetching staff list for User Management
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (allProfiles && allProfiles.length > 0) {
        const mappedProfiles: UserProfile[] = allProfiles.map((p) => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          role: (p.role === 'admin' ? 'admin' : 'interviewer') as UserRole,
          department_unit: p.department_unit || 'Labour Directorate',
          phone_number: p.phone_number || undefined,
          avatar_url: p.avatar_url || undefined,
        }));
        setUsers(mappedProfiles);
      }
    } catch (err) {
      console.error('Error in fetchOrCreateProfile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase Auth listener
  useEffect(() => {
    if (isTestEnv) {
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Check active session on mount
    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession }, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn('Supabase session fetch warning:', error.message);
        }
        setSession(currentSession);
        if (currentSession?.user) {
          setIsDemoMode(false);
          try {
            localStorage.removeItem('mglsd_demo_user');
            localStorage.removeItem('mglsd_active_user_id');
          } catch {
            // guard
          }
          fetchOrCreateProfile(currentSession.user);
        } else {
          // When Supabase is configured, lack of active session means unauthenticated user.
          // Never fall back to or activate a localStorage demo user!
          setCurrentUser(null);
          setIsDemoMode(false);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to get Supabase session:', err);
        setLoading(false);
      });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          setIsDemoMode(false);
          localStorage.removeItem('mglsd_demo_user');
          localStorage.removeItem('mglsd_active_user_id');
          await fetchOrCreateProfile(newSession.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsDemoMode(false);
        localStorage.removeItem('mglsd_demo_user');
        localStorage.removeItem('mglsd_active_user_id');
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchOrCreateProfile, isTestEnv]);

  // Realtime subscription for profile changes (role updates across tabs/browsers)
  useEffect(() => {
    if (!isSupabaseConfigured || isTestEnv || !currentUser) return;

    const channel = supabase
      .channel(`profile-role-changes-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentUser.id}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord && newRecord.role) {
            const mappedRole = (newRecord.role === 'admin' ? 'admin' : 'interviewer') as UserRole;
            setCurrentUser((prev) => (prev ? { ...prev, role: mappedRole } : null));
            setActualRole(mappedRole);
            setActiveRole(mappedRole);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabaseConfigured, isTestEnv, currentUser?.id]);

  /**
   * Real Supabase Sign In (or local fallback in demo mode)
   */
  const login = async (email: string, password?: string): Promise<{ error: any }> => {
    // If real Supabase is configured, require password and authenticate with Supabase Auth
    if (isSupabaseConfigured) {
      if (!password) {
        return { error: new Error('Password is required for Supabase authentication.') };
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          setLoading(false);
          return { error };
        }

        if (data.user) {
          setIsDemoMode(false);
          localStorage.removeItem('mglsd_demo_user');
          localStorage.removeItem('mglsd_active_user_id');
          await fetchOrCreateProfile(data.user);
        }
        return { error: null };
      } catch (err: any) {
        setLoading(false);
        return { error: err };
      }
    }

    // Demo Mode fallback: match mock user or create temporary user
    const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      setCurrentUser(existing);
      setActualRole(existing.role);
      setActiveRole(existing.role);
      setIsDemoMode(true);
      return { error: null };
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email: email.trim(),
      full_name: email.split('@')[0].replace(/[._]/g, ' '),
      role: 'interviewer',
      department_unit: 'Labour Directorate',
      avatar_url: INITIAL_CURRENT_USER.avatar_url,
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setActualRole('interviewer');
    setActiveRole('interviewer');
    setIsDemoMode(true);
    return { error: null };
  };

  /**
   * Real Supabase Sign Up
   */
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    department?: string
  ): Promise<{ error: any }> => {
    if (isSupabaseConfigured) {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              department_unit: department || 'Labour Directorate',
              role: 'interviewer',
            },
          },
        });

        if (error) {
          setLoading(false);
          return { error };
        }

        if (data.user) {
          setIsDemoMode(false);
          localStorage.removeItem('mglsd_demo_user');
          await fetchOrCreateProfile(data.user);
        }
        return { error: null };
      } catch (err: any) {
        setLoading(false);
        return { error: err };
      }
    }

    // Demo Mode sign up
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email: email.trim(),
      full_name: fullName.trim(),
      role: 'interviewer',
      department_unit: department || 'Labour Directorate',
      avatar_url: INITIAL_CURRENT_USER.avatar_url,
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setActualRole('interviewer');
    setActiveRole('interviewer');
    setIsDemoMode(true);
    return { error: null };
  };

  /**
   * Logout from real Supabase or clear demo session
   */
  const logout = async (): Promise<void> => {
    localStorage.removeItem('mglsd_demo_user');
    localStorage.removeItem('mglsd_active_user_id');

    if (isSupabaseConfigured && session) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out warning:', err);
      }
    }

    setCurrentUser(null);
    setSession(null);
    setIsDemoMode(false);
  };

  /**
   * Quick 1-click Demo Login for development testing:
   * Strictly disallowed when running against real Supabase or in production builds.
   */
  const demoLogin = (targetRole: UserRole = 'interviewer') => {
    // In production or when Supabase is configured, block demo login (allow in test env)
    if ((isSupabaseConfigured && !isTestEnv) || (typeof import.meta !== 'undefined' && import.meta.env?.PROD)) {
      console.warn('Security Warning: demoLogin is strictly disabled when Supabase is configured or in production mode.');
      return;
    }
    const selected = targetRole === 'admin' ? ADMIN_USER : INITIAL_CURRENT_USER;
    setCurrentUser(selected);
    setActualRole(selected.role);
    setActiveRole(selected.role);
    setIsDemoMode(true);
    localStorage.setItem('mglsd_demo_user', JSON.stringify(selected));
    localStorage.setItem('mglsd_active_user_id', selected.id);
  };

  /**
   * Role Switcher for previewing RLS perspectives:
   * - In Pure Demo mode (!isSupabaseConfigured or test env): freely switch between Interviewer and Admin personas
   * - When Supabase is configured: non-admin users can NEVER call switchRole('admin') or escalate their role
   * - Only authenticated Admins who signed in through Supabase can toggle between 'admin' and 'interviewer' preview
   * - In production builds with Supabase: role switching is completely disabled
   */
  const switchRole = (newRole: UserRole) => {
    // 1. When Supabase is configured (non-test env):
    if (isSupabaseConfigured && !isTestEnv) {
      // In production builds, completely disable role switching
      if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
        console.warn('Security Notice: Role switching is disabled in production with Supabase configured.');
        return;
      }
      // Strictly prevent non-admins from switching to admin
      if (actualRole !== 'admin') {
        console.warn('Security Violation: Non-admin users cannot switch to admin role when Supabase is configured.');
        return;
      }
      // Legitimate Supabase admins can preview the interviewer perspective
      setActiveRole(newRole);
      if (currentUser) {
        setCurrentUser({ ...currentUser, role: newRole });
      }
      return;
    }

    // 2. Pure demo mode or test environment:
    if (newRole === 'admin') {
      const admin = users.find((u) => u.role === 'admin') || ADMIN_USER;
      setCurrentUser(admin);
      setActualRole('admin');
      setActiveRole('admin');
    } else {
      const interviewer = users.find((u) => u.id === 'usr-john-okello-001') || INITIAL_CURRENT_USER;
      setCurrentUser(interviewer);
      setActualRole('interviewer');
      setActiveRole('interviewer');
    }
  };

  /**
   * Update current user profile
   */
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;

    // Defense-in-depth: Ensure role cannot be altered via self profile updates
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).role;

    const updatedUser = { ...currentUser, ...safeUpdates, role: currentUser.role };
    setCurrentUser(updatedUser);

    if (isSupabaseConfigured && !isDemoMode) {
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: updatedUser.full_name,
            phone_number: updatedUser.phone_number || null,
            department_unit: updatedUser.department_unit,
            avatar_url: updatedUser.avatar_url || null,
          })
          .eq('id', currentUser.id);
      } catch (err) {
        console.error('Error updating profile in Supabase:', err);
      }
    }

    setUsers((all) => all.map((u) => (u.id === currentUser.id ? updatedUser : u)));
  };

  const triggerError = (message: string) => {
    setAuthError(message);
    setTimeout(() => setAuthError(null), 5000);
  };

  /**
   * Administrative role update
   */
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    const prevUsers = users;
    const prevCurrentUser = currentUser;
    const prevActualRole = actualRole;
    const prevActiveRole = activeRole;
    
    console.log('Before update, prevUsers:', prevUsers.map(u => u.role));

    // Optimistic update
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));

    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
      setActualRole(newRole);
      setActiveRole(newRole);
    }

    if (isSupabaseConfigured && actualRole === 'admin') {
      try {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
      } catch (err) {
        console.error('Error updating user role in Supabase:', err);
        
        // Rollback immediately
        setUsers(() => [...prevUsers]);
        setCurrentUser(() => (prevCurrentUser ? { ...prevCurrentUser } : null));
        setActualRole(() => prevActualRole);
        setActiveRole(() => prevActiveRole);
        
        triggerError('Failed to update role – changes reverted');
      }
    } else {
        // Fallback for demo mode
    }
  };

  /**
   * Add new staff member
   */
  const addNewUser = async (newUser: Omit<UserProfile, 'id'>) => {
    const user: UserProfile = {
      ...newUser,
      id: `usr-${Date.now()}`,
    };
    setUsers((prev) => [...prev, user]);
  };

  const effectiveRole = activeRole;
  const isAdmin = effectiveRole === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        role: effectiveRole,
        actualRole,
        isAdmin,
        loading,
        session,
        isDemoMode,
        isSupabaseConfigured,
        allUsers: users,
        login,
        signUp,
        logout,
        switchRole,
        demoLogin,
        updateProfile,
        updateUserRole,
        addNewUser,
        authError,
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
