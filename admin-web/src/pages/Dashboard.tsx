import { CheckCircle2, Clock3, FileText, RefreshCw, Siren } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import 'leaflet/dist/leaflet.css';
import { adminApi, type AdminIncident } from '../services/api';
import MapLayers from '../components/MapLayers';

const TileLayer = MapLayers;

export interface DashboardStats {
    totalIncidents: number;
    newIncidents: number;
    openIncidents: number;
    inProgressIncidents: number;
    completedIncidents: number;
    urgentIncidents: number;
    highPriorityCount: number;
}

const statusLabels: Record<AdminIncident['status'], string> = { pending: 'Mới', assigned: 'Đã tiếp nhận', in_progress: 'Đang xử lý', completed: 'Hoàn tất', rejected: 'Từ chối' };
const priorityLabels: Record<AdminIncident['priority'], string> = { low: 'Nhẹ', medium: 'Trung bình', high: 'Nghiêm trọng', critical: 'Khẩn cấp' };
const markerColors: Record<AdminIncident['status'] | 'critical', string> = { pending: '#2E86DE', assigned: '#E67E22', in_progress: '#E67E22', completed: '#27AE60', rejected: '#C0392B', critical: '#C0392B' };
const statCards: Array<{ key: keyof DashboardStats; label: string; icon: typeof FileText; tone: string; urgent?: boolean }> = [
    { key: 'totalIncidents', label: 'Tổng Báo Cáo', icon: FileText, tone: 'bg-blue-50 text-info' },
    { key: 'newIncidents', label: 'Báo Cáo Mới', icon: FileText, tone: 'bg-orange-50 text-warning' },
    { key: 'inProgressIncidents', label: 'Đang Xử Lý', icon: Clock3, tone: 'bg-orange-50 text-warning' },
    { key: 'completedIncidents', label: 'Hoàn Tất', icon: CheckCircle2, tone: 'bg-green-50 text-success' },
    { key: 'urgentIncidents', label: 'Khẩn Cấp', icon: Siren, tone: 'bg-red-50 text-danger', urgent: true },
] as const;

function badgeClass(value: string) {
    if (value === 'Hoàn tất' || value === 'Nhẹ') return 'bg-green-50 text-success';
    if (value === 'Khẩn cấp' || value === 'Từ chối') return 'bg-red-50 text-danger';
    if (value === 'Đang xử lý' || value === 'Nghiêm trọng') return 'bg-orange-50 text-warning';
    return 'bg-blue-50 text-info';
}

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [incidents, setIncidents] = useState<AdminIncident[]>([]);
    const [chartData, setChartData] = useState<Array<{ date: string; count: number; completed: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mapFilter, setMapFilter] = useState<'all' | AdminIncident['status'] | 'critical'>('all');

    const loadDashboard = async () => {
        setLoading(true); setError('');
        try {
            const [statsResponse, incidentsResponse, analyticsResponse] = await Promise.all([adminApi.getDashboardStats(), adminApi.getIncidents(1, 100), adminApi.getAnalytics('week')]);
            setStats(statsResponse.data);
            setIncidents(incidentsResponse.data);
            const analytics = analyticsResponse.data as { incidents?: Array<{ date: string; count: number; completed: number }> };
            setChartData(analytics.incidents || []);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu dashboard.'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadDashboard(); }, 0);
        return () => window.clearTimeout(timer);
    }, []);
    const filteredIncidents = useMemo(() => incidents.filter((incident) => mapFilter === 'all' || (mapFilter === 'critical' ? incident.priority === 'critical' : incident.status === mapFilter)), [incidents, mapFilter]);
    const categoryData = useMemo(() => { const counts = new Map<string, number>(); incidents.forEach((incident) => counts.set(incident.category_name || `Danh mục ${incident.category_id}`, (counts.get(incident.category_name || `Danh mục ${incident.category_id}`) || 0) + 1)); const colors = ['#2E86DE', '#27AE60', '#E67E22', '#0A9E96', '#8E7CC3', '#AAB7C4']; return Array.from(counts, ([name, value], index) => ({ name, value, color: colors[index % colors.length] })); }, [incidents]);

    if (loading) return <div className="rounded-xl bg-white p-12 text-center text-sm text-neutral-500">Đang tải dữ liệu dashboard...</div>;
    if (error || !stats) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-danger"><p>{error || 'Không có dữ liệu dashboard.'}</p><button type="button" onClick={() => void loadDashboard()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-danger px-3 py-2 font-semibold text-white"><RefreshCw size={15} />Thử lại</button></div>;

    return <div className="space-y-7"><div className="flex items-end justify-between"><div><p className="text-sm font-medium text-neutral-500">Dữ liệu trực tiếp từ hệ thống</p><h1 className="mt-1 text-2xl font-bold text-neutral-900">Tổng Quan</h1></div><button type="button" onClick={() => void loadDashboard()} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><RefreshCw size={15} />Làm mới</button></div>
        <section className="grid grid-cols-5 gap-4">{statCards.map(({ key, label, icon: Icon, tone, urgent }) => <article key={key} className={`rounded-xl border bg-white p-5 shadow-sm ${urgent ? 'border-danger/50 ring-1 ring-danger/10' : 'border-slate-200'}`}><div className="flex items-center gap-4"><div className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}><Icon size={21} /></div><div><p className="text-xs font-medium text-neutral-500">{label}</p><p className="mt-1 text-2xl font-bold text-neutral-900">{stats[key].toLocaleString('vi-VN')}</p></div></div></article>)}</section>
        <section className="grid grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] gap-6"><article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-base font-bold text-neutral-900">Bản đồ báo cáo</h2><p className="mt-1 text-xs text-neutral-500">Vị trí báo cáo gần đây</p></div><div className="flex gap-2 overflow-x-auto px-5 py-4">{(['all', 'pending', 'in_progress', 'completed', 'critical'] as const).map((filter) => <button key={filter} type="button" onClick={() => setMapFilter(filter)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${mapFilter === filter ? 'bg-primary text-white' : 'bg-slate-100 text-neutral-500'}`}>{filter === 'all' ? 'Tất cả' : filter === 'pending' ? 'Mới' : filter === 'in_progress' ? 'Đang xử lý' : filter === 'completed' ? 'Hoàn tất' : 'Khẩn cấp'}</button>)}</div><div className="h-[390px]"><MapContainer center={[10.7769, 106.7009]} zoom={12} scrollWheelZoom={false} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{filteredIncidents.filter((incident) => incident.latitude !== undefined && incident.longitude !== undefined).map((incident) => <CircleMarker key={incident.id} center={[incident.latitude!, incident.longitude!]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: markerColors[incident.priority === 'critical' ? 'critical' : incident.status], fillOpacity: 0.95 }}><Popup>{incident.title}</Popup></CircleMarker>)}</MapContainer></div></article><div className="space-y-6"><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-neutral-900">Báo cáo theo thời gian</h2><div className="mt-4 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ left: -25, right: 5 }}><CartesianGrid vertical={false} stroke="#E8EEF1" /><XAxis dataKey="date" hide /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7A8997' }} /><Tooltip /><Bar dataKey="count" name="Báo cáo" fill="#0A9E96" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-neutral-900">Phân bố theo loại sự cố</h2><div className="mt-2 flex items-center gap-3"><div className="h-40 w-40 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" innerRadius={45} outerRadius={68} paddingAngle={2} stroke="none">{categoryData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="min-w-0 flex-1 space-y-2">{categoryData.map((item) => <div key={item.name} className="flex justify-between gap-2 text-xs"><span className="truncate text-neutral-500">{item.name}</span><strong className="text-neutral-900">{item.value}</strong></div>)}</div></div></article></div></section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-base font-bold text-neutral-900">Báo cáo gần đây</h2><Link to="/incidents" className="text-xs font-bold text-primary">Xem tất cả</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs text-neutral-500"><tr>{['Mã', 'Tiêu đề', 'Danh mục', 'Khu vực', 'Mức độ', 'Trạng thái', 'Thời gian'].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{incidents.slice(0, 5).map((incident) => <tr key={incident.id}><td className="px-5 py-4"><Link to={`/incidents/${incident.id}`} className="font-semibold text-primary">BC-{incident.id}</Link></td><td className="px-5 py-4 font-semibold text-neutral-900">{incident.title}</td><td className="px-5 py-4 text-neutral-500">{incident.category_name || `Danh mục ${incident.category_id}`}</td><td className="px-5 py-4 text-neutral-500">{incident.location_name || 'Chưa cập nhật'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(priorityLabels[incident.priority])}`}>{priorityLabels[incident.priority]}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(statusLabels[incident.status])}`}>{statusLabels[incident.status]}</span></td><td className="px-5 py-4 text-xs text-neutral-500">{new Date(incident.created_at).toLocaleString('vi-VN')}</td></tr>)}</tbody></table></div></section>
    </div>;
}
