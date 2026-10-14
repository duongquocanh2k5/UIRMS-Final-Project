import { Router } from 'express';
import { AdminRole, REGEX_PATTERNS } from '../config/constants';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { staffController } from '../controllers/staff.controller';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRole(AdminRole.SUPER_ADMIN, AdminRole.MANAGER));

router.get('/', (req, res) => staffController.getStaff(req, res));
router.get('/stats/summary', (req, res) => staffController.getStatsSummary(req, res));
router.get('/:id', (req, res) => staffController.getStaffById(req, res));

router.post(
    '/',
    validateRequest({
        name: { required: true, type: 'string', minLength: 2, maxLength: 255 },
        email: { required: true, type: 'string', pattern: REGEX_PATTERNS.EMAIL, maxLength: 255 },
        phone: { required: false, type: 'string', maxLength: 20 },
        department: { required: false, type: 'string', maxLength: 100 },
        role: {
            required: true,
            type: 'string',
            custom: (value) => value === AdminRole.TECHNICIAN || value === AdminRole.MANAGER,
        },
        password: { required: true, type: 'string', pattern: REGEX_PATTERNS.PASSWORD },
    }),
    (req, res) => staffController.createStaff(req, res)
);

router.patch(
    '/:id',
    validateRequest({
        name: { required: false, type: 'string', minLength: 2, maxLength: 255 },
        phone: { required: false, type: 'string', maxLength: 20 },
        department: { required: false, type: 'string', maxLength: 100 },
        is_active: { required: false, type: 'boolean' },
    }),
    (req, res) => staffController.updateStaff(req, res)
);

export default router;