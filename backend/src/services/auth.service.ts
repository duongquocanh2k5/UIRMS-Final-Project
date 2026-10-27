/**
 * Authentication Service
 * Handles user registration, login, and OTP verification
 */

import { User, Admin, CreateUserInput } from '../types/index';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, TokenPayload } from '../utils/jwt';
import { query, queryOne } from '../config/database';
import { env } from '../config/environment';
import { emailService } from './email.service';
import crypto from 'crypto';

/**
 * Generate a cryptographically secure OTP
 */
function generateSecureOTP(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max).toString();
}

/**
 * Strips sensitive fields from a user object before returning to caller
 */
function stripSensitiveFields<T extends Record<string, any>>(obj: T): Omit<T, 'password_hash' | 'verification_code' | 'verification_code_expires_at'> {
  const { password_hash, verification_code, verification_code_expires_at, ...safe } = obj;
  return safe as any;
}

export class AuthService {
  /**
   * Register new user
   */
  async registerUser(input: CreateUserInput & { bio?: string }): Promise<User> {
    const { phone, email, password, full_name, identity_number, bio } = input;

    try {
      // Hash password
      const password_hash = await hashPassword(password);

      // Generate cryptographically secure verification code with expiry
      const verification_code = generateSecureOTP();
      const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

      const result = await query<User>(
        `INSERT INTO users (phone, email, password_hash, full_name, identity_number, bio, verification_code, verification_code_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *;`,
        [phone, email, password_hash, full_name, identity_number, bio || null, verification_code, expiresAt]
      );

      if (!result || result.length === 0) {
        throw new Error('Failed to create user');
      }

      return result[0]!;
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error('User with this email or phone already exists');
      }
      throw error;
    }
  }

  /**
   * Login user
   */
  async loginUser(
    emailOrPhone: string,
    password: string
  ): Promise<{ user: Omit<User, 'password_hash' | 'verification_code' | 'verification_code_expires_at'>; token: string } | null> {
    try {
      const user = await queryOne<User>(
        `SELECT * FROM users WHERE (email = $1 OR phone = $1) AND deleted_at IS NULL;`,
        [emailOrPhone]
      );

      if (!user) {
        return null;
      }

      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return null;
      }

      const payload: TokenPayload = {
        id: user.id,
        email: user.email,
        role: 'user',
      };

      const token = generateToken(payload);

      // Strip sensitive fields before returning
      return { user: stripSensitiveFields(user), token };
    } catch (error) {
      throw error;
    }
  }

  async loginAdmin(emailOrUsername: string, password: string, selectedRole: string): Promise<{ admin: Omit<Admin, 'password_hash'>; token: string } | null> {
    const admin = await queryOne<Admin>(
      `SELECT * FROM admins WHERE (email = $1 OR username = $1) AND is_active = true;`,
      [emailOrUsername]
    );
    if (!admin || !(await comparePassword(password, admin.password_hash)) || admin.role !== selectedRole) return null;

    const token = generateToken({ id: admin.id, email: admin.email, role: admin.role }, env.adminJwtExpiry);
    await query(`UPDATE admins SET last_login = NOW(), updated_at = NOW() WHERE id = $1;`, [admin.id]);

    // Strip sensitive fields before returning
    const { password_hash, ...safeAdmin } = admin;
    return { admin: safeAdmin, token };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<User | null> {
    return queryOne<User>(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL;`,
      [userId]
    );
  }

  /**
   * Get user by email or phone
   */
  async getUserByEmailOrPhone(email: string, phone: string): Promise<User | null> {
    return queryOne<User>(
      `SELECT * FROM users WHERE (email = $1 OR phone = $2) AND deleted_at IS NULL;`,
      [email, phone]
    );
  }

  /**
   * Verify user email — checks OTP and expiry
   */
  async verifyUserEmail(userId: number, verificationCode: string): Promise<boolean> {
    const result = await query(
      `UPDATE users SET is_verified = true, verification_code = NULL, verification_code_expires_at = NULL, updated_at = NOW()
       WHERE id = $1 AND verification_code = $2
         AND (verification_code_expires_at IS NULL OR verification_code_expires_at > NOW())
         AND deleted_at IS NULL
       RETURNING id;`,
      [userId, verificationCode]
    );

    return result.length > 0;
  }

  /**
   * Send password reset OTP — with expiry
   */
  async sendPasswordResetOTP(email: string): Promise<boolean> {
    const otp = generateSecureOTP();
    const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

    const result = await query(
      `UPDATE users SET verification_code = $1, verification_code_expires_at = $2, updated_at = NOW()
       WHERE email = $3 AND deleted_at IS NULL
       RETURNING id;`,
      [otp, expiresAt, email]
    );

    if (result.length > 0) {
      // Try to send OTP via email service; fallback logs in emailService
      const sent = await emailService.sendPasswordResetEmail(email, otp);
      return sent;
    }

    return false;
  }

  /**
   * Reset password with OTP — checks expiry
   */
  async resetPassword(
    email: string,
    resetCode: string,
    newPassword: string
  ): Promise<boolean> {
    const password_hash = await hashPassword(newPassword);

    const result = await query(
      `UPDATE users SET password_hash = $1, verification_code = NULL, verification_code_expires_at = NULL, updated_at = NOW()
       WHERE email = $2 AND verification_code = $3
         AND (verification_code_expires_at IS NULL OR verification_code_expires_at > NOW())
         AND deleted_at IS NULL
       RETURNING id;`,
      [password_hash, email, resetCode]
    );

    return result.length > 0;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: number,
    updates: {
      full_name?: string;
      bio?: string;
      avatar_url?: string;
    }
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.full_name) {
      fields.push(`full_name = $${paramCount++}`);
      values.push(updates.full_name);
    }
    if (updates.bio !== undefined) {
      fields.push(`bio = $${paramCount++}`);
      values.push(updates.bio);
    }
    if (updates.avatar_url) {
      fields.push(`avatar_url = $${paramCount++}`);
      values.push(updates.avatar_url);
    }

    if (fields.length === 0) {
      return this.getUserById(userId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query<User>(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *;`,
      values
    );

    return result[0] || null;
  }

  /**
   * Delete user account (soft delete)
   */
  async deleteUserAccount(userId: number): Promise<boolean> {
    const result = await query(
      `UPDATE users SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id;`,
      [userId]
    );

    return result.length > 0;
  }
}

export const authService = new AuthService();
