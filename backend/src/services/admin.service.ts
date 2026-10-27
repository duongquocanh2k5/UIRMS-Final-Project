/**
 * Admin Service
 * Handles admin-level business logic
 */

import { query, queryOne, transaction } from '../config/database';
import { Incident, PaginationParams, IncidentFilters } from '../types/index';
import { calculateOffset } from '../utils/helpers';

interface AdminIncidentUpdate {
  assigned_technician?: number | null;
  assigned_to?: number | null;
  priority?: string;
}

/**
 * Maps period string to interval days (whitelist to prevent SQL injection)
 */
function getIntervalDays(period: string): number {
  switch (period) {
    case 'day': return 1;
    case 'week': return 7;
    case 'month': return 30;
    default: return 7;
  }
}

export class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<{
    totalIncidents: number;
    newIncidents: number;
    openIncidents: number;
    inProgressIncidents: number;
    completedIncidents: number;
    urgentIncidents: number;
    averageResolutionTime: string;
    highPriorityCount: number;
  }> {
    const total = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE deleted_at IS NULL;`
    );

    const open = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE status = 'pending' AND deleted_at IS NULL;`
    );

    const inProgress = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE status = 'in_progress' AND deleted_at IS NULL;`
    );

    const completed = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE status = 'completed' AND deleted_at IS NULL;`
    );

    const urgent = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE priority = 'critical' AND deleted_at IS NULL;`
    );

    const avgTime = await query<{ avg_time: string }>(
      `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_time
       FROM incidents 
       WHERE status = 'completed' AND completed_at IS NOT NULL AND deleted_at IS NULL;`
    );

    const highPriority = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE priority = 'high' AND deleted_at IS NULL;`
    );

    return {
      totalIncidents: parseInt(total[0]?.count || '0', 10),
      newIncidents: parseInt(open[0]?.count || '0', 10),
      openIncidents: parseInt(open[0]?.count || '0', 10),
      inProgressIncidents: parseInt(inProgress[0]?.count || '0', 10),
      completedIncidents: parseInt(completed[0]?.count || '0', 10),
      urgentIncidents: parseInt(urgent[0]?.count || '0', 10),
      averageResolutionTime: avgTime[0]?.avg_time ? `${parseFloat(avgTime[0].avg_time).toFixed(2)} hours` : 'N/A',
      highPriorityCount: parseInt(highPriority[0]?.count || '0', 10),
    };
  }

  /**
   * Get all incidents with admin details (user, category, etc)
   */
  async getAllIncidentsWithDetails(
    filters: IncidentFilters,
    pagination: PaginationParams,
    requester?: { id: number; role: string }
  ): Promise<{ incidents: any[]; total: number }> {
    let whereClause = 'WHERE i.deleted_at IS NULL';
    const params: any[] = [];
    let paramCount = 1;

    if (requester?.role === 'technician') {
      whereClause += ` AND (i.assigned_to = $${paramCount} OR i.assigned_technician = $${paramCount})`;
      params.push(requester.id);
      paramCount++;
    }

    if (filters.status) {
      whereClause += ` AND i.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.priority) {
      whereClause += ` AND i.priority = $${paramCount}`;
      params.push(filters.priority);
      paramCount++;
    }

    if (filters.category_id !== undefined) {
      whereClause += ` AND i.category_id = $${paramCount}`;
      params.push(filters.category_id);
      paramCount++;
    }

    if (filters.search) {
      whereClause += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount} OR CAST(i.id AS TEXT) ILIKE $${paramCount} OR ('BC-' || TO_CHAR(i.created_at, 'YYYY') || '-' || LPAD(i.id::TEXT, 4, '0')) ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    if (filters.startDate) {
      whereClause += ` AND i.created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      whereClause += ` AND i.created_at <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents i ${whereClause};`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0', 10);

    // Get paginated results with joined user and category data
    const offset = calculateOffset(pagination.page, pagination.limit);
    const incidents = await query(
      `SELECT 
        i.*,
        COALESCE(assigned_admin.full_name, assigned_admin.username) AS assigned_technician,
        u.email as user_email,
        u.phone as user_phone,
        u.full_name as user_name,
        c.name as category_name,
        ROUND(ST_Y(i.location_point)::numeric, 6) as latitude,
        ROUND(ST_X(i.location_point)::numeric, 6) as longitude
       FROM incidents i
       LEFT JOIN users u ON i.user_id = u.id
       LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN admins assigned_admin ON assigned_admin.id = COALESCE(i.assigned_to, i.assigned_technician)
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1};`,
      [...params, pagination.limit, offset]
    );

    return { incidents, total };
  }

  async getIncidentWithDetails(incidentId: number, requester: { id: number; role: string }): Promise<any | null> {
    const accessClause = requester.role === 'technician'
      ? 'AND (i.assigned_to = $2 OR i.assigned_technician = $2)'
      : '';
    const params = requester.role === 'technician' ? [incidentId, requester.id] : [incidentId];
    const incident = await queryOne<any>(
      `SELECT i.*,
              COALESCE(assigned_admin.full_name, assigned_admin.username) AS assigned_technician,
              ai_category.name AS ai_suggested_category_name,
              duplicate_incident.title AS duplicate_of_title,
              COALESCE((
                SELECT json_agg(json_build_object(
                  'id', image.id,
                  'image_url', image.image_url,
                  'is_before', COALESCE((to_jsonb(image)->>'is_before')::boolean, true),
                  'created_at', image.created_at
                ) ORDER BY image.created_at ASC)
                FROM incident_images image
                WHERE image.incident_id = i.id
              ), '[]') AS images,
              COALESCE((SELECT json_agg(image_url ORDER BY created_at)
            FROM incident_images WHERE incident_id = i.id), '[]') AS image_urls,
              u.email AS user_email, u.phone AS user_phone, u.full_name AS user_name,
              c.name AS category_name,
              ROUND(ST_Y(i.location_point)::numeric, 6) AS latitude,
              ROUND(ST_X(i.location_point)::numeric, 6) AS longitude
       FROM incidents i
       LEFT JOIN users u ON i.user_id = u.id
       LEFT JOIN categories c ON i.category_id = c.id
       LEFT JOIN categories ai_category ON ai_category.id = i.ai_suggested_category
       LEFT JOIN incidents duplicate_incident ON duplicate_incident.id = i.duplicate_of
      LEFT JOIN admins assigned_admin ON assigned_admin.id = COALESCE(i.assigned_to, i.assigned_technician)
       WHERE i.id = $1 AND i.deleted_at IS NULL ${accessClause};`,
      params
    );
    if (!incident) return null;

    incident.nearby_incident_count = null;
    if (incident.latitude !== null && incident.latitude !== undefined
      && incident.longitude !== null && incident.longitude !== undefined) {
      try {
        const nearby = await queryOne<{ count: number }>(
          `SELECT COUNT(*)::int AS count
           FROM get_incidents_near_location($1::NUMERIC, $2::NUMERIC, 50)
           WHERE incident_id <> $3;`,
          [incident.latitude, incident.longitude, incidentId]
        );
        incident.nearby_incident_count = Number(nearby?.count ?? 0);
      } catch (error) {
        console.error('Get nearby duplicate count error:', error);
      }
    }
    return incident;
  }

  async addAdminIncidentImage(
    incidentId: number,
    adminId: number,
    role: string,
    imageUrl: string
  ): Promise<{ id: number; image_url: string; is_before: boolean; created_at: Date } | null> {
    return queryOne(
      `INSERT INTO incident_images (incident_id, image_url, uploaded_by_admin, is_before)
       SELECT i.id, $3, $2, false
       FROM incidents i
       WHERE i.id = $1 AND i.deleted_at IS NULL
         AND ($4 <> 'technician' OR i.assigned_to = $2 OR i.assigned_technician = $2)
       RETURNING id, image_url, is_before, created_at;`,
      [incidentId, adminId, imageUrl, role]
    );
  }

  /**
   * Assign incident to technician
   */
  async assignIncident(
    incidentId: number,
    input: AdminIncidentUpdate,
    performedBy: number,
    performedByRole: string
  ): Promise<Incident | null> {
    const hasAssignee = Object.hasOwn(input, 'assigned_to') || Object.hasOwn(input, 'assigned_technician');
    const assignedTo = Object.hasOwn(input, 'assigned_to') ? input.assigned_to : input.assigned_technician;
    return transaction(async (client) => {
      const current = await client.query<Incident>(
        'SELECT * FROM incidents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
        [incidentId]
      );
      const currentIncident = current.rows[0];
      if (!currentIncident) return null;

      if (assignedTo !== undefined && assignedTo !== null) {
        const staff = await client.query<{ id: number }>(
          `SELECT id FROM admins
           WHERE id = $1 AND is_active = true AND role = 'technician'
             AND ($3 <> 'manager' OR department_id = (
               SELECT department_id FROM admins WHERE id = $2 AND role = 'manager' AND is_active = true
             ))`,
          [assignedTo, performedBy, performedByRole]
        );
        if (!staff.rows[0]) {
          throw new Error('ASSIGNEE_NOT_FOUND');
        }
      }

      const values: any[] = [];
      const updates = ['updated_at = NOW()'];
      if (hasAssignee) {
        values.push(assignedTo ?? null);
        updates.push(`assigned_to = $${values.length}`, `assigned_technician = $${values.length}`);
        if (assignedTo !== null && assignedTo !== undefined && currentIncident.status === 'pending') updates.push("status = 'assigned'");
      }
      if (input.priority) {
        values.push(input.priority);
        updates.push(`priority = $${values.length}`);
      }
      values.push(incidentId);
      const updated = await client.query<Incident>(
        `UPDATE incidents SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      const result = updated.rows[0];
      if (!result) return null;
      if (hasAssignee) {
        await client.query(
          `INSERT INTO incident_history
            (incident_id, action, old_status, new_status, old_assigned_to, new_assigned_to, performed_by)
           VALUES ($1, 'assigned', $2, $3, $4, $5, $6)`,
          [incidentId, currentIncident.status, result.status, currentIncident.assigned_to ?? null, result.assigned_to ?? null, performedBy]
        );
      }
      return result;
    });
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(
    incidentId: number,
    status: string,
    performedBy: number,
    performedByRole: string,
    rejectionReason?: string
  ): Promise<Incident | null> {
    return transaction(async (client) => {
      const current = await client.query<Incident>(
        'SELECT * FROM incidents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
        [incidentId]
      );
      const currentIncident = current.rows[0];
      if (!currentIncident) return null;
      if (status === 'rejected' && !rejectionReason?.trim()) {
        throw new Error('REJECTION_REASON_REQUIRED');
      }
      if (performedByRole === 'technician') {
        const assignedToCurrentAdmin = currentIncident.assigned_to === performedBy
          || currentIncident.assigned_technician === performedBy;
        if (!assignedToCurrentAdmin) return null;
        if (!['in_progress', 'completed'].includes(status)) throw new Error('TECHNICIAN_STATUS_FORBIDDEN');
      }
      if (status === 'completed') {
        const evidence = await client.query(
          'SELECT id FROM incident_images WHERE incident_id = $1 AND is_before = false LIMIT 1',
          [incidentId]
        );
        if (!evidence.rows[0]) throw new Error('COMPLETION_EVIDENCE_REQUIRED');
      }
      const updated = await client.query<Incident>(
        `UPDATE incidents
         SET status = $1, completed_at = $2, updated_at = NOW()
         WHERE id = $3 AND deleted_at IS NULL
         RETURNING *`,
        [status, status === 'completed' ? new Date() : null, incidentId]
      );
      const result = updated.rows[0];
      if (!result) return null;
      await client.query(
        `INSERT INTO incident_history
          (incident_id, action, old_status, new_status, old_assigned_to, new_assigned_to, note, performed_by)
         VALUES ($1, 'status_changed', $2, $3, $4, $5, $6, $7)`,
        [incidentId, currentIncident.status, result.status, currentIncident.assigned_to ?? null, result.assigned_to ?? null, rejectionReason?.trim() || null, performedBy]
      );
      if (status === 'rejected') {
        await client.query(
          `INSERT INTO notifications (user_id, incident_id, title, message, type)
           VALUES ($1, $2, $3, $4, 'status_update')`,
          [currentIncident.user_id, incidentId, `Báo cáo BC-${incidentId} bị từ chối`, `Lý do: ${rejectionReason!.trim()}`]
        );
      }
      return result;
    });
  }

  async getStaff(managerId?: number): Promise<any[]> {
    const accountScope = managerId === undefined
      ? ''
      : `AND role = 'technician'
         AND department_id = (SELECT department_id FROM admins WHERE id = $1 AND role = 'manager' AND is_active = true)`;
    const params = managerId === undefined ? [] : [managerId];
    return query(
      `SELECT id, username, email, full_name, role, is_active, created_at,
              COALESCE(is_active AND last_seen_at >= NOW() - INTERVAL '90 seconds', false) AS is_online
       FROM admins WHERE deleted_at IS NULL ${accountScope}
       ORDER BY full_name NULLS LAST, username`,
      params
    );
  }

  async getIncidentHistory(incidentId: number, technicianId?: number): Promise<any[]> {
    const assignmentScope = technicianId === undefined
      ? ''
      : `AND EXISTS (SELECT 1 FROM incidents i WHERE i.id = h.incident_id
                     AND i.deleted_at IS NULL AND (i.assigned_to = $2 OR i.assigned_technician = $2))`;
    return query(
      `SELECT h.*, a.full_name AS performed_by_name
       FROM incident_history h
       JOIN admins a ON a.id = h.performed_by
       WHERE h.incident_id = $1 ${assignmentScope}
       ORDER BY h.created_at DESC, h.id DESC`,
      technicianId === undefined ? [incidentId] : [incidentId, technicianId]
    );
  }

  async getIncidentNotes(incidentId: number, technicianId?: number): Promise<any[]> {
    const assignmentScope = technicianId === undefined
      ? ''
      : `AND EXISTS (SELECT 1 FROM incidents i WHERE i.id = n.incident_id
                     AND i.deleted_at IS NULL AND (i.assigned_to = $2 OR i.assigned_technician = $2))`;
    return query(
      `SELECT n.*, a.full_name AS created_by_name
       FROM incident_notes n
       JOIN admins a ON a.id = n.created_by
       WHERE n.incident_id = $1 ${assignmentScope}
       ORDER BY n.created_at DESC, n.id DESC`,
      technicianId === undefined ? [incidentId] : [incidentId, technicianId]
    );
  }

  async addIncidentNote(incidentId: number, note: string, createdBy: number, createdByRole: string): Promise<any | null> {
    return transaction(async (client) => {
      const incident = await client.query(
        `SELECT id FROM incidents
         WHERE id = $1 AND deleted_at IS NULL
           AND ($3 <> 'technician' OR assigned_to = $2 OR assigned_technician = $2)`,
        [incidentId, createdBy, createdByRole]
      );
      if (!incident.rows[0]) return null;
      const created = await client.query(
        `INSERT INTO incident_notes (incident_id, note, created_by) VALUES ($1, $2, $3) RETURNING *`,
        [incidentId, note, createdBy]
      );
      await client.query(
        `INSERT INTO incident_history (incident_id, action, note, performed_by) VALUES ($1, 'note_added', $2, $3)`,
        [incidentId, note, createdBy]
      );
      return created.rows[0];
    });
  }

  /**
   * Get incident analytics for dashboard
   * FIX: Uses parameterized interval instead of string interpolation to prevent SQL injection
   */
  async getIncidentAnalytics(period: string): Promise<{
    period: string;
    incidents: Array<{ date: string; count: number; completed: number }>;
    avgResolutionTime: string;
    completionRate: string;
  }> {
    let dateFormat = 'YYYY-MM-DD';
    const intervalDays = getIntervalDays(period);

    if (period === 'day') {
      dateFormat = 'YYYY-MM-DD HH:00';
    }

    // FIX: Use parameterized query with make_interval() instead of string interpolation
    const incidents = await query<{ date: string; count: string; completed: string }>(
      `SELECT 
        TO_CHAR(created_at, $1) as date,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM incidents
       WHERE created_at > NOW() - make_interval(days => $2)
       AND deleted_at IS NULL
       GROUP BY TO_CHAR(created_at, $1)
       ORDER BY date;`,
      [dateFormat, intervalDays]
    );

    const avgTimeResult = await query<{ avg_time: string }>(
      `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_time
       FROM incidents 
       WHERE created_at > NOW() - make_interval(days => $1)
       AND status = 'completed' AND completed_at IS NOT NULL
       AND deleted_at IS NULL;`,
      [intervalDays]
    );

    const totalInPeriod = await query<{ total: string; completed: string }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM incidents
       WHERE created_at > NOW() - make_interval(days => $1)
       AND deleted_at IS NULL;`,
      [intervalDays]
    );

    const total = parseInt(totalInPeriod[0]?.total || '0', 10);
    const completed = parseInt(totalInPeriod[0]?.completed || '0', 10);
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(2) : '0';

    return {
      period,
      incidents: incidents.map((row) => ({
        date: row.date,
        count: parseInt(row.count, 10),
        completed: parseInt(row.completed, 10),
      })),
      avgResolutionTime: avgTimeResult[0]?.avg_time
        ? `${parseFloat(avgTimeResult[0].avg_time).toFixed(2)} hours`
        : 'N/A',
      completionRate: `${completionRate}%`,
    };
  }

  /**
   * Get technician workload and performance
   */
  async getTechnicianWorkload(): Promise<
    Array<{
      technician: string;
      assignedCount: number;
      completedCount: number;
      avgResolutionTime: string;
      currentLoad: number;
    }>
  > {
    return query<any>(
      `SELECT 
        COALESCE(assigned_technician, 'Unassigned') as technician,
        COUNT(*) as assigned_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_resolution_time,
        SUM(CASE WHEN status IN ('open', 'in_progress') THEN 1 ELSE 0 END) as current_load
       FROM incidents
       WHERE deleted_at IS NULL
       GROUP BY COALESCE(assigned_technician, 'Unassigned')
       ORDER BY current_load DESC;`
    );
  }

  /**
   * Get heatmap data for visualization
   */
  async getHeatmapData(): Promise<Array<{ lat: number; lng: number; count: number }>> {
    return query<{ lat: number; lng: number; count: number }>(
      `SELECT 
        ROUND(ST_Y(location_point)::numeric, 2) as lat,
        ROUND(ST_X(location_point)::numeric, 2) as lng,
        COUNT(*) as count
       FROM incidents
       WHERE deleted_at IS NULL AND location_point IS NOT NULL
       GROUP BY ROUND(ST_Y(location_point)::numeric, 2), ROUND(ST_X(location_point)::numeric, 2)
       ORDER BY count DESC;`
    );
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    totalResolved: number;
    avgResolutionTime: string;
    highPriorityResolved: number;
    userReportsCount: number;
    mostReportedCategory: string;
    resolutionRate: string;
  }> {
    const resolved = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE status = 'completed' AND deleted_at IS NULL;`
    );

    const avgTime = await query<{ avg_time: string }>(
      `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_time
       FROM incidents 
       WHERE status = 'completed' AND completed_at IS NOT NULL AND deleted_at IS NULL;`
    );

    const highPriorityResolved = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE priority = 'high' AND status = 'completed' AND deleted_at IS NULL;`
    );

    const userReports = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE deleted_at IS NULL;`
    );

    const topCategory = await query<{ name: string; count: string }>(
      `SELECT c.name, COUNT(i.id) as count 
       FROM incidents i
       JOIN categories c ON i.category_id = c.id
       WHERE i.deleted_at IS NULL
       GROUP BY c.name
       ORDER BY count DESC
       LIMIT 1;`
    );

    const allIncidents = await query<{ total: string; completed: string }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM incidents
       WHERE deleted_at IS NULL;`
    );

    const total = parseInt(allIncidents[0]?.total || '0', 10);
    const completed = parseInt(allIncidents[0]?.completed || '0', 10);
    const resolutionRate = total > 0 ? ((completed / total) * 100).toFixed(2) : '0';

    return {
      totalResolved: parseInt(resolved[0]?.count || '0', 10),
      avgResolutionTime: avgTime[0]?.avg_time
        ? `${parseFloat(avgTime[0].avg_time).toFixed(2)} hours`
        : 'N/A',
      highPriorityResolved: parseInt(highPriorityResolved[0]?.count || '0', 10),
      userReportsCount: parseInt(userReports[0]?.count || '0', 10),
      mostReportedCategory: topCategory[0]?.name || 'N/A',
      resolutionRate: `${resolutionRate}%`,
    };
  }

  /**
   * Get active technicians
   */
  async getActiveTechnicians(): Promise<
    Array<{
      technician: string;
      activeIncidents: number;
      completedToday: number;
      status: string;
    }>
  > {
    return query<any>(
      `SELECT 
        assigned_technician as technician,
        COUNT(*) as active_incidents,
        SUM(CASE WHEN DATE(completed_at) = CURRENT_DATE THEN 1 ELSE 0 END) as completed_today,
        CASE 
          WHEN COUNT(CASE WHEN status = 'in_progress' THEN 1 END) > 0 THEN 'Busy'
          WHEN COUNT(CASE WHEN status IN ('open', 'on_hold') THEN 1 END) > 0 THEN 'Available'
          ELSE 'Idle'
        END as status
       FROM incidents
       WHERE assigned_technician IS NOT NULL
       AND status IN ('open', 'in_progress', 'on_hold')
       AND deleted_at IS NULL
       GROUP BY assigned_technician
       ORDER BY active_incidents DESC;`
    );
  }
}

export const adminService = new AdminService();
