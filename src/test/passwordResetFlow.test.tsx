/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LoginView } from '../components/LoginView';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

vi.mock('../lib/supabase', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, any>;
  return {
    ...actual,
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ error: null }),
        resend: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      removeChannel: vi.fn(),
    },
  };
});

describe('User Password Reset Functionality', () => {
  beforeEach(() => {
    setSupabaseConfiguredForTesting(true);
    vi.clearAllMocks();
  });

  it('allows user to navigate to forgot password view and request a reset link', async () => {
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({ error: null });

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    // Click "Forgot password?" link
    const forgotLink = screen.getByTestId('forgot-password-link');
    fireEvent.click(forgotLink);

    // Verify forgot password header is present
    expect(screen.getByText(/Reset Password/i)).toBeInTheDocument();
    expect(screen.getByTestId('forgot-password-submit-btn')).toBeInTheDocument();

    // Fill email
    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'officer@mglsd.go.ug' },
    });

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByTestId('forgot-password-submit-btn'));
    });

    // Verify resetPasswordForEmail was called with the email
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'officer@mglsd.go.ug',
      expect.objectContaining({ redirectTo: expect.any(String) })
    );

    // Verify success banner appears
    expect(screen.getByTestId('login-success-alert')).toBeInTheDocument();
    expect(screen.getByText(/Password reset link has been sent/i)).toBeInTheDocument();
  });

  it('allows returning to sign in from forgot password view', () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('forgot-password-link'));
    expect(screen.getByText(/Reset Password/i)).toBeInTheDocument();

    // Click Back to Sign In
    fireEvent.click(screen.getByTestId('forgot-back-to-signin-btn'));
    expect(screen.getByTestId('login-tab-signin')).toBeInTheDocument();
  });

  it('validates email address client-side in forgot password mode', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('forgot-password-link'));

    // Try submitting empty email
    await act(async () => {
      fireEvent.click(screen.getByTestId('forgot-password-submit-btn'));
    });

    expect(screen.getByTestId('email-error')).toBeInTheDocument();
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
