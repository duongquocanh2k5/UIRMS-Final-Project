/**
 * Notification Controller
 * Handles notification-related requests
 */

import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { notificationService } from '../services/notification.service';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, PAGINATION } from '../config/constants';
import { validatePaginationParams } from '../utils/validators';

export class NotificationController {
  /**
   * Get user notifications
   * GET /notifications?page=1&limit=20
   */
  async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { page = PAGINATION.DEFAULT_PAGE, limit = 20 } = req.query;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const { page: validPage, limit: validLimit } = validatePaginationParams(page, limit);

      const { notifications, total } = await notificationService.getUserNotifications(
        userId,
        { page: validPage, limit: validLimit }
      );

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page: validPage,
          limit: validLimit,
          total,
          totalPages: Math.ceil(total / validLimit),
        },
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Mark notification as read
   * PATCH /notifications/:notificationId/read
   */
  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;

      const notification = await notificationService.markAsRead(parseInt(notificationId as string, 10));

      if (!notification) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERROR_MESSAGES.NOT_FOUND,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /notifications/read-all
   */
  async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const count = await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: `${count} notifications marked as read`,
        data: { updatedCount: count },
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get unread count
   * GET /notifications/unread/count
   */
  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const count = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Delete notification
   * DELETE /notifications/:notificationId
   */
  async deleteNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;

      const deleted = await notificationService.deleteNotification(parseInt(notificationId as string, 10));

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERROR_MESSAGES.NOT_FOUND,
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Delete all notifications
   * DELETE /notifications
   */
  async deleteAllNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const count = await notificationService.deleteAllNotifications(userId);

      res.json({
        success: true,
        message: `${count} notifications deleted`,
        data: { deletedCount: count },
      });
    } catch (error) {
      console.error('Delete all notifications error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get notification preferences
   * GET /notifications/preferences
   */
  async getPreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const preferences = await notificationService.getPreferences(userId);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error('Get notification preferences error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Update notification preferences
   * PATCH /notifications/preferences
   */
  async updatePreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { emailNotifications, pushNotifications, smsNotifications } = req.body;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const updated = await notificationService.updatePreferences(userId, {
        emailNotifications,
        pushNotifications,
        smsNotifications,
      });

      res.json({
        success: true,
        message: 'Notification preferences updated',
        data: updated,
      });
    } catch (error) {
      console.error('Update notification preferences error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
}

export const notificationController = new NotificationController();
