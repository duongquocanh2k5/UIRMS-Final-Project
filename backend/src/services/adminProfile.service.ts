import { query, queryOne } from '../config/database';
import { comparePassword, hashPassword } from '../utils/password';
import { AdminProfileResponse, UpdateAdminProfileInput } from '../types/index';

export class AdminProfileService {
    async recordPresence(adminId: number): Promise<boolean> {
        const result = await query(
            `UPDATE admins SET last_seen_at = NOW()
             WHERE id = $1 AND is_active = true AND deleted_at IS NULL
             RETURNING id;`,
            [adminId]
        );
        return result.length > 0;
    }

    async getProfile(adminId: number): Promise<AdminProfileResponse | null> {
        return queryOne<AdminProfileResponse>(
            `SELECT id, username, email, full_name AS name, phone, avatar_url,
              role, is_active, created_at
       FROM admins
       WHERE id = $1 AND deleted_at IS NULL;`,
            [adminId]
        );
    }

    async updateProfile(adminId: number, input: UpdateAdminProfileInput): Promise<AdminProfileResponse | null> {
        const updates: string[] = [];
        const values: unknown[] = [];

        if (input.name !== undefined) {
            values.push(input.name);
            updates.push(`full_name = $${values.length}`);
        }
        if (input.phone !== undefined) {
            values.push(input.phone);
            updates.push(`phone = $${values.length}`);
        }
        if (input.avatar_url !== undefined) {
            values.push(input.avatar_url);
            updates.push(`avatar_url = $${values.length}`);
        }

        if (updates.length === 0) return this.getProfile(adminId);

        values.push(adminId);
        return queryOne<AdminProfileResponse>(
            `UPDATE admins
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length} AND deleted_at IS NULL
       RETURNING id, username, email, full_name AS name, phone, avatar_url,
                 role, is_active, created_at;`,
            values
        );
    }

    async changePassword(adminId: number, currentPassword: string, newPassword: string): Promise<'not_found' | 'invalid_password' | 'updated'> {
        const admin = await queryOne<{ password_hash: string }>(
            `SELECT password_hash FROM admins WHERE id = $1 AND deleted_at IS NULL;`,
            [adminId]
        );
        if (!admin) return 'not_found';
        if (!(await comparePassword(currentPassword, admin.password_hash))) return 'invalid_password';

        const passwordHash = await hashPassword(newPassword);
        const updated = await query(
            `UPDATE admins SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id;`,
            [passwordHash, adminId]
        );
        return updated.length > 0 ? 'updated' : 'not_found';
    }
}

export const adminProfileService = new AdminProfileService();