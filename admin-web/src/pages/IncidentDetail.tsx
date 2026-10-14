import { ArrowLeft, CheckCircle2, MapPin, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import { Link, useNavigate, useParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import HistoryTimeline, { type HistoryLog } from '../components/HistoryTimeline';
import ImageGallery from '../components/ImageGallery';
import InfoCard, { type InfoRow } from '../components/InfoCard';
import ProcessingPanel from '../components/ProcessingPanel';
import { adminApi, type AdminIncident, type AdminIncidentHistory, type AdminIncidentNote, type AssignableAdmin } from '../services/api';
import MapLayers from '../components/MapLayers';

const TileLayer = MapLayers;

const statusLabels: Record<AdminIncident['status'], string> = { pending: 'Mới', assigned: 'Đã tiếp nhận', in_progress: 'Đang xử lý', completed: 'Hoàn tất', rejected: 'Từ chối' };
const priorityLabels: Record<AdminIncident['priority'], string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', critical: 'Khẩn cấp' };
const statusToApi: Record<string, string> = { Mới: 'pending', 'Đang xử lý': 'in_progress', 'Hoàn tất': 'completed', 'Từ chối': 'rejected' };
const priorityToApi: Record<string, AdminIncident['priority']> = { Thấp: 'low', 'Trung bình': 'medium', Cao: 'high', 'Khẩn cấp': 'critical' };
const badgeClass = (value: string) => value === 'Hoàn tất' || value === 'Thấp' ? 'bg-green-50 text-success' : value === 'Khẩn cấp' || value === 'Từ chối' ? 'bg-red-50 text-danger' : value === 'Đang xử lý' || value === 'Cao' ? 'bg-orange-50 text-warning' : 'bg-blue-50 text-info';
const displayStatus = (value: string | null) => value ? statusLabels[value as keyof typeof statusLabels] || value : 'Chưa xác định';

export default function IncidentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [incident, setIncident] = useState<AdminIncident | null>(null);
    const [status, setStatus] = useState('Mới');
    const [priority, setPriority] = useState('Trung bình');
    const [assignee, setAssignee] = useState('Chưa phân công');
    const [note, setNote] = useState('');
    const [feedback, setFeedback] = useState('');
    const [staff, setStaff] = useState<AssignableAdmin[]>([]);
    const [notes, setNotes] = useState<AdminIncidentNote[]>([]);
    const [history, setHistory] = useState<AdminIncidentHistory[]>([]);
    const [activityWarning, setActivityWarning] = useState('');
    const [noteSaving, setNoteSaving] = useState(false);
    const [notifying, setNotifying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadActivity = useCallback(async (incidentId: number) => {
        const [historyResult, notesResult, staffResult] = await Promise.allSettled([
            adminApi.getIncidentHistory(incidentId),
            adminApi.getIncidentNotes(incidentId),
            adminApi.getAssignableStaff(),
        ]);
        const warnings: string[] = [];
        if (historyResult.status === 'fulfilled') setHistory(historyResult.value.data);
        else { setHistory([]); warnings.push('Không tải được lịch sử xử lý.'); }
        if (notesResult.status === 'fulfilled') setNotes(notesResult.value.data);
        else { setNotes([]); warnings.push('Không tải được ghi chú.'); }
        if (staffResult.status === 'fulfilled') setStaff(staffResult.value.data.filter((person) => person.is_active && ['technician', 'manager'].includes(person.role)));
        else { setStaff([]); warnings.push('Không tải được danh sách nhân viên.'); }
        setActivityWarning(warnings.join(' '));
    }, []);

    const loadIncident = useCallback(async () => {
        const incidentId = Number(id);
        if (!id || !Number.isInteger(incidentId) || incidentId < 1) {
            setError('Mã báo cáo không hợp lệ.');
            setLoading(false);
            return;
        }
        setLoading(true); setError('');
        try {
            const response = await adminApi.getIncident(incidentId);
            setIncident(response.data); setStatus(statusLabels[response.data.status]); setPriority(priorityLabels[response.data.priority]); setAssignee(response.data.assigned_to ? String(response.data.assigned_to) : '');
            await loadActivity(incidentId);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải chi tiết báo cáo.'); }
        finally { setLoading(false); }
    }, [id, loadActivity]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadIncident(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadIncident]);
    if (loading) return <div className="rounded-xl bg-white p-12 text-center text-sm text-neutral-500">Đang tải chi tiết báo cáo...</div>;
    if (error || !incident) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-danger">{error || 'Không tìm thấy báo cáo.'}<button type="button" onClick={() => void loadIncident()} className="ml-3 inline-flex items-center gap-1 font-semibold underline"><RefreshCw size={14} />Thử lại</button></div>;

    const latitude = incident.latitude ?? 10.7769;
    const longitude = incident.longitude ?? 106.7009;
    const infoRows: InfoRow[] = [
        { label: 'Mã sự cố', value: `BC-${incident.id}` }, { label: 'Danh mục', value: incident.category_name || `Danh mục ${incident.category_id}` }, { label: 'Khu vực', value: incident.location_name || 'Chưa cập nhật' }, { label: 'Địa chỉ', value: incident.location_name || 'Chưa cập nhật' }, { label: 'Người phản ánh', value: <span>{incident.user_name || incident.user_email || 'Không xác định'}<span className="mt-1 block text-xs font-normal text-neutral-500">{incident.user_phone || 'Chưa cập nhật SĐT'}</span></span> }, { label: 'Kênh tiếp nhận', value: 'Ứng dụng UIRMS' },
    ];
    const logs: HistoryLog[] = history.map((entry) => {
        const action = entry.action === 'assigned' ? 'Đã cập nhật phân công' : entry.action === 'status_changed' ? 'Đã cập nhật trạng thái' : 'Đã thêm ghi chú';
        const assignedStaff = staff.find((person) => person.id === entry.new_assigned_to);
        const detail = entry.action === 'status_changed'
            ? `${displayStatus(entry.old_status)} → ${displayStatus(entry.new_status)}`
            : entry.action === 'assigned'
                ? `Nhân viên: ${assignedStaff?.full_name || assignedStaff?.username || 'Chưa phân công'}`
                : entry.note || undefined;
        return { id: String(entry.id), action, timestamp: new Date(entry.created_at).toLocaleString('vi-VN'), actor: entry.performed_by_name || 'Quản trị viên', detail };
    });
    const saveChanges = async () => {
        try {
            await Promise.all([
                adminApi.updateIncidentStatus(incident.id, statusToApi[status] || 'pending'),
                adminApi.assignIncident(incident.id, { ...(assignee ? { assigned_to: Number(assignee) } : {}), priority: priorityToApi[priority] || 'medium' }),
            ]);
            setNotice('Đã cập nhật báo cáo.');
            await loadIncident();
        } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Cập nhật thất bại.'); }
    };
    const saveNote = async () => {
        if (!note.trim()) return;
        setNoteSaving(true);
        try {
            await adminApi.addIncidentNote(incident.id, note.trim());
            setNote('');
            setNotice('Đã lưu ghi chú.');
            await loadActivity(incident.id);
        } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Lưu ghi chú thất bại.'); }
        finally { setNoteSaving(false); }
    };
    const sendNotification = async () => {
        const message = feedback.trim();
        if (!message) return;
        if (!incident.user_id) {
            setNotice('Không tìm thấy người gửi báo cáo để nhận thông báo.');
            return;
        }
        setNotifying(true);
        try {
            await adminApi.sendAdminNotification({ user_id: incident.user_id, incident_id: incident.id, title: `Cập nhật báo cáo BC-${incident.id}`, message, type: 'new_reply' });
            setFeedback('');
            setNotice('Đã gửi thông báo cho công dân.');
        } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Gửi thông báo thất bại.'); }
        finally { setNotifying(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500"><Link to="/incidents" className="hover:text-primary">Danh sách báo cáo</Link><span>/</span><span className="font-medium text-neutral-900">BC-{incident.id}</span></div>
            <div className="flex items-start justify-between gap-6"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-neutral-900">{incident.title}</h1><span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeClass(status)}`}>{status}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeClass(priority)}`}>{priority}</span></div><p className="mt-3 text-sm text-neutral-500">Mã báo cáo: <b className="text-neutral-900">BC-{incident.id}</b> · Tạo ngày {new Date(incident.created_at).toLocaleString('vi-VN')}</p></div><button type="button" onClick={() => navigate('/incidents')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-500"><ArrowLeft size={16} />Quay lại</button></div>
            {notice && <div role="status" className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-success"><CheckCircle2 size={16} />{notice}</div>}
            {activityWarning && <div role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{activityWarning}</div>}
            <div className="grid grid-cols-[minmax(0,1.85fr)_minmax(330px,1fr)] items-start gap-6">
                <div className="space-y-6"><InfoCard title="Thông Tin Chi Tiết" rows={infoRows} /><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-neutral-900">Mô Tả Sự Cố</h2><p className="mt-4 text-sm leading-7 text-neutral-600">{incident.description || 'Không có mô tả.'}</p></section><ImageGallery images={incident.image_urls || []} /><section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="p-5"><h2 className="text-base font-bold text-neutral-900">Vị Trí Trên Bản Đồ</h2></div><div className="h-[290px]"><MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Marker position={[latitude, longitude]}><Popup>{incident.location_name || 'Vị trí báo cáo'}</Popup></Marker></MapContainer></div><div className="flex items-center gap-2 px-5 py-3 text-sm text-neutral-600"><MapPin size={17} className="text-danger" />{incident.location_name || 'Chưa cập nhật địa chỉ'}</div></section></div>
                <div className="space-y-6"><ProcessingPanel status={status} priority={priority} assignee={assignee} note={note} feedback={feedback} staff={staff} notes={notes} noteSaving={noteSaving} notifying={notifying} onStatusChange={setStatus} onPriorityChange={setPriority} onAssigneeChange={setAssignee} onNoteChange={setNote} onAddNote={() => void saveNote()} onFeedbackChange={setFeedback} onUpdate={() => void saveChanges()} onNotify={() => void sendNotification()} /><HistoryTimeline logs={logs} /></div>
            </div>
        </div>
    );
}
