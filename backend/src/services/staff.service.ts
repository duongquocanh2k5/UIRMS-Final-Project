import { randomUUID } from 'crypto';
import {
    CreateStaffInput,
    StaffActiveIncident,
    StaffDetailResponse,
    StaffListItem,
    StaffStatsSummaryResponse,
    UpdateStaffInput,
} from '../types/index';
import { query, queryOne } from '../config/database';
import { calculateOffset } from '../utils/helpers';
import { hashPassword } from '../utils/password';

export interface StaffPagination {
    page: number;
    limit: number;
}

export class StaffService {
    async getStaff(pagination: StaffPagination): Promise<{ staff: StaffListItem[]; total: number }> {
        const countRows = await query<{ count: string }>(
            `SELECT COUNT(*) AS count
       FROM admins
       WHERE role IN ('technician', 'manager') AND deleted_at IS NULL;`
        );
        const total = Number(countRows[0]?.count ?? 0);
        const offset = calculateOffset(pagination.page, pagination.limit);
        const staff = await query<StaffListItem>(
            `SELECT a.id,
              a.full_name AS name,
              a.role,
              d.name AS department,
              a.phone,
              a.avatar_url,
              a.is_active,
              (SELECT COUNT(*)::int
               FROM incidents i
               WHERE i.assigned_to = a.id
                 AND i.status IN ('assigned', 'in_progress')
                 AND i.deleted_at IS NULL) AS "inProgressCount",
              (SELECT COUNT(*)::int
               FROM incidents i
               WHERE i.assigned_to = a.id
                 AND i.status = 'completed'
                 AND i.deleted_at IS NULL) AS "completedCount"
       FROM admins a
    LEFT JOIN departments d ON d.id = a.department_id
       WHERE a.role IN ('technician', 'manager') AND a.deleted_at IS NULL
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $1 OFFSET $2;`,
            [pagination.limit, offset]
        );

        return {
            staff: staff.map((item) => ({
                ...item,
                inProgressCount: Number(item.inProgressCount),
                completedCount: Number(item.completedCount),
            })),
            total,
        };
    }

    async getStatsSummary(): Promise<StaffStatsSummaryResponse> {
        const [summary, department] = await Promise.all([
            queryOne<{ totalStaff: number; activeStaff: number }>(
                `SELECT COUNT(*) FILTER (WHERE role = 'technician')::int AS "totalStaff",
                COUNT(*) FILTER (WHERE role = 'technician' AND is_active = TRUE)::int AS "activeStaff"
         FROM admins
         WHERE deleted_at IS NULL;`
            ),
            queryOne<{ name: string; activeCount: number }>(
                `SELECT COALESCE(NULLIF(BTRIM(d.name), ''), 'Không xác định') AS name,
                  COUNT(*)::int AS "activeCount"
         FROM admins a
         JOIN incidents i ON i.assigned_to = a.id
              LEFT JOIN departments d ON d.id = a.department_id
         WHERE a.role IN ('technician', 'manager')
           AND a.deleted_at IS NULL
           AND i.deleted_at IS NULL
           AND i.status IN ('assigned', 'in_progress')
         GROUP BY COALESCE(NULLIF(BTRIM(d.name), ''), 'Không xác định')
         ORDER BY COUNT(*) DESC, name ASC
         LIMIT 1;`
            ),
        ]);

        return {
            totalStaff: Number(summary?.totalStaff ?? 0),
            activeStaff: Number(summary?.activeStaff ?? 0),
            busiestDepartment: {
                name: department?.name ?? 'Không xác định',
                activeCount: Number(department?.activeCount ?? 0),
            },
        };
    }

    async getStaffById(staffId: number): Promise<StaffDetailResponse | null> {
        const staff = await queryOne<Omit<StaffDetailResponse, 'activeIncidents'>>(
                        `SELECT a.id, a.username, a.full_name AS name, a.email, a.phone,
                            d.name AS department, a.avatar_url,
                            a.role, a.is_active, a.last_login, a.created_at, a.updated_at
             FROM admins a
             LEFT JOIN departments d ON d.id = a.department_id
             WHERE a.id = $1 AND a.role IN ('technician', 'manager') AND a.deleted_at IS NULL;`,
            [staffId]
        );

        if (!staff) return null;

        const activeIncidents = await query<StaffActiveIncident>(
            `SELECT i.id, i.title, i.description, c.name AS category_name,
              i.location_name, i.district, i.priority, i.status, i.created_at
       FROM incidents i
       LEFT JOIN categories c ON c.id = i.category_id
       WHERE i.assigned_to = $1
         AND i.status NOT IN ('completed', 'rejected')
         AND i.deleted_at IS NULL
       ORDER BY CASE i.priority
                  WHEN 'critical' THEN 1
                  WHEN 'high' THEN 2
                  WHEN 'medium' THEN 3
                  WHEN 'low' THEN 4
                  ELSE 5
                END,
                i.created_at DESC;`,
            [staffId]
        );

        return { ...staff, activeIncidents };
    }

    async createStaff(input: CreateStaffInput): Promise<Omit<StaffDetailResponse, 'activeIncidents'>> {
        const passwordHash = await hashPassword(input.password);
        const emailPrefix = input.email.split('@')[0] ?? 'staff';
        const usernamePrefix = emailPrefix
            .replace(/[^a-zA-Z0-9_.-]/g, '-')
            .slice(0, 88) || 'staff';
        const username = `${usernamePrefix}-${randomUUID().slice(0, 8)}`;

        const staff = await queryOne<Omit<StaffDetailResponse, 'activeIncidents'>>(
              `WITH department_row AS (
            INSERT INTO departments (name)
            SELECT $6
            WHERE $6 IS NOT NULL
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
          )
          INSERT INTO admins (username, email, password_hash, full_name, phone, department_id, role)
          VALUES ($1, $2, $3, $4, $5, (SELECT id FROM department_row), $7)
          RETURNING id, username, full_name AS name, email, phone,
                  (SELECT name FROM departments WHERE id = admins.department_id) AS department,
                  avatar_url, role, is_active, last_login, created_at, updated_at;`,
            [
                username,
                input.email,
                passwordHash,
                input.name,
                input.phone ?? null,
                input.department ?? null,
                input.role,
            ]
        );

        if (!staff) throw new Error('Failed to create staff member');
        return staff;
    }

    async updateStaff(staffId: number, input: UpdateStaffInput): Promise<Omit<StaffDetailResponse, 'activeIncidents'> | null> {
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
        if (input.department !== undefined) {
            let departmentId: number | null = null;
            if (input.department !== null) {
                const department = await queryOne<{ id: number }>(
                    `INSERT INTO departments (name)
                     VALUES ($1)
                     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                     RETURNING id;`,
                    [input.department]
                );
                if (!department) throw new Error('Failed to find or create department');
                departmentId = department.id;
            }
            values.push(departmentId);
            updates.push(`department_id = $${values.length}`);
        }
        if (input.is_active !== undefined) {
            values.push(input.is_active);
            updates.push(`is_active = $${values.length}`);
        }

        if (updates.length === 0) return null;

        values.push(staffId);
        return queryOne<Omit<StaffDetailResponse, 'activeIncidents'>>(
            `UPDATE admins
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
         AND role IN ('technician', 'manager')
         AND deleted_at IS NULL
    RETURNING id, username, full_name AS name, email, phone,
           (SELECT name FROM departments WHERE id = admins.department_id) AS department,
           avatar_url, role, is_active, last_login, created_at, updated_at;`,
            values
        );
    }
}

export const staffService = new StaffService();