import { useEffect, useState } from 'react';
import { adminApi, type AdminCategory, type CategoryPayload } from '../services/api';

interface CategoriesResult {
    key: number;
    categories: AdminCategory[];
    error: string;
}

export function useCategories() {
    const [reloadKey, setReloadKey] = useState(0);
    const [result, setResult] = useState<CategoriesResult>({ key: -1, categories: [], error: '' });
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState('');

    useEffect(() => {
        let active = true;
        adminApi.getCategories()
            .then(({ data }) => { if (active) setResult({ key: reloadKey, categories: data, error: '' }); })
            .catch((reason: unknown) => { if (active) setResult({ key: reloadKey, categories: [], error: reason instanceof Error ? reason.message : 'Không thể tải danh mục.' }); });
        return () => { active = false; };
    }, [reloadKey]);

    async function createCategory(payload: CategoryPayload) {
        setSaving(true); setActionError('');
        try { await adminApi.createCategory(payload); setReloadKey((key) => key + 1); }
        catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Không thể tạo danh mục.'); throw reason; }
        finally { setSaving(false); }
    }

    async function updateCategory(id: number, payload: Partial<CategoryPayload>) {
        setSaving(true); setActionError('');
        try { await adminApi.updateCategory(id, payload); setReloadKey((key) => key + 1); }
        catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Không thể cập nhật danh mục.'); throw reason; }
        finally { setSaving(false); }
    }

    async function deleteCategory(id: number) {
        setDeletingId(id); setActionError('');
        try { await adminApi.deleteCategory(id); setReloadKey((key) => key + 1); }
        catch (reason) { const message = reason instanceof Error ? reason.message : 'Không thể xóa danh mục.'; setActionError(message); throw reason; }
        finally { setDeletingId(null); }
    }

    const current = result.key === reloadKey;
    return {
        categories: current ? result.categories : [],
        loading: !current,
        error: current ? result.error : '',
        saving,
        deletingId,
        actionError,
        clearActionError: () => setActionError(''),
        createCategory,
        updateCategory,
        deleteCategory,
        refresh: () => setReloadKey((key) => key + 1),
    };
}