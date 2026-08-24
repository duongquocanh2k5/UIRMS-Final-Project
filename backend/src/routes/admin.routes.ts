/**
 * Admin Routes
 * All routes protected by admin authentication middleware
 *
 * GET    /admin/dashboard/stats           - Dashboard statistics
 * GET    /admin/incidents                 - All incidents (admin view)
 * POST   /admin/incidents/:incidentId/assign - Assign incident
 * PATCH  /admin/incidents/:incidentId/status - Update incident status
 * GET    /admin/analytics/incidents       - Analytics and trends
 * GET    /admin/incidents/heatmap         - Heatmap data
 * GET    /admin/technicians/workload      - Technician workload
 * GET    /admin/technicians/active        - Active technicians
 * GET    /admin/metrics/performance       - Performance metrics
 */

import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { AdminRole } from '../config/constants';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRole(AdminRole.SUPER_ADMIN, AdminRole.MANAGER));

// Dashboard
router.get('/dashboard/stats', (req, res) => adminController.getDashboardStats(req, res));

// Incidents management
router.get('/incidents', (req, res) => adminController.getAllIncidents(req, res));
router.post('/incidents/:incidentId/assign', (req, res) => adminController.assignIncident(req, res));
router.patch('/incidents/:incidentId/status', (req, res) => adminController.updateIncidentStatus(req, res));

// Analytics
router.get('/analytics/incidents', (req, res) => adminController.getIncidentAnalytics(req, res));

// Heatmap
router.get('/incidents/heatmap', (req, res) => adminController.getIncidentsHeatmap(req, res));

// Technicians
router.get('/technicians/workload', (req, res) => adminController.getTechnicianWorkload(req, res));
router.get('/technicians/active', (req, res) => adminController.getActiveTechnicians(req, res));

// Performance metrics
router.get('/metrics/performance', (req, res) => adminController.getPerformanceMetrics(req, res));

export default router;
