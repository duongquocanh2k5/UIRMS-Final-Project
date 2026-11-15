import { CalendarDays, Download, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { useStatsData } from '../hooks/useStatsData';
import type { CategoryMonthlyStats, StatsRange } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { getCategoryColor } from '../utils/categoryColors';

type Preset = '7d' | '30d' | '3m' | 'custom';

const presetOptions: Array<{ id: Exclude<Preset, 'custom'>; label: string; days?: number }> = [
    { id: '7d', label: '7 ngày', days: 7 },
    { id: '30d', label: '30 ngày', days: 30 },
    { id: '3m', label: '3 tháng' },
];

function localDateString(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

function getPresetRange(preset: Exclude<Preset, 'custom'>): StatsRange {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    const from = new Date(to);

    if (preset === '3m') {
        const targetMonth = from.getMonth() - 3;
        const targetYear = from.getFullYear() + Math.floor(targetMonth / 12);
        const normalizedMonth = (targetMonth + 12) % 12;
        const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
        from.setFullYear(targetYear, normalizedMonth, Math.min(from.getDate(), lastDayOfTargetMonth));
    } else {
        from.setDate(from.getDate() - (presetOptions.find((option) => option.id === preset)?.days ?? 30) + 1);
    }

    return { from: localDateString(from), to: localDateString(to) };
}

function buildCategorySummary(rows: CategoryMonthlyStats[], translateCategory: (name: string) => string, selectedMonth: string) {
    const filtered = selectedMonth === 'all' ? rows : rows.filter((row) => row.month === selectedMonth);
    const totals = new Map<string, { rawName: string; name: string; total: number; color: string }>();

    filtered.forEach(({ category, total }) => {
        const translated = translateCategory(category);
        const existing = totals.get(translated);
        const count = Number(total) || 0;
        if (existing) {
            existing.total += count;
        } else {
            totals.set(translated, {
                rawName: category,
                name: translated,
                total: count,
                color: getCategoryColor(undefined, category),
            });
        }
    });

    const items = Array.from(totals.values()).sort((a, b) => b.total - a.total);
    const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
    return items.map((item) => ({
        ...item,
        share: grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0,
    }));
}

function getAvailableMonths(rows: CategoryMonthlyStats[]): string[] {
    return Array.from(new Set(rows.map((row) => row.month))).sort().reverse();
}

function formatMonth(month: string): string {
    const [year, monthNumber] = month.split('-');
    return `${monthNumber}/${year}`;
}

function formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function ChangeBadge({ value, lowerIsBetter, t }: { value: number; lowerIsBetter: boolean; t: (vi: string, en: string) => string }) {
    const unchanged = Math.abs(value) < 0.05;
    const positive = lowerIsBetter ? value < 0 : value > 0;
    const tone = unchanged ? 'bg-slate-100 text-neutral-500' : positive ? 'bg-green-50 text-success' : 'bg-red-50 text-danger';
    const Icon = unchanged ? Minus : value < 0 ? TrendingDown : TrendingUp;

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
            <Icon size={14} />
            {unchanged ? 'Không đổi' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`}
            <span className="font-medium opacity-75">{t('kỳ trước', 'vs. prior period')}</span>
        </span>
    );
}

function KpiCard({ title, value, detail, change, lowerIsBetter, target, t }: {
    title: string;
    value: string;
    detail: string;
    change?: number;
    lowerIsBetter?: boolean;
    target?: { label: string; met: boolean };
    t: (vi: string, en: string) => string;
}) {
    return (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-neutral-500">{title}</p>
            <p className="mt-3 text-3xl font-bold text-neutral-900">{value}</p>
            <div className="mt-4 flex min-h-7 flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-500">{detail}</span>
                {change !== undefined && <ChangeBadge value={change} lowerIsBetter={lowerIsBetter ?? false} t={t} />}
                {target && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${target.met ? 'bg-green-50 text-success' : 'bg-orange-50 text-warning'}`}>{target.label}</span>}
            </div>
        </article>
    );
}

function StatsSkeleton({ label }: { label: string }) {
    return (
        <div className="space-y-6" aria-label={label} aria-busy="true">
            <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
            <div className="grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
                <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
            </div>
            <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </div>
    );
}

export default function Stats() {
    const { t, translateCategory } = useLanguage();
    const [preset, setPreset] = useState<Preset>('30d');
    const [range, setRange] = useState<StatsRange>(() => getPresetRange('30d'));
    const [draftRange, setDraftRange] = useState(range);
    const [customOpen, setCustomOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const { overview, districts, categories, loading, error, retry } = useStatsData(range);

    const availableMonths = getAvailableMonths(categories ?? []);
    const activeMonthFilter = selectedMonth !== 'all' && availableMonths.includes(selectedMonth) ? selectedMonth : 'all';
    const categorySummary = buildCategorySummary(categories ?? [], translateCategory, activeMonthFilter);
    const totalCategoryReports = categorySummary.reduce((sum, item) => sum + item.total, 0);
    const maxDistrictTotal = Math.max(...(districts ?? []).map((item) => item.total), 0);

    function selectPreset(nextPreset: Exclude<Preset, 'custom'>) {
        setPreset(nextPreset);
        setCustomOpen(false);
        setRange(getPresetRange(nextPreset));
    }

    function applyCustomRange() {
        if (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to) return;
        setPreset('custom');
        setRange(draftRange);
        setCustomOpen(false);
    }

    function exportReport() {
        if (!overview) return;

        const workbook = XLSX.utils.book_new();
        const summarySheet = XLSX.utils.json_to_sheet([
            { 'Chỉ số': 'Thời gian xử lý trung bình (ngày)', 'Giá trị': overview.avgProcessingDays },
            { 'Chỉ số': 'Thay đổi thời gian xử lý (%)', 'Giá trị': overview.avgProcessingDaysChange },
            { 'Chỉ số': 'Tỷ lệ hoàn tất đúng hạn (%)', 'Giá trị': overview.onTimeRate },
            { 'Chỉ số': 'Tỷ lệ từ chối (%)', 'Giá trị': overview.rejectionRate },
            { 'Chỉ số': 'Thay đổi tỷ lệ từ chối (%)', 'Giá trị': overview.rejectionRateChange },
        ]);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overview.trend.map((row) => ({ Ngày: row.date, 'Tiếp nhận': row.received, 'Đã xử lý': row.completed }))), 'Xu hướng');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((districts ?? []).map((row) => ({ 'Quận/Huyện': row.district, 'Tổng báo cáo': row.total }))), 'Theo quận huyện');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((categories ?? []).map((row) => ({ Tháng: row.month, 'Loại sự cố': row.category, 'Tổng báo cáo': row.total }))), 'Theo loại hàng tháng');
        XLSX.writeFile(workbook, `uirms-thong-ke-${range.from}-${range.to}.xlsx`);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-neutral-500">{t('Hiệu quả tiếp nhận và xử lý sự cố', 'Incident Intake and Resolution Performance')}</p>
                    <h1 className="mt-1 text-2xl font-bold text-neutral-900">{t('Thống Kê & Báo Cáo', 'Analytics & Reports')}</h1>
                </div>
                <button type="button" onClick={exportReport} disabled={!overview || loading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                    <Download size={16} />{t('Xuất Báo Cáo', 'Export Report')}
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {presetOptions.map((option) => (
                    <button key={option.id} type="button" onClick={() => selectPreset(option.id)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${preset === option.id ? 'bg-primary text-white' : 'border border-slate-200 bg-white text-neutral-500 hover:border-primary hover:text-primary'}`}>
                        {t(option.label, option.id === '7d' ? '7 days' : option.id === '30d' ? '30 days' : '3 months')}
                    </button>
                ))}
                <button type="button" onClick={() => { setDraftRange(range); setCustomOpen((open) => !open); setPreset('custom'); }} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${preset === 'custom' ? 'bg-primary text-white' : 'border border-slate-200 bg-white text-neutral-500 hover:border-primary hover:text-primary'}`}>
                    <CalendarDays size={15} />{t('Tùy chọn', 'Custom range')}
                </button>
            </div>

            {customOpen && (
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <label className="grid gap-1 text-xs font-semibold text-neutral-500">{t('Từ ngày', 'From date')}<input type="date" value={draftRange.from} max={draftRange.to} onChange={(event) => setDraftRange((current) => ({ ...current, from: event.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-neutral-900" /></label>
                    <label className="grid gap-1 text-xs font-semibold text-neutral-500">{t('Đến ngày', 'To date')}<input type="date" value={draftRange.to} min={draftRange.from} max={localDateString(new Date())} onChange={(event) => setDraftRange((current) => ({ ...current, to: event.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-neutral-900" /></label>
                    <button type="button" onClick={applyCustomRange} disabled={!draftRange.from || !draftRange.to || draftRange.from > draftRange.to} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{t('Áp dụng', 'Apply')}</button>
                    <span className="text-xs text-neutral-500">{range.from} {t('đến', 'to')} {range.to}</span>
                </div>
            )}

            {loading ? <StatsSkeleton label={t('Đang tải thống kê', 'Loading analytics')} /> : error ? (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-danger">
                    <p>{t('Không thể tải dữ liệu thống kê:', 'Could not load analytics data:')} {error}</p>
                    <button type="button" onClick={retry} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-danger px-3 py-2 font-semibold text-white"><RefreshCw size={15} />{t('Thử lại', 'Retry')}</button>
                </div>
            ) : overview && (
                <>
                    <section className="grid gap-4 md:grid-cols-3">
                        <KpiCard t={t} title={t('Thời Gian Xử Lý TB', 'Avg. Resolution Time')} value={`${overview.avgProcessingDays.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ${t('ngày', 'days')}`} detail={t('So với kỳ trước', 'Compared with prior period')} change={overview.avgProcessingDaysChange} lowerIsBetter />
                        <KpiCard t={t} title={t('Tỷ Lệ Hoàn Tất Đúng Hạn', 'On-Time Resolution Rate')} value={`${overview.onTimeRate.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`} detail={t('Theo SLA từng mức độ', 'Based on priority-level SLAs')} target={{ label: t('Mục tiêu 85%', '85% target'), met: overview.onTimeRate >= 85 }} />
                        <KpiCard t={t} title={t('Tỷ Lệ Từ Chối', 'Rejection Rate')} value={`${overview.rejectionRate.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`} detail={t('So với kỳ trước', 'Compared with prior period')} change={overview.rejectionRateChange} lowerIsBetter />
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                        <article className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-base font-bold text-neutral-900">{t('Xu hướng báo cáo theo thời gian', 'Report Trends Over Time')}</h2><p className="mt-1 text-xs text-neutral-500">{t('Số lượng tiếp nhận và hoàn tất mỗi ngày', 'Daily reports received and resolved')}</p></div>
                            <div className="h-[310px] p-4 sm:p-5">
                                {overview.trend.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={overview.trend} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                                    <CartesianGrid vertical={false} stroke="#E8EEF1" />
                                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#7A8997', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                                    <YAxis allowDecimals={false} tick={{ fill: '#7A8997', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip labelFormatter={(label) => new Date(`${label}T00:00:00`).toLocaleDateString('vi-VN')} />
                                    <Legend />
                                    <Line type="monotone" dataKey="received" name={t('Tiếp nhận', 'Received')} stroke="#2E86DE" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="completed" name={t('Đã xử lý', 'Resolved')} stroke="#27AE60" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                                </LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-neutral-500">{t('Chưa có dữ liệu trong khoảng thời gian này.', 'No data available for this period.')}</div>}
                            </div>
                        </article>

                        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div><h2 className="text-base font-bold text-neutral-900">{t('Báo cáo theo Quận/Huyện', 'Reports by District')}</h2><p className="mt-1 text-xs text-neutral-500">{t('Top 5 khu vực theo số lượng báo cáo', 'Top 5 areas by report volume')}</p></div>
                            <div className="mt-6 space-y-5">
                                {(districts ?? []).map((item) => {
                                    const width = maxDistrictTotal ? (item.total / maxDistrictTotal) * 100 : 0;
                                    return <div key={item.district}>
                                        <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium text-neutral-700">{item.district}</span><span className="shrink-0 font-bold text-neutral-900">{item.total.toLocaleString('vi-VN')}</span></div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${width}%` }} /></div>
                                    </div>;
                                })}
                                {!districts?.length && <p className="py-10 text-center text-sm text-neutral-500">{t('Chưa có dữ liệu khu vực.', 'No district data available.')}</p>}
                            </div>
                        </article>
                    </section>

                    <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                            <div>
                                <h2 className="text-base font-bold text-neutral-900">
                                    {t('Phân tích loại sự cố theo mức độ phổ biến', 'Incident Breakdown by Category')}
                                </h2>
                                <p className="mt-1 text-xs text-neutral-500">
                                    {t(
                                        `Xếp hạng từ cao xuống thấp (${totalCategoryReports.toLocaleString('vi-VN')} báo cáo)`,
                                        `Ranked highest to lowest (${totalCategoryReports.toLocaleString('en-US')} reports)`
                                    )}
                                </p>
                            </div>
                            {availableMonths.length > 1 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMonth('all')}
                                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${activeMonthFilter === 'all' ? 'bg-primary text-white' : 'bg-slate-100 text-neutral-600 hover:bg-slate-200'}`}
                                    >
                                        {t('Cả kỳ', 'All months')}
                                    </button>
                                    {availableMonths.map((month) => (
                                        <button
                                            key={month}
                                            type="button"
                                            onClick={() => setSelectedMonth(month)}
                                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${activeMonthFilter === month ? 'bg-primary text-white' : 'bg-slate-100 text-neutral-600 hover:bg-slate-200'}`}
                                        >
                                            {formatMonth(month)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 sm:p-5">
                            {categorySummary.length ? (
                                <div style={{ height: Math.max(260, categorySummary.length * 42) }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={categorySummary}
                                            layout="vertical"
                                            margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
                                        >
                                            <CartesianGrid horizontal={false} stroke="#E8EEF1" />
                                            <XAxis type="number" allowDecimals={false} tick={{ fill: '#7A8997', fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                width={185}
                                                tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                formatter={(value: unknown) => [
                                                    `${Number(value).toLocaleString('vi-VN')} ${t('báo cáo', 'reports')}`,
                                                    t('Số lượng', 'Count'),
                                                ]}
                                            />
                                            <Bar dataKey="total" barSize={22} radius={[0, 6, 6, 0]}>
                                                {categorySummary.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                                <LabelList
                                                    dataKey="total"
                                                    position="right"
                                                    formatter={(value: unknown) => {
                                                        const n = Number(value) || 0;
                                                        const pct = totalCategoryReports > 0 ? Math.round((n / totalCategoryReports) * 100) : 0;
                                                        return `${n} (${pct}%)`;
                                                    }}
                                                    style={{ fill: '#334155', fontSize: 12, fontWeight: 700 }}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex h-60 items-center justify-center text-sm text-neutral-500">
                                    {t('Chưa có dữ liệu danh mục trong khoảng thời gian này.', 'No category data available for this period.')}
                                </div>
                            )}
                        </div>
                    </article>
                </>
            )}
        </div>
    );
}