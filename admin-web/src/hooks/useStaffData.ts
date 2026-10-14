import { useEffect, useState } from 'react';
import { adminApi, type StaffDetail, type StaffListItem, type StaffStatsSummary } from '../services/api';

interface StaffListResult {
    key: string;
    staff: StaffListItem[];
    total: number;
    totalPages: number;
    summary: StaffStatsSummary | null;
    error: string;
    summaryError: string;
}

export function useStaffList(page = 1, limit = 10) {
    const [reloadKey, setReloadKey] = useState(0);
    const requestKey = `${page}:${limit}:${reloadKey}`;
    const [result, setResult] = useState<StaffListResult>({
        key: '', staff: [], total: 0, totalPages: 1, summary: null, error: '', summaryError: '',
    });

    useEffect(() => {
        let active = true;
        Promise.allSettled([adminApi.getStaff(page, limit), adminApi.getStaffStatsSummary()])
            .then(([listResult, summaryResult]) => {
                if (!active) return;
                setResult({
                    key: requestKey,
                    staff: listResult.status === 'fulfilled' ? listResult.value.data : [],
                    total: listResult.status === 'fulfilled' ? listResult.value.pagination.total : 0,
                    totalPages: listResult.status === 'fulfilled' ? listResult.value.pagination.totalPages || 1 : 1,
                    summary: summaryResult.status === 'fulfilled' ? summaryResult.value.data : null,
                    error: listResult.status === 'rejected'
                        ? listResult.reason instanceof Error ? listResult.reason.message : 'Không thể tải danh sách nhân viên.'
                        : '',
                    summaryError: summaryResult.status === 'rejected'
                        ? summaryResult.reason instanceof Error ? summaryResult.reason.message : 'Không thể tải thống kê nhân viên.'
                        : '',
                });
            });

        return () => { active = false; };
    }, [page, limit, reloadKey, requestKey]);

    const current = result.key === requestKey;
    return {
        staff: current ? result.staff : [],
        total: current ? result.total : 0,
        totalPages: current ? result.totalPages : 1,
        summary: current ? result.summary : null,
        loading: !current,
        error: current ? result.error : '',
        summaryError: current ? result.summaryError : '',
        refresh: () => setReloadKey((key) => key + 1),
    };
}

interface StaffDetailResult {
    key: string;
    staff: StaffDetail | null;
    error: string;
}

export function useStaffDetail(id: number | null) {
    const [reloadKey, setReloadKey] = useState(0);
    const requestKey = id === null ? 'none' : `${id}:${reloadKey}`;
    const [result, setResult] = useState<StaffDetailResult>({ key: '', staff: null, error: '' });

    useEffect(() => {
        if (id === null) return;
        let active = true;
        adminApi.getStaffById(id)
            .then((response) => {
                if (active) setResult({ key: requestKey, staff: response.data, error: '' });
            })
            .catch((reason: unknown) => {
                if (active) setResult({
                    key: requestKey,
                    staff: null,
                    error: reason instanceof Error ? reason.message : 'Không thể tải hồ sơ nhân viên.',
                });
            });

        return () => { active = false; };
    }, [id, reloadKey, requestKey]);

    const current = id === null || result.key === requestKey;
    return {
        staff: id === null || !current ? null : result.staff,
        loading: id !== null && !current,
        error: current ? result.error : '',
        refresh: () => setReloadKey((key) => key + 1),
    };
}