import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CreateStaffPayload } from '../services/api';

interface AddStaffModalProps {
    onClose: () => void;
    onCreate: (payload: CreateStaffPayload) => Promise<void>;
}

const fieldClass = 'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-500 focus:border-primary focus:ring-2 focus:ring-primary/20';

export default function AddStaffModal({ onClose, onCreate }: AddStaffModalProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [department, setDepartment] = useState('');
    const [role, setRole] = useState<CreateStaffPayload['role']>('technician');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await onCreate({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                department: department.trim() || undefined,
                role,
                password,
            });
            onClose();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Không thể tạo nhân viên.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="add-staff-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl">
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><h2 id="add-staff-title" className="text-lg font-bold text-neutral-900">Thêm Nhân Viên</h2><p className="mt-1 text-sm text-neutral-500">Tạo tài khoản cho nhân sự xử lý sự cố</p></div><button type="button" onClick={onClose} disabled={submitting} className="rounded-md p-2 text-neutral-500 hover:bg-slate-100 hover:text-neutral-900 disabled:opacity-50" aria-label="Đóng"><X size={18} /></button></div>
                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-danger">{error}</div>}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-neutral-600">Họ và tên<input required minLength={2} maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} placeholder="Nguyễn Văn A" /></label>
                        <label className="text-xs font-semibold text-neutral-600">Email<input required type="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} placeholder="nhanvien@uirms.vn" /></label>
                        <label className="text-xs font-semibold text-neutral-600">Số điện thoại<input maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} placeholder="090..." /></label>
                        <label className="text-xs font-semibold text-neutral-600">Đơn vị<input maxLength={100} value={department} onChange={(event) => setDepartment(event.target.value)} className={fieldClass} placeholder="Đội KTĐT Quận 1" /></label>
                        <label className="text-xs font-semibold text-neutral-600">Vai trò<select value={role} onChange={(event) => setRole(event.target.value as CreateStaffPayload['role'])} className={fieldClass}><option value="technician">Kỹ thuật viên</option><option value="manager">Điều phối viên</option></select></label>
                        <label className="text-xs font-semibold text-neutral-600">Mật khẩu<input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} autoComplete="new-password" /></label>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-slate-50 disabled:opacity-50">Hủy</button><button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Đang tạo...' : 'Tạo nhân viên'}</button></div>
                </form>
            </section>
        </div>
    );
}