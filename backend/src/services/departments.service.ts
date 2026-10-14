import { PoolClient } from 'pg';
import { query, queryOne, transaction } from '../config/database';
import { DepartmentInput, DepartmentResponse } from '../types/index';

interface DepartmentDeleteResult {
    exists: boolean;
    staffCount: number;
}

export class DepartmentsService {
    async getDepartments(): Promise<DepartmentResponse[]> {
        const rows = await query<DepartmentResponse>(
            `SELECT d.id, d.name, d.area, d.lead_admin_id,
              lead.full_name AS "leadName",
              COUNT(staff.id) FILTER (WHERE staff.deleted_at IS NULL)::int AS "staffCount",
              d.created_at
       FROM departments d
       LEFT JOIN admins lead ON lead.id = d.lead_admin_id
       LEFT JOIN admins staff ON staff.department_id = d.id
       GROUP BY d.id, lead.full_name
       ORDER BY d.name ASC;`
        );
        return rows.map((row) => ({ ...row, staffCount: Number(row.staffCount) }));
    }

    async createDepartment(input: DepartmentInput): Promise<DepartmentResponse | null> {
        return queryOne<DepartmentResponse>(
            `INSERT INTO departments (name, area, lead_admin_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, area, lead_admin_id,
                 (SELECT full_name FROM admins WHERE id = departments.lead_admin_id) AS "leadName",
                 (SELECT COUNT(*)::int FROM admins WHERE department_id = departments.id AND deleted_at IS NULL) AS "staffCount",
                 created_at;`,
            [input.name, input.area ?? null, input.lead_admin_id ?? null]
        );
    }

    async updateDepartment(departmentId: number, input: DepartmentInput): Promise<DepartmentResponse | null> {
        const updates: string[] = [];
        const values: unknown[] = [];

        if (input.name !== undefined) {
            values.push(input.name);
            updates.push(`name = $${values.length}`);
        }
        if (input.area !== undefined) {
            values.push(input.area);
            updates.push(`area = $${values.length}`);
        }
        if (input.lead_admin_id !== undefined) {
            values.push(input.lead_admin_id);
            updates.push(`lead_admin_id = $${values.length}`);
        }

        if (updates.length === 0) return null;

        values.push(departmentId);
        return queryOne<DepartmentResponse>(
            `UPDATE departments
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, name, area, lead_admin_id,
                 (SELECT full_name FROM admins WHERE id = departments.lead_admin_id) AS "leadName",
                 (SELECT COUNT(*)::int FROM admins WHERE department_id = departments.id AND deleted_at IS NULL) AS "staffCount",
                 created_at;`,
            values
        );
    }

    async deleteDepartment(departmentId: number): Promise<DepartmentDeleteResult> {
        return transaction(async (client: PoolClient) => {
            const department = await client.query<{ id: number }>(
                `SELECT id FROM departments WHERE id = $1 FOR UPDATE;`,
                [departmentId]
            );
            if (department.rowCount === 0) return { exists: false, staffCount: 0 };

            const usage = await client.query<{ count: number }>(
                `SELECT COUNT(*)::int AS count FROM admins WHERE department_id = $1;`,
                [departmentId]
            );
            const staffCount = Number(usage.rows[0]?.count ?? 0);
            if (staffCount > 0) return { exists: true, staffCount };

            await client.query(`DELETE FROM departments WHERE id = $1;`, [departmentId]);
            return { exists: true, staffCount: 0 };
        });
    }
}

export const departmentsService = new DepartmentsService();