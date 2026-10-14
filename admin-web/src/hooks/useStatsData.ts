import { useEffect, useState } from 'react';
import { adminApi, type CategoryMonthlyStats, type DistrictStats, type StatsOverview, type StatsRange } from '../services/api';

interface StatsData {
    overview: StatsOverview;
    districts: DistrictStats[];
    categories: CategoryMonthlyStats[];
}

export function useStatsData(range: StatsRange) {
    const { from, to } = range;
    const [reloadKey, setReloadKey] = useState(0);
    const requestKey = `${from}:${to}:${reloadKey}`;
    const [result, setResult] = useState<{
        key: string;
        data: StatsData | null;
        error: string;
    }>({ key: '', data: null, error: '' });

    useEffect(() => {
        let active = true;
        const currentRange = { from, to };

        Promise.all([
            adminApi.getStatsOverview(currentRange),
            adminApi.getStatsByDistrict(currentRange),
            adminApi.getStatsByCategoryMonthly(currentRange),
        ])
            .then(([overview, districts, categories]) => {
                if (active) setResult({ key: requestKey, data: { overview, districts, categories }, error: '' });
            })
            .catch((reason: unknown) => {
                if (active) setResult({
                    key: requestKey,
                    data: null,
                    error: reason instanceof Error ? reason.message : 'Không thể tải dữ liệu thống kê.',
                });
            });

        return () => {
            active = false;
        };
    }, [from, to, reloadKey, requestKey]);

    const isCurrentRequest = result.key === requestKey;
    return {
        ...result.data,
        loading: !isCurrentRequest,
        error: isCurrentRequest ? result.error : '',
        retry: () => setReloadKey((key) => key + 1),
    };
}