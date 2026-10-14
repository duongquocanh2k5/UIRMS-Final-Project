import { Router } from 'express';
import { AdminRole } from '../config/constants';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { departmentsController } from '../controllers/departments.controller';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRole(AdminRole.SUPER_ADMIN));

router.get('/', (req, res) => departmentsController.getAll(req, res));
router.post(
    '/',
    validateRequest({
        name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
        area: { required: false, type: 'string', maxLength: 100 },
        lead_admin_id: { required: false, type: 'number', custom: (value) => Number.isInteger(value) && value > 0 },
    }),
    (req, res) => departmentsController.create(req, res)
);
router.patch(
    '/:id',
    validateRequest({
        name: { required: false, type: 'string', minLength: 1, maxLength: 100 },
        area: { required: false, type: 'string', maxLength: 100 },
        lead_admin_id: { required: false, type: 'number', custom: (value) => Number.isInteger(value) && value > 0 },
    }),
    (req, res) => departmentsController.update(req, res)
);
router.delete('/:id', (req, res) => departmentsController.delete(req, res));

export default router;