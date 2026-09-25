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
    expect(screen.getByTestId('login-success-alert')).toBeInTheDocument();
    expect(screen.getByText(/Account created successfully/i)).toBeInTheDocument();
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

  it('distinguishes signup returning an immediate session by omitting the confirmation panel', async () => {
    (supabase.auth.signUp as any).mockResolvedValueOnce({
      data: {
        user: { id: 'usr-immediate', email: 'officer.auto@mglsd.go.ug', identities: [{ id: '1' }] },
        session: { access_token: 'fake-token', user: { id: 'usr-immediate' } },
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

    fireEvent.change(screen.getByTestId('login-fullname'), { target: { value: 'Auto Officer' } });
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'officer.auto@mglsd.go.ug' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password123' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit-btn'));
    });

    // Confirmation panel should NOT be shown
    expect(screen.queryByTestId('login-confirmation-panel')).toBeNull();
    // Immediate success alert should be shown
    expect(screen.getByTestId('login-success-alert')).toBeInTheDocument();
    expect(screen.getByText(/Account registered successfully/i)).toBeInTheDocument();
  });

  it('makes resend-confirmation success and failure visible in the UI', async () => {
    (supabase.auth.signUp as any).mockResolvedValueOnce({
      data: {
        user: { id: 'usr-resend-test', email: 'officer.resend@mglsd.go.ug', identities: [{ id: '1' }] },
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

    fireEvent.change(screen.getByTestId('login-fullname'), { target: { value: 'Resend Officer' } });
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'officer.resend@mglsd.go.ug' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password123' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit-btn'));
    });

    // Confirmation panel is displayed
    const resendBtn = screen.getByTestId('resend-confirmation-btn');
    expect(resendBtn).toBeInTheDocument();

    // 1. Successful resend
    (supabase.auth.resend as any).mockResolvedValueOnce({ error: null });
    await act(async () => {
      fireEvent.click(resendBtn);
    });

    expect(screen.getByTestId('login-success-alert')).toBeInTheDocument();
    expect(screen.getByText(/Confirmation email sent again/i)).toBeInTheDocument();

    // 2. Failed resend (e.g. rate limit)
    (supabase.auth.resend as any).mockResolvedValueOnce({
      error: { message: 'over_email_send_rate_limit', status: 429 },
    });
    await act(async () => {
      fireEvent.click(resendBtn);
    });

    expect(screen.getByTestId('login-error-alert')).toBeInTheDocument();
    expect(screen.getByText(/Too many attempts/i)).toBeInTheDocument();
  });

  it('does not swallow empty signup response as successful signup', async () => {
    function SignUpConsumer() {
      const { signUp } = useAuth();
      const [outcome, setOutcome] = React.useState<string | null>(null);

      return (
        <div>
          <button
            data-testid="test-empty-signup"
            onClick={async () => {
              const res = await signUp('empty@mglsd.go.ug', 'password123', 'Empty Officer');
              if (res.error) {
                setOutcome(`ERROR: ${res.error.message}`);
              } else {
                setOutcome('SUCCESS');
              }
            }}
          >
            Trigger
          </button>
          <div data-testid="signup-outcome">{outcome}</div>
        </div>
      );
    }

    (supabase.auth.signUp as any).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    });

    render(
      <AuthProvider>
        <SignUpConsumer />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-empty-signup'));
    });

    expect(screen.getByTestId('signup-outcome').textContent).toContain('ERROR');
    expect(screen.getByTestId('signup-outcome').textContent).not.toBe('SUCCESS');
  });
});
