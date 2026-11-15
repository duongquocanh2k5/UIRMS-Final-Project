import { AlertTriangle, CheckCircle2, Clock3, Compass, FileText, RefreshCw, Siren, UserCheck, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import 'leaflet/dist/leaflet.css';
import { adminApi, type AdminIncident, type AssignableAdmin } from '../services/api';
import MapLayers from '../components/MapLayers';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getCategoryColor } from '../utils/categoryColors';
import { parseDatabaseDateTime } from '../utils/dateTime';

const TileLayer = MapLayers;

export interface DashboardStats {
    totalIncidents: number;
    newIncidents: number;
    openIncidents: number;
    assignedIncidents?: number;
    unassignedIncidents?: number;
    inProgressIncidents: number;
    completedIncidents: number;
    urgentIncidents: number;
    highPriorityCount: number;
}

const statusLabels: Record<AdminIncident['status'], string> = { pending: 'Mới', assigned: 'Đã tiếp nhận', in_progress: 'Đang xử lý', completed: 'Hoàn tất', rejected: 'Từ chối' };
const priorityLabels: Record<AdminIncident['priority'], string> = { low: 'Nhẹ', medium: 'Trung bình', high: 'Nghiêm trọng', critical: 'Khẩn cấp' };
const slaHoursByPriority: Record<AdminIncident['priority'], number> = { critical: 24, high: 48, medium: 72, low: 120 };

function getSlaRemainingHours(incident: AdminIncident): number {
    const createdMs = parseDatabaseDateTime(incident.created_at).getTime();
    const targetHours = slaHoursByPriority[incident.priority] || 72;
    const deadlineMs = createdMs + targetHours * 3600_000;
    return (deadlineMs - Date.now()) / 3600_000;
}

function formatSlaBadge(remainingHours: number, t: (vi: string, en: string) => string): { label: string; className: string } {
    const absHours = Math.round(Math.abs(remainingHours));
    if (remainingHours < 0) {
        return {
            label: t(`Quá hạn ${absHours}h`, `Overdue ${absHours}h`),
            className: 'bg-red-100 text-danger border border-red-200',
        };
    }
    if (remainingHours <= 12) {
        return {
            label: t(`Còn ${Math.max(1, absHours)}h (Sắp hết SLA)`, `${Math.max(1, absHours)}h left (SLA risk)`),
            className: 'bg-amber-100 text-amber-800 border border-amber-200',
        };
    }
    return {
        label: t(`Còn ${absHours}h`, `${absHours}h left`),
        className: 'bg-teal-50 text-primary border border-teal-200',
    };
}

function badgeClass(value: string) {
    if (value === 'Hoàn tất' || value === 'Nhẹ') return 'bg-green-50 text-success';
    if (value === 'Khẩn cấp' || value === 'Từ chối') return 'bg-red-50 text-danger';
    if (value === 'Đang xử lý' || value === 'Nghiêm trọng') return 'bg-orange-50 text-warning';
    return 'bg-blue-50 text-info';
}

function DashboardMapFocus({ target }: { target: { lat: number; lng: number; zoom: number; trigger: number } | null }) {
    const map = useMap();
    useEffect(() => {
        if (target && Number.isFinite(target.lat) && Number.isFinite(target.lng)) {
            map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), target.zoom), { duration: 0.75 });
        }
    }, [map, target]);
    return null;
}

export default function Dashboard() {
    const { user } = useAuth();
    const { t, translateCategory } = useLanguage();
    const isTechnician = user.role === 'technician';
    const canManage = user.role === 'super_admin' || user.role === 'manager';

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [incidents, setIncidents] = useState<AdminIncident[]>([]);
    const [staffList, setStaffList] = useState<AssignableAdmin[]>([]);
    const [chartData, setChartData] = useState<Array<{ date: string; count: number; completed: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mapFilter, setMapFilter] = useState<'all' | AdminIncident['status'] | 'critical'>('all');
    const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom: number; trigger: number } | null>(null);

    const loadDashboard = async () => {
        setLoading(true); setError('');
        try {
            const [statsResponse, incidentsResponse, analyticsResponse, staffResponse] = await Promise.all([
                adminApi.getDashboardStats(),
                adminApi.getIncidents(1, 100),
                adminApi.getAnalytics('month'),
                canManage ? adminApi.getAssignableStaff().catch(() => ({ data: [] as AssignableAdmin[] })) : Promise.resolve({ data: [] as AssignableAdmin[] }),
            ]);
            setStats(statsResponse.data);
            setIncidents(incidentsResponse.data);
            setStaffList(staffResponse.data.filter((person) => person.role === 'technician'));
            const analytics = analyticsResponse.data as { incidents?: Array<{ date: string; count: number; completed: number }> };
            const countsByDate = new Map<string, { count: number; completed: number }>();
            (analytics.incidents || []).forEach((item) => {
                countsByDate.set(item.date, { count: Number(item.count) || 0, completed: Number(item.completed) || 0 });
            });
            const last30Days: Array<{ date: string; count: number; completed: number }> = [];
            const now = new Date();
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const shortLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                const entry = countsByDate.get(iso);
                last30Days.push({
                    date: shortLabel,
                    count: entry?.count ?? 0,
                    completed: entry?.completed ?? 0,
                });
            }
            setChartData(last30Days);
        } catch (reason) { setError(reason instanceof Error ? reason.message : t('Không thể tải dữ liệu dashboard.', 'Could not load dashboard data.')); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadDashboard(); }, 0);
        return () => window.clearTimeout(timer);
    }, [canManage]);

    const filteredIncidents = useMemo(() => incidents.filter((incident) => mapFilter === 'all' || (mapFilter === 'critical' ? incident.priority === 'critical' : incident.status === mapFilter)), [incidents, mapFilter]);
    const categoryData = useMemo(() => {
        const counts = new Map<string, { value: number; color: string }>();
        incidents.forEach((incident) => {
            const name = incident.category_name ? translateCategory(incident.category_name) : t(`Danh mục ${incident.category_id}`, `Category ${incident.category_id}`);
            const color = getCategoryColor(incident.category_id, incident.category_name);
            const existing = counts.get(name);
            counts.set(name, { value: (existing?.value || 0) + 1, color: existing?.color || color });
        });
        return Array.from(counts, ([name, info]) => ({ name, value: info.value, color: info.color }));
    }, [incidents, t, translateCategory]);

    const activePriorityQueue = useMemo(() => {
        return incidents
            .filter((item) => !['completed', 'rejected'].includes(item.status))
            .map((item) => ({ incident: item, remainingHours: getSlaRemainingHours(item) }))
            .sort((a, b) => a.remainingHours - b.remainingHours);
    }, [incidents]);

    const unassignedCount = useMemo(
        () => stats?.unassignedIncidents ?? incidents.filter((item) => !item.assigned_to && !item.assigned_technician && item.status === 'pending').length,
        [incidents, stats]
    );

    const slaRiskCount = useMemo(
        () => activePriorityQueue.filter((item) => item.remainingHours <= 12).length,
        [activePriorityQueue]
    );

    const statCards = useMemo(() => {
        if (isTechnician) {
            return [
                { key: 'total', value: stats?.totalIncidents ?? 0, label: t('Tổng Việc Được Giao', 'Total Assigned'), icon: FileText, tone: 'bg-blue-50 text-info', to: '/incidents' },
                { key: 'assigned', value: (stats?.newIncidents ?? 0) + (stats?.assignedIncidents ?? 0), label: t('Chờ Bắt Đầu', 'Ready to Start'), icon: UserCheck, tone: 'bg-amber-50 text-warning', to: '/incidents?status=assigned' },
                { key: 'inProgress', value: stats?.inProgressIncidents ?? 0, label: t('Đang Xử Lý', 'In Progress'), icon: Clock3, tone: 'bg-orange-50 text-warning', to: '/incidents?status=in_progress' },
                { key: 'completed', value: stats?.completedIncidents ?? 0, label: t('Đã Hoàn Tất', 'Completed'), icon: CheckCircle2, tone: 'bg-green-50 text-success', to: '/incidents?status=completed' },
                { key: 'urgent', value: stats?.urgentIncidents ?? 0, label: t('Khẩn Cấp', 'Critical'), icon: Siren, tone: 'bg-red-50 text-danger', urgent: true, to: '/incidents?priority=critical' },
            ];
        }
        return [
            { key: 'total', value: stats?.totalIncidents ?? 0, label: t('Tổng Báo Cáo', 'Total Reports'), icon: FileText, tone: 'bg-blue-50 text-info', to: '/incidents' },
            { key: 'unassigned', value: unassignedCount, label: t('Chưa Phân Công', 'Unassigned'), icon: AlertTriangle, tone: 'bg-amber-50 text-warning', to: '/incidents?quick=unassigned' },
            { key: 'inProgress', value: stats?.inProgressIncidents ?? 0, label: t('Đang Xử Lý', 'In Progress'), icon: Clock3, tone: 'bg-orange-50 text-warning', to: '/incidents?status=in_progress' },
            { key: 'completed', value: stats?.completedIncidents ?? 0, label: t('Hoàn Tất', 'Completed'), icon: CheckCircle2, tone: 'bg-green-50 text-success', to: '/incidents?status=completed' },
            { key: 'urgent', value: stats?.urgentIncidents ?? 0, label: t('Khẩn Cấp', 'Critical'), icon: Siren, tone: 'bg-red-50 text-danger', urgent: true, to: '/incidents?priority=critical' },
        ];
    }, [isTechnician, stats, t, unassignedCount]);

    if (loading) return <div className="rounded-xl bg-white p-12 text-center text-sm text-neutral-500">{t('Đang tải dữ liệu dashboard...', 'Loading dashboard data...')}</div>;
    if (error || !stats) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-danger"><p>{error || t('Không có dữ liệu dashboard.', 'No dashboard data available.')}</p><button type="button" onClick={() => void loadDashboard()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-danger px-3 py-2 font-semibold text-white"><RefreshCw size={15} />{t('Thử lại', 'Retry')}</button></div>;

    const roleSubtitle = isTechnician
        ? t('Tổng quan công việc và lộ trình xử lý sự cố được giao cho bạn', 'Your assigned incidents, SLA deadlines, and field navigation')
        : user.role === 'manager'
            ? t('Điều phối xử lý sự cố, giám sát SLA và đội ngũ kỹ thuật viên phụ trách', 'Coordinate incident dispatch, SLA targets, and your technician team')
            : t('Dữ liệu trực tiếp toàn hệ thống Trung tâm Điều hành UIRMS', 'Live system-wide data from the UIRMS Operations Center');

    return <div className="space-y-7">
        <div className="flex items-end justify-between">
            <div>
                <p className="text-sm font-medium text-neutral-500">{roleSubtitle}</p>
                <h1 className="mt-1 text-2xl font-bold text-neutral-900">
                    {isTechnician ? t('Tổng Quan Công Việc Của Tôi', 'My Work Overview') : user.role === 'manager' ? t('Tổng Quan Điều Phối', 'Dispatch Overview') : t('Tổng Quan Hệ Thống', 'System Overview')}
                </h1>
            </div>
            <button type="button" onClick={() => void loadDashboard()} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><RefreshCw size={15} />{t('Làm mới', 'Refresh')}</button>
        </div>

        <section className="grid grid-cols-5 gap-4">
            {statCards.map(({ key, value, label, icon: Icon, tone, urgent, to }) => (
                <Link
                    key={key}
                    to={to}
                    className={`group block rounded-xl border bg-white p-5 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md ${urgent ? 'border-danger/50 ring-1 ring-danger/10 hover:border-danger' : 'border-slate-200 hover:border-primary/40'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105 ${tone}`}><Icon size={21} /></div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-neutral-500 group-hover:text-neutral-700">{label}</p>
                            <p className="mt-1 text-2xl font-bold text-neutral-900">{value.toLocaleString('vi-VN')}</p>
                        </div>
                    </div>
                </Link>
            ))}
        </section>

        {/* Quick Dispatch Banner for Manager & Super Admin */}
        {canManage && (
            <section className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-neutral-900">
                                {t(`${unassignedCount} báo cáo mới chưa phân công`, `${unassignedCount} new unassigned report(s)`)}
                            </p>
                            <p className="text-xs text-neutral-600">
                                {t('Cần giao cho kỹ thuật viên phụ trách để bắt đầu tính tiến độ xử lý', 'Assign to a technician to begin field resolution')}
                            </p>
                        </div>
                    </div>
                    <Link to="/incidents?quick=unassigned" className="shrink-0 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700">
                        {t('Phân công ngay →', 'Assign now →')}
                    </Link>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/70 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15 text-danger">
                            <Clock3 size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-neutral-900">
                                {t(`${slaRiskCount} sự cố sắp quá hạn / quá hạn SLA`, `${slaRiskCount} incident(s) near or past SLA`)}
                            </p>
                            <p className="text-xs text-neutral-600">
                                {t('Các sự cố còn ≤ 12 giờ cam kết hoặc đã trễ hạn cần đôn đốc ưu tiên', 'Incidents with ≤ 12h remaining or overdue require priority follow-up')}
                            </p>
                        </div>
                    </div>
                    <Link to="/incidents?quick=sla" className="shrink-0 rounded-lg bg-danger px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700">
                        {t('Kiểm tra SLA →', 'Review SLA →')}
                    </Link>
                </div>
            </section>
        )}

        {/* Priority Action Queue for Technician */}
        {isTechnician && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="text-base font-bold text-neutral-900">{t('Việc ưu tiên cần xử lý ngay (Theo hạn SLA)', 'Priority Action Queue (Sorted by SLA)')}</h2>
                        <p className="mt-0.5 text-xs text-neutral-500">{t('Ưu tiên xử lý các sự cố sắp hết thời gian cam kết SLA và tải ảnh nghiệm thu khi hoàn tất', 'Prioritize incidents with the shortest remaining SLA and upload verification photos upon completion')}</p>
                    </div>
                    <Link to="/incidents" className="text-xs font-bold text-primary hover:underline">{t('Tất cả việc được giao →', 'All assigned tasks →')}</Link>
                </div>
                {activePriorityQueue.length === 0 ? (
                    <div className="p-8 text-center text-sm text-neutral-500">
                        {t('Tuyệt vời! Bạn đã hoàn tất toàn bộ các sự cố được giao.', 'All caught up! You have no pending assigned incidents.')}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {activePriorityQueue.slice(0, 5).map(({ incident, remainingHours }) => {
                            const slaBadge = formatSlaBadge(remainingHours, t);
                            const hasCoords = incident.latitude !== undefined && incident.longitude !== undefined;
                            return (
                                <div key={incident.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/70">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-extrabold text-primary">BC-{incident.id}</span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${slaBadge.className}`}>{slaBadge.label}</span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass(priorityLabels[incident.priority])}`}>
                                                {t(priorityLabels[incident.priority], ({ 'Nhẹ': 'Low', 'Trung bình': 'Medium', 'Nghiêm trọng': 'High', 'Khẩn cấp': 'Critical' })[priorityLabels[incident.priority]])}
                                            </span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass(statusLabels[incident.status])}`}>
                                                {t(statusLabels[incident.status], ({ 'Mới': 'Pending', 'Đã tiếp nhận': 'Assigned', 'Đang xử lý': 'In Progress', 'Hoàn tất': 'Completed', 'Từ chối': 'Rejected' })[statusLabels[incident.status]])}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 truncate text-sm font-bold text-neutral-900">{incident.title}</p>
                                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                                            {incident.category_name ? translateCategory(incident.category_name) : `Danh mục ${incident.category_id}`} · {incident.location_name || t('Chưa cập nhật địa chỉ', 'Address not provided')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasCoords && (
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-primary hover:text-primary"
                                            >
                                                <Compass size={14} />
                                                {t('Chỉ đường', 'Directions')}
                                            </a>
                                        )}
                                        <Link
                                            to={`/incidents/${incident.id}`}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
                                        >
                                            {t('Xử lý ngay →', 'Process →')}
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        )}

        <section className="grid grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] gap-6">
            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="text-base font-bold text-neutral-900">{isTechnician ? t('Bản đồ sự cố được giao', 'My Assigned Incident Map') : t('Bản đồ báo cáo', 'Incident Map')}</h2>
                    <p className="mt-1 text-xs text-neutral-500">{isTechnician ? t('Vị trí các điểm sự cố bạn đang phụ trách', 'Locations of incidents assigned to you') : t('Vị trí báo cáo gần đây', 'Recent incident locations')}</p>
                </div>
                <div className="flex gap-2 overflow-x-auto px-5 py-4">
                    {(['all', 'pending', 'in_progress', 'completed', 'critical'] as const).map((filter) => (
                        <button key={filter} type="button" onClick={() => setMapFilter(filter)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${mapFilter === filter ? 'bg-primary text-white' : 'bg-slate-100 text-neutral-500'}`}>
                            {filter === 'all' ? t('Tất cả', 'All') : filter === 'pending' ? t('Mới', 'Pending') : filter === 'in_progress' ? t('Đang xử lý', 'In Progress') : filter === 'completed' ? t('Hoàn tất', 'Completed') : t('Khẩn cấp', 'Critical')}
                        </button>
                    ))}
                </div>
                <div className="h-[390px]">
                    <MapContainer center={[10.7769, 106.7009]} zoom={12} scrollWheelZoom className="h-full w-full">
                        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <DashboardMapFocus target={mapFocus} />
                        {filteredIncidents.filter((incident) => incident.latitude !== undefined && incident.longitude !== undefined).map((incident) => {
                            const dotColor = getCategoryColor(incident.category_id, incident.category_name);
                            const lat = Number(incident.latitude);
                            const lng = Number(incident.longitude);
                            return (
                                <CircleMarker
                                    key={incident.id}
                                    center={[lat, lng]}
                                    radius={8}
                                    pathOptions={{ color: '#fff', weight: 2.2, fillColor: dotColor, fillOpacity: 0.95 }}
                                    eventHandlers={{
                                        click: () => {
                                            setMapFocus((prev) => ({
                                                lat,
                                                lng,
                                                zoom: 17,
                                                trigger: (prev?.trigger ?? 0) + 1,
                                            }));
                                        },
                                    }}
                                >
                                    <Popup>
                                        <div className="min-w-52 space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold tracking-wide text-neutral-500">BC-{incident.id}</span>
                                                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${badgeClass(priorityLabels[incident.priority])}`}>
                                                    {t(priorityLabels[incident.priority], ({ 'Nhẹ': 'Low', 'Trung bình': 'Medium', 'Nghiêm trọng': 'High', 'Khẩn cấp': 'Critical' } as Record<string, string>)[priorityLabels[incident.priority]] || priorityLabels[incident.priority])}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold leading-snug text-neutral-900">{incident.title}</p>
                                            <div className="space-y-1 text-xs text-neutral-600">
                                                <p><span className="font-semibold text-neutral-500">{t('Khu vực:', 'Area:')}</span> {incident.location_name || t('Chưa cập nhật', 'Not provided')}</p>
                                                <p className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-neutral-500">{t('Danh mục:', 'Category:')}</span>
                                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                                                    <span>{incident.category_name ? translateCategory(incident.category_name) : t(`Danh mục ${incident.category_id}`, `Category ${incident.category_id}`)}</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${badgeClass(statusLabels[incident.status])}`}>
                                                    {t(statusLabels[incident.status], ({ 'Mới': 'Pending', 'Đã tiếp nhận': 'Assigned', 'Đang xử lý': 'In Progress', 'Hoàn tất': 'Completed', 'Từ chối': 'Rejected' } as Record<string, string>)[statusLabels[incident.status]] || statusLabels[incident.status])}
                                                </span>
                                                <Link to={`/incidents/${incident.id}`} className="whitespace-nowrap text-xs font-bold text-primary hover:underline">{t('Xem chi tiết →', 'View details →')}</Link>
                                            </div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                    </MapContainer>
                </div>
                {categoryData.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs">
                        <span className="font-bold text-neutral-600">{t('Bảng màu loại sự cố:', 'Category colors:')}</span>
                        {categoryData.map((item) => (
                            <span key={item.name} className="inline-flex items-center gap-1.5 text-neutral-700">
                                <span className="h-3 w-3 shrink-0 rounded-full border border-white shadow-sm" style={{ backgroundColor: item.color }} />
                                <span>{item.name}</span>
                                <strong className="text-neutral-500">({item.value})</strong>
                            </span>
                        ))}
                    </div>
                )}
            </article>

            <div className="space-y-6">
                <article className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${canManage ? 'transition hover:border-primary/40 hover:shadow-md' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h2 className="text-base font-bold text-neutral-900">{t('Báo cáo theo thời gian (30 ngày)', 'Reports Over Time (30 Days)')}</h2>
                            <p className="mt-0.5 text-xs text-neutral-500">{t('Thống kê số lượng báo cáo trong 1 tháng gần nhất', 'Daily incident volume over the past month')}</p>
                        </div>
                        {canManage && (
                            <Link to="/stats" className="shrink-0 text-xs font-bold text-primary hover:underline">
                                {t('Xem thống kê →', 'View stats →')}
                            </Link>
                        )}
                    </div>
                    {canManage ? (
                        <Link to="/stats" className="mt-4 block h-48 cursor-pointer" title={t('Mở trang Thống kê chi tiết', 'Open detailed Statistics')}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ left: -25, right: 5 }}>
                                    <CartesianGrid vertical={false} stroke="#E8EEF1" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} interval={4} tick={{ fontSize: 10, fill: '#7A8997' }} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7A8997' }} />
                                    <Tooltip />
                                    <Bar dataKey="count" name={t('Báo cáo', 'Reports')} fill="#0A9E96" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Link>
                    ) : (
                        <div className="mt-4 h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ left: -25, right: 5 }}>
                                    <CartesianGrid vertical={false} stroke="#E8EEF1" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} interval={4} tick={{ fontSize: 10, fill: '#7A8997' }} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7A8997' }} />
                                    <Tooltip />
                                    <Bar dataKey="count" name={t('Báo cáo', 'Reports')} fill="#0A9E96" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </article>

                <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-neutral-900">{t('Phân bố theo loại sự cố', 'Incidents by Category')}</h2>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="h-40 w-40 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryData} dataKey="value" innerRadius={45} outerRadius={68} paddingAngle={2} stroke="none">
                                        {categoryData.map((item) => <Cell key={item.name} fill={item.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                            {categoryData.map((item) => (
                                <div key={item.name} className="flex justify-between gap-2 text-xs">
                                    <span className="truncate text-neutral-500">{item.name}</span>
                                    <strong className="text-neutral-900">{item.value}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>
            </div>
        </section>

        {/* Technician Team Status Panel for Manager & Super Admin */}
        {canManage && staffList.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <Users size={18} className="text-primary" />
                        <div>
                            <h2 className="text-base font-bold text-neutral-900">{t('Trạng thái đội ngũ kỹ thuật viên', 'Technician Team Status & Workload')}</h2>
                            <p className="text-xs text-neutral-500">
                                {t('Theo dõi trạng thái trực tuyến và số lượng sự cố đang xử lý để phân bổ công việc đồng đều', 'Monitor live online status and active incident counts to balance dispatch')}
                            </p>
                        </div>
                    </div>
                    <Link to="/staff" className="text-xs font-bold text-primary hover:underline">{t('Quản lý nhân sự →', 'Manage staff →')}</Link>
                </div>
                <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                    {staffList.slice(0, 8).map((person) => {
                        const activeLoad = person.active_count ?? 0;
                        const completedLoad = person.completed_count ?? 0;
                        return (
                            <div key={person.id} className="flex flex-col justify-between rounded-xl border border-slate-200 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-neutral-900">{person.full_name || person.username}</p>
                                        <p className="truncate text-xs text-neutral-500">@{person.username}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${person.is_online ? 'bg-green-50 text-success' : 'bg-slate-100 text-neutral-500'}`}>
                                        <span className={`h-2 w-2 rounded-full ${person.is_online ? 'bg-success' : 'bg-slate-400'}`} />
                                        {person.is_online ? t('Trực tuyến', 'Online') : t('Ngoại tuyến', 'Offline')}
                                    </span>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                                    <span className="text-neutral-500">
                                        {t('Đang xử lý:', 'Active:')} <strong className={activeLoad >= 5 ? 'text-danger' : 'text-neutral-900'}>{activeLoad}</strong>
                                    </span>
                                    <span className="text-neutral-500">
                                        {t('Hoàn tất:', 'Done:')} <strong className="text-success">{completedLoad}</strong>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-neutral-900">{isTechnician ? t('Sự cố được giao gần đây', 'Recent Assigned Incidents') : t('Báo cáo gần đây', 'Recent Reports')}</h2>
                <Link to="/incidents" className="text-xs font-bold text-primary">{t('Xem tất cả', 'View all')}</Link>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-neutral-500">
                        <tr>
                            {['Mã|ID', 'Tiêu đề|Title', 'Danh mục|Category', 'Khu vực|Area', 'Mức độ|Priority', 'Trạng thái|Status', 'Thời gian|Date'].map((heading) => (
                                <th key={heading} className="px-5 py-3">{t(...heading.split('|') as [string, string])}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {incidents.slice(0, 5).map((incident) => (
                            <tr key={incident.id}>
                                <td className="px-5 py-4"><Link to={`/incidents/${incident.id}`} className="font-semibold text-primary">BC-{incident.id}</Link></td>
                                <td className="px-5 py-4 font-semibold text-neutral-900">{incident.title}</td>
                                <td className="px-5 py-4 text-neutral-500">{incident.category_name ? translateCategory(incident.category_name) : t(`Danh mục ${incident.category_id}`, `Category ${incident.category_id}`)}</td>
                                <td className="px-5 py-4 text-neutral-500">{incident.location_name || t('Chưa cập nhật', 'Not provided')}</td>
                                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(priorityLabels[incident.priority])}`}>{t(priorityLabels[incident.priority], ({ 'Nhẹ': 'Low', 'Trung bình': 'Medium', 'Nghiêm trọng': 'High', 'Khẩn cấp': 'Critical' })[priorityLabels[incident.priority]])}</span></td>
                                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(statusLabels[incident.status])}`}>{t(statusLabels[incident.status], ({ 'Mới': 'Pending', 'Đã tiếp nhận': 'Assigned', 'Đang xử lý': 'In Progress', 'Hoàn tất': 'Completed', 'Từ chối': 'Rejected' })[statusLabels[incident.status]])}</span></td>
                                <td className="px-5 py-4 text-xs text-neutral-500">{new Date(incident.created_at).toLocaleString('vi-VN')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    </div>;
}
