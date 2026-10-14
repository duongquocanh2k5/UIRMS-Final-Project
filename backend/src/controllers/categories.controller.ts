import { Request, Response } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS } from '../config/constants';
import { CategoriesService, categoriesService } from '../services/categories.service';
import { CategoryInput } from '../types/index';

function parseId(value: string): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export class CategoriesController {
    constructor(private readonly service: CategoriesService = categoriesService) { }

    async getAll(_req: Request, res: Response): Promise<void> {
        try {
            res.json({ success: true, data: await this.service.getCategories() });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async create(req: Request, res: Response): Promise<void> {
        const input = req.body as CategoryInput;
        if (!input.name?.trim()) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Tên danh mục không được để trống' });
            return;
        }
        try {
            const category = await this.service.createCategory({
                name: input.name.trim(),
                icon: input.icon?.trim() || null,
                color: input.color?.trim() || null,
            });
            if (!category) {
                res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
                return;
            }
            res.status(HTTP_STATUS.CREATED).json({ success: true, data: category });
        } catch (error) {
            console.error('Create category error:', error);
            if ((error as { code?: string }).code === '23505') {
                res.status(HTTP_STATUS.CONFLICT).json({ error: 'Tên danh mục đã tồn tại' });
                return;
            }
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async update(req: Request, res: Response): Promise<void> {
        const categoryId = parseId(req.params.id as string);
        if (!categoryId) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Mã danh mục không hợp lệ' });
            return;
        }
        const allowedFields = new Set(['name', 'icon', 'color']);
        const body = req.body as Record<string, unknown>;
        if (Object.keys(body).length === 0 || Object.keys(body).some((field) => !allowedFields.has(field))) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Chỉ được cập nhật name, icon và color' });
            return;
        }
        if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Tên danh mục không được để trống' });
            return;
        }

        try {
            const category = await this.service.updateCategory(categoryId, {
                ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
                ...(body.icon === null || typeof body.icon === 'string' ? { icon: typeof body.icon === 'string' ? body.icon.trim() || null : null } : {}),
                ...(body.color === null || typeof body.color === 'string' ? { color: typeof body.color === 'string' ? body.color.trim() || null : null } : {}),
            });
            if (!category) {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
                return;
            }
            res.json({ success: true, data: category });
        } catch (error) {
            console.error('Update category error:', error);
            if ((error as { code?: string }).code === '23505') {
                res.status(HTTP_STATUS.CONFLICT).json({ error: 'Tên danh mục đã tồn tại' });
                return;
            }
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async delete(req: Request, res: Response): Promise<void> {
        const categoryId = parseId(req.params.id as string);
        if (!categoryId) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Mã danh mục không hợp lệ' });
            return;
        }

        try {
            const result = await this.service.deleteCategory(categoryId);
            if (!result.exists) {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.NOT_FOUND });
                return;
            }
            if (result.reportCount > 0) {
                res.status(HTTP_STATUS.CONFLICT).json({ error: `Không thể xóa danh mục đang có ${result.reportCount} báo cáo sử dụng` });
                return;
            }
            res.json({ success: true, data: { id: categoryId } });
        } catch (error) {
            console.error('Delete category error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }
}

export const categoriesController = new CategoriesController();