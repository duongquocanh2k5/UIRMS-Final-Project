import type { AdminIncidentNote, AssignableAdmin } from '../services/api';

interface ProcessingPanelProps {
    status: string;
    priority: string;
    assignee: string;
    note: string;
    feedback: string;
    staff: AssignableAdmin[];
    notes: AdminIncidentNote[];
    noteSaving: boolean;
    notifying: boolean;
    onStatusChange: (value: string) => void;
    onPriorityChange: (value: string) => void;
    onAssigneeChange: (value: string) => void;
    onNoteChange: (value: string) => void;
    onAddNote: () => void;
    onFeedbackChange: (value: string) => void;
    onUpdate: () => void;
    onNotify: () => void;
}

const fieldClass = 'mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
const labelClass = 'text-xs font-semibold text-neutral-500';

export default function ProcessingPanel({ status, priority, assignee, note, feedback, staff, notes, noteSaving, notifying, onStatusChange, onPriorityChange, onAssigneeChange, onNoteChange, onAddNote, onFeedbackChange, onUpdate, onNotify }: ProcessingPanelProps) {
    return <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-neutral-900">Xử Lý & Cập Nhật</h2><div className="mt-5 space-y-4">
            <label className="block"><span className={labelClass}>Trạng thái</span><select value={status} onChange={(event) => onStatusChange(event.target.value)} className={fieldClass}><option>Mới</option><option>Đang xử lý</option><option>Hoàn tất</option><option>Từ chối</option></select></label>
            <label className="block"><span className={labelClass}>Mức độ khẩn</span><select value={priority} onChange={(event) => onPriorityChange(event.target.value)} className={fieldClass}><option>Thấp</option><option>Trung bình</option><option>Cao</option><option>Khẩn cấp</option></select></label>
            <label className="block"><span className={labelClass}>Nhân viên xử lý</span><select value={assignee} onChange={(event) => onAssigneeChange(event.target.value)} className={fieldClass}><option value="">Chưa phân công</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.full_name || member.username}</option>)}</select></label>
            <label className="block"><span className={labelClass}>Ghi chú nội bộ</span><textarea value={note} onChange={(event) => onNoteChange(event.target.value)} rows={4} placeholder="Thêm ghi chú cho đội xử lý..." className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-background p-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            <button type="button" onClick={onAddNote} disabled={!note.trim() || noteSaving} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50">{noteSaving ? 'Đang lưu ghi chú...' : 'Lưu ghi chú'}</button>
            {notes.length > 0 && <div className="space-y-2">{notes.map((item) => <article key={item.id} className="rounded-lg bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-neutral-700">{item.note}</p><p className="mt-2 text-xs text-neutral-500">{item.created_by_name || 'Quản trị viên'} · {new Date(item.created_at).toLocaleString('vi-VN')}</p></article>)}</div>}
            <button type="button" onClick={onUpdate} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90">Cập Nhật Trạng Thái</button>
        </div></section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-neutral-900">Gửi Phản Hồi Cho Công Dân</h2><textarea value={feedback} onChange={(event) => onFeedbackChange(event.target.value)} rows={4} placeholder="Nhập nội dung phản hồi..." className="mt-4 w-full resize-none rounded-lg border border-slate-200 bg-background p-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /><button type="button" onClick={onNotify} disabled={!feedback.trim() || notifying} className="mt-3 w-full rounded-lg border border-primary px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50">{notifying ? 'Đang gửi...' : 'Gửi Thông Báo'}</button></section>
    </div>;
}
