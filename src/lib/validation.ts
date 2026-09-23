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

/**
 * Specifically authorised email domains for the MGLSD Diagnostic Application.
 * In addition to these domains, any official Uganda government address ending in '.go.ug' is accepted.
 */
export const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'malaikapath.org',
  'mglsd.go.ug',
] as const;

export const UNAUTHORIZED_DOMAIN_MESSAGE =
  'This email domain is not authorised. Please use a Gmail, Yahoo, Malaika Path, or official .go.ug email address.';

/**
 * Checks whether an email address belongs to the authorised domain list:
 * - @gmail.com
 * - @yahoo.com
 * - @malaikapath.org
 * - @mglsd.go.ug
 * - any address ending in .go.ug (e.g. name@ministry.go.ug, officer@local.go.ug)
 */
export function isAllowedEmail(email: string): boolean {
  const normalised = email.trim().toLowerCase();
  if (!normalised || !normalised.includes('@')) return false;

  const parts = normalised.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain) return false;

  // Exact match against allowed list
  if ((ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain)) return true;

  // Allow any subdomain or address under .go.ug
  if (domain === 'go.ug' || domain.endsWith('.go.ug')) return true;

  return false;
}

export interface EmailValidationResult {
  isValid: boolean;
  errorMessage?: string;
  isMinistryDomain: boolean;
  warningMessage?: string;
}

/**
 * Validates email address format and strictly enforces authorised domain access.
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

  if (!isAllowedEmail(trimmed)) {
    return {
      isValid: false,
      errorMessage: UNAUTHORIZED_DOMAIN_MESSAGE,
      isMinistryDomain: false,
    };
  }

  const lower = trimmed.toLowerCase();
  const isMinistry = lower.endsWith('@mglsd.go.ug') || lower.endsWith('.go.ug');

  return {
    isValid: true,
    isMinistryDomain: isMinistry,
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
