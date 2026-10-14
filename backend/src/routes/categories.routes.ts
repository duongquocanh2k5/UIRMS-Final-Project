import { Router } from 'express';
import { AdminRole } from '../config/constants';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { categoriesController } from '../controllers/categories.controller';

const router = Router();

router.use(authenticateToken);
router.get('/', authorizeRole(AdminRole.SUPER_ADMIN, AdminRole.MANAGER, AdminRole.TECHNICIAN), (req, res) => categoriesController.getAll(req, res));
router.post(
    '/',
    authorizeRole(AdminRole.SUPER_ADMIN),
    validateRequest({
        name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
        icon: { required: false, type: 'string', maxLength: 10 },
        color: { required: false, type: 'string', maxLength: 20 },
    }),
    (req, res) => categoriesController.create(req, res)
);
router.patch(
    '/:id',
    authorizeRole(AdminRole.SUPER_ADMIN),
    validateRequest({
        name: { required: false, type: 'string', minLength: 1, maxLength: 100 },
        icon: { required: false, type: 'string', maxLength: 10 },
        color: { required: false, type: 'string', maxLength: 20 },
    }),
    (req, res) => categoriesController.update(req, res)
);
router.delete('/:id', authorizeRole(AdminRole.SUPER_ADMIN), (req, res) => categoriesController.delete(req, res));

export default router;