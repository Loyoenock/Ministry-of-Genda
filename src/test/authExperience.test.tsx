/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LoginView } from '../components/LoginView';
import { supabase } from '../lib/supabase';
import {
  validateEmail,
  validatePassword,
  validateFullName,
  isAllowedEmail,
  UNAUTHORIZED_DOMAIN_MESSAGE,
} from '../lib/validation';
import { mapSignInError, mapSignUpError } from '../lib/authErrorMapper';

describe('Validation Utilities & Domain Restrictions', () => {
  it('correctly validates allowed email domains', () => {
    // Allowed exact domains
    expect(isAllowedEmail('loyoenock@gmail.com')).toBe(true);
    expect(isAllowedEmail('officer.john@gmail.com')).toBe(true);
    expect(isAllowedEmail('investigator@yahoo.com')).toBe(true);
    expect(isAllowedEmail('coordinator@malaikapath.org')).toBe(true);
    expect(isAllowedEmail('director@mglsd.go.ug')).toBe(true);

    // Allowed .go.ug addresses
    expect(isAllowedEmail('inspector@labour.go.ug')).toBe(true);
    expect(isAllowedEmail('commissioner@internalaffairs.go.ug')).toBe(true);
    expect(isAllowedEmail('officer@districts.kampala.go.ug')).toBe(true);

    // Blocked unauthorized domains
    expect(isAllowedEmail('user@outlook.com')).toBe(false);
    expect(isAllowedEmail('user@hotmail.com')).toBe(false);
    expect(isAllowedEmail('user@proton.me')).toBe(false);
    expect(isAllowedEmail('consultant@worldbank.org')).toBe(false);
    expect(isAllowedEmail('attacker@evil.com')).toBe(false);
    expect(isAllowedEmail('notgo.ug@domain.com')).toBe(false);
  });

  it('validates email format and rejects unauthorized domains', () => {
    // Empty
    expect(validateEmail('').isValid).toBe(false);
    expect(validateEmail('   ').isValid).toBe(false);

    // Invalid format
    expect(validateEmail('invalid-email').isValid).toBe(false);
    expect(validateEmail('user@').isValid).toBe(false);
    expect(validateEmail('@domain.com').isValid).toBe(false);

    // Unauthorized domain rejected with specific message
    const unauthorized = validateEmail('consultant@worldbank.org');
    expect(unauthorized.isValid).toBe(false);
    expect(unauthorized.errorMessage).toBe(UNAUTHORIZED_DOMAIN_MESSAGE);

    const outlook = validateEmail('user@outlook.com');
    expect(outlook.isValid).toBe(false);
    expect(outlook.errorMessage).toBe(UNAUTHORIZED_DOMAIN_MESSAGE);

    // Valid authorised domains
    expect(validateEmail('officer@gmail.com').isValid).toBe(true);
    expect(validateEmail('officer@yahoo.com').isValid).toBe(true);
    expect(validateEmail('officer@malaikapath.org').isValid).toBe(true);
    expect(validateEmail('okello.john@mglsd.go.ug').isValid).toBe(true);
    expect(validateEmail('officer@internalaffairs.go.ug').isValid).toBe(true);
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

describe('LoginView Component - Domain Restrictions & Validation UX', () => {
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

  it('rejects unauthorised domains on blur with clear error message', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId('login-email');
    fireEvent.change(emailInput, { target: { value: 'officer@outlook.com' } });
    fireEvent.blur(emailInput);

    const error = screen.getByTestId('email-error');
    expect(error.textContent).toContain('This email domain is not authorised');
    expect(error.textContent).toContain('Gmail, Yahoo, Malaika Path, or official .go.ug');
  });

  it('rejects unauthorised domains on form submit without calling auth', async () => {
    const signInSpy = vi.spyOn(supabase.auth, 'signInWithPassword');

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId('login-email');
    const passInput = screen.getByTestId('login-password');
    fireEvent.change(emailInput, { target: { value: 'user@proton.me' } });
    fireEvent.change(passInput, { target: { value: 'SecretPass123' } });

    act(() => {
      fireEvent.click(screen.getByTestId('login-submit-btn'));
    });

    const error = screen.getByTestId('email-error');
    expect(error.textContent).toContain('This email domain is not authorised');
    expect(signInSpy).not.toHaveBeenCalled();
  });

  it('accepts permitted domains like @gmail.com without domain error', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId('login-email');
    fireEvent.change(emailInput, { target: { value: 'loyoenock@gmail.com' } });
    fireEvent.blur(emailInput);

    expect(screen.queryByTestId('email-error')).toBeNull();
  });

  it('accepts permitted domains like @malaikapath.org without domain error', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId('login-email');
    fireEvent.change(emailInput, { target: { value: 'director@malaikapath.org' } });
    fireEvent.blur(emailInput);

    expect(screen.queryByTestId('email-error')).toBeNull();
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

describe('AuthContext - Server-side / Security Backstop Guard', () => {
  function TestAuthGuardConsumer() {
    const { login, signUp } = useAuth();
    const [loginResult, setLoginResult] = React.useState<string | null>(null);
    const [signUpResult, setSignUpResult] = React.useState<string | null>(null);

    return (
      <div>
        <button
          data-testid="test-login-unauthorized"
          onClick={async () => {
            const res = await login('badguy@outlook.com', 'password123');
            setLoginResult(res.error ? res.error.message : 'SUCCESS');
          }}
        >
          Test Login Unauthorized
        </button>
        <button
          data-testid="test-signup-unauthorized"
          onClick={async () => {
            const res = await signUp('badguy@hotmail.com', 'password123', 'Bad Guy');
            setSignUpResult(res.error ? res.error.message : 'SUCCESS');
          }}
        >
          Test Signup Unauthorized
        </button>
        <div data-testid="login-result">{loginResult}</div>
        <div data-testid="signup-result">{signUpResult}</div>
      </div>
    );
  }

  it('rejects unauthorized domain inside login and signUp in AuthContext', async () => {
    const signInSpy = vi.spyOn(supabase.auth, 'signInWithPassword');
    const signUpSpy = vi.spyOn(supabase.auth, 'signUp');

    render(
      <AuthProvider>
        <TestAuthGuardConsumer />
      </AuthProvider>
    );

    // Click test login
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-login-unauthorized'));
    });

    expect(screen.getByTestId('login-result').textContent).toBe(UNAUTHORIZED_DOMAIN_MESSAGE);
    expect(signInSpy).not.toHaveBeenCalled();

    // Click test signup
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-signup-unauthorized'));
    });

    expect(screen.getByTestId('signup-result').textContent).toBe(UNAUTHORIZED_DOMAIN_MESSAGE);
    expect(signUpSpy).not.toHaveBeenCalled();
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
