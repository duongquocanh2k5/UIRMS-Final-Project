/**
 * Notification Routes
 * GET /notifications
 * PUT /notifications/:id/read
 * GET /notifications/unread/count
 */

import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

// Get unread count (place before /:id)
router.get('/unread/count', (req, res) => notificationController.getUnreadCount(req, res));

// Get all notifications
router.get('/', (req, res) => notificationController.getNotifications(req, res));

// Mark notification as read
router.put('/:id/read', (req, res) => notificationController.markAsRead(req, res));

export default router;
