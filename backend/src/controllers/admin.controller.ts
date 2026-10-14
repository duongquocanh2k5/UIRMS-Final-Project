/**
 * Admin Controller
 * Handles admin dashboard and management requests
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, PAGINATION } from '../config/constants';
import { adminService } from '../services/admin.service';
import { validatePaginationParams } from '../utils/validators';
import { notificationService } from '../services/notification.service';
import { incidentImageUpload } from '../middlewares/incidentUpload';
import { unlink } from 'node:fs/promises';

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
  async getAllIncidents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, priority, category_id, search, from_date, to_date } = req.query;

      const { page: validPage, limit: validLimit } = validatePaginationParams(page, limit);

      const filters = {
        ...(search ? { search: String(search) } : {}),
        ...(status ? { status: status as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
        ...(category_id ? { category_id: parseInt(category_id as string, 10) } : {}),
        ...(from_date ? { startDate: new Date(`${from_date}T00:00:00.000Z`) } : {}),
        ...(to_date ? { endDate: new Date(`${to_date}T23:59:59.999Z`) } : {}),
      };

      const { incidents, total } = await adminService.getAllIncidentsWithDetails(
        filters,
        { page: validPage, limit: validLimit },
        req.user
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

  async getIncident(req: AuthRequest, res: Response): Promise<void> {
    try {
      const incident = await adminService.getIncidentWithDetails(Number(req.params.incidentId), req.user!);
      if (!incident) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }
      res.json({ success: true, data: incident });
    } catch (error) {
      console.error('Get admin incident error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
    }
  }

  async uploadAfterImage(req: AuthRequest, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Vui lòng chọn ảnh hiện trường.' });
      return;
    }

    try {
      const saved = await adminService.addAdminIncidentImage(
        Number(req.params.incidentId),
        req.user!.id,
        req.user!.role,
        `/uploads/incidents/${file.filename}`
      );
      if (!saved) {
        await unlink(file.path).catch(() => undefined);
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }
      res.status(HTTP_STATUS.CREATED).json({ success: true, data: saved });
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      console.error('Upload admin incident evidence error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
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
      const hasAssignee = Object.hasOwn(req.body, 'assigned_to') || Object.hasOwn(req.body, 'assigned_technician');

      if (!hasAssignee && !priority) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'At least one of assigned_technician, assigned_to, or priority is required'
        });
        return;
      }

      const assignee = Object.hasOwn(req.body, 'assigned_to') ? assigned_to : assigned_technician;
      if (hasAssignee && assignee !== null && (!Number.isInteger(Number(assignee)) || Number(assignee) <= 0)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'assigned_to must be a positive integer' });
        return;
      }
      const assignment: { assigned_technician?: number | null; assigned_to?: number | null; priority?: string } = {};
      if (hasAssignee) {
        assignment.assigned_technician = assignee === null ? null : Number(assignee);
        assignment.assigned_to = assignee === null ? null : Number(assignee);
      }
      if (priority) assignment.priority = priority;
      const updated = await adminService.assignIncident(parseInt(incidentId as string, 10), assignment, req.user!.id, req.user!.role);

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
      if (error instanceof Error && error.message === 'ASSIGNEE_NOT_FOUND') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Nhân viên không tồn tại hoặc đã bị vô hiệu hóa' });
        return;
      }
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
      const { status, rejection_reason } = req.body;

      if (!status || !['pending', 'assigned', 'in_progress', 'completed', 'rejected'].includes(status)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid status. Must be: pending, assigned, in_progress, completed, or rejected'
        });
        return;
      }

      if (status === 'rejected' && (typeof rejection_reason !== 'string' || !rejection_reason.trim())) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Vui lòng nhập lý do từ chối.' });
        return;
      }

      const updated = await adminService.updateIncidentStatus(parseInt(incidentId as string, 10), status, req.user!.id, req.user!.role, rejection_reason);

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
      if (error instanceof Error && error.message === 'TECHNICIAN_STATUS_FORBIDDEN') {
        res.status(HTTP_STATUS.FORBIDDEN).json({ error: ERROR_MESSAGES.FORBIDDEN });
        return;
      }
      if (error instanceof Error && error.message === 'COMPLETION_EVIDENCE_REQUIRED') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Vui lòng tải ảnh kết quả sau xử lý trước khi hoàn tất.' });
        return;
      }
      if (error instanceof Error && error.message === 'REJECTION_REASON_REQUIRED') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Vui lòng nhập lý do từ chối.' });
        return;
      }
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  async getStaff(req: AuthRequest, res: Response): Promise<void> {
    try {
      const managerId = req.user?.role === 'manager' ? req.user.id : undefined;
      res.json({ success: true, data: await adminService.getStaff(managerId) });
    } catch (error) {
      console.error('Get staff error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
    }
  }

  async getIncidentHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const technicianId = req.user?.role === 'technician' ? req.user.id : undefined;
      const history = await adminService.getIncidentHistory(Number(req.params.incidentId), technicianId);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Get incident history error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
    }
  }

  async getIncidentNotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const technicianId = req.user?.role === 'technician' ? req.user.id : undefined;
      res.json({ success: true, data: await adminService.getIncidentNotes(Number(req.params.incidentId), technicianId) });
    } catch (error) {
      console.error('Get incident notes error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
    }
  }

  async addIncidentNote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { note } = req.body;
      if (typeof note !== 'string' || !note.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'note is required' });
        return;
      }
      const created = await adminService.addIncidentNote(Number(req.params.incidentId), note.trim(), req.user!.id, req.user!.role);
      if (!created) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }
      res.status(HTTP_STATUS.CREATED).json({ success: true, data: created });
    } catch (error) {
      console.error('Add incident note error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
    }
  }

  async sendNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { user_id, incident_id, title, message, type = 'system' } = req.body;
      if (!Number.isInteger(Number(user_id)) || !title?.trim() || !message?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'user_id, title, and message are required' });
        return;
      }
      if (!['status_update', 'new_reply', 'system', 'reminder'].includes(type)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid notification type' });
        return;
      }
      const notification = await notificationService.createNotification(Number(user_id), title.trim(), message.trim(), type, incident_id ? Number(incident_id) : undefined);
      res.status(HTTP_STATUS.CREATED).json({ success: true, data: notification });
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
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
