import { Edit2, RefreshCw, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import type { StaffDetail, UpdateStaffPayload } from '../services/api';
import { Avatar } from './StaffAvatar';
import { roleLabels } from './staff.constants';

interface StaffDetailPanelProps {
    staff: StaffDetail | null;
    loading: boolean;
    error: string;
    canManage: boolean;
    canChangeDepartment: boolean;
    onRetry: () => void;
    onSave: (payload: UpdateStaffPayload) => Promise<void>;
}

const statusLabels: Record<string, string> = { pending: 'Mới', assigned: 'Đã tiếp nhận', in_progress: 'Đang xử lý' };
const priorityLabels: Record<string, string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', critical: 'Khẩn cấp' };
const badgeClass = (value: string) => value === 'Thấp' ? 'bg-green-50 text-success' : value === 'Khẩn cấp' ? 'bg-red-50 text-danger' : value === 'Cao' || value === 'Đang xử lý' ? 'bg-orange-50 text-warning' : 'bg-blue-50 text-info';

export default function StaffDetailPanel({ staff, loading, error, canManage, canChangeDepartment, onRetry, onSave }: StaffDetailPanelProps) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [form, setForm] = useState<UpdateStaffPayload>({});
    if (loading) return <div className="grid gap-6 lg:grid-cols-2" aria-label="Đang tải hồ sơ" aria-busy="true"><div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" /><div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" /></div>;
    if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-danger">Không thể tải hồ sơ: {error}<button type="button" onClick={onRetry} className="ml-3 inline-flex items-center gap-1 font-semibold underline"><RefreshCw size={14} />Thử lại</button></div>;
    if (!staff) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-neutral-500">Không tìm thấy thông tin nhân viên.</div>;

    const activeIncidents = staff.activeIncidents ?? [];
    function beginEditing(currentStaff: StaffDetail) {
        setForm({ name: currentStaff.name, phone: currentStaff.phone, department: currentStaff.department, is_active: currentStaff.is_active });
        setEditError('');
        setEditing(true);
    }
    async function saveChanges(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setEditError('');
        try {
            await onSave({
                name: form.name?.trim(),
                phone: form.phone?.trim() || null,
                ...(canChangeDepartment ? { department: form.department?.trim() || null } : {}),
                is_active: form.is_active,
            });
            setEditing(false);
        } catch (reason) {
            setEditError(reason instanceof Error ? reason.message : 'Không thể cập nhật nhân viên.');
        } finally {
            setSaving(false);
        }
    }
    return (
        <section className="grid items-start gap-6 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-neutral-900">Thông tin nhân viên đang chọn</h2>{canManage && !editing && <button type="button" onClick={() => beginEditing(staff)} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-slate-50"><Edit2 size={14} />Chỉnh sửa</button>}</div>
                <div className="mt-5 flex items-center gap-4">
                    <Avatar name={staff.name} url={staff.avatar_url} size="large" />
                    <div className="min-w-0"><h3 className="truncate text-lg font-bold text-neutral-900">{staff.name}</h3><p className="mt-1 text-sm text-neutral-500">{roleLabels[staff.role]}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${staff.is_active ? 'bg-green-50 text-success' : 'bg-slate-100 text-neutral-500'}`}>{staff.is_active ? 'Đang làm việc' : 'Nghỉ'}</span></div>
                </div>
                <form onSubmit={(event) => void saveChanges(event)} className="mt-6 border-t border-slate-100 pt-5">
                    <h3 className="text-sm font-bold text-neutral-900">Thông Tin Cá Nhân</h3>
                    {editing ? <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {editError && <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{editError}</p>}
                        <label className="text-xs font-medium text-neutral-500">Họ và tên<input required minLength={2} maxLength={255} value={form.name ?? ''} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-neutral-900" /></label>
                        <label className="text-xs font-medium text-neutral-500">Số điện thoại<input maxLength={20} value={form.phone ?? ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-neutral-900" /></label>
                        {canChangeDepartment && <label className="text-xs font-medium text-neutral-500">Đơn vị<input maxLength={100} value={form.department ?? ''} onChange={(event) => setForm({ ...form, department: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-neutral-900" /></label>}
                        <label className="flex items-center gap-2 self-end text-sm font-medium text-neutral-700"><input type="checkbox" checked={form.is_active ?? false} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="h-4 w-4 accent-primary" />Đang làm việc</label>
                        <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setEditing(false)} disabled={saving} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-neutral-600 disabled:opacity-50"><X size={14} />Hủy</button><button type="submit" disabled={saving} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save size={14} />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
                    </div> : <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="min-w-0"><dt className="text-xs font-medium text-neutral-500">Email</dt><dd className="mt-1 break-all text-sm font-semibold text-neutral-900">{staff.email}</dd></div>
                        <div className="min-w-0"><dt className="text-xs font-medium text-neutral-500">Đơn vị</dt><dd className="mt-1 text-sm font-semibold text-neutral-900">{staff.department || 'Chưa phân đơn vị'}</dd></div>
                        <div className="min-w-0"><dt className="text-xs font-medium text-neutral-500">Số điện thoại</dt><dd className="mt-1 text-sm font-semibold text-neutral-900">{staff.phone || 'Chưa cập nhật'}</dd></div>
                    </dl>}
                </form>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-base font-bold text-neutral-900">Sự Cố Đang Điều Phối ({activeIncidents.length})</h2><p className="mt-1 text-xs text-neutral-500">Các sự cố chưa hoàn tất được giao cho nhân viên này</p></div>
                {activeIncidents.length ? <ul className="divide-y divide-slate-100">
                    {activeIncidents.map((incident) => <li key={incident.id}>
                        <Link to={`/incidents/${incident.id}`} className="block px-5 py-4 transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                            <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-primary">BC-{incident.id}</p><p className="mt-1 truncate text-sm font-semibold text-neutral-900" title={incident.title}>{incident.title}</p><p className="mt-1 text-xs text-neutral-500">{incident.category_name || 'Chưa phân loại'} · {new Date(incident.created_at).toLocaleDateString('vi-VN')}</p></div><span className="shrink-0 text-neutral-400" aria-hidden="true">›</span></div>
                            <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass(statusLabels[incident.status] || incident.status)}`}>{statusLabels[incident.status] || incident.status}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass(priorityLabels[incident.priority] || incident.priority)}`}>{priorityLabels[incident.priority] || incident.priority}</span></div>
                        </Link>
                    </li>)}
                </ul> : <p className="px-5 py-12 text-center text-sm text-neutral-500">Nhân viên hiện không có sự cố đang điều phối.</p>}
            </article>
        </section>
    );
}