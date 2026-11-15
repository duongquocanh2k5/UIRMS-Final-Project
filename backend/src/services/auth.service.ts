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
import { parseAndValidateCCCD } from '../utils/validators';
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

      void emailService.sendEmailVerificationOTP(email, verification_code);

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
   * Send email verification OTP to current user
   */
  async sendEmailVerificationOTP(userId: number): Promise<{ status: 'sent' | 'not_found' | 'already_verified' | 'sent_fallback'; otp?: string }> {
    const user = await this.getUserById(userId);
    if (!user) {
      return { status: 'not_found' };
    }
    if (user.is_verified) {
      return { status: 'already_verified' };
    }

    const otp = generateSecureOTP();
    const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

    await query(
      `UPDATE users SET verification_code = $1, verification_code_expires_at = $2, updated_at = NOW()
       WHERE id = $3 AND deleted_at IS NULL;`,
      [otp, expiresAt, userId]
    );

    const sent = await emailService.sendEmailVerificationOTP(user.email, otp);
    if (sent) {
      return { status: 'sent' };
    }

    // Fallback: also insert an in-app notification and return the OTP so mobile verification works even without SMTP/Brevo
    try {
      await query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'system');`,
        [
          userId,
          'Mã OTP xác thực tài khoản UIRMS',
          `Mã OTP kích hoạt tài khoản công dân của bạn là: ${otp} (hiệu lực ${env.otpExpiryMinutes} phút).`,
        ]
      );
    } catch {
      // Ignore if notifications insert fails
    }

    return { status: 'sent_fallback', otp };
  }

  /**
   * Login or register citizen via VNeID eKYC (Level 2 Digital Identity)
   */
  async loginOrRegisterVNeID(input: {
    identity_number: string;
    full_name?: string;
    phone?: string;
  }): Promise<{ user: Omit<User, 'password_hash' | 'verification_code' | 'verification_code_expires_at'>; token: string }> {
    const cleanCccd = input.identity_number.trim();
    const parsedCccd = parseAndValidateCCCD(cleanCccd);
    const maskedCccd = `***${cleanCccd.slice(-4)}`;
    const vneidBio = parsedCccd.valid
      ? `Định danh VNeID Mức 2 · CCCD ${maskedCccd} · ${parsedCccd.provinceName} (${parsedCccd.gender}, ${parsedCccd.birthYear})`
      : `Đã định danh điện tử qua VNeID (Mức độ 2 · CCCD ${maskedCccd})`;

    const existing = await queryOne<User>(
      `SELECT * FROM users WHERE identity_number = $1 AND deleted_at IS NULL LIMIT 1;`,
      [cleanCccd]
    );

    let user: User;
    if (existing) {
      const updated = await queryOne<User>(
        `UPDATE users
         SET is_verified = true,
             verification_code = NULL,
             verification_code_expires_at = NULL,
             full_name = COALESCE(NULLIF($2, ''), full_name),
             bio = $3,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *;`,
        [existing.id, (input.full_name || '').trim(), vneidBio]
      );
      user = updated || { ...existing, is_verified: true };
    } else {
      const password_hash = await hashPassword(`VNeID@${cleanCccd}#2026`);
      const suffix = cleanCccd.slice(-6);
      const fallbackPhone = input.phone && /^0\d{9}$/.test(input.phone.trim())
        ? input.phone.trim()
        : `09${cleanCccd.slice(-8).padStart(8, '0')}`;
      const email = `vneid.${cleanCccd}@citizen.uirms.vn`;
      const fullName = (input.full_name || '').trim() || `Công dân VNeID (${suffix})`;

      const byPhoneOrEmail = await queryOne<User>(
        `SELECT * FROM users WHERE (phone = $1 OR email = $2) AND deleted_at IS NULL LIMIT 1;`,
        [fallbackPhone, email]
      );

      if (byPhoneOrEmail) {
        const updated = await queryOne<User>(
          `UPDATE users
           SET is_verified = true,
               identity_number = COALESCE(identity_number, $2),
               full_name = COALESCE(NULLIF($3, ''), full_name),
               bio = $4,
               updated_at = NOW()
           WHERE id = $1
           RETURNING *;`,
          [byPhoneOrEmail.id, cleanCccd, (input.full_name || '').trim(), vneidBio]
        );
        user = updated || { ...byPhoneOrEmail, is_verified: true };
      } else {
        const created = await query<User>(
          `INSERT INTO users (phone, email, password_hash, full_name, identity_number, bio, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6, true)
           RETURNING *;`,
          [fallbackPhone, email, password_hash, fullName, cleanCccd, vneidBio]
        );
        user = created[0]!;
      }
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: 'user',
    });

    return { user: stripSensitiveFields(user), token };
  }

  /**
   * Link and verify current logged-in citizen account via VNeID
   */
  async verifyUserWithVNeID(
    userId: number,
    identityNumber: string,
    fullName?: string
  ): Promise<Omit<User, 'password_hash' | 'verification_code' | 'verification_code_expires_at'> | null> {
    const cleanCccd = identityNumber.trim();
    const parsedCccd = parseAndValidateCCCD(cleanCccd);
    const maskedCccd = `***${cleanCccd.slice(-4)}`;
    const vneidBio = parsedCccd.valid
      ? `Định danh VNeID Mức 2 · CCCD ${maskedCccd} · ${parsedCccd.provinceName} (${parsedCccd.gender}, ${parsedCccd.birthYear})`
      : `Đã định danh điện tử qua VNeID (Mức độ 2 · CCCD ${maskedCccd})`;

    const updated = await queryOne<User>(
      `UPDATE users
       SET is_verified = true,
           identity_number = $2,
           verification_code = NULL,
           verification_code_expires_at = NULL,
           full_name = COALESCE(NULLIF($3, ''), full_name),
           bio = $4,
           updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *;`,
      [userId, cleanCccd, (fullName || '').trim(), vneidBio]
    );
    return updated ? stripSensitiveFields(updated) : null;
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
  async sendPasswordResetOTP(email: string): Promise<'sent' | 'not_found' | 'delivery_failed'> {
    const otp = generateSecureOTP();
    const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

    const result = await query(
      `UPDATE users SET verification_code = $1, verification_code_expires_at = $2, updated_at = NOW()
       WHERE email = $3 AND deleted_at IS NULL
       RETURNING id;`,
      [otp, expiresAt, email]
    );

    if (result.length === 0) {
      return 'not_found';
    }

    const sent = await emailService.sendPasswordResetEmail(email, otp);
    if (sent) {
      return 'sent';
    }

    await query(
      `UPDATE users
       SET verification_code = NULL, verification_code_expires_at = NULL, updated_at = NOW()
       WHERE email = $1 AND verification_code = $2;`,
      [email, otp]
    );
    return 'delivery_failed';
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
      phone?: string;
      bio?: string;
      avatar_url?: string;
    }
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.full_name !== undefined) {
      fields.push(`full_name = $${paramCount++}`);
      values.push(updates.full_name);
    }
    if (updates.phone !== undefined) {
      fields.push(`phone = $${paramCount++}`);
      values.push(updates.phone);
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

  async changeUserPassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<'not_found' | 'invalid_password' | 'updated'> {
    const user = await this.getUserById(userId);
    if (!user) {
      return 'not_found';
    }

    if (!(await comparePassword(currentPassword, user.password_hash))) {
      return 'invalid_password';
    }

    const passwordHash = await hashPassword(newPassword);
    const result = await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id;`,
      [passwordHash, userId]
    );

    return result.length > 0 ? 'updated' : 'not_found';
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
