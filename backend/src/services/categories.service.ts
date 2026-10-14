import { PoolClient } from 'pg';
import { query, queryOne, transaction } from '../config/database';
import { CategoryInput, CategoryResponse } from '../types/index';

interface CategoryDeleteResult {
    exists: boolean;
    reportCount: number;
}

export class CategoriesService {
    async getCategories(): Promise<CategoryResponse[]> {
        const rows = await query<CategoryResponse>(
            `SELECT c.id, c.name, c.description, c.icon, c.color, c.icon_url, c.color_code,
              c.severity_weight, c.is_active, c.created_at, c.updated_at,
              COUNT(i.id)::int AS "reportCount"
       FROM categories c
       LEFT JOIN incidents i ON i.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name ASC;`
        );
        return rows.map((row) => ({ ...row, reportCount: Number(row.reportCount) }));
    }

    async createCategory(input: CategoryInput): Promise<CategoryResponse | null> {
        return queryOne<CategoryResponse>(
            `INSERT INTO categories (name, icon, color)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, icon, color, icon_url, color_code,
                 severity_weight, is_active, created_at, updated_at,
                 0::int AS "reportCount";`,
            [input.name, input.icon ?? null, input.color ?? null]
        );
    }

    async updateCategory(categoryId: number, input: CategoryInput): Promise<CategoryResponse | null> {
        const updates: string[] = [];
        const values: unknown[] = [];

        if (input.name !== undefined) {
            values.push(input.name);
            updates.push(`name = $${values.length}`);
        }
        if (input.icon !== undefined) {
            values.push(input.icon);
            updates.push(`icon = $${values.length}`);
        }
        if (input.color !== undefined) {
            values.push(input.color);
            updates.push(`color = $${values.length}`);
        }

        if (updates.length === 0) return null;

        values.push(categoryId);
        return queryOne<CategoryResponse>(
            `UPDATE categories
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, name, description, icon, color, icon_url, color_code,
                 severity_weight, is_active, created_at, updated_at,
                 (SELECT COUNT(*)::int FROM incidents WHERE category_id = categories.id) AS "reportCount";`,
            values
        );
    }

    async deleteCategory(categoryId: number): Promise<CategoryDeleteResult> {
        return transaction(async (client: PoolClient) => {
            const category = await client.query<{ id: number }>(
                `SELECT id FROM categories WHERE id = $1 FOR UPDATE;`,
                [categoryId]
            );
            if (category.rowCount === 0) return { exists: false, reportCount: 0 };

            const usage = await client.query<{ count: number }>(
                `SELECT COUNT(*)::int AS count FROM incidents WHERE category_id = $1;`,
                [categoryId]
            );
            const reportCount = Number(usage.rows[0]?.count ?? 0);
            if (reportCount > 0) return { exists: true, reportCount };

            await client.query(`DELETE FROM categories WHERE id = $1;`, [categoryId]);
            return { exists: true, reportCount: 0 };
        });
    }
}

export const categoriesService = new CategoriesService();