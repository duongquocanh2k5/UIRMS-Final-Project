/**
 * Password Utilities
 * Hashing and comparison using bcrypt
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
}

/**
 * Compare password with hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error comparing password:', error);
    throw error;
  }
}

/**
 * Generate random password using cryptographically secure random bytes
 */
export function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(randomBytes[i]! % chars.length);
  }
  return password;
}
