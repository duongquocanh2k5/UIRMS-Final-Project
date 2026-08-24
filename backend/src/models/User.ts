/**
 * User Model
 * Database schema and query helpers for Users
 */

import { IUser, ICreateUserInput, IUpdateUserInput } from './types';
import { query, queryOne } from '../config/database';

/**
 * User database table schema
 */
export const USER_TABLE = 'users';

export const USER_COLUMNS = {
  id: 'id',
  phone: 'phone',
  email: 'email',
  password_hash: 'password_hash',
  full_name: 'full_name',
  avatar_url: 'avatar_url',
  is_verified: 'is_verified',
  verification_code: 'verification_code',
  bio: 'bio',
  created_at: 'created_at',
  updated_at: 'updated_at',
  deleted_at: 'deleted_at',
} as const;

/**
 * User Model Class
 * Provides database methods for User operations
 */
export class UserModel {
  /**
   * Create new user
   */
  static async create(input: ICreateUserInput & { password_hash: string }): Promise<IUser> {
    const { phone, email, password_hash, full_name, identity_number, bio } = input;

    const result = await query<IUser>(
      `INSERT INTO ${USER_TABLE} (phone, email, password_hash, full_name, identity_number, bio)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [phone, email, password_hash, full_name, identity_number, bio || null]
    );

    return result[0]!;
  }

  /**
   * Find user by ID
   */
  static async findById(userId: number): Promise<IUser | null> {
    return queryOne<IUser>(
      `SELECT * FROM ${USER_TABLE} WHERE id = $1 AND deleted_at IS NULL;`,
      [userId]
    );
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<IUser | null> {
    return queryOne<IUser>(
      `SELECT * FROM ${USER_TABLE} WHERE email = $1 AND deleted_at IS NULL;`,
      [email]
    );
  }

  /**
   * Find user by phone
   */
  static async findByPhone(phone: string): Promise<IUser | null> {
    return queryOne<IUser>(
      `SELECT * FROM ${USER_TABLE} WHERE phone = $1 AND deleted_at IS NULL;`,
      [phone]
    );
  }

  /**
   * Find user by email or phone
   */
  static async findByEmailOrPhone(emailOrPhone: string): Promise<IUser | null> {
    return queryOne<IUser>(
      `SELECT * FROM ${USER_TABLE} WHERE (email = $1 OR phone = $1) AND deleted_at IS NULL;`,
      [emailOrPhone]
    );
  }

  /**
   * Update user
   */
  static async update(userId: number, input: IUpdateUserInput): Promise<IUser | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(input.full_name);
    }
    if (input.avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(input.avatar_url);
    }
    if (input.bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(input.bio);
    }

    if (updates.length === 0) {
      return this.findById(userId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query<IUser>(
      `UPDATE ${USER_TABLE}
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *;`,
      values
    );

    return result[0] || null;
  }

  /**
   * Soft delete user
   */
  static async delete(userId: number): Promise<boolean> {
    const result = await query(
      `UPDATE ${USER_TABLE}
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id;`,
      [userId]
    );

    return result.length > 0;
  }

  /**
   * Verify user email
   */
  static async verifyEmail(userId: number): Promise<IUser | null> {
    const result = await query<IUser>(
      `UPDATE ${USER_TABLE}
       SET is_verified = true, verification_code = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [userId]
    );

    return result[0] || null;
  }

  /**
   * Update verification code
   */
  static async updateVerificationCode(userId: number, code: string): Promise<IUser | null> {
    const result = await query<IUser>(
      `UPDATE ${USER_TABLE}
       SET verification_code = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *;`,
      [code, userId]
    );

    return result[0] || null;
  }

  /**
   * Count total users
   */
  static async count(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${USER_TABLE} WHERE deleted_at IS NULL;`
    );

    return parseInt(result[0]?.count || '0', 10);
  }
}

export default UserModel;
