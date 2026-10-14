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

export class AuthService {
  /**
   * Register new user
   */
  async registerUser(input: CreateUserInput & { bio?: string }): Promise<User> {
    const { phone, email, password, full_name, identity_number, bio } = input;

    try {
      // Hash password
      const password_hash = await hashPassword(password);

      // Generate verification code
      const verification_code = Math.random().toString().substring(2, 8);

      const result = await query<User>(
        `INSERT INTO users (phone, email, password_hash, full_name, identity_number, bio, verification_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *;`,
        [phone, email, password_hash, full_name, identity_number, bio || null, verification_code]
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
  ): Promise<{ user: User; token: string } | null> {
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

      return { user, token };
    } catch (error) {
      throw error;
    }
  }

  async loginAdmin(emailOrUsername: string, password: string, selectedRole: string): Promise<{ admin: Admin; token: string } | null> {
    const admin = await queryOne<Admin>(
      `SELECT * FROM admins WHERE (email = $1 OR username = $1) AND is_active = true;`,
      [emailOrUsername]
    );
    if (!admin || !(await comparePassword(password, admin.password_hash)) || admin.role !== selectedRole) return null;

    const token = generateToken({ id: admin.id, email: admin.email, role: admin.role }, env.adminJwtExpiry);
    await query(`UPDATE admins SET last_login = NOW(), updated_at = NOW() WHERE id = $1;`, [admin.id]);
    return { admin, token };
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
   * Verify user email
   */
  async verifyUserEmail(userId: number, verificationCode: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE users SET is_verified = true, verification_code = NULL, updated_at = NOW()
         WHERE id = $1 AND verification_code = $2 AND deleted_at IS NULL
         RETURNING id;`,
        [userId, verificationCode]
      );

      return result.length > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send password reset OTP
   */
  async sendPasswordResetOTP(email: string): Promise<boolean> {
    try {
      const otp = Math.random().toString().substring(2, 8);

      const result = await query(
        `UPDATE users SET verification_code = $1, updated_at = NOW()
         WHERE email = $2 AND deleted_at IS NULL
         RETURNING id;`,
        [otp, email]
      );

      if (result.length > 0) {
        // Try to send OTP via email service; fallback logs in emailService
        const sent = await emailService.sendPasswordResetEmail(email, otp);
        return sent;
      }

      return false;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(
    email: string,
    resetCode: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const password_hash = await hashPassword(newPassword);

      const result = await query(
        `UPDATE users SET password_hash = $1, verification_code = NULL, updated_at = NOW()
         WHERE email = $2 AND verification_code = $3 AND deleted_at IS NULL
         RETURNING id;`,
        [password_hash, email, resetCode]
      );

      return result.length > 0;
    } catch (error) {
      throw error;
    }
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
    try {
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
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user account (soft delete)
   */
  async deleteUserAccount(userId: number): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE users SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id;`,
        [userId]
      );

      return result.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

export const authService = new AuthService();
