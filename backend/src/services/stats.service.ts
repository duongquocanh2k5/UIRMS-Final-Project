import { query } from '../config/database';

export interface StatsDateRange {
    from: string;
    toExclusive: string;
    previousFrom: string;
    previousToExclusive: string;
}

export interface StatsTrendPoint {
    date: string;
    received: number;
    completed: number;
}

export interface StatsOverviewResponse {
    avgProcessingDays: number;
    avgProcessingDaysChange: number;
    onTimeRate: number;
    onTimeRateChange: number;
    rejectionRate: number;
    rejectionRateChange: number;
    trend: StatsTrendPoint[];
}

export interface DistrictStatsResponse {
    district: string;
    total: number;
}

export interface CategoryMonthlyStatsResponse {
    month: string;
    category: string;
    total: number;
}

interface OverviewMetricsRow {
    avg_processing_days: number | string;
    previous_avg_processing_days: number | string;
    on_time_rate: number | string;
    previous_on_time_rate: number | string;
    rejection_rate: number | string;
    previous_rejection_rate: number | string;
}

interface TrendRow {
    date: string;
    received: number;
    completed: number;
}

function percentageChange(current: number, previous: number): number {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }

    return ((current - previous) / Math.abs(previous)) * 100;
}

export class StatsService {
    async getOverview(range: StatsDateRange): Promise<StatsOverviewResponse> {
        const [metricsRows, trend] = await Promise.all([
            query<OverviewMetricsRow>(
                `WITH incident_metrics AS (
           SELECT status, priority, created_at, completed_at,
                  EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400.0 AS processing_days,
                  CASE priority
                    WHEN 'critical' THEN 2 * 60 * 60
                    WHEN 'high' THEN 24 * 60 * 60
                    WHEN 'medium' THEN 3 * 24 * 60 * 60
                    WHEN 'low' THEN 7 * 24 * 60 * 60
                    ELSE 0
                  END AS sla_seconds
           FROM incidents
           WHERE deleted_at IS NULL
         )
         SELECT
           COALESCE(AVG(processing_days) FILTER (
             WHERE status = 'completed'
               AND completed_at >= $1::date AND completed_at < $2::date
           ), 0) AS avg_processing_days,
           COALESCE(AVG(processing_days) FILTER (
             WHERE status = 'completed'
               AND completed_at >= $3::date AND completed_at < $4::date
           ), 0) AS previous_avg_processing_days,
           COALESCE(100.0 * COUNT(*) FILTER (
             WHERE status = 'completed'
               AND completed_at >= $1::date AND completed_at < $2::date
               AND EXTRACT(EPOCH FROM (completed_at - created_at)) <= sla_seconds
           ) / NULLIF(COUNT(*) FILTER (
             WHERE status = 'completed'
               AND completed_at >= $1::date AND completed_at < $2::date
           ), 0), 0) AS on_time_rate,
           COALESCE(100.0 * COUNT(*) FILTER (
             WHERE status = 'completed'
               AND completed_at >= $3::date AND completed_at < $4::date
               AND EXTRACT(EPOCH FROM (completed_at - created_at)) <= sla_seconds
           ) / NULLIF(COUNT(*) FILTER (
             WHERE status = 'completed'
               AND completed_at >= $3::date AND completed_at < $4::date
           ), 0), 0) AS previous_on_time_rate,
           COALESCE(100.0 * COUNT(*) FILTER (
             WHERE status = 'rejected'
               AND created_at >= $1::date AND created_at < $2::date
           ) / NULLIF(COUNT(*) FILTER (
             WHERE created_at >= $1::date AND created_at < $2::date
           ), 0), 0) AS rejection_rate,
           COALESCE(100.0 * COUNT(*) FILTER (
             WHERE status = 'rejected'
               AND created_at >= $3::date AND created_at < $4::date
           ) / NULLIF(COUNT(*) FILTER (
             WHERE created_at >= $3::date AND created_at < $4::date
           ), 0), 0) AS previous_rejection_rate
         FROM incident_metrics;`,
                [range.from, range.toExclusive, range.previousFrom, range.previousToExclusive]
            ),
            query<TrendRow>(
                `WITH days AS (
           SELECT generate_series($1::date, $2::date - 1, INTERVAL '1 day')::date AS day
         )
         SELECT TO_CHAR(days.day, 'YYYY-MM-DD') AS date,
                COUNT(incidents.id) FILTER (
                  WHERE incidents.created_at >= days.day
                    AND incidents.created_at < days.day + INTERVAL '1 day'
                )::int AS received,
                COUNT(incidents.id) FILTER (
                  WHERE incidents.status = 'completed'
                    AND incidents.completed_at >= days.day
                    AND incidents.completed_at < days.day + INTERVAL '1 day'
                )::int AS completed
         FROM days
         LEFT JOIN incidents
           ON incidents.deleted_at IS NULL
          AND (
            (incidents.created_at >= days.day AND incidents.created_at < days.day + INTERVAL '1 day')
            OR (incidents.status = 'completed'
                AND incidents.completed_at >= days.day
                AND incidents.completed_at < days.day + INTERVAL '1 day')
          )
         GROUP BY days.day
         ORDER BY days.day;`,
                [range.from, range.toExclusive]
            ),
        ]);

        const metrics = metricsRows[0]!;
        const avgProcessingDays = Number(metrics.avg_processing_days);
        const previousAvgProcessingDays = Number(metrics.previous_avg_processing_days);
        const onTimeRate = Number(metrics.on_time_rate);
        const previousOnTimeRate = Number(metrics.previous_on_time_rate);
        const rejectionRate = Number(metrics.rejection_rate);
        const previousRejectionRate = Number(metrics.previous_rejection_rate);

        return {
            avgProcessingDays,
            avgProcessingDaysChange: percentageChange(avgProcessingDays, previousAvgProcessingDays),
            onTimeRate,
            onTimeRateChange: percentageChange(onTimeRate, previousOnTimeRate),
            rejectionRate,
            rejectionRateChange: percentageChange(rejectionRate, previousRejectionRate),
            trend,
        };
    }

    async getByDistrict(range: StatsDateRange): Promise<DistrictStatsResponse[]> {
        const rows = await query<{ district: string; total: number }>(
            `SELECT COALESCE(NULLIF(BTRIM(district), ''), 'Không xác định') AS district,
              COUNT(*)::int AS total
       FROM incidents
       WHERE deleted_at IS NULL
         AND created_at >= $1::date AND created_at < $2::date
       GROUP BY COALESCE(NULLIF(BTRIM(district), ''), 'Không xác định')
       ORDER BY total DESC, district ASC
       LIMIT 5;`,
            [range.from, range.toExclusive]
        );

        return rows.map((row) => ({ ...row, total: Number(row.total) }));
    }

    async getByCategoryMonthly(range: StatsDateRange): Promise<CategoryMonthlyStatsResponse[]> {
        const rows = await query<CategoryMonthlyStatsResponse>(
            `SELECT TO_CHAR(DATE_TRUNC('month', incidents.created_at), 'YYYY-MM') AS month,
              categories.name AS category,
              COUNT(*)::int AS total
       FROM incidents
       JOIN categories ON categories.id = incidents.category_id
       WHERE incidents.deleted_at IS NULL
         AND incidents.created_at >= $1::date AND incidents.created_at < $2::date
       GROUP BY DATE_TRUNC('month', incidents.created_at), categories.id, categories.name
       ORDER BY DATE_TRUNC('month', incidents.created_at), categories.name;`,
            [range.from, range.toExclusive]
        );

        return rows.map((row) => ({ ...row, total: Number(row.total) }));
    }
}

export const statsService = new StatsService();