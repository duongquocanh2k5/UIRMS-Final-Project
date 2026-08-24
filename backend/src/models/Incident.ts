/**
 * Incident Model
 * Database schema and query helpers for Incidents
 */

import { IIncident, ICreateIncidentInput, IUpdateIncidentInput } from './types';
import { query, queryOne } from '../config/database';
import { IncidentStatus } from '../config/constants';

/**
 * Incident database table schema
 */
export const INCIDENT_TABLE = 'incidents';

export const INCIDENT_COLUMNS = {
  id: 'id',
  user_id: 'user_id',
  category_id: 'category_id',
  title: 'title',
  description: 'description',
  location_name: 'location_name',
  location_point: 'location_point',
  priority: 'priority',
  status: 'status',
  assigned_to: 'assigned_to',
  assigned_technician: 'assigned_technician',
  ai_confidence: 'ai_confidence',
  ai_suggested_category: 'ai_suggested_category',
  is_duplicate: 'is_duplicate',
  duplicate_of: 'duplicate_of',
  created_at: 'created_at',
  updated_at: 'updated_at',
  completed_at: 'completed_at',
  deleted_at: 'deleted_at',
} as const;

/**
 * Incident Model Class
 * Provides database methods for Incident operations
 */
export class IncidentModel {
  /**
   * Create new incident
   */
  static async create(userId: number, input: ICreateIncidentInput): Promise<IIncident> {
    const {
      category_id,
      title,
      description,
      location_name,
      latitude,
      longitude,
      priority = 'medium',
    } = input;

    const result = await query<IIncident>(
      `INSERT INTO ${INCIDENT_TABLE} 
       (user_id, category_id, title, description, location_name, location_point, priority, status)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_Point($6, $7), 4326), $8, $9)
       RETURNING *;`,
      [
        userId,
        category_id,
        title,
        description || null,
        location_name || null,
        longitude,
        latitude,
        priority,
        IncidentStatus.PENDING,
      ]
    );

    return result[0]!;
  }

  /**
   * Find incident by ID
   */
  static async findById(incidentId: number): Promise<IIncident | null> {
    return queryOne<IIncident>(
      `SELECT * FROM ${INCIDENT_TABLE} WHERE id = $1 AND deleted_at IS NULL;`,
      [incidentId]
    );
  }

  /**
   * Find all incidents by user ID
   */
  static async findByUserId(userId: number, limit = 20, offset = 0): Promise<IIncident[]> {
    return query<IIncident>(
      `SELECT * FROM ${INCIDENT_TABLE} 
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3;`,
      [userId, limit, offset]
    );
  }

  /**
   * Find all incidents by status
   */
  static async findByStatus(status: IncidentStatus, limit = 20, offset = 0): Promise<IIncident[]> {
    return query<IIncident>(
      `SELECT * FROM ${INCIDENT_TABLE} 
       WHERE status = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3;`,
      [status, limit, offset]
    );
  }

  /**
   * Find all incidents by category
   */
  static async findByCategory(categoryId: number, limit = 20, offset = 0): Promise<IIncident[]> {
    return query<IIncident>(
      `SELECT * FROM ${INCIDENT_TABLE} 
       WHERE category_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3;`,
      [categoryId, limit, offset]
    );
  }

  /**
   * Find incidents within radius of coordinates (requires PostGIS)
   */
  static async findNearby(
    latitude: number,
    longitude: number,
    radiusMeters = 5000
  ): Promise<IIncident[]> {
    return query<IIncident>(
      `SELECT * FROM ${INCIDENT_TABLE}
       WHERE ST_DistanceSphere(location_point, ST_Point($1, $2)) <= $3
       AND deleted_at IS NULL
       ORDER BY created_at DESC;`,
      [longitude, latitude, radiusMeters]
    );
  }

  /**
   * Update incident
   */
  static async update(incidentId: number, input: IUpdateIncidentInput): Promise<IIncident | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(input.description);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(input.status);
    }
    if (input.priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(input.priority);
    }
    if (input.assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount++}`);
      values.push(input.assigned_to);
    }
    if (input.assigned_technician !== undefined) {
      updates.push(`assigned_technician = $${paramCount++}`);
      values.push(input.assigned_technician);
    }

    if (updates.length === 0) {
      return this.findById(incidentId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(incidentId);

    const result = await query<IIncident>(
      `UPDATE ${INCIDENT_TABLE}
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *;`,
      values
    );

    return result[0] || null;
  }

  /**
   * Mark as completed
   */
  static async markCompleted(incidentId: number): Promise<IIncident | null> {
    const result = await query<IIncident>(
      `UPDATE ${INCIDENT_TABLE}
       SET status = $1, completed_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *;`,
      [IncidentStatus.COMPLETED, incidentId]
    );

    return result[0] || null;
  }

  /**
   * Soft delete incident
   */
  static async delete(incidentId: number): Promise<boolean> {
    const result = await query(
      `UPDATE ${INCIDENT_TABLE}
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id;`,
      [incidentId]
    );

    return result.length > 0;
  }

  /**
   * Count total incidents
   */
  static async count(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${INCIDENT_TABLE} WHERE deleted_at IS NULL;`
    );

    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * Count incidents by status
   */
  static async countByStatus(status: IncidentStatus): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${INCIDENT_TABLE} WHERE status = $1 AND deleted_at IS NULL;`,
      [status]
    );

    return parseInt(result[0]?.count || '0', 10);
  }
}

export default IncidentModel;
