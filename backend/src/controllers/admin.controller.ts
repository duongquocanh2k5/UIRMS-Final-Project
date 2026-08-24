/**
 * Admin Controller
 * Handles admin dashboard and management requests
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, PAGINATION } from '../config/constants';
import { adminService } from '../services/admin.service';
import { validatePaginationParams } from '../utils/validators';

export class AdminController {
  /**
   * Get dashboard statistics
   * GET /admin/dashboard/stats
   */
  async getDashboardStats(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get all incidents with admin view
   * GET /admin/incidents?page=1&limit=10&status=open&priority=high
   */
  async getAllIncidents(req: Request, res: Response): Promise<void> {
    try {
      const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, priority } = req.query;

      const { page: validPage, limit: validLimit } = validatePaginationParams(page, limit);

      const { incidents, total } = await adminService.getAllIncidentsWithDetails(
        {
          status: status as any,
          priority: priority as any,
        },
        { page: validPage, limit: validLimit }
      );

      res.json({
        success: true,
        data: incidents,
        pagination: {
          page: validPage,
          limit: validLimit,
          total,
          totalPages: Math.ceil(total / validLimit),
        },
      });
    } catch (error) {
      console.error('Get admin incidents error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Assign incident to technician
   * POST /admin/incidents/:incidentId/assign
   */
  async assignIncident(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      const { assigned_technician, assigned_to, priority } = req.body;

      if (!assigned_technician && !assigned_to && !priority) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'At least one of assigned_technician, assigned_to, or priority is required'
        });
        return;
      }

      const updated = await adminService.assignIncident(parseInt(incidentId as string, 10), {
        assigned_technician,
        assigned_to,
        priority,
      });

      if (!updated) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }

      res.json({
        success: true,
        message: 'Incident assigned successfully',
        data: updated,
      });
    } catch (error) {
      console.error('Assign incident error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Update incident status
   * PATCH /admin/incidents/:incidentId/status
   */
  async updateIncidentStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      const { status } = req.body;

      if (!status || !['open', 'in_progress', 'on_hold', 'completed'].includes(status)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid status. Must be: open, in_progress, on_hold, or completed'
        });
        return;
      }

      const updated = await adminService.updateIncidentStatus(parseInt(incidentId as string, 10), status);

      if (!updated) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }

      res.json({
        success: true,
        message: SUCCESS_MESSAGES.INCIDENT_UPDATED,
        data: updated,
      });
    } catch (error) {
      console.error('Update incident status error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get incident analytics and trends
   * GET /admin/analytics/incidents?period=week
   */
  async getIncidentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'week' } = req.query;

      if (!['day', 'week', 'month'].includes(period as string)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid period. Must be: day, week, or month'
        });
        return;
      }

      const analytics = await adminService.getIncidentAnalytics(period as string);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get technician workload
   * GET /admin/technicians/workload
   */
  async getTechnicianWorkload(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const workload = await adminService.getTechnicianWorkload();

      res.json({
        success: true,
        data: workload,
      });
    } catch (error) {
      console.error('Get technician workload error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get heatmap data for visualization
   * GET /admin/incidents/heatmap
   */
  async getIncidentsHeatmap(_req: Request, res: Response): Promise<void> {
    try {
      const heatmapData = await adminService.getHeatmapData();

      res.json({
        success: true,
        data: heatmapData,
        count: heatmapData.length,
      });
    } catch (error) {
      console.error('Get heatmap data error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get performance metrics
   * GET /admin/metrics/performance
   */
  async getPerformanceMetrics(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const metrics = await adminService.getPerformanceMetrics();

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error('Get performance metrics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get active technicians
   * GET /admin/technicians/active
   */
  async getActiveTechnicians(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const technicians = await adminService.getActiveTechnicians();

      res.json({
        success: true,
        data: technicians,
      });
    } catch (error) {
      console.error('Get active technicians error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
}

export const adminController = new AdminController();
