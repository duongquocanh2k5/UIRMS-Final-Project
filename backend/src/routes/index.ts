/**
 * Routes Index
 * Mounts all route modules
 */

import { Router } from 'express';
import { AdminRole, REGEX_PATTERNS } from '../config/constants';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import authRoutes from './auth.routes';
import incidentRoutes from './incidents.routes';
import adminRoutes from './admin.routes';
import notificationRoutes from './notifications.routes';
import statsRoutes from './stats.routes';
import staffRoutes from './staff.routes';
import adminsRoutes from './admins.routes';
import categoriesRoutes from './categories.routes';
import departmentsRoutes from './departments.routes';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validateRequest';

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
router.post(
  '/admin/register',
  authenticateToken,
  authorizeRole(AdminRole.SUPER_ADMIN, AdminRole.MANAGER),
  validateRequest({
    username: { required: true, type: 'string', minLength: 3 },
    email: { required: true, type: 'string', pattern: REGEX_PATTERNS.EMAIL },
    password: { required: true, type: 'string', minLength: 8 },
    full_name: { required: true, type: 'string', minLength: 2 },
  }),
  (req, res) => authController.registerAdmin(req, res)
);
router.use('/incidents', incidentRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/stats', statsRoutes);
router.use('/staff', staffRoutes);
router.use('/admins', adminsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/departments', departmentsRoutes);

export default router;
