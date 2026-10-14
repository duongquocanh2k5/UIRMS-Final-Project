import { Request, Response } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS } from '../config/constants';
import { AdminRole } from '../config/constants';
import { validatePaginationParams } from '../utils/validators';
import { CreateStaffInput, UpdateStaffInput } from '../types/index';
import { staffService } from '../services/staff.service';
import { AuthRequest } from '../middlewares/auth.middleware';

function parseStaffId(value: string): number | null {
    const staffId = Number(value);
    return Number.isInteger(staffId) && staffId > 0 ? staffId : null;
}

export class StaffController {
    async getStaff(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { page, limit } = validatePaginationParams(req.query.page, req.query.limit);
            const managerId = req.user?.role === AdminRole.MANAGER ? req.user.id : undefined;
            const { staff, total } = await staffService.getStaff({ page, limit }, managerId);

            res.json({
                success: true,
                data: staff,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (error) {
            console.error('Get staff error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async getStatsSummary(req: AuthRequest, res: Response): Promise<void> {
        try {
            const managerId = req.user?.role === AdminRole.MANAGER ? req.user.id : undefined;
            res.json({ success: true, data: await staffService.getStatsSummary(managerId) });
        } catch (error) {
            console.error('Get staff stats summary error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async getStaffById(req: AuthRequest, res: Response): Promise<void> {
        const staffId = parseStaffId(req.params.id as string);
        if (!staffId) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid staff id' });
            return;
        }

        try {
            const managerId = req.user?.role === AdminRole.MANAGER ? req.user.id : undefined;
            const staff = await staffService.getStaffById(staffId, managerId);
            if (!staff) {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
                return;
            }
            res.json({ success: true, data: staff });
        } catch (error) {
            console.error('Get staff details error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async createStaff(req: AuthRequest, res: Response): Promise<void> {
        try {
            const input = req.body as CreateStaffInput;
            if (req.user?.role === AdminRole.MANAGER && input.role !== AdminRole.TECHNICIAN) {
                res.status(HTTP_STATUS.FORBIDDEN).json({ error: ERROR_MESSAGES.FORBIDDEN });
                return;
            }
            const staff = await staffService.createStaff({
                ...input,
                name: input.name.trim(),
                email: input.email.trim().toLowerCase(),
                phone: input.phone?.trim() || null,
                department: input.department?.trim() || null,
            }, req.user!);
            res.status(HTTP_STATUS.CREATED).json({ success: true, data: staff });
        } catch (error) {
            console.error('Create staff error:', error);
            if (error instanceof Error && error.message === 'MANAGER_DEPARTMENT_REQUIRED') {
                res.status(HTTP_STATUS.CONFLICT).json({ error: 'Quản lý chưa được gán đơn vị.' });
                return;
            }
            if ((error as { code?: string }).code === '23505') {
                res.status(HTTP_STATUS.CONFLICT).json({ error: 'Staff email already exists' });
                return;
            }
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async updateStaff(req: AuthRequest, res: Response): Promise<void> {
        const staffId = parseStaffId(req.params.id as string);
        if (!staffId) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid staff id' });
            return;
        }

        const allowedFields = new Set(['name', 'phone', 'department', 'is_active']);
        const body = req.body as Record<string, unknown>;
        if (req.user?.role === AdminRole.MANAGER && Object.hasOwn(body, 'department')) {
            res.status(HTTP_STATUS.FORBIDDEN).json({ error: ERROR_MESSAGES.FORBIDDEN });
            return;
        }
        if (Object.keys(body).some((field) => !allowedFields.has(field)) || Object.keys(body).length === 0) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Only name, phone, department, and is_active can be updated' });
            return;
        }
        if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Name must be a non-empty string' });
            return;
        }
        if (body.phone !== undefined && body.phone !== null && typeof body.phone !== 'string') {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Phone must be a string or null' });
            return;
        }
        if (body.department !== undefined && body.department !== null && typeof body.department !== 'string') {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Department must be a string or null' });
            return;
        }
        if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'is_active must be a boolean' });
            return;
        }

        const input = {
            ...body,
            ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
            ...(typeof body.phone === 'string' ? { phone: body.phone.trim() || null } : {}),
            ...(typeof body.department === 'string' ? { department: body.department.trim() || null } : {}),
        } as UpdateStaffInput;

        try {
            const managerId = req.user?.role === AdminRole.MANAGER ? req.user.id : undefined;
            const staff = await staffService.updateStaff(staffId, input, managerId);
            if (!staff) {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
                return;
            }
            res.json({ success: true, data: staff });
        } catch (error) {
            console.error('Update staff error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }
}

export const staffController = new StaffController();