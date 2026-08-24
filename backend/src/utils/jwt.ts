/**
 * JWT Utilities
 * Token generation and verification
 */

import * as jwt from 'jsonwebtoken';
import { env } from '../config/environment';

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload as any, env.jwtSecret as any, {
    expiresIn: env.jwtExpiry as any,
  } as any) as string;
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token as any, env.jwtSecret as any) as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Decode token without verification
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload | null;
  } catch (error) {
    return null;
  }
}
