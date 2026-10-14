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
import { incidentImageUpload } from '../middlewares/incidentUpload';
import { AdminRole } from '../config/constants';

const router = Router();

// Incident access includes technicians, with assignment checks in the service layer.
router.use(authenticateToken);

const incidentRoles = [AdminRole.SUPER_ADMIN, AdminRole.MANAGER, AdminRole.TECHNICIAN];
const managementRoles = [AdminRole.SUPER_ADMIN, AdminRole.MANAGER];

router.get('/incidents/heatmap', authorizeRole(AdminRole.SUPER_ADMIN), (req, res) => adminController.getIncidentsHeatmap(req, res));
router.get('/incidents', authorizeRole(...incidentRoles), (req, res) => adminController.getAllIncidents(req, res));
router.get('/incidents/:incidentId', authorizeRole(...incidentRoles), (req, res) => adminController.getIncident(req, res));
router.post('/incidents/:incidentId/images/after', authorizeRole(...incidentRoles), incidentImageUpload.single('image'), (req, res) => adminController.uploadAfterImage(req, res));
router.get('/incidents/:incidentId/history', authorizeRole(...incidentRoles), (req, res) => adminController.getIncidentHistory(req, res));
router.get('/incidents/:incidentId/notes', authorizeRole(...incidentRoles), (req, res) => adminController.getIncidentNotes(req, res));
router.post('/incidents/:incidentId/notes', authorizeRole(...incidentRoles), (req, res) => adminController.addIncidentNote(req, res));
router.patch('/incidents/:incidentId/status', authorizeRole(...incidentRoles), (req, res) => adminController.updateIncidentStatus(req, res));
router.post('/incidents/:incidentId/assign', authorizeRole(...managementRoles), (req, res) => adminController.assignIncident(req, res));

router.use(authorizeRole(...managementRoles));

// Global system views and configuration are reserved for super-admins.
router.get('/dashboard/stats', authorizeRole(AdminRole.SUPER_ADMIN), (req, res) => adminController.getDashboardStats(req, res));
router.get('/staff', (req, res) => adminController.getStaff(req, res));
router.post('/notifications', (req, res) => adminController.sendNotification(req, res));

// Analytics
router.get('/analytics/incidents', authorizeRole(AdminRole.SUPER_ADMIN), (req, res) => adminController.getIncidentAnalytics(req, res));

// Heatmap

// Technicians
router.get('/technicians/workload', authorizeRole(AdminRole.SUPER_ADMIN), (req, res) => adminController.getTechnicianWorkload(req, res));
router.get('/technicians/active', authorizeRole(AdminRole.SUPER_ADMIN), (req, res) => adminController.getActiveTechnicians(req, res));

// Performance metrics
router.get('/metrics/performance', authorizeRole(AdminRole.SUPER_ADMIN), (req, res) => adminController.getPerformanceMetrics(req, res));

export default router;
