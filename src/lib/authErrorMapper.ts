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

export type AuthSeverity = 'error' | 'success' | 'info';

export interface AuthFeedback {
  title?: string;
  message: string;
  code: AuthErrorCode | string;
  severity: AuthSeverity;
}

export interface MappedAuthError {
  message: string;
  code: AuthErrorCode;
}

/**
 * Centralised user-facing copy helper for all authentication scenarios.
 */
export function getAuthFeedback(
  codeOrScenario: AuthErrorCode | string,
  context?: { email?: string; mode?: 'signin' | 'signup' }
): AuthFeedback {
  const code = (codeOrScenario || 'UNKNOWN').toUpperCase();

  switch (code) {
    case 'INVALID_CREDENTIALS':
      return {
        message: 'Incorrect email or password.',
        code: 'INVALID_CREDENTIALS',
        severity: 'error',
      };
    case 'EMAIL_NOT_CONFIRMED':
      return {
        message: 'Please confirm your email before signing in. Check your inbox for the confirmation link from MGLSD Diagnostic.',
        code: 'EMAIL_NOT_CONFIRMED',
        severity: 'error',
      };
    case 'RATE_LIMITED':
      return {
        message: 'Too many attempts. Please wait a few minutes and try again.',
        code: 'RATE_LIMITED',
        severity: 'error',
      };
    case 'NETWORK_ERROR':
      return {
        message: 'Unable to reach the authentication server. Check your network connection and try again.',
        code: 'NETWORK_ERROR',
        severity: 'error',
      };
    case 'USER_ALREADY_EXISTS':
      return {
        message: 'An account with this email already exists. Please sign in instead.',
        code: 'USER_ALREADY_EXISTS',
        severity: 'error',
      };
    case 'WEAK_PASSWORD':
      return {
        message: 'Password must be at least 6 characters. Use a stronger password for your ministry account.',
        code: 'WEAK_PASSWORD',
        severity: 'error',
      };
    case 'CHECK_EMAIL':
    case 'NEEDS_CONFIRMATION':
      return {
        title: 'Confirm your email',
        message: `We created your account for ${context?.email || 'your email'}. Open the confirmation link sent by MGLSD Diagnostic, then sign in.`,
        code: 'EMAIL_NOT_CONFIRMED',
        severity: 'info',
      };
    case 'SIGNUP_SUCCESS':
      return {
        message: 'Account created successfully. Welcome to the MGLSD Labour Directorate diagnostic workspace.',
        code: 'UNKNOWN',
        severity: 'success',
      };
    case 'RESEND_SUCCESS':
      return {
        message: 'Confirmation email sent again. Check your inbox and spam folder.',
        code: 'UNKNOWN',
        severity: 'success',
      };
    case 'UNKNOWN':
    default:
      return {
        message: 'Please try again. If the problem continues, contact the system administrator.',
        code: 'UNKNOWN',
        severity: 'error',
      };
  }
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
    rawMessage.includes('timeout') ||
    rawMessage.includes('offline') ||
    status === 0 ||
    status === 503 ||
    status === 504
  ) {
    return {
      message: 'Unable to connect to the authentication server. Please check your network connection and try again.',
      code: 'NETWORK_ERROR',
    };
  }

  // Email not confirmed
  if (
    error?.code === 'email_not_confirmed' ||
    rawMessage.includes('email not confirmed') ||
    rawMessage.includes('email_not_confirmed') ||
    rawMessage.includes('not verified') ||
    rawMessage.includes('unconfirmed')
  ) {
    return {
      message: 'Please confirm your email before signing in. Check your inbox for the confirmation link.',
      code: 'EMAIL_NOT_CONFIRMED',
    };
  }

  // Invalid credentials (generic to protect account privacy against email enumeration)
  if (
    rawMessage.includes('invalid login credentials') ||
    rawMessage.includes('invalid credentials') ||
    rawMessage.includes('invalid grant') ||
    rawMessage.includes('wrong password') ||
    rawMessage.includes('user not found') ||
    rawMessage.includes('invalid password') ||
    rawMessage.includes('bad credentials')
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
 * Maps Supabase / connection errors during Resend Confirmation to user-friendly messages.
 */
export function mapResendError(error: any): MappedAuthError {
  if (!error) {
    return {
      message: 'Failed to resend confirmation email. Please try again.',
      code: 'UNKNOWN',
    };
  }

  const rawMessage = (typeof error === 'string' ? error : error.message || '').toLowerCase();
  const status = error.status || error.statusCode;

  // Rate limiting
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

  // Network issue
  if (
    rawMessage.includes('fetch') ||
    rawMessage.includes('network') ||
    rawMessage.includes('connection') ||
    rawMessage.includes('failed to fetch') ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('offline') ||
    status === 0 ||
    status === 503 ||
    status === 504
  ) {
    return {
      message: 'Unable to connect to the authentication server. Please check your network connection and try again.',
      code: 'NETWORK_ERROR',
    };
  }

  // Already confirmed
  if (rawMessage.includes('already confirmed') || rawMessage.includes('already verified')) {
    return {
      message: 'This email is already confirmed. Please sign in.',
      code: 'UNKNOWN',
    };
  }

  return {
    message: error.message || 'Failed to resend confirmation email. Please try again.',
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
    error?.code === 'user_already_exists' ||
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
    error?.code === 'weak_password' ||
    (rawMessage.includes('password') &&
      (rawMessage.includes('weak') ||
        rawMessage.includes('short') ||
        rawMessage.includes('at least') ||
        rawMessage.includes('character') ||
        rawMessage.includes('pwned')))
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
    rawMessage.includes('over_email_send_rate_limit') ||
    rawMessage.includes('over_request_rate_limit')
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
    rawMessage.includes('failed to fetch') ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('offline') ||
    status === 0 ||
    status === 503 ||
    status === 504
  ) {
    return {
      message: 'Unable to connect to the authentication server. Please check your network connection and try again.',
      code: 'NETWORK_ERROR',
    };
  }

  // Invalid email format (server-side)
  if (
    error?.code === 'invalid_email' ||
    error?.code === 'validation_failed' ||
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
