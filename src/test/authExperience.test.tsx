/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { LoginView } from '../components/LoginView';
import { supabase } from '../lib/supabase';
import { validateEmail, validatePassword, validateFullName } from '../lib/validation';
import { mapSignInError, mapSignUpError } from '../lib/authErrorMapper';

describe('Validation Utilities', () => {
  it('validates email correctly and flags official domains', () => {
    // Empty
    expect(validateEmail('').isValid).toBe(false);
    expect(validateEmail('   ').isValid).toBe(false);

    // Invalid format
    expect(validateEmail('invalid-email').isValid).toBe(false);
    expect(validateEmail('user@').isValid).toBe(false);
    expect(validateEmail('@domain.com').isValid).toBe(false);
    expect(validateEmail('user@domain').isValid).toBe(false);

    // Valid external domain (soft warning)
    const external = validateEmail('consultant@worldbank.org');
    expect(external.isValid).toBe(true);
    expect(external.isMinistryDomain).toBe(false);
    expect(external.warningMessage).toContain('@mglsd.go.ug');

    // Valid ministry domain (no warning)
    const ministry = validateEmail('okello.john@mglsd.go.ug');
    expect(ministry.isValid).toBe(true);
    expect(ministry.isMinistryDomain).toBe(true);
    expect(ministry.warningMessage).toBeUndefined();

    // Valid generic ug government domain (no warning)
    const govUg = validateEmail('officer@internalaffairs.go.ug');
    expect(govUg.isValid).toBe(true);
    expect(govUg.isMinistryDomain).toBe(true);
    expect(govUg.warningMessage).toBeUndefined();
  });

  it('validates password length and complexity rules', () => {
    // Empty
    expect(validatePassword('').isValid).toBe(false);
    expect(validatePassword('   ').isValid).toBe(false);

    // Sign in allows any existing password string
    expect(validatePassword('123', false).isValid).toBe(true);

    // Sign up requires at least 6 characters
    expect(validatePassword('12345', true).isValid).toBe(false);
    expect(validatePassword('12345', true).errorMessage).toContain('at least 6 characters');
    expect(validatePassword('SecurePass123', true).isValid).toBe(true);
  });

  it('validates official full name for sign up', () => {
    expect(validateFullName('').isValid).toBe(false);
    expect(validateFullName('A').isValid).toBe(false);
    expect(validateFullName('John Okello').isValid).toBe(true);
  });
});

describe('Auth Error Mapping Engine', () => {
  it('maps sign-in errors accurately with security privacy preservation', () => {
    // Invalid credentials
    expect(mapSignInError({ message: 'Invalid login credentials' }).message).toBe(
      'Incorrect email or password.'
    );
    expect(mapSignInError({ message: 'invalid credentials' }).code).toBe('INVALID_CREDENTIALS');

    // Email not confirmed
    const unconfirmed = mapSignInError({ message: 'Email not confirmed' });
    expect(unconfirmed.code).toBe('EMAIL_NOT_CONFIRMED');
    expect(unconfirmed.message).toContain('confirm your email');

    // Rate limiting
    const rateLimited = mapSignInError({ status: 429, message: 'Too many requests' });
    expect(rateLimited.code).toBe('RATE_LIMITED');
    expect(rateLimited.message).toContain('Too many attempts');

    // Network disconnection
    const network = mapSignInError({ message: 'Failed to fetch' });
    expect(network.code).toBe('NETWORK_ERROR');
    expect(network.message).toContain('Unable to connect to the authentication server');
  });

  it('maps sign-up errors accurately detecting duplicate accounts', () => {
    // Duplicate email
    const duplicate = mapSignUpError({ message: 'User already registered' });
    expect(duplicate.code).toBe('USER_ALREADY_EXISTS');
    expect(duplicate.message).toBe(
      'An account with this email already exists. Please sign in instead.'
    );

    const duplicate422 = mapSignUpError({ status: 422, message: 'email address already in use' });
    expect(duplicate422.code).toBe('USER_ALREADY_EXISTS');

    // Weak password
    const weakPass = mapSignUpError({ message: 'Password should be at least 6 characters' });
    expect(weakPass.code).toBe('WEAK_PASSWORD');
    expect(weakPass.message).toContain('Password is too weak');

    // Rate limit
    const rateLimit = mapSignUpError({ status: 429, message: 'over_email_send_rate_limit' });
    expect(rateLimit.code).toBe('RATE_LIMITED');
    expect(rateLimit.message).toContain('Too many attempts');
  });
});

describe('LoginView Component - Client-Side Validation & UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks empty email on form submit and shows inline validation error', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const submitBtn = screen.getByTestId('login-submit-btn');

    act(() => {
      fireEvent.click(submitBtn);
    });

    const error = screen.getByTestId('email-error');
    expect(error.textContent).toContain('Please enter your ministry email address.');
  });

  it('blocks invalid email format client-side and shows inline error', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId('login-email');
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);

    const error = screen.getByTestId('email-error');
    expect(error.textContent).toContain('Please enter a valid ministry email address.');
  });

  it('shows soft guidance warning when email is valid but outside @mglsd.go.ug domain', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId('login-email');
    fireEvent.change(emailInput, { target: { value: 'consultant@partner.org' } });
    fireEvent.blur(emailInput);

    // Field error should NOT be present
    expect(screen.queryByTestId('email-error')).toBeNull();

    // Soft domain warning should be present
    const warning = screen.getByTestId('email-warning');
    expect(warning.textContent).toContain('@mglsd.go.ug');
  });

  it('blocks empty password when email is valid', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId('login-email');
    fireEvent.change(emailInput, { target: { value: 'officer@mglsd.go.ug' } });

    const submitBtn = screen.getByTestId('login-submit-btn');
    act(() => {
      fireEvent.click(submitBtn);
    });

    const passError = screen.getByTestId('password-error');
    expect(passError.textContent).toContain('Please enter your account password.');
  });

  it('enforces min 6 characters password in Create Account mode', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    // Switch to Create Account mode
    const signupTab = screen.getByTestId('login-tab-signup');
    act(() => {
      fireEvent.click(signupTab);
    });

    const nameInput = screen.getByTestId('login-fullname');
    const emailInput = screen.getByTestId('login-email');
    const passInput = screen.getByTestId('login-password');

    fireEvent.change(nameInput, { target: { value: 'Sarah Nansubuga' } });
    fireEvent.change(emailInput, { target: { value: 'sarah.n@mglsd.go.ug' } });
    fireEvent.change(passInput, { target: { value: '123' } });
    fireEvent.blur(passInput);

    const passError = screen.getByTestId('password-error');
    expect(passError.textContent).toContain('Password must be at least 6 characters long.');
  });

  it('preserves email address when switching between Sign In and Create Account tabs', () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId('login-email') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'sarah.n@mglsd.go.ug' } });

    // Switch to sign-up
    const signupTab = screen.getByTestId('login-tab-signup');
    act(() => {
      fireEvent.click(signupTab);
    });

    expect((screen.getByTestId('login-email') as HTMLInputElement).value).toBe(
      'sarah.n@mglsd.go.ug'
    );

    // Switch back to sign-in
    const signinTab = screen.getByTestId('login-tab-signin');
    act(() => {
      fireEvent.click(signinTab);
    });

    expect((screen.getByTestId('login-email') as HTMLInputElement).value).toBe(
      'sarah.n@mglsd.go.ug'
    );
  });
});

describe('LoginView - Supabase Auth Error Feedback & Duplicate Handling', () => {
  it('surfaces "Incorrect email or password" on invalid login credentials', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 } as any,
    });

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'officer@mglsd.go.ug' },
    });
    fireEvent.change(screen.getByTestId('login-password'), {
      target: { value: 'wrongpassword' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit-btn'));
    });

    const alert = await screen.findByTestId('login-error-alert');
    expect(alert.textContent).toContain('Incorrect email or password.');
  });

  it('detects duplicate user on sign-up and offers quick "Sign in with this email" button', async () => {
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already registered', status: 422 } as any,
    });

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    // Switch to Create Account mode
    act(() => {
      fireEvent.click(screen.getByTestId('login-tab-signup'));
    });

    fireEvent.change(screen.getByTestId('login-fullname'), {
      target: { value: 'Sarah Nansubuga' },
    });
    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'sarah.existing@mglsd.go.ug' },
    });
    fireEvent.change(screen.getByTestId('login-password'), {
      target: { value: 'StrongPassword123' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit-btn'));
    });

    const alert = await screen.findByTestId('login-error-alert');
    expect(alert.textContent).toContain(
      'An account with this email already exists. Please sign in instead.'
    );

    // Quick action button to switch to Sign In
    const switchBtn = screen.getByTestId('switch-to-signin-btn');
    expect(switchBtn).toBeTruthy();

    // Clicking switches to sign-in tab with email preserved
    act(() => {
      fireEvent.click(switchBtn);
    });

    expect(screen.getByText('Sign In to Workspace')).toBeTruthy();
    expect((screen.getByTestId('login-email') as HTMLInputElement).value).toBe(
      'sarah.existing@mglsd.go.ug'
    );
  });

  it('detects duplicate user when Supabase returns obfuscated user with empty identities', async () => {
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValueOnce({
      data: {
        user: { id: 'obfuscated-id', email: 'existing@mglsd.go.ug', identities: [] } as any,
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

    fireEvent.change(screen.getByTestId('login-fullname'), {
      target: { value: 'Existing User' },
    });
    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'existing@mglsd.go.ug' },
    });
    fireEvent.change(screen.getByTestId('login-password'), {
      target: { value: 'ValidPass123' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit-btn'));
    });

    const alert = await screen.findByTestId('login-error-alert');
    expect(alert.textContent).toContain(
      'An account with this email already exists. Please sign in instead.'
    );
  });

  it('displays email confirmation success banner when sign-up requires verification', async () => {
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValueOnce({
      data: {
        user: {
          id: 'new-user-id',
          email: 'new.officer@mglsd.go.ug',
          identities: [{ id: 'id-1' }],
        } as any,
        session: null, // session is null when email confirmation is required
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

    fireEvent.change(screen.getByTestId('login-fullname'), {
      target: { value: 'New Officer' },
    });
    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'new.officer@mglsd.go.ug' },
    });
    fireEvent.change(screen.getByTestId('login-password'), {
      target: { value: 'NewOfficerPass123' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit-btn'));
    });

    const successAlert = await screen.findByTestId('login-success-alert');
    expect(successAlert.textContent).toContain(
      'Account created successfully. Please check your inbox to confirm your email before signing in.'
    );
  });
});
