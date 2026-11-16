/**
 * Incident Controller
 * Handles incident-related requests
 */

import { Request, Response } from 'express';
import fs from 'node:fs';
import { AuthRequest } from '../middlewares/auth.middleware';
import { incidentService } from '../services/incident.service';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, PAGINATION } from '../config/constants';
import { validatePaginationParams } from '../utils/validators';
import { aiService, type ChatMessage } from '../services/ai.service';

export class IncidentController {
  async chatWithAI(req: AuthRequest, res: Response): Promise<void> {
    const lang = req.body?.language === 'en' ? 'en' : 'vi';
    const userId = req.user?.id;
    if (!userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      return;
    }

    const { message, history } = req.body as { message?: unknown; history?: unknown };
    if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'message must be a string between 1 and 1,000 characters.' });
      return;
    }

    const recentHistory: ChatMessage[] = Array.isArray(history)
      ? history.slice(-10).flatMap((item): ChatMessage[] => {
        if (!item || (item.role !== 'user' && item.role !== 'model') || typeof item.text !== 'string') return [];
        const text = item.text.trim();
        return text ? [{ role: item.role, text: text.slice(0, 1000) }] : [];
      })
      : [];

    try {
      const result = await aiService.chatWithAssistant(userId, message.trim(), recentHistory, lang);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('AI assistant controller error:', error);
      res.json({
        success: true,
        data: {
          reply: lang === 'vi'
            ? 'Trợ lý UIRMS hiện tạm thời không khả dụng. Bạn vẫn có thể gửi và quản lý báo cáo trong ứng dụng.'
            : 'The UIRMS assistant is temporarily unavailable. You can still submit and manage reports in the application.',
          suggestedCategoryId: null,
        },
      });
    }
  }

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

  async serveIncidentImage(req: Request, res: Response): Promise<void> {
    try {
      const imageId = parseInt(req.params.imageId as string, 10);
      if (!Number.isFinite(imageId) || imageId <= 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_MESSAGES.INVALID_INPUT });
        return;
      }

      const row = await incidentService.getIncidentImageRaw(imageId);
      if (!row || !row.image_url) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }

      const rawUrl = row.image_url.trim();
      const dataMatch = rawUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
      if (dataMatch) {
        const mimeType = dataMatch[1] || 'image/jpeg';
        const base64Data = dataMatch[2] || '';
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', String(buffer.length));
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.send(buffer);
        return;
      }

      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/uploads/')) {
        res.redirect(rawUrl);
        return;
      }

      res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
    } catch (error) {
      console.error('Serve incident image error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
    }
  }

  async uploadIncidentImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const incidentId = parseInt(req.params.incidentId as string, 10);
      const file = req.file;
      const rawBase64 = typeof req.body?.image_base64 === 'string' ? req.body.image_base64.trim() : '';

      if (!userId || (!file && !rawBase64)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'The uploaded image is invalid.' });
        return;
      }

      let imageUrl = '';
      let imageSource: string | { buffer: Buffer; mimeType: string };

      if (file) {
        imageUrl = `/uploads/incidents/${file.filename}`;
        try {
          const fileBuffer = fs.readFileSync(file.path);
          const mimeType = file.mimetype || 'image/jpeg';
          imageUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        } catch {
          // Fallback to static path if file read fails
        }
        imageSource = file.path;
      } else {
        const dataUrlMatch = rawBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
        const mimeType = dataUrlMatch?.[1] || (typeof req.body?.mime_type === 'string' && req.body.mime_type.startsWith('image/') ? req.body.mime_type : 'image/jpeg');
        const base64Data = dataUrlMatch?.[2] || rawBase64;
        const buffer = Buffer.from(base64Data, 'base64');
        if (!buffer.length) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'The uploaded image is invalid.' });
          return;
        }
        imageUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
        imageSource = { buffer, mimeType };
      }

      const saved = await incidentService.addIncidentImage(incidentId, userId, imageUrl, imageSource);
      if (!saved) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: {
          id: saved.image_id,
          image_url: `/api/incidents/images/${saved.image_id}`,
          ai_analysis: saved.ai_analysis,
        },
      });
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
   * FIX: Enforce ownership — regular users can only view their own incidents
   */
  async getUserIncidents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = req.query;

      const { page: validPage, limit: validLimit } = validatePaginationParams(page, limit);

      let filters: any;
      if (req.user?.role === 'technician') {
        // Technicians see only their assigned incidents
        filters = { assigned_to: req.user.id };
      } else if (req.user?.role === 'user') {
        // FIX: Regular users can ONLY view their own incidents (prevent IDOR)
        filters = { user_id: req.user.id };
      } else {
        // Admin roles can view any user's incidents
        filters = { user_id: parseInt(userId as string, 10) };
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
      console.error('Get user incidents error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Update incident
   * PUT /incidents/:incidentId
   * FIX: Regular users can only update their own pending incidents and cannot modify status or assignment
   */
  async updateIncident(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { title, description, category_id, location_name, status, priority, assigned_to, assigned_technician } = req.body;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
        return;
      }

      // Regular users can only update their own pending incidents and cannot alter status/assignee
      if (userRole === 'user') {
        const incident = await incidentService.getIncidentById(parseInt(incidentId as string, 10));
        if (!incident || incident.user_id !== userId) {
          res.status(HTTP_STATUS.FORBIDDEN).json({ error: ERROR_MESSAGES.FORBIDDEN });
          return;
        }
        if (
          incident.status !== 'pending' ||
          status !== undefined ||
          assigned_to !== undefined ||
          assigned_technician !== undefined
        ) {
          res.status(HTTP_STATUS.FORBIDDEN).json({ error: ERROR_MESSAGES.FORBIDDEN });
          return;
        }
      }

      const updated = await incidentService.updateIncident(parseInt(incidentId as string, 10), {
        title,
        description,
        category_id,
        location_name,
        ...(userRole !== 'user' ? { status, assigned_to, assigned_technician } : {}),
        priority,
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
      const userId = req.user?.id;
      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
        return;
      }

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
   * Submit citizen rating & feedback for completed incident
   * POST /incidents/:incidentId/feedback
   */
  async submitCitizenFeedback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const incidentId = parseInt(req.params.incidentId as string, 10);
      const userId = req.user?.id;
      const { rating, feedback } = req.body;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
        return;
      }

      const numRating = Number(rating);
      if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Rating must be an integer between 1 and 5.',
        });
        return;
      }

      if (feedback !== undefined && feedback !== null && (typeof feedback !== 'string' || feedback.length > 1000)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Feedback must be a string up to 1,000 characters.',
        });
        return;
      }

      const result = await incidentService.submitCitizenFeedback(incidentId, userId, numRating, feedback);
      if (result.status === 'not_found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
        return;
      }
      if (result.status === 'not_completed') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'You can only rate an incident after it has been marked as completed.',
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Submit citizen feedback error:', error);
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
