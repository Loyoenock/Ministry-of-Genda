/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_CURRENT_USER, ADMIN_USER } from '../lib/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { mapSignInError, mapSignUpError, AuthErrorCode } from '../lib/authErrorMapper';
import { isAllowedEmail, UNAUTHORIZED_DOMAIN_MESSAGE } from '../lib/validation';

export interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  actualRole: UserRole;
  isAdmin: boolean;
  loading: boolean;
  session: Session | null;
  isSupabaseConfigured: boolean;
  allUsers: UserProfile[];
  authError: string | null;
  login: (email: string, password?: string) => Promise<{ error: any; code?: AuthErrorCode }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    department?: string
  ) => Promise<{ error: any; needsConfirmation?: boolean; code?: AuthErrorCode }>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void> | void;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void> | void;
  addNewUser: (newUser: Omit<UserProfile, 'id'>) => Promise<void> | void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Minimal test fixtures kept exclusively for automated test suite isolation
const TEST_USERS: UserProfile[] = [
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
    return null;
  });

  const [actualRole, setActualRole] = useState<UserRole>(() => {
    return currentUser?.role || 'interviewer';
  });

  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    return currentUser?.role || 'interviewer';
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (isTestEnv) return false;
    return isSupabaseConfigured;
  });

  const [authError, setAuthError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserProfile[]>(() => {
    if (isTestEnv) {
      return TEST_USERS;
    }
    return [];
  });

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
          console.error('[profiles] insert failed', insertErr);
          // Re-select row in case trigger won the race or row already exists
          const { data: retryRow } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (retryRow) {
            const mappedRole = (retryRow.role === 'admin' ? 'admin' : 'interviewer') as UserRole;
            const profile: UserProfile = {
              id: retryRow.id,
              email: retryRow.email,
              full_name: retryRow.full_name,
              role: mappedRole,
              department_unit: retryRow.department_unit || 'Labour Directorate',
              phone_number: retryRow.phone_number || undefined,
              avatar_url: retryRow.avatar_url || undefined,
            };
            setCurrentUser(profile);
            setActualRole(mappedRole);
            setActiveRole(mappedRole);
          } else {
            setCurrentUser(newProfile);
            setActualRole(newProfile.role);
            setActiveRole(newProfile.role);
          }
        } else {
          setCurrentUser(newProfile);
          setActualRole(newProfile.role);
          setActiveRole(newProfile.role);
        }
      }

      // Fetch staff list for User Management
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
      if (authUser) {
        const fallbackProfile: UserProfile = {
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || 'Labour Officer',
          role: 'interviewer',
          department_unit: authUser.user_metadata?.department_unit || 'Labour Directorate',
        };
        setCurrentUser(fallbackProfile);
      }
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
          fetchOrCreateProfile(currentSession.user);
        } else {
          // When Supabase is configured, lack of active session means unauthenticated user
          setCurrentUser(null);
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
          await fetchOrCreateProfile(newSession.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setActualRole('interviewer');
        setActiveRole('interviewer');
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchOrCreateProfile, isTestEnv]);

  // Realtime subscription for profile changes (role and profile updates across tabs/browsers)
  useEffect(() => {
    if (!isSupabaseConfigured || isTestEnv || !currentUser) return;

    const channel = supabase
      .channel(`profile-changes-${currentUser.id}`)
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
          if (newRecord) {
            const mappedRole = (newRecord.role === 'admin' ? 'admin' : 'interviewer') as UserRole;
            setCurrentUser((prev) => (prev ? {
              ...prev,
              ...newRecord,
              role: mappedRole,
            } : null));
            if (newRecord.role) {
              setActualRole(mappedRole);
              setActiveRole(mappedRole);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabaseConfigured, isTestEnv, currentUser?.id]);

  /**
   * Real Supabase Sign In
   */
  const login = async (email: string, password?: string): Promise<{ error: any; code?: AuthErrorCode }> => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password?.trim() || '';

    if (!trimmedEmail) {
      const err = new Error('Please enter your email address.');
      setAuthError(err.message);
      return { error: err, code: 'INVALID_EMAIL' };
    }
    if (!isAllowedEmail(trimmedEmail)) {
      const err = new Error(UNAUTHORIZED_DOMAIN_MESSAGE);
      setAuthError(err.message);
      return { error: err, code: 'INVALID_EMAIL' };
    }
    if (!trimmedPassword) {
      const err = new Error('Please enter your account password.');
      setAuthError(err.message);
      return { error: err, code: 'INVALID_CREDENTIALS' };
    }

    setAuthError(null);

    if (!isSupabaseConfigured) {
      const err = new Error('Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
      setAuthError(err.message);
      return { error: err, code: 'INVALID_CREDENTIALS' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error) {
        setLoading(false);
        const mapped = mapSignInError(error);
        setAuthError(mapped.message);
        return { error: new Error(mapped.message), code: mapped.code };
      }

      if (!data.session || !data.user) {
        setLoading(false);
        const err = new Error('Sign-in succeeded but no session was established. Please try again or contact support.');
        setAuthError(err.message);
        return { error: err, code: 'INVALID_CREDENTIALS' };
      }

      try {
        await fetchOrCreateProfile(data.user);
      } catch (profileErr) {
        console.error('fetchOrCreateProfile error during login:', profileErr);
      }

      if (data.user) {
        const minimalProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email || trimmedEmail,
          full_name: data.user.user_metadata?.full_name || 'Labour Officer',
          role: 'interviewer',
          department_unit: data.user.user_metadata?.department_unit || 'Labour Directorate',
        };
        setCurrentUser((prev) => prev || minimalProfile);
      }

      setLoading(false);
      setAuthError(null);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      const mapped = mapSignInError(err);
      setAuthError(mapped.message);
      return { error: new Error(mapped.message), code: mapped.code };
    }
  };

  /**
   * Real Supabase Sign Up
   */
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    department?: string
  ): Promise<{ error: any; needsConfirmation?: boolean; code?: AuthErrorCode }> => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedEmail) {
      const err = new Error('Please enter your email address.');
      setAuthError(err.message);
      return { error: err, code: 'INVALID_EMAIL' };
    }

    if (!isAllowedEmail(trimmedEmail)) {
      const err = new Error(UNAUTHORIZED_DOMAIN_MESSAGE);
      setAuthError(err.message);
      return { error: err, code: 'INVALID_EMAIL' };
    }

    if (!trimmedFullName) {
      const err = new Error('Please enter your official full name.');
      setAuthError(err.message);
      return { error: err, code: 'INVALID_CREDENTIALS' };
    }

    if (trimmedPassword.length < 6) {
      const err = new Error('Password must be at least 6 characters long.');
      setAuthError(err.message);
      return { error: err, code: 'WEAK_PASSWORD' };
    }

    setAuthError(null);

    if (!isSupabaseConfigured) {
      const err = new Error('Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
      setAuthError(err.message);
      return { error: err, code: 'INVALID_CREDENTIALS' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: {
            full_name: trimmedFullName,
            department_unit: department?.trim() || 'Labour Directorate',
            role: 'interviewer',
          },
        },
      });

      if (error) {
        setLoading(false);
        const mapped = mapSignUpError(error);
        setAuthError(mapped.message);
        return { error: new Error(mapped.message), code: mapped.code };
      }

      // Supabase duplicate email detection when email confirmation is enabled:
      // Supabase returns an obfuscated user object with an empty identities array []
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setLoading(false);
        const msg = 'An account with this email already exists. Please sign in instead.';
        setAuthError(msg);
        return {
          error: new Error(msg),
          code: 'USER_ALREADY_EXISTS',
        };
      }

      if (data?.user) {
        // If session exists (email confirmation disabled in Supabase project), user is logged in immediately
        if (data.session) {
          await fetchOrCreateProfile(data.user);
          setAuthError(null);
          return { error: null, needsConfirmation: false };
        } else {
          // Confirmation email was sent; user needs to confirm
          setLoading(false);
          setAuthError(null);
          return { error: null, needsConfirmation: true };
        }
      }

      setLoading(false);
      return { error: null, needsConfirmation: true };
    } catch (err: any) {
      setLoading(false);
      const mapped = mapSignUpError(err);
      setAuthError(mapped.message);
      return { error: new Error(mapped.message), code: mapped.code };
    }
  };

  /**
   * Logout from real Supabase
   */
  const logout = async (): Promise<void> => {
    if (isSupabaseConfigured && session) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out warning:', err);
      }
    }

    setCurrentUser(null);
    setSession(null);
    setActualRole('interviewer');
    setActiveRole('interviewer');
  };

  /**
   * Role Switcher for previewing RLS perspectives:
   * - When Supabase is configured: non-admin users can NEVER call switchRole('admin') or escalate their role
   * - Only authenticated Admins who signed in through Supabase can toggle between 'admin' and 'interviewer' preview
   * - In production builds with Supabase: role switching is completely disabled
   * - In test environments: test personas can be toggled for RLS assertions
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

    // 2. Test environment:
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

    if (isSupabaseConfigured) {
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
        isSupabaseConfigured,
        allUsers: users,
        login,
        signUp,
        logout,
        switchRole,
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
