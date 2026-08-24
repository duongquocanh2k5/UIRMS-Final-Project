/**
 * Admin Service
 * Handles admin-level business logic
 */

import { query, queryOne } from '../config/database';
import { Incident, PaginationParams, IncidentFilters } from '../types/index';
import { calculateOffset } from '../utils/helpers';

interface AdminIncidentUpdate {
  assigned_technician?: string;
  assigned_to?: number;
  priority?: string;
}

export class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<{
    totalIncidents: number;
    openIncidents: number;
    inProgressIncidents: number;
    completedIncidents: number;
    averageResolutionTime: string;
    highPriorityCount: number;
  }> {
    const total = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE deleted_at IS NULL;`
    );

    const open = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE status = 'open' AND deleted_at IS NULL;`
    );

    const inProgress = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE status = 'in_progress' AND deleted_at IS NULL;`
    );

    const completed = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE status = 'completed' AND deleted_at IS NULL;`
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
      openIncidents: parseInt(open[0]?.count || '0', 10),
      inProgressIncidents: parseInt(inProgress[0]?.count || '0', 10),
      completedIncidents: parseInt(completed[0]?.count || '0', 10),
      averageResolutionTime: avgTime[0]?.avg_time ? `${parseFloat(avgTime[0].avg_time).toFixed(2)} hours` : 'N/A',
      highPriorityCount: parseInt(highPriority[0]?.count || '0', 10),
    };
  }

  /**
   * Get all incidents with admin details (user, category, etc)
   */
  async getAllIncidentsWithDetails(
    filters: IncidentFilters,
    pagination: PaginationParams
  ): Promise<{ incidents: any[]; total: number }> {
    let whereClause = 'WHERE i.deleted_at IS NULL';
    const params: any[] = [];
    let paramCount = 1;

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
        u.email as user_email,
        u.phone as user_phone,
        u.full_name as user_name,
        c.name as category_name,
        ROUND(ST_Y(i.location_point)::numeric, 6) as latitude,
        ROUND(ST_X(i.location_point)::numeric, 6) as longitude
       FROM incidents i
       LEFT JOIN users u ON i.user_id = u.id
       LEFT JOIN categories c ON i.category_id = c.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1};`,
      [...params, pagination.limit, offset]
    );

    return { incidents, total };
  }

  /**
   * Assign incident to technician
   */
  async assignIncident(
    incidentId: number,
    input: AdminIncidentUpdate
  ): Promise<Incident | null> {
    let updateClause = 'SET updated_at = NOW()';
    const params: any[] = [];
    let paramCount = 1;

    if (input.assigned_technician) {
      updateClause += `, assigned_technician = $${paramCount}`;
      params.push(input.assigned_technician);
      paramCount++;
    }

    if (input.assigned_to !== undefined) {
      updateClause += `, assigned_to = $${paramCount}`;
      params.push(input.assigned_to);
      paramCount++;
    }

    if (input.priority) {
      updateClause += `, priority = $${paramCount}`;
      params.push(input.priority);
      paramCount++;
    }

    params.push(incidentId);

    return queryOne<Incident>(
      `UPDATE incidents ${updateClause} WHERE id = $${paramCount} RETURNING *;`,
      params
    );
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(
    incidentId: number,
    status: string
  ): Promise<Incident | null> {
    const completedAt = status === 'completed' ? 'NOW()' : 'NULL';
    
    return queryOne<Incident>(
      `UPDATE incidents 
       SET status = $1, completed_at = ${completedAt}, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *;`,
      [status, incidentId]
    );
  }

  /**
   * Get incident analytics for dashboard
   */
  async getIncidentAnalytics(period: string): Promise<{
    period: string;
    incidents: Array<{ date: string; count: number; completed: number }>;
    avgResolutionTime: string;
    completionRate: string;
  }> {
    let dateFormat = 'YYYY-MM-DD';
    let intervalDays = '7';

    if (period === 'month') {
      intervalDays = '30';
    } else if (period === 'day') {
      intervalDays = '1';
      dateFormat = 'YYYY-MM-DD HH:00';
    }

    const incidents = await query<{ date: string; count: string; completed: string }>(
      `SELECT 
        TO_CHAR(created_at, $1) as date,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM incidents
       WHERE created_at > NOW() - INTERVAL '${intervalDays} days'
       AND deleted_at IS NULL
       GROUP BY TO_CHAR(created_at, $1)
       ORDER BY date;`,
      [dateFormat]
    );

    const avgTimeResult = await query<{ avg_time: string }>(
      `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_time
       FROM incidents 
       WHERE created_at > NOW() - INTERVAL '${intervalDays} days'
       AND status = 'completed' AND completed_at IS NOT NULL
       AND deleted_at IS NULL;`
    );

    const totalInPeriod = await query<{ total: string; completed: string }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM incidents
       WHERE created_at > NOW() - INTERVAL '${intervalDays} days'
       AND deleted_at IS NULL;`
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
