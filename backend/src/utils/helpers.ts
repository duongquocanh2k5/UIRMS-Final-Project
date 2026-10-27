/**
 * Helper Utilities
 * Common helper functions
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Generate unique ID
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Generate OTP (One Time Password)
 * Uses cryptographically secure random number generator
 */
export function generateOTP(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max).toString();
}

/**
 * Calculate offset for pagination
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Sleep/delay execution
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format date for database
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString();
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
