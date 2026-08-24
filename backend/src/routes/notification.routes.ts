/**
 * Notification Routes
 * All routes require authentication
 *
 * GET    /notifications                      - Get notifications
 * GET    /notifications/unread/count         - Get unread count
 * GET    /notifications/preferences          - Get notification preferences
 * PATCH  /notifications/:notificationId/read - Mark as read
 * PATCH  /notifications/read-all             - Mark all as read
 * PATCH  /notifications/preferences          - Update preferences
 * DELETE /notifications/:notificationId      - Delete notification
 * DELETE /notifications                      - Delete all notifications
 */

import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

// Get notifications
router.get('/', (req, res) => notificationController.getNotifications(req, res));

// Get unread count
router.get('/unread/count', (req, res) => notificationController.getUnreadCount(req, res));

// Get preferences
router.get('/preferences', (req, res) => notificationController.getPreferences(req, res));

// Mark as read
router.patch('/:notificationId/read', (req, res) => notificationController.markAsRead(req, res));

// Mark all as read
router.patch('/read-all', (req, res) => notificationController.markAllAsRead(req, res));

// Update preferences
router.patch('/preferences', (req, res) => notificationController.updatePreferences(req, res));

// Delete notification
router.delete('/:notificationId', (req, res) => notificationController.deleteNotification(req, res));

// Delete all notifications
router.delete('/', (req, res) => notificationController.deleteAllNotifications(req, res));

export default router;
