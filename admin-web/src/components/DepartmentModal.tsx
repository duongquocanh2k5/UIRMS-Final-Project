import { useState, type FormEvent } from 'react';
import type { AdminDepartment, DepartmentPayload, StaffListItem } from '../services/api';

interface DepartmentModalProps {
    department?: AdminDepartment | null;
    staff: StaffListItem[];
    staffError: string;
    saving: boolean;
    onClose: () => void;
    onSave: (payload: DepartmentPayload) => Promise<void>;
}

const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

export default function DepartmentModal({ department, staff, staffError, saving, onClose, onSave }: DepartmentModalProps) {
    const [name, setName] = useState(department?.name ?? '');
    const [area, setArea] = useState(department?.area ?? '');
    const [leadAdminId, setLeadAdminId] = useState(department?.lead_admin_id?.toString() ?? '');
    const [error, setError] = useState('');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        try {
            await onSave({ name: name.trim(), area: area.trim() || null, lead_admin_id: leadAdminId ? Number(leadAdminId) : null });
            onClose();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Không thể lưu đơn vị.');
        }
    }

    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="department-modal-title" className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-5"><h2 id="department-modal-title" className="text-lg font-bold text-neutral-900">{department ? 'Sửa Đơn Vị' : 'Thêm Đơn Vị'}</h2><p className="mt-1 text-sm text-neutral-500">Cập nhật khu vực và trưởng đội phụ trách</p></div>
            <form onSubmit={submit} className="space-y-4 px-6 py-5">
                {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
                <label className="block text-xs font-semibold text-neutral-600">Tên đơn vị<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Đội KTĐT Quận 1" /></label>
                <label className="block text-xs font-semibold text-neutral-600">Khu vực phụ trách<input maxLength={100} value={area} onChange={(event) => setArea(event.target.value)} className={inputClass} placeholder="Quận 1" /></label>
                <label className="block text-xs font-semibold text-neutral-600">Trưởng đội<select value={leadAdminId} onChange={(event) => setLeadAdminId(event.target.value)} className={inputClass}><option value="">Chưa phân công</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role === 'manager' ? 'Điều phối viên' : 'Kỹ thuật viên'}</option>)}</select></label>
                {staffError && <p role="alert" className="text-xs text-warning">Danh sách nhân viên chưa tải được: {staffError}</p>}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-slate-50">Hủy</button><button type="submit" disabled={saving || !name.trim()} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu đơn vị'}</button></div>
            </form>
        </section>
    </div>;
}