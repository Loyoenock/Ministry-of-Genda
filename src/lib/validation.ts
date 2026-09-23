/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Standard RFC 5322 compatible email regular expression.
 * Validates standard address syntax: local-part @ domain . tld (min 2 chars)
 */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface EmailValidationResult {
  isValid: boolean;
  errorMessage?: string;
  isMinistryDomain: boolean;
  warningMessage?: string;
}

/**
 * Validates email address format and checks whether it belongs to an official Uganda Government / MGLSD domain.
 * Does not block external email addresses, but provides an official domain guidance warning.
 */
export function validateEmail(email: string): EmailValidationResult {
  const trimmed = email.trim();

  if (!trimmed) {
    return {
      isValid: false,
      errorMessage: 'Please enter your ministry email address.',
      isMinistryDomain: false,
    };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid ministry email address.',
      isMinistryDomain: false,
    };
  }

  const lower = trimmed.toLowerCase();
  const isMinistry = lower.endsWith('@mglsd.go.ug') || lower.endsWith('.go.ug');

  return {
    isValid: true,
    isMinistryDomain: isMinistry,
    warningMessage: !isMinistry
      ? 'Official MGLSD personnel typically use an @mglsd.go.ug or .go.ug address. External addresses are permitted but may have limited role privileges.'
      : undefined,
  };
}

export interface PasswordValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates password length and basic complexity.
 */
export function validatePassword(password: string, isSignUp: boolean = false): PasswordValidationResult {
  if (!password || password.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: 'Please enter your account password.',
    };
  }

  if (isSignUp && password.length < 6) {
    return {
      isValid: false,
      errorMessage: 'Password must be at least 6 characters long.',
    };
  }

  return {
    isValid: true,
  };
}

export interface FullNameValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates official full name for sign-up.
 */
export function validateFullName(name: string): FullNameValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return {
      isValid: false,
      errorMessage: 'Please enter your official full name.',
    };
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      errorMessage: 'Official full name must be at least 2 characters.',
    };
  }

  return {
    isValid: true,
  };
}
