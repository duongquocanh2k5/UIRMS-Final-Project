import { Request, Response } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS } from '../config/constants';
import { DepartmentsService, departmentsService } from '../services/departments.service';
import { DepartmentInput } from '../types/index';

function parseId(value: string): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function parseInput(body: Record<string, unknown>): DepartmentInput {
    return {
        ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
        ...(body.area === null || typeof body.area === 'string' ? { area: typeof body.area === 'string' ? body.area.trim() || null : null } : {}),
        ...(body.lead_admin_id === null || typeof body.lead_admin_id === 'number' ? { lead_admin_id: body.lead_admin_id as number | null } : {}),
    };
}

export class DepartmentsController {
    constructor(private readonly service: DepartmentsService = departmentsService) { }

    async getAll(_req: Request, res: Response): Promise<void> {
        try {
            res.json({ success: true, data: await this.service.getDepartments() });
        } catch (error) {
            console.error('Get departments error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async create(req: Request, res: Response): Promise<void> {
        try {
            const department = await this.service.createDepartment(parseInput(req.body as Record<string, unknown>));
            if (!department) {
                res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
                return;
            }
            res.status(HTTP_STATUS.CREATED).json({ success: true, data: department });
        } catch (error) {
            console.error('Create department error:', error);
            this.handleWriteError(error, res);
        }
    }

    async update(req: Request, res: Response): Promise<void> {
        const departmentId = parseId(req.params.id as string);
        if (!departmentId) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid department ID.' });
            return;
        }
        const allowedFields = new Set(['name', 'area', 'lead_admin_id']);
        const body = req.body as Record<string, unknown>;
        if (Object.keys(body).length === 0 || Object.keys(body).some((field) => !allowedFields.has(field))) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Only name, area, and lead_admin_id can be updated.' });
            return;
        }
        if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Department name is required.' });
            return;
        }
        if (body.area !== undefined && body.area !== null && typeof body.area !== 'string') {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'area must be a string or null.' });
            return;
        }
        if (body.lead_admin_id !== undefined && body.lead_admin_id !== null && (!Number.isInteger(body.lead_admin_id) || Number(body.lead_admin_id) < 1)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'lead_admin_id must be a positive integer or null.' });
            return;
        }

        try {
            const department = await this.service.updateDepartment(departmentId, parseInput(body));
            if (!department) {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
                return;
            }
            res.json({ success: true, data: department });
        } catch (error) {
            console.error('Update department error:', error);
            this.handleWriteError(error, res);
        }
    }

    async delete(req: Request, res: Response): Promise<void> {
        const departmentId = parseId(req.params.id as string);
        if (!departmentId) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid department ID.' });
            return;
        }

        try {
            const result = await this.service.deleteDepartment(departmentId);
            if (!result.exists) {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
                return;
            }
            if (result.staffCount > 0) {
                res.status(HTTP_STATUS.CONFLICT).json({ error: `This department cannot be deleted because it is assigned to ${result.staffCount} staff member(s).` });
                return;
            }
            res.json({ success: true, data: { id: departmentId } });
        } catch (error) {
            console.error('Delete department error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    private handleWriteError(error: unknown, res: Response): void {
        const code = (error as { code?: string }).code;
        if (code === '23505') {
            res.status(HTTP_STATUS.CONFLICT).json({ error: 'A department with this name already exists.' });
            return;
        }
        if (code === '23503') {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'The department lead does not exist.' });
            return;
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
    }
}

export const departmentsController = new DepartmentsController();