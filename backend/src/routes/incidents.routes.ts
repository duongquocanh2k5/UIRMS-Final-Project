/**
 * Incident Routes
 * GET    /incidents                  - List all incidents
 * GET    /incidents/:incidentId      - Get incident details
 * GET    /incidents/user/:userId     - Get user's incidents
 * GET    /incidents/nearby           - Get nearby incidents
 * GET    /incidents/stats/summary    - Get statistics
 * GET    /incidents/heatmap/data     - Get heatmap data
 * POST   /incidents                  - Create incident
 * PUT    /incidents/:incidentId      - Update incident
 * PATCH  /incidents/:incidentId/complete - Mark complete
 * DELETE /incidents/:incidentId      - Delete incident
 */

import { Router } from 'express';
import { incidentController } from '../controllers/incident.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { incidentImageUpload } from '../middlewares/incidentUpload';

const router = Router();

// Get statistics (before /:id to avoid route conflict)
router.get('/stats/summary', (req, res) => incidentController.getIncidentStats(req, res));

// Get heatmap data
router.get('/heatmap/data', (req, res) => incidentController.getHeatmapData(req, res));

// Get nearby incidents
router.get('/search/nearby', (req, res) => incidentController.getNearbyIncidents(req, res));

// Get user's incidents
router.get('/user/:userId', (req, res) => incidentController.getUserIncidents(req, res));

// Get all incidents
router.get('/', (req, res) => incidentController.getIncidents(req, res));

// Get incident by ID
router.get('/:incidentId', (req, res) => incidentController.getIncident(req, res));

router.post(
  '/:incidentId/images',
  authenticateToken,
  incidentImageUpload.single('image'),
  (req, res) => incidentController.uploadIncidentImage(req, res)
);

// Create incident (authenticated)
router.post(
  '/',
  authenticateToken,
  validateRequest({
    category_id: { required: true, type: 'number' },
    title: { required: true, type: 'string', minLength: 3 },
    district: { required: false, type: 'string', maxLength: 100 },
    latitude: { required: true, type: 'number' },
    longitude: { required: true, type: 'number' },
    priority: { required: false, type: 'string' },
  }),
  (req, res) => incidentController.createIncident(req, res)
);

// Update incident (authenticated)
router.put(
  '/:incidentId',
  authenticateToken,
  (req, res) => incidentController.updateIncident(req, res)
);

// Mark as completed (authenticated)
router.patch(
  '/:incidentId/complete',
  authenticateToken,
  (req, res) => incidentController.completeIncident(req, res)
);

// Delete incident (authenticated)
router.delete(
  '/:incidentId',
  authenticateToken,
  (req, res) => incidentController.deleteIncident(req, res)
);

export default router;
