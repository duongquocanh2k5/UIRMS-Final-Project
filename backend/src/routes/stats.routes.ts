import { Router } from 'express';
import { AdminRole } from '../config/constants';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { statsController } from '../controllers/stats.controller';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRole(AdminRole.SUPER_ADMIN, AdminRole.MANAGER));

router.get('/overview', (req, res) => statsController.getOverview(req, res));
router.get('/by-district', (req, res) => statsController.getByDistrict(req, res));
router.get('/by-category-monthly', (req, res) => statsController.getByCategoryMonthly(req, res));

export default router;