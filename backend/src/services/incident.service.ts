/**
 * Incident Service
 * Handles CRUD operations for incidents
 */

import {
  Incident,
  CreateIncidentInput,
  UpdateIncidentInput,
  IncidentFilters,
  PaginationParams,
} from '../types/index';
import { query, queryOne } from '../config/database';
import { calculateOffset } from '../utils/helpers';

export class IncidentService {
  /**
   * Create new incident
   */
  async createIncident(userId: number, input: CreateIncidentInput): Promise<Incident> {
    const { category_id, title, description, location_name, district, latitude, longitude, priority } = input;

    const result = await query<Incident>(
      `INSERT INTO incidents (user_id, category_id, title, description, location_name, district, location_point, priority)
       VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_Point($7, $8), 4326), COALESCE($9, 'medium'))
       RETURNING *;`,
      [userId, category_id, title, description, location_name, district ?? null, longitude, latitude, priority]
    );

    return result[0]!;
  }

  /**
   * Get incident by ID
   */
  async getIncidentById(incidentId: number, assignedTo?: number): Promise<Incident | null> {
    const assignmentScope = assignedTo === undefined
      ? ''
      : 'AND (assigned_to = $2 OR assigned_technician = $2)';
    return queryOne<Incident>(
      `SELECT incidents.*,
              COALESCE((SELECT json_agg(image_url ORDER BY created_at)
                        FROM incident_images WHERE incident_id = incidents.id), '[]') AS image_urls
       FROM incidents WHERE id = $1 AND deleted_at IS NULL ${assignmentScope};`,
      assignedTo === undefined ? [incidentId] : [incidentId, assignedTo]
    );
  }

  async addIncidentImage(incidentId: number, userId: number, imageUrl: string): Promise<boolean> {
    const result = await query(
      `INSERT INTO incident_images (incident_id, image_url, uploaded_by)
       SELECT id, $3, $2 FROM incidents
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id;`,
      [incidentId, userId, imageUrl]
    );
    return result.length > 0;
  }

  /**
   * Get all incidents with filters and pagination
   */
  async getIncidents(
    filters: IncidentFilters,
    pagination: PaginationParams
  ): Promise<{ incidents: Incident[]; total: number }> {
    let whereClause = 'WHERE deleted_at IS NULL';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.status) {
      whereClause += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.category_id !== undefined) {
      whereClause += ` AND category_id = $${paramCount}`;
      params.push(filters.category_id);
      paramCount++;
    }

    if (filters.user_id !== undefined) {
      whereClause += ` AND user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }

    if (filters.assigned_to !== undefined) {
      whereClause += ` AND (assigned_to = $${paramCount} OR assigned_technician = $${paramCount})`;
      params.push(filters.assigned_to);
      paramCount++;
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents ${whereClause};`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0', 10);

    // Get paginated results
    const offset = calculateOffset(pagination.page, pagination.limit);
    const incidents = await query<Incident>(
      `SELECT incidents.*,
              COALESCE((SELECT json_agg(image_url ORDER BY created_at)
                        FROM incident_images WHERE incident_id = incidents.id), '[]') AS image_urls
       FROM incidents ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1};`,
      [...params, pagination.limit, offset]
    );

    return { incidents, total };
  }

  /**
   * Update incident
   */
  async updateIncident(
    incidentId: number,
    input: UpdateIncidentInput
  ): Promise<Incident | null> {
    const { status, priority, assigned_to, assigned_technician } = input;

    let updateClause = 'SET updated_at = NOW()';
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      updateClause += `, status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      updateClause += `, priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (assigned_to !== undefined) {
      updateClause += `, assigned_to = $${paramCount}`;
      params.push(assigned_to);
      paramCount++;
    }

    if (assigned_technician !== undefined) {
      updateClause += `, assigned_technician = $${paramCount}`;
      params.push(assigned_technician);
      paramCount++;
    }

    params.push(incidentId);

    return queryOne<Incident>(
      `UPDATE incidents ${updateClause} WHERE id = $${paramCount} RETURNING *;`,
      params
    );
  }

  /**
   * Find incidents near location
   */
  async getIncidentsNearLocation(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000,
    assignedTo?: number
  ): Promise<Incident[]> {
    const assignmentScope = assignedTo === undefined
      ? ''
      : 'AND (assigned_to = $4 OR assigned_technician = $4)';
    return query<Incident>(
      `SELECT * FROM incidents
       WHERE ST_DWithin(
         location_point,
         ST_SetSRID(ST_Point($1, $2), 4326),
         $3
       )
      AND deleted_at IS NULL ${assignmentScope}
       ORDER BY created_at DESC;`,
      assignedTo === undefined ? [longitude, latitude, radiusMeters] : [longitude, latitude, radiusMeters, assignedTo]
    );
  }

  /**
   * Mark incident as completed
   */
  async markCompleted(incidentId: number): Promise<Incident | null> {
    return queryOne<Incident>(
      `UPDATE incidents 
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *;`,
      [incidentId]
    );
  }

  /**
   * Delete incident (soft delete)
   */
  async deleteIncident(incidentId: number, userId: number): Promise<boolean> {
    const result = await query(
      `UPDATE incidents 
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
         AND deleted_at IS NULL
       RETURNING id;`,
      [incidentId, userId]
    );

    return result.length > 0;
  }

  /**
   * Get incident statistics
   */
  async getIncidentStats(assignedTo?: number): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const assignmentScope = assignedTo === undefined
      ? ''
      : 'AND (assigned_to = $1 OR assigned_technician = $1)';
    const categoryAssignmentScope = assignedTo === undefined
      ? ''
      : 'AND (i.assigned_to = $1 OR i.assigned_technician = $1)';
    const params = assignedTo === undefined ? [] : [assignedTo];
    // Total incidents
    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE deleted_at IS NULL ${assignmentScope};`,
      params
    );
    const total = parseInt(totalResult[0]?.count || '0', 10);

    // By status
    const byStatusResult = await query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count FROM incidents WHERE deleted_at IS NULL ${assignmentScope} GROUP BY status;`,
      params
    );
    const byStatus: Record<string, number> = {};
    byStatusResult.forEach((row) => {
      byStatus[row.status] = parseInt(row.count, 10);
    });

    // By priority
    const byPriorityResult = await query<{ priority: string; count: string }>(
      `SELECT priority, COUNT(*) as count FROM incidents WHERE deleted_at IS NULL ${assignmentScope} GROUP BY priority;`,
      params
    );
    const byPriority: Record<string, number> = {};
    byPriorityResult.forEach((row) => {
      byPriority[row.priority] = parseInt(row.count, 10);
    });

    // By category
    const byCategoryResult = await query<{ name: string; count: string }>(
      `SELECT c.name, COUNT(i.id) as count 
       FROM incidents i
       JOIN categories c ON i.category_id = c.id
      WHERE i.deleted_at IS NULL ${categoryAssignmentScope}
      GROUP BY c.name;`,
      params
    );
    const byCategory: Record<string, number> = {};
    byCategoryResult.forEach((row) => {
      byCategory[row.name] = parseInt(row.count, 10);
    });

    return { total, byStatus, byPriority, byCategory };
  }

  /**
   * Get heatmap data (for visualization)
   */
  async getHeatmapData(assignedTo?: number): Promise<Array<{ lat: number; lng: number; count: number }>> {
    const assignmentScope = assignedTo === undefined
      ? ''
      : 'AND (assigned_to = $1 OR assigned_technician = $1)';
    return query<{ lat: number; lng: number; count: number }>(
      `SELECT 
         ROUND(ST_Y(location_point)::numeric, 2) as lat,
         ROUND(ST_X(location_point)::numeric, 2) as lng,
         COUNT(*) as count
       FROM incidents
      WHERE deleted_at IS NULL AND location_point IS NOT NULL ${assignmentScope}
       GROUP BY ROUND(ST_Y(location_point)::numeric, 2), ROUND(ST_X(location_point)::numeric, 2)
      ORDER BY count DESC;`,
      assignedTo === undefined ? [] : [assignedTo]
    );
  }
}

export const incidentService = new IncidentService();
