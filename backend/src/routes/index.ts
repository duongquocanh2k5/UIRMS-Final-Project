/**
 * Routes Index
 * Mounts all route modules
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import incidentRoutes from './incidents.routes';
import adminRoutes from './admin.routes';
import notificationRoutes from './notifications.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/incidents', incidentRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

export default router;
