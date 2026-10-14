/**
 * Incident Controller
 * Handles incident-related requests
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { incidentService } from '../services/incident.service';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, PAGINATION } from '../config/constants';
import { validatePaginationParams } from '../utils/validators';

export class IncidentController {
  /**
   * Create new incident
   * POST /incidents
   */
  async createIncident(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { category_id, title, description, location_name, district, latitude, longitude, priority } = req.body;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
        return;
      }

      if (!category_id || !title || latitude === undefined || longitude === undefined) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_MESSAGES.INVALID_INPUT });
        return;
      }

      const incident = await incidentService.createIncident(userId, {
        category_id,
        title,
        description,
        location_name,
        district,
        latitude,
        longitude,
        priority,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: SUCCESS_MESSAGES.INCIDENT_CREATED,
        data: incident,
      });
    } catch (error) {
      console.error('Create incident error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get incident by ID
   * GET /incidents/:incidentId
   */
  async getIncident(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;

      const assignedTo = req.user?.role === 'technician' ? req.user.id : undefined;
      const incident = await incidentService.getIncidentById(parseInt(incidentId as string, 10), assignedTo);

      if (!incident) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }

      res.json({
        success: true,
        data: incident,
      });
    } catch (error) {
      console.error('Get incident error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  async uploadIncidentImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const incidentId = parseInt(req.params.incidentId as string, 10);
      const file = req.file;

      if (!userId || !file) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Ảnh tải lên không hợp lệ' });
        return;
      }

      const saved = await incidentService.addIncidentImage(incidentId, userId, `/uploads/incidents/${file.filename}`);
      if (!saved) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }

      res.status(HTTP_STATUS.CREATED).json({ success: true, data: { image_url: `/uploads/incidents/${file.filename}` } });
    } catch (error) {
      console.error('Upload incident image error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
    }
  }

  /**
   * Get all incidents with filters
   * GET /incidents?page=1&limit=10&status=open&category_id=1
   */
  async getIncidents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, category_id } = req.query;

      const { page: validPage, limit: validLimit } = validatePaginationParams(page, limit);

      const filters: any = { status: status as any };
      if (req.user?.role === 'technician') filters.assigned_to = req.user.id;
      if (category_id) {
        filters.category_id = parseInt(category_id as string, 10);
      }

      const { incidents, total } = await incidentService.getIncidents(
        filters,
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
      console.error('Get incidents error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get user's incidents
   * GET /incidents/user/:userId
   */
  async getUserIncidents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = req.query;

      const { page: validPage, limit: validLimit } = validatePaginationParams(page, limit);

      const filters = req.user?.role === 'technician'
        ? { assigned_to: req.user.id }
        : { user_id: parseInt(userId as string, 10) };
      const { incidents, total } = await incidentService.getIncidents(
        filters,
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
      console.error('Get user incidents error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Update incident
   * PUT /incidents/:incidentId
   */
  async updateIncident(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      const { status, priority, assigned_to, assigned_technician } = req.body;

      const updated = await incidentService.updateIncident(parseInt(incidentId as string, 10), {
        status,
        priority,
        assigned_to,
        assigned_technician,
      });

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
      console.error('Update incident error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get incidents near location
   * GET /incidents/search/nearby?latitude=10.7&longitude=106.7&radius=5000
   */
  async getNearbyIncidents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { latitude, longitude, radius = 5000 } = req.query;

      if (latitude === undefined || longitude === undefined) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Latitude and longitude are required',
        });
        return;
      }

      const incidents = await incidentService.getIncidentsNearLocation(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        parseInt(radius as string, 10),
        req.user?.role === 'technician' ? req.user.id : undefined
      );

      res.json({
        success: true,
        data: incidents,
        count: incidents.length,
      });
    } catch (error) {
      console.error('Get nearby incidents error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Mark incident as completed
   * PATCH /incidents/:incidentId/complete
   */
  async completeIncident(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;

      const updated = await incidentService.markCompleted(parseInt(incidentId as string, 10));

      if (!updated) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }

      res.json({
        success: true,
        message: 'Incident marked as completed',
        data: updated,
      });
    } catch (error) {
      console.error('Complete incident error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Delete incident
   * DELETE /incidents/:incidentId
   */
  async deleteIncident(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
        return;
      }

      const deleted = await incidentService.deleteIncident(parseInt(incidentId as string, 10), userId);

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete incident error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get incident statistics
   * GET /incidents/stats/summary
   */
  async getIncidentStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await incidentService.getIncidentStats(req.user?.role === 'technician' ? req.user.id : undefined);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get incident stats error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get heatmap data
   * GET /incidents/heatmap/data
   */
  async getHeatmapData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const heatmapData = await incidentService.getHeatmapData(req.user?.role === 'technician' ? req.user.id : undefined);

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
}

export const incidentController = new IncidentController();
