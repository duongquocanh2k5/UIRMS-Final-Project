import { Router } from 'express';
import { AdminRole, REGEX_PATTERNS } from '../config/constants';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { adminsController } from '../controllers/admins.controller';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRole(AdminRole.SUPER_ADMIN, AdminRole.MANAGER, AdminRole.TECHNICIAN));

router.post('/me/presence', (req, res) => adminsController.recordPresence(req, res));
router.get('/me', (req, res) => adminsController.getMe(req, res));
router.patch(
    '/me',
    validateRequest({
        name: { required: false, type: 'string', minLength: 2, maxLength: 255 },
        phone: { required: false, type: 'string', maxLength: 20 },
        avatar_url: { required: false, type: 'string', maxLength: 2048 },
    }),
    (req, res) => adminsController.updateMe(req, res)
);
router.patch(
    '/me/password',
    validateRequest({
        currentPassword: { required: true, type: 'string' },
        newPassword: { required: true, type: 'string', pattern: REGEX_PATTERNS.PASSWORD },
    }),
    (req, res) => adminsController.changePassword(req, res)
);

export default router;