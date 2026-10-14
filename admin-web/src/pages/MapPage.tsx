import { Layers3, MapPin, RefreshCw } from 'lucide-react';
import L from 'leaflet';
import 'leaflet.heat';
import { useCallback, useEffect, useState } from 'react';
import { MapContainer, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MapLayers, { type MapLayer } from '../components/MapLayers';
import { adminApi, type HeatmapPoint } from '../services/api';

type MapMode = MapLayer | 'heatmap';

const modes: Array<{ id: MapMode; label: string }> = [
    { id: 'street', label: 'Đường phố' },
    { id: 'satellite', label: 'Vệ tinh' },
    { id: 'heatmap', label: 'Bản đồ nhiệt' },
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
    const [mode, setMode] = useState<MapMode>('street');
    const [points, setPoints] = useState<HeatmapPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadHeatmap = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await adminApi.getHeatmap();
            setPoints(response.data.map((point) => ({ ...point, count: Number(point.count) })));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu bản đồ nhiệt.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadHeatmap(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadHeatmap]);

    return <section className="relative h-full min-h-[420px] bg-slate-100" aria-label="Bản đồ sự cố">
        <MapContainer center={[10.7769, 106.7009]} zoom={12} scrollWheelZoom zoomControl={false} className="h-full w-full">
            <MapLayers layer={mode === 'satellite' ? 'satellite' : 'street'} />
            {mode === 'heatmap' && <HeatLayer points={points} />}
            <ZoomControl position="bottomright" />
        </MapContainer>
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-[1000] flex flex-wrap items-start justify-between gap-3">
            <div className="pointer-events-auto rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-lg">
                <div className="flex items-center gap-1" role="group" aria-label="Lớp bản đồ">
                    {modes.map(({ id, label }) => <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id} className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${mode === id ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-slate-100'}`}>
                        {id === 'heatmap' && <Layers3 size={14} className="mr-1.5 inline" />}{label}
                    </button>)}
                </div>
            </div>
            <div className="pointer-events-auto max-w-[min(100%,360px)] rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-lg">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-neutral-500">Vị trí sự cố</p><p className="mt-1 text-lg font-bold text-neutral-900">{points.reduce((total, point) => total + point.count, 0).toLocaleString('vi-VN')} báo cáo</p></div><MapPin size={18} className="mt-1 text-danger" /></div>
                {mode === 'heatmap' && <p className="mt-1 text-xs text-neutral-500">Mật độ báo cáo theo khu vực</p>}
                {loading && <p className="mt-2 text-xs text-neutral-500">Đang tải dữ liệu nhiệt...</p>}
                {error && <div className="mt-2 flex items-center justify-between gap-3 text-xs text-danger"><span>{error}</span><button type="button" onClick={() => void loadHeatmap()} aria-label="Thử tải lại bản đồ nhiệt" className="rounded p-1 hover:bg-red-50"><RefreshCw size={14} /></button></div>}
            </div>
        </div>
    </section>;
}