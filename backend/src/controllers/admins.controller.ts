import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ERROR_MESSAGES, HTTP_STATUS, REGEX_PATTERNS } from '../config/constants';
import { AdminProfileService, adminProfileService } from '../services/adminProfile.service';
import { UpdateAdminProfileInput } from '../types/index';

export class AdminsController {
    constructor(private readonly service: AdminProfileService = adminProfileService) { }

    async recordPresence(req: AuthRequest, res: Response): Promise<void> {
        try {
            const recorded = await this.service.recordPresence(req.user!.id);
            if (!recorded) {
                res.status(HTTP_STATUS.FORBIDDEN).json({ error: ERROR_MESSAGES.FORBIDDEN });
                return;
            }
            res.status(HTTP_STATUS.OK).json({ success: true });
        } catch (error) {
            console.error('Record admin presence error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async getMe(req: AuthRequest, res: Response): Promise<void> {
        try {
            const admin = await this.service.getProfile(req.user!.id);
            if (!admin) {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
                return;
            }
            res.json({ success: true, data: admin });
        } catch (error) {
            console.error('Get admin profile error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async updateMe(req: AuthRequest, res: Response): Promise<void> {
        const allowedFields = new Set(['name', 'phone', 'avatar_url']);
        const body = req.body as Record<string, unknown>;
        if (Object.keys(body).length === 0 || Object.keys(body).some((field) => !allowedFields.has(field))) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Only name, phone, and avatar_url can be updated.' });
            return;
        }
        if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Name must be a non-empty string.' });
            return;
        }
        if (body.phone !== undefined && body.phone !== null && typeof body.phone !== 'string') {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Phone must be a string or null.' });
            return;
        }
        if (body.avatar_url !== undefined && body.avatar_url !== null && typeof body.avatar_url !== 'string') {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'avatar_url must be a string or null.' });
            return;
        }

        const input: UpdateAdminProfileInput = {
            ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
            ...(body.phone === null || typeof body.phone === 'string' ? { phone: typeof body.phone === 'string' ? body.phone.trim() || null : null } : {}),
            ...(body.avatar_url === null || typeof body.avatar_url === 'string' ? { avatar_url: typeof body.avatar_url === 'string' ? body.avatar_url.trim() || null : null } : {}),
        };

        try {
            const admin = await this.service.updateProfile(req.user!.id, input);
            if (!admin) {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
                return;
            }
            res.json({ success: true, data: admin });
        } catch (error) {
            console.error('Update admin profile error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async changePassword(req: AuthRequest, res: Response): Promise<void> {
        const { currentPassword, newPassword } = req.body as { currentPassword?: unknown; newPassword?: unknown };
        if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Current password and new password are required.' });
            return;
        }
        if (!REGEX_PATTERNS.PASSWORD.test(newPassword)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'The new password must be at least 8 characters long and include an uppercase letter, a number, and a special character.' });
            return;
        }

        try {
            const result = await this.service.changePassword(req.user!.id, currentPassword, newPassword);
            if (result === 'not_found') {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
                return;
            }
            if (result === 'invalid_password') {
                res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'The current password is incorrect.' });
                return;
            }
            res.json({ success: true, data: { message: 'Password changed successfully.' } });
        } catch (error) {
            console.error('Change admin password error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }
}

export const adminsController = new AdminsController();