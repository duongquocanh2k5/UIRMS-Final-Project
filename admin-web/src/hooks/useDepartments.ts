import { useEffect, useState } from 'react';
import { adminApi, type AdminDepartment, type DepartmentPayload, type StaffListItem } from '../services/api';

interface DepartmentsResult {
    key: number;
    departments: AdminDepartment[];
    staff: StaffListItem[];
    error: string;
    staffError: string;
}

export function useDepartments() {
    const [reloadKey, setReloadKey] = useState(0);
    const [result, setResult] = useState<DepartmentsResult>({ key: -1, departments: [], staff: [], error: '', staffError: '' });
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState('');

    useEffect(() => {
        let active = true;
        Promise.allSettled([adminApi.getDepartments(), adminApi.getAllStaff()])
            .then(([departmentsResult, staffResult]) => {
                if (!active) return;
                setResult({
                    key: reloadKey,
                    departments: departmentsResult.status === 'fulfilled' ? departmentsResult.value.data : [],
                    staff: staffResult.status === 'fulfilled' ? staffResult.value : [],
                    error: departmentsResult.status === 'rejected'
                        ? departmentsResult.reason instanceof Error ? departmentsResult.reason.message : 'Không thể tải đơn vị xử lý.'
                        : '',
                    staffError: staffResult.status === 'rejected'
                        ? staffResult.reason instanceof Error ? staffResult.reason.message : 'Không thể tải danh sách trưởng đội.'
                        : '',
                });
            });
        return () => { active = false; };
    }, [reloadKey]);

    async function createDepartment(payload: DepartmentPayload) {
        setSaving(true); setActionError('');
        try { await adminApi.createDepartment(payload); setReloadKey((key) => key + 1); }
        catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Không thể tạo đơn vị.'); throw reason; }
        finally { setSaving(false); }
    }

    async function updateDepartment(id: number, payload: Partial<DepartmentPayload>) {
        setSaving(true); setActionError('');
        try { await adminApi.updateDepartment(id, payload); setReloadKey((key) => key + 1); }
        catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Không thể cập nhật đơn vị.'); throw reason; }
        finally { setSaving(false); }
    }

    async function deleteDepartment(id: number) {
        setDeletingId(id); setActionError('');
        try { await adminApi.deleteDepartment(id); setReloadKey((key) => key + 1); }
        catch (reason) { const message = reason instanceof Error ? reason.message : 'Không thể xóa đơn vị.'; setActionError(message); throw reason; }
        finally { setDeletingId(null); }
    }

    const current = result.key === reloadKey;
    return {
        departments: current ? result.departments : [],
        staff: current ? result.staff : [],
        loading: !current,
        error: current ? result.error : '',
        staffError: current ? result.staffError : '',
        saving,
        deletingId,
        actionError,
        clearActionError: () => setActionError(''),
        createDepartment,
        updateDepartment,
        deleteDepartment,
        refresh: () => setReloadKey((key) => key + 1),
    };
}