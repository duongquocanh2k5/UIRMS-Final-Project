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
import { aiService, AIAnalysisResult } from './ai.service';

export class IncidentService {
  /**
   * Create new incident
   */
  async createIncident(userId: number, input: CreateIncidentInput): Promise<Incident> {
    const { category_id, title, description, location_name, district, latitude, longitude, priority } = input;

    const result = await query<Incident>(
      `WITH new_incident AS (
         INSERT INTO incidents (user_id, category_id, title, description, location_name, district, location_point, priority)
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_Point($7, $8), 4326), COALESCE($9, 'medium'))
         RETURNING *
       ),
       duplicate_candidate AS (
         SELECT existing.id
         FROM incidents existing
         CROSS JOIN new_incident created
         WHERE existing.id <> created.id
           AND existing.deleted_at IS NULL
           AND existing.category_id = created.category_id
           AND existing.status NOT IN ('completed', 'rejected')
           AND ST_DWithin(
             existing.location_point::GEOGRAPHY,
             ST_SetSRID(ST_MakePoint($7, $8), 4326)::GEOGRAPHY,
             50
           )
         ORDER BY existing.created_at ASC
         LIMIT 1
       ),
       updated_incident AS (
         UPDATE incidents
         SET is_duplicate = TRUE,
             duplicate_of = duplicate_candidate.id,
             updated_at = NOW()
         FROM duplicate_candidate
         WHERE incidents.id = (SELECT id FROM new_incident)
         RETURNING incidents.*
       )
       SELECT * FROM updated_incident
       UNION ALL
       SELECT * FROM new_incident
       WHERE NOT EXISTS (SELECT 1 FROM duplicate_candidate)
       LIMIT 1;`,
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
    const row = await queryOne<any>(
      `SELECT incidents.*,
              categories.name AS category_name,
              ROUND(ST_Y(incidents.location_point)::numeric, 6) AS latitude,
              ROUND(ST_X(incidents.location_point)::numeric, 6) AS longitude,
              (
                SELECT ic.comment
                FROM incident_comments ic
                WHERE ic.incident_id = incidents.id AND ic.deleted_at IS NULL
                ORDER BY ic.updated_at DESC, ic.id DESC
                LIMIT 1
              ) AS latest_citizen_comment,
              (
                SELECT COALESCE(ic.updated_at, ic.created_at)
                FROM incident_comments ic
                WHERE ic.incident_id = incidents.id AND ic.deleted_at IS NULL
                ORDER BY ic.updated_at DESC, ic.id DESC
                LIMIT 1
              ) AS citizen_feedback_at,
              COALESCE((SELECT json_agg(json_build_object(
                          'id', id,
                          'image_url', CASE WHEN image_url LIKE 'data:%' THEN '/api/incidents/images/' || id::text ELSE image_url END,
                          'is_before', COALESCE(is_before, true),
                          'created_at', created_at
                        ) ORDER BY created_at ASC, id ASC)
                        FROM incident_images WHERE incident_id = incidents.id), '[]') AS images,
              COALESCE((SELECT json_agg(
                          CASE WHEN image_url LIKE 'data:%' THEN '/api/incidents/images/' || id::text ELSE image_url END
                          ORDER BY created_at ASC, id ASC
                        )
                        FROM incident_images WHERE incident_id = incidents.id), '[]') AS image_urls
       FROM incidents
       LEFT JOIN categories ON categories.id = incidents.category_id
       WHERE incidents.id = $1 AND incidents.deleted_at IS NULL ${assignmentScope};`,
      assignedTo === undefined ? [incidentId] : [incidentId, assignedTo]
    );
    if (!row) return null;

    if (row.latest_citizen_comment) {
      const trimmed = String(row.latest_citizen_comment).trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          const rating = Number(parsed?.rating);
          row.citizen_rating = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
          row.citizen_feedback = typeof parsed?.feedback === 'string' && parsed.feedback.trim() ? parsed.feedback.trim() : null;
        } catch {
          row.citizen_rating = null;
          row.citizen_feedback = trimmed;
        }
      } else {
        row.citizen_rating = null;
        row.citizen_feedback = trimmed;
      }
    } else {
      row.citizen_rating = null;
      row.citizen_feedback = null;
    }
    delete row.latest_citizen_comment;

    return row;
  }

  /**
   * Submit or update citizen rating & feedback for a completed incident
   */
  async submitCitizenFeedback(
    incidentId: number,
    userId: number,
    rating: number,
    feedback?: string
  ): Promise<
    | { status: 'ok'; data: { citizen_rating: number; citizen_feedback: string | null; citizen_feedback_at: string } }
    | { status: 'not_found' }
    | { status: 'not_completed' }
  > {
    const incident = await queryOne<{ id: number; user_id: number; status: string }>(
      `SELECT id, user_id, status FROM incidents WHERE id = $1 AND deleted_at IS NULL;`,
      [incidentId]
    );

    if (!incident || incident.user_id !== userId) {
      return { status: 'not_found' };
    }

    if (incident.status !== 'completed') {
      return { status: 'not_completed' };
    }

    const cleanFeedback = feedback?.trim() ? feedback.trim() : null;
    const serialized = JSON.stringify({
      rating,
      feedback: cleanFeedback || '',
    });

    const existing = await queryOne<{ id: number }>(
      `SELECT id FROM incident_comments
       WHERE incident_id = $1 AND user_id = $2 AND deleted_at IS NULL
       ORDER BY id DESC LIMIT 1;`,
      [incidentId, userId]
    );

    let feedbackAt: string = new Date().toISOString();
    if (existing) {
      const updated = await queryOne<{ updated_at: Date }>(
        `UPDATE incident_comments
         SET comment = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING updated_at;`,
        [serialized, existing.id]
      );
      if (updated?.updated_at) {
        feedbackAt = new Date(updated.updated_at).toISOString();
      }
    } else {
      const inserted = await queryOne<{ created_at: Date }>(
        `INSERT INTO incident_comments (incident_id, user_id, comment)
         VALUES ($1, $2, $3)
         RETURNING created_at;`,
        [incidentId, userId, serialized]
      );
      if (inserted?.created_at) {
        feedbackAt = new Date(inserted.created_at).toISOString();
      }
    }

    return {
      status: 'ok',
      data: {
        citizen_rating: rating,
        citizen_feedback: cleanFeedback,
        citizen_feedback_at: feedbackAt,
      },
    };
  }

  async getIncidentImageRaw(imageId: number): Promise<{ id: number; image_url: string } | null> {
    return queryOne<{ id: number; image_url: string }>(
      `SELECT id, image_url FROM incident_images WHERE id = $1 LIMIT 1;`,
      [imageId]
    );
  }

  async addIncidentImage(
    incidentId: number,
    userId: number,
    imageUrl: string,
    imageSource: string | { buffer: Buffer; mimeType: string }
  ): Promise<{ image_id: number; ai_analysis: AIAnalysisResult | null } | null> {
    const savedImage = await queryOne<{ id: number }>(
      `INSERT INTO incident_images (incident_id, image_url, uploaded_by, is_before)
       SELECT id, $3, $2, TRUE FROM incidents
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id;`,
      [incidentId, userId, imageUrl]
    );
    if (!savedImage) {
      return null;
    }

    // Run AI vision analysis asynchronously in the background so image upload responds immediately
    void (async () => {
      try {
        const [incident, categories] = await Promise.all([
          queryOne<{ title: string; description: string | null; category_name: string | null }>(
            `SELECT i.title, i.description, c.name AS category_name
             FROM incidents i
             LEFT JOIN categories c ON c.id = i.category_id
             WHERE i.id = $1 AND i.deleted_at IS NULL;`,
            [incidentId]
          ),
          query<{ id: number; name: string }>(
            `SELECT id, name FROM categories ORDER BY id;`
          ),
        ]);

        if (!incident) return;

        const analysis = await aiService.analyzeIncidentImage(
          imageSource,
          incident.title,
          incident.description || undefined,
          categories,
          incident.category_name || undefined
        );

        if (analysis) {
          try {
            await query(
              `UPDATE incident_images SET ai_analysis = $1::jsonb WHERE id = $2;`,
              [JSON.stringify(analysis), savedImage.id]
            );
          } catch (error) {
            console.error('Failed to save AI analysis for incident image:', error);
          }

          try {
            await query(
              `UPDATE incidents
               SET ai_confidence = $1, ai_suggested_category = $2, updated_at = NOW()
               WHERE id = $3 AND deleted_at IS NULL;`,
              [analysis.confidence, analysis.suggested_category_id, incidentId]
            );
          } catch (error) {
            console.error('Failed to update incident with AI analysis:', error);
          }
        }
      } catch (error) {
        console.error('Failed to analyze uploaded incident image:', error);
      }
    })();

    return { image_id: savedImage.id, ai_analysis: null };
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
              categories.name AS category_name,
              ROUND(ST_Y(incidents.location_point)::numeric, 6) AS latitude,
              ROUND(ST_X(incidents.location_point)::numeric, 6) AS longitude,
              COALESCE((SELECT json_agg(json_build_object(
                          'id', id,
                          'image_url', CASE WHEN image_url LIKE 'data:%' THEN '/api/incidents/images/' || id::text ELSE image_url END,
                          'is_before', COALESCE(is_before, true),
                          'created_at', created_at
                        ) ORDER BY created_at ASC, id ASC)
                        FROM incident_images WHERE incident_id = incidents.id), '[]') AS images,
              COALESCE((SELECT json_agg(
                          CASE WHEN image_url LIKE 'data:%' THEN '/api/incidents/images/' || id::text ELSE image_url END
                          ORDER BY created_at ASC, id ASC
                        )
                        FROM incident_images WHERE incident_id = incidents.id), '[]') AS image_urls
       FROM incidents
       LEFT JOIN categories ON categories.id = incidents.category_id
       ${whereClause}
       ORDER BY incidents.created_at DESC
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
    const { title, description, category_id, location_name, status, priority, assigned_to, assigned_technician } = input;

    let updateClause = 'SET updated_at = NOW()';
    const params: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updateClause += `, title = $${paramCount}`;
      params.push(title);
      paramCount++;
    }

    if (description !== undefined) {
      updateClause += `, description = $${paramCount}`;
      params.push(description);
      paramCount++;
    }

    if (category_id !== undefined) {
      updateClause += `, category_id = $${paramCount}`;
      params.push(category_id);
      paramCount++;
    }

    if (location_name !== undefined) {
      updateClause += `, location_name = $${paramCount}`;
      params.push(location_name);
      paramCount++;
    }

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
      `UPDATE incidents ${updateClause} WHERE id = $${paramCount} AND deleted_at IS NULL RETURNING *;`,
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
         location_point::GEOGRAPHY,
         ST_SetSRID(ST_Point($1, $2), 4326)::GEOGRAPHY,
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
         AND status = 'pending' AND deleted_at IS NULL
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
