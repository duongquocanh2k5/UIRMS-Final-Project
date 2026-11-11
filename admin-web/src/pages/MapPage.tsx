import { Layers3, MapPin, RefreshCw } from 'lucide-react';
import L from 'leaflet';
import 'leaflet.heat';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, ZoomControl, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import MapLayers, { type MapLayer } from '../components/MapLayers';
import { adminApi, type HeatmapPoint, type MapIncidentPoint } from '../services/api';
import { useCategories } from '../hooks/useCategories';
import { useLanguage } from '../context/LanguageContext';
import { getCategoryColor } from '../utils/categoryColors';

type MapMode = MapLayer | 'heatmap';

const modes: Array<{ id: MapMode; vi: string; en: string }> = [
    { id: 'street', vi: 'Đường phố', en: 'Street' },
    { id: 'satellite', vi: 'Vệ tinh', en: 'Satellite' },
    { id: 'heatmap', vi: 'Bản đồ nhiệt', en: 'Heatmap' },
];

function HeatLayer({ points }: { points: HeatmapPoint[] }) {
    const map = useMap();

    useEffect(() => {
        const maxCount = Math.max(1, ...points.map((point) => point.count));
        const layer = L.heatLayer(
            points.map((point) => [point.lat, point.lng, Math.max(0.15, point.count / maxCount)]),
            { radius: 32, blur: 24, maxZoom: 17, minOpacity: 0.35, gradient: { 0.25: '#2e86de', 0.5: '#27ae60', 0.75: '#f1c40f', 1: '#c0392b' } },
        ).addTo(map);

        return () => { map.removeLayer(layer); };
    }, [map, points]);

    return null;
}

export default function MapPage() {
    const { t, translateCategory } = useLanguage();
    const [mode, setMode] = useState<MapMode>('street');
    const [categoryId, setCategoryId] = useState<number | undefined>();
    const [points, setPoints] = useState<HeatmapPoint[]>([]);
    const [allIncidents, setAllIncidents] = useState<MapIncidentPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { categories, loading: categoriesLoading, error: categoriesError } = useCategories();

    const loadMapData = useCallback(async () => {
        setLoading(true);
        setError('');
        const [heatmapResult, incidentsResult] = await Promise.allSettled([
            adminApi.getHeatmap(categoryId),
            adminApi.getMapIncidents(),
        ]);
        const errors: string[] = [];

        if (heatmapResult.status === 'fulfilled') {
            setPoints(heatmapResult.value.data.map((point) => ({ ...point, count: Number(point.count) })));
        } else {
            errors.push(t('Không thể tải dữ liệu bản đồ nhiệt.', 'Could not load heatmap data.'));
        }

        if (incidentsResult.status === 'fulfilled') {
            setAllIncidents(incidentsResult.value.data);
        } else {
            errors.push(t('Không thể tải vị trí các báo cáo.', 'Could not load incident locations.'));
        }

        setError(errors.join(' '));
        setLoading(false);
    }, [categoryId, t]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadMapData(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadMapData]);

    const visibleIncidents = useMemo(
        () => categoryId === undefined
            ? allIncidents
            : allIncidents.filter((item) => item.category_id === categoryId),
        [allIncidents, categoryId]
    );

    const legendItems = useMemo(() => {
        const countsByCategory = new Map<number, { id: number; name: string; color: string; count: number }>();

        categories.forEach((cat) => {
            countsByCategory.set(cat.id, {
                id: cat.id,
                name: cat.name,
                color: getCategoryColor(cat.id, cat.name, cat.color || cat.color_code),
                count: 0,
            });
        });

        allIncidents.forEach((inc) => {
            const catId = inc.category_id ?? 0;
            const existing = countsByCategory.get(catId);
            if (existing) {
                existing.count += 1;
            } else {
                const rawName = inc.category_name || `Danh mục ${catId}`;
                countsByCategory.set(catId, {
                    id: catId,
                    name: rawName,
                    color: getCategoryColor(catId, rawName, inc.category_color),
                    count: 1,
                });
            }
        });

        return Array.from(countsByCategory.values()).sort((a, b) => b.count - a.count);
    }, [allIncidents, categories]);

    return <section className="relative h-full min-h-[420px] bg-slate-100" aria-label={t('Bản đồ sự cố', 'Incident map')}>
        <MapContainer center={[10.7769, 106.7009]} zoom={12} scrollWheelZoom zoomControl={false} className="h-full w-full">
            <MapLayers layer={mode === 'satellite' ? 'satellite' : 'street'} />
            {mode === 'heatmap' && <HeatLayer points={points} />}
            {visibleIncidents.map((incident) => {
                const dotColor = getCategoryColor(incident.category_id, incident.category_name, incident.category_color);
                const categoryLabel = incident.category_name
                    ? translateCategory(incident.category_name)
                    : t(`Danh mục ${incident.category_id ?? ''}`, `Category ${incident.category_id ?? ''}`);
                return (
                    <CircleMarker
                        key={incident.id}
                        center={[incident.lat, incident.lng]}
                        radius={8}
                        pathOptions={{ color: '#ffffff', weight: 2.2, fillColor: dotColor, fillOpacity: 0.95 }}
                    >
                        <Popup>
                            <div className="min-w-48 space-y-1.5 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                                    <span className="font-bold text-neutral-600">{categoryLabel}</span>
                                </div>
                                <p className="text-sm font-bold text-neutral-900">{incident.title}</p>
                                <p>{t('Mã báo cáo', 'Report ID')}: <strong>BC-{incident.id}</strong></p>
                                <p>{t('Trạng thái', 'Status')}: {t(incident.status, ({ pending: 'Pending', assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed', rejected: 'Rejected' })[incident.status] || incident.status)}</p>
                                <div className="flex items-center gap-3 border-t border-slate-100 pt-1.5 font-bold">
                                    <Link to={`/incidents/${incident.id}`} className="text-primary hover:underline">{t('Xem chi tiết →', 'View details →')}</Link>
                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${incident.lat},${incident.lng}`} target="_blank" rel="noreferrer" className="text-neutral-600 hover:underline">{t('Chỉ đường ↗', 'Directions ↗')}</a>
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
            <ZoomControl position="bottomright" />
        </MapContainer>

        {/* Top Controls */}
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-[1000] flex flex-wrap items-start justify-between gap-3">
            <div className="pointer-events-auto rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-lg">
                <div className="flex items-center gap-1" role="group" aria-label={t('Lớp bản đồ', 'Map layers')}>
                    {modes.map(({ id, vi, en }) => <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id} className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${mode === id ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-slate-100'}`}>
                        {id === 'heatmap' && <Layers3 size={14} className="mr-1.5 inline" />}{t(vi, en)}
                    </button>)}
                </div>
            </div>
            <div className="pointer-events-auto flex flex-col gap-1">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg">
                    <span className="whitespace-nowrap text-xs font-semibold text-neutral-600">{t('Danh mục', 'Category')}</span>
                    <select
                        value={categoryId ?? ''}
                        onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : undefined)}
                        disabled={categoriesLoading}
                        aria-label={t('Lọc bản đồ theo danh mục', 'Filter map by category')}
                        className="max-w-48 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-neutral-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    >
                        <option value="">{t('Tất cả danh mục', 'All categories')}</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{translateCategory(category.name)}</option>)}
                    </select>
                </label>
                {categoriesError && <p role="alert" className="rounded-md bg-white/95 px-3 py-1.5 text-xs text-danger shadow">{categoriesError}</p>}
            </div>
            <div className="pointer-events-auto max-w-[min(100%,360px)] rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-lg">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-neutral-500">{t('Vị trí sự cố đang hiển thị', 'Visible incident locations')}</p><p className="mt-1 text-lg font-bold text-neutral-900">{visibleIncidents.length.toLocaleString('vi-VN')} {t('báo cáo', 'reports')}</p></div><MapPin size={18} className="mt-1 text-danger" /></div>
                {mode === 'heatmap' && <p className="mt-1 text-xs text-neutral-500">{t('Mật độ báo cáo theo khu vực', 'Report density by area')}</p>}
                {loading && <p className="mt-2 text-xs text-neutral-500">{t('Đang tải vị trí báo cáo...', 'Loading incident locations...')}</p>}
                {error && <div className="mt-2 flex items-center justify-between gap-3 text-xs text-danger"><span>{error}</span><button type="button" onClick={() => void loadMapData()} aria-label={t('Thử tải lại dữ liệu bản đồ', 'Retry loading map data')} className="rounded p-1 hover:bg-red-50"><RefreshCw size={14} /></button></div>}
            </div>
        </div>

        {/* Bottom-Left Category Color Legend */}
        {legendItems.length > 0 && (
            <div className="pointer-events-auto absolute bottom-5 left-4 z-[1000] max-h-64 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-neutral-700">
                        {t('Bảng màu loại sự cố', 'Incident Category Legend')}
                    </h3>
                    {categoryId !== undefined && (
                        <button
                            type="button"
                            onClick={() => setCategoryId(undefined)}
                            className="text-[11px] font-bold text-primary hover:underline"
                        >
                            {t('Hiện tất cả', 'Show all')}
                        </button>
                    )}
                </div>
                <div className="space-y-1">
                    {legendItems.map((item) => {
                        const isSelected = categoryId === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setCategoryId(isSelected ? undefined : item.id)}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                                    isSelected
                                        ? 'bg-primary/10 font-bold text-primary ring-1 ring-primary/30'
                                        : 'text-neutral-700 hover:bg-slate-100'
                                }`}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <span
                                        className="h-3 w-3 shrink-0 rounded-full border border-white shadow-sm"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="truncate">{translateCategory(item.name)}</span>
                                </span>
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                                    {item.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        )}
    </section>;
}
