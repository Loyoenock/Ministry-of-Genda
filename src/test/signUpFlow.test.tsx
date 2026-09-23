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

describe('Sign-up & Email Confirmation Flow', () => {
  beforeEach(() => {
    setSupabaseConfiguredForTesting(true);
    vi.clearAllMocks();
  });

  it('shows persistent confirmation panel when signUp requires email confirmation (session is null)', async () => {
    (supabase.auth.signUp as any).mockResolvedValueOnce({
      data: {
        user: { id: 'usr-new-1', email: 'officer@mglsd.go.ug', identities: [{}] },
        session: null,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    // Switch to Sign Up tab
    act(() => {
      fireEvent.click(screen.getByTestId('login-tab-signup'));
    });

    // Fill form
    fireEvent.change(screen.getByTestId('login-fullname'), { target: { value: 'Jane Akello' } });
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'officer@mglsd.go.ug' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password123' } });

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit-btn'));
    });

    // Verify confirmation panel appears
    expect(screen.getByTestId('login-confirmation-panel')).toBeInTheDocument();
    expect(screen.getByText(/Confirm your email to activate your account/i)).toBeInTheDocument();
    expect(screen.getByText(/officer@mglsd.go.ug/i)).toBeInTheDocument();
  });

  it('handles duplicate email when identities array is empty', async () => {
    (supabase.auth.signUp as any).mockResolvedValueOnce({
      data: {
        user: { id: 'usr-existing', email: 'existing@mglsd.go.ug', identities: [] },
        session: null,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('login-tab-signup'));
    });

    fireEvent.change(screen.getByTestId('login-fullname'), { target: { value: 'Jane Akello' } });
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'existing@mglsd.go.ug' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password123' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit-btn'));
    });

    expect(screen.getByTestId('login-error-alert')).toBeInTheDocument();
    expect(screen.getByText(/An account with this email already exists/i)).toBeInTheDocument();
  });
});
