/**
 * Category Model
 * Database schema and query helpers for Categories
 */

import { ICategory, ICreateCategoryInput, IUpdateCategoryInput } from './types';
import { query, queryOne } from '../config/database';

/**
 * Category database table schema
 */
export const CATEGORY_TABLE = 'categories';

export const CATEGORY_COLUMNS = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon_url: 'icon_url',
  color_code: 'color_code',
  severity_weight: 'severity_weight',
  is_active: 'is_active',
  created_at: 'created_at',
  updated_at: 'updated_at',
} as const;

/**
 * Category Model Class
 * Provides database methods for Category operations
 */
export class CategoryModel {
  /**
   * Create new category
   */
  static async create(input: ICreateCategoryInput): Promise<ICategory> {
    const { name, description, icon_url, color_code, severity_weight } = input;

    const result = await query<ICategory>(
      `INSERT INTO ${CATEGORY_TABLE} 
       (name, description, icon_url, color_code, severity_weight, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *;`,
      [name, description || null, icon_url || null, color_code || null, severity_weight]
    );

    return result[0]!;
  }

  /**
   * Find category by ID
   */
  static async findById(categoryId: number): Promise<ICategory | null> {
    return queryOne<ICategory>(
      `SELECT * FROM ${CATEGORY_TABLE} WHERE id = $1;`,
      [categoryId]
    );
  }

  /**
   * Find category by name
   */
  static async findByName(name: string): Promise<ICategory | null> {
    return queryOne<ICategory>(
      `SELECT * FROM ${CATEGORY_TABLE} WHERE LOWER(name) = LOWER($1);`,
      [name]
    );
  }

  /**
   * Get all active categories
   */
  static async getActive(limit = 100): Promise<ICategory[]> {
    return query<ICategory>(
      `SELECT * FROM ${CATEGORY_TABLE} 
       WHERE is_active = true
       ORDER BY name ASC
       LIMIT $1;`,
      [limit]
    );
  }

  /**
   * Get all categories
   */
  static async getAll(limit = 100): Promise<ICategory[]> {
    return query<ICategory>(
      `SELECT * FROM ${CATEGORY_TABLE} 
       ORDER BY name ASC
       LIMIT $1;`,
      [limit]
    );
  }

  /**
   * Get categories sorted by severity weight
   */
  static async getBySeverity(limit = 100): Promise<ICategory[]> {
    return query<ICategory>(
      `SELECT * FROM ${CATEGORY_TABLE} 
       WHERE is_active = true
       ORDER BY severity_weight DESC
       LIMIT $1;`,
      [limit]
    );
  }

  /**
   * Update category
   */
  static async update(categoryId: number, input: IUpdateCategoryInput): Promise<ICategory | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(input.description);
    }
    if (input.icon_url !== undefined) {
      updates.push(`icon_url = $${paramCount++}`);
      values.push(input.icon_url);
    }
    if (input.color_code !== undefined) {
      updates.push(`color_code = $${paramCount++}`);
      values.push(input.color_code);
    }
    if (input.severity_weight !== undefined) {
      updates.push(`severity_weight = $${paramCount++}`);
      values.push(input.severity_weight);
    }
    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(input.is_active);
    }

    if (updates.length === 0) {
      return this.findById(categoryId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(categoryId);

    const result = await query<ICategory>(
      `UPDATE ${CATEGORY_TABLE}
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *;`,
      values
    );

    return result[0] || null;
  }

  /**
   * Toggle category active status
   */
  static async toggleActive(categoryId: number): Promise<ICategory | null> {
    const result = await query<ICategory>(
      `UPDATE ${CATEGORY_TABLE}
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [categoryId]
    );

    return result[0] || null;
  }

  /**
   * Delete category
   */
  static async delete(categoryId: number): Promise<boolean> {
    const result = await query(
      `DELETE FROM ${CATEGORY_TABLE}
       WHERE id = $1
       RETURNING id;`,
      [categoryId]
    );

    return result.length > 0;
  }

  /**
   * Count total categories
   */
  static async count(activeOnly = false): Promise<number> {
    const whereClause = activeOnly ? 'WHERE is_active = true' : '';
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${CATEGORY_TABLE} ${whereClause};`
    );

    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * Search categories by name
   */
  static async search(searchTerm: string, limit = 20): Promise<ICategory[]> {
    return query<ICategory>(
      `SELECT * FROM ${CATEGORY_TABLE}
       WHERE LOWER(name) LIKE LOWER($1) OR LOWER(description) LIKE LOWER($1)
       AND is_active = true
       ORDER BY name ASC
       LIMIT $2;`,
      [`%${searchTerm}%`, limit]
    );
  }
}

export default CategoryModel;
