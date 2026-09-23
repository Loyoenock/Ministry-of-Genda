/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'USER_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface MappedAuthError {
  message: string;
  code: AuthErrorCode;
}

/**
 * Maps Supabase / connection errors during Sign-in to user-friendly messages.
 * Note: Under security best practices, sign-in never discloses whether an email exists or not.
 */
export function mapSignInError(error: any): MappedAuthError {
  if (!error) {
    return {
      message: 'Authentication failed. Please check your credentials.',
      code: 'UNKNOWN',
    };
  }

  const rawMessage = (typeof error === 'string' ? error : error.message || '').toLowerCase();
  const status = error.status || error.statusCode;

  // Rate limiting / too many attempts
  if (
    status === 429 ||
    rawMessage.includes('rate limit') ||
    rawMessage.includes('too many requests') ||
    rawMessage.includes('over_email_send_rate_limit') ||
    rawMessage.includes('over_request_rate_limit')
  ) {
    return {
      message: 'Too many attempts. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
    };
  }

  // Network or connectivity issue
  if (
    rawMessage.includes('fetch') ||
    rawMessage.includes('network') ||
    rawMessage.includes('connection') ||
    rawMessage.includes('failed to fetch') ||
    rawMessage.includes('timeout')
  ) {
    return {
      message: 'Unable to connect to the authentication server. Please check your network connection and try again.',
      code: 'NETWORK_ERROR',
    };
  }

  // Email not confirmed
  if (
    rawMessage.includes('email not confirmed') ||
    rawMessage.includes('not verified') ||
    rawMessage.includes('email_not_confirmed') ||
    rawMessage.includes('confirm') ||
    rawMessage.includes('verify')
  ) {
    return {
      message: 'Please confirm your email before signing in. Check your inbox for the confirmation link.',
      code: 'EMAIL_NOT_CONFIRMED',
    };
  }

  // Invalid credentials (generic to protect account privacy)
  if (
    rawMessage.includes('invalid login credentials') ||
    rawMessage.includes('invalid credentials') ||
    rawMessage.includes('invalid grant') ||
    rawMessage.includes('wrong password') ||
    rawMessage.includes('user not found')
  ) {
    return {
      message: 'Incorrect email or password.',
      code: 'INVALID_CREDENTIALS',
    };
  }

  return {
    message: error.message || 'Incorrect email or password.',
    code: 'UNKNOWN',
  };
}

/**
 * Maps Supabase / connection errors during Sign-up to user-friendly messages.
 * Specifically detects duplicate emails and weak passwords.
 */
export function mapSignUpError(error: any): MappedAuthError {
  if (!error) {
    return {
      message: 'Registration could not be completed. Please try again.',
      code: 'UNKNOWN',
    };
  }

  const rawMessage = (typeof error === 'string' ? error : error.message || '').toLowerCase();
  const status = error.status || error.statusCode;

  // Duplicate email detection
  if (
    rawMessage.includes('already registered') ||
    rawMessage.includes('already in use') ||
    rawMessage.includes('user_already_exists') ||
    rawMessage.includes('email already exists') ||
    (status === 422 && (rawMessage.includes('email') || rawMessage.includes('user')))
  ) {
    return {
      message: 'An account with this email already exists. Please sign in instead.',
      code: 'USER_ALREADY_EXISTS',
    };
  }

  // Password complexity / length rules
  if (
    rawMessage.includes('password') &&
    (rawMessage.includes('weak') ||
      rawMessage.includes('short') ||
      rawMessage.includes('at least') ||
      rawMessage.includes('character') ||
      rawMessage.includes('pwned'))
  ) {
    return {
      message: 'Password is too weak. Please use at least 6 characters including letters and numbers.',
      code: 'WEAK_PASSWORD',
    };
  }

  // Rate limiting
  if (
    status === 429 ||
    rawMessage.includes('rate limit') ||
    rawMessage.includes('too many requests') ||
    rawMessage.includes('over_email_send_rate_limit')
  ) {
    return {
      message: 'Too many attempts. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
    };
  }

  // Network issue
  if (
    rawMessage.includes('fetch') ||
    rawMessage.includes('network') ||
    rawMessage.includes('connection') ||
    rawMessage.includes('failed to fetch')
  ) {
    return {
      message: 'Unable to connect to the authentication server. Please check your network connection and try again.',
      code: 'NETWORK_ERROR',
    };
  }

  // Invalid email format (server-side)
  if (
    rawMessage.includes('invalid email') ||
    rawMessage.includes('invalid format') ||
    rawMessage.includes('unable to validate email')
  ) {
    return {
      message: 'Please enter a valid ministry email address.',
      code: 'INVALID_EMAIL',
    };
  }

  return {
    message: error.message || 'Registration could not be completed. Please try again.',
    code: 'UNKNOWN',
  };
}
