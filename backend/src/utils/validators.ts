/**
 * Validation Utilities
 * Input validation functions
 */

import { REGEX_PATTERNS } from '../config/constants';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return REGEX_PATTERNS.EMAIL.test(email);
}

/**
 * Validate Vietnamese phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  return REGEX_PATTERNS.VIETNAMESE_PHONE.test(phone);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  return REGEX_PATTERNS.PASSWORD.test(password);
}

/**
 * Validate Vietnamese citizen identity number (CMND/CCCD)
 */
export function isValidIdentityNumber(identityNumber: string): boolean {
  return REGEX_PATTERNS.CMND_CCCD.test(identityNumber);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize string input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page?: any,
  limit?: any
): { page: number; limit: number } {
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

  return { page: parsedPage, limit: parsedLimit };
}
