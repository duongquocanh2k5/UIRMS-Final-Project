import type { AdminIncidentNote, AssignableAdmin } from '../services/api';
import { ChevronDown, Search, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

interface ProcessingPanelProps {
    incidentId: number;
    canManageIncident: boolean;
    status: string;
    rejectionReason: string;
    priority: string;
    assignee: string;
    assigneeError: string;
    note: string;
    feedback: string;
    staff: AssignableAdmin[];
    notes: AdminIncidentNote[];
    noteSaving: boolean;
    notifying: boolean;
    updating: boolean;
    updateConfirmed: boolean;
    onStatusChange: (value: string) => void;
    onRejectionReasonChange: (value: string) => void;
    onPriorityChange: (value: string) => void;
    onAssigneeChange: (value: string) => void;
    onNoteChange: (value: string) => void;
    onAddNote: () => Promise<boolean>;
    onFeedbackChange: (value: string) => void;
    onUpdate: () => void;
    onNotify: () => Promise<boolean>;
}

const fieldClass = 'mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
const labelClass = 'text-xs font-semibold text-neutral-500';
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLocaleLowerCase('vi-VN').trim();

export default function ProcessingPanel({ incidentId, canManageIncident, status, rejectionReason, priority, assignee, assigneeError, note, feedback, staff, notes, noteSaving, notifying, updating, updateConfirmed, onStatusChange, onRejectionReasonChange, onPriorityChange, onAssigneeChange, onNoteChange, onAddNote, onFeedbackChange, onUpdate, onNotify }: ProcessingPanelProps) {
    const [noteConfirmed, setNoteConfirmed] = useState(false);
    const [notificationConfirmed, setNotificationConfirmed] = useState(false);
    const [assigneeListOpen, setAssigneeListOpen] = useState(false);
    const canAssignTo = (member: AssignableAdmin) => member.is_active && member.role === 'technician';
    const filteredStaff = staff.filter((member) => {
        const displayName = member.full_name ? `${member.full_name} (${member.username})` : member.username;
        return normalizeSearch(`${member.full_name || ''} ${member.username} ${displayName}`).includes(normalizeSearch(assignee));
    });

    function handleAssigneeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setAssigneeListOpen(true);
        } else if (event.key === 'Escape') {
            setAssigneeListOpen(false);
        } else if (event.key === 'Enter' && assigneeListOpen && filteredStaff.find(canAssignTo)) {
            event.preventDefault();
            const member = filteredStaff.find(canAssignTo)!;
            onAssigneeChange(member.full_name ? `${member.full_name} (${member.username})` : member.username);
            setAssigneeListOpen(false);
        }
    }

    async function handleAddNote() {
        if (await onAddNote()) {
            setNoteConfirmed(true);
            window.setTimeout(() => setNoteConfirmed(false), 1600);
        }
    }

    async function handleNotify() {
        if (await onNotify()) {
            setNotificationConfirmed(true);
            window.setTimeout(() => setNotificationConfirmed(false), 1600);
        }
    }

    return <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-neutral-900">Xử Lý & Cập Nhật</h2><div className="mt-5 space-y-4">
            <label className="block"><span className={labelClass}>Trạng thái</span><select value={status} onChange={(event) => onStatusChange(event.target.value)} className={fieldClass}>{canManageIncident ? <><option>Mới</option><option>Đã tiếp nhận</option><option>Đang xử lý</option><option>Hoàn tất</option><option>Từ chối</option></> : <><option disabled>Mới</option><option>Đã tiếp nhận</option><option>Đang xử lý</option><option>Hoàn tất</option><option disabled>Từ chối</option></>}</select></label>
            {status === 'Từ chối' && canManageIncident && <label className="block"><span className={labelClass}>Lý do từ chối <span className="text-danger">*</span></span><textarea required value={rejectionReason} onChange={(event) => onRejectionReasonChange(event.target.value)} rows={3} maxLength={1000} placeholder="Nêu rõ lý do để công dân biết hướng xử lý..." className="mt-1.5 w-full resize-y rounded-lg border border-red-200 bg-red-50/40 p-3 text-sm text-neutral-900 outline-none focus:border-danger focus:ring-2 focus:ring-danger/20" /></label>}
            {canManageIncident && <label className="block"><span className={labelClass}>Mức độ khẩn</span><select value={priority} onChange={(event) => onPriorityChange(event.target.value)} className={fieldClass}><option>Thấp</option><option>Trung bình</option><option>Cao</option><option>Khẩn cấp</option></select></label>}
            {canManageIncident && <div>
                <label htmlFor={`incident-${incidentId}-assignee`} className={labelClass}>Nhân viên xử lý</label>
                <div className="relative mt-1.5" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAssigneeListOpen(false); }}>
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input id={`incident-${incidentId}-assignee`} role="combobox" aria-autocomplete="list" aria-expanded={assigneeListOpen} aria-controls={`incident-${incidentId}-assignee-list`} value={assignee} onFocus={() => setAssigneeListOpen(true)} onChange={(event) => { onAssigneeChange(event.target.value); setAssigneeListOpen(true); }} onKeyDown={handleAssigneeKeyDown} placeholder="Tìm tên hoặc username..." autoComplete="off" className={`${fieldClass} pl-9 pr-20`} />
                    <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
                        {assignee && <button type="button" onClick={() => { onAssigneeChange(''); setAssigneeListOpen(false); }} disabled={updating} aria-label="Bỏ phân công" title="Bỏ phân công" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-red-50 hover:text-danger disabled:opacity-50"><X size={15} /></button>}
                        <button type="button" onClick={() => setAssigneeListOpen((open) => !open)} disabled={updating} aria-label={assigneeListOpen ? 'Đóng danh sách nhân viên' : 'Mở danh sách nhân viên'} aria-expanded={assigneeListOpen} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-slate-100 disabled:opacity-50"><ChevronDown size={16} className={`transition-transform ${assigneeListOpen ? 'rotate-180' : ''}`} /></button>
                    </div>
                    {assigneeListOpen && <div id={`incident-${incidentId}-assignee-list`} role="listbox" aria-label="Nhân viên kỹ thuật" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        {filteredStaff.length ? filteredStaff.map((member) => {
                            const label = member.full_name ? `${member.full_name} (${member.username})` : member.username;
                            const assignable = canAssignTo(member);
                            const roleLabel = member.role === 'super_admin' ? 'Quản trị cấp cao' : member.role === 'manager' ? 'Điều phối viên' : 'Kỹ thuật viên';
                            return <button key={member.id} type="button" role="option" aria-selected={assignee === label} aria-disabled={!assignable} disabled={!assignable || updating} onMouseDown={(event) => event.preventDefault()} onClick={() => { onAssigneeChange(label); setAssigneeListOpen(false); }} className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-55 ${assignee === label ? 'bg-primary-light text-primary' : 'text-neutral-700 hover:bg-slate-50'}`}><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${member.is_online ? 'bg-green-500' : 'bg-slate-400'}`} title={member.is_online ? 'Đang online' : 'Offline'} aria-label={member.is_online ? 'Đang online' : 'Offline'} /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{member.full_name || member.username}</span><span className="mt-0.5 block text-[11px] text-neutral-500">{roleLabel} · {member.username}{!member.is_active ? ' · Đã khóa' : ''}</span></span></button>;
                        }) : <p className="px-3 py-3 text-sm text-neutral-500">{staff.length ? 'Không tìm thấy kỹ thuật viên phù hợp.' : 'Không có kỹ thuật viên đang hoạt động trong phạm vi đơn vị này.'}</p>}
                    </div>}
                </div>
                {assigneeError && <p role="alert" className="mt-1 text-xs text-danger">{assigneeError}</p>}
                <p className="mt-1 text-[11px] text-neutral-500">Chọn một kỹ thuật viên đang hoạt động trong danh sách.</p>
            </div>}
            <label className="block"><span className={labelClass}>Ghi chú nội bộ</span><textarea value={note} onChange={(event) => onNoteChange(event.target.value)} rows={4} placeholder="Thêm ghi chú cho đội xử lý..." className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-background p-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            <button type="button" onClick={() => void handleAddNote()} disabled={!note.trim() || noteSaving} className={`w-full rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${noteConfirmed ? 'border-[#087f78] bg-[#087f78] text-white ring-4 ring-primary/20' : 'border-slate-200 bg-white text-neutral-700 hover:bg-slate-50'}`}>{noteSaving ? 'Đang lưu ghi chú...' : noteConfirmed ? 'Đã lưu ghi chú' : 'Lưu ghi chú'}</button>
            {notes.length > 0 && <div className="space-y-2">{notes.map((item) => <article key={item.id} className="rounded-lg bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-neutral-700">{item.note}</p><p className="mt-2 text-xs text-neutral-500">{item.created_by_name || 'Quản trị viên'} · {new Date(item.created_at).toLocaleString('vi-VN')}</p></article>)}</div>}
            <button type="button" onClick={onUpdate} disabled={updating} aria-live="polite" className={`w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:cursor-wait ${updateConfirmed ? 'bg-[#087f78] ring-4 ring-primary/20' : 'bg-primary hover:bg-primary/90'} disabled:opacity-70`}>{updating ? 'Đang cập nhật...' : updateConfirmed ? 'Đã cập nhật' : 'Cập Nhật Trạng Thái'}</button>
        </div></section>
        {canManageIncident && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-neutral-900">Gửi Phản Hồi Cho Công Dân</h2><textarea value={feedback} onChange={(event) => onFeedbackChange(event.target.value)} rows={4} placeholder="Nhập nội dung phản hồi..." className="mt-4 w-full resize-none rounded-lg border border-slate-200 bg-background p-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /><button type="button" onClick={() => void handleNotify()} disabled={!feedback.trim() || notifying} className={`mt-3 w-full rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${notificationConfirmed ? 'border-[#087f78] bg-[#087f78] text-white ring-4 ring-primary/20' : 'border-primary text-primary hover:bg-primary-light'}`}>{notifying ? 'Đang gửi...' : notificationConfirmed ? 'Đã gửi phản hồi' : 'Gửi Thông Báo'}</button></section>}
    </div>;
}
