import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import DepartmentModal from './DepartmentModal';
import { useDepartments } from '../hooks/useDepartments';
import type { AdminDepartment, DepartmentPayload } from '../services/api';

export default function DepartmentsSection() {
    const departmentsState = useDepartments();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<AdminDepartment | null>(null);

    function openCreate() {
        departmentsState.clearActionError();
        setEditingDepartment(null);
        setModalOpen(true);
    }

    function openEdit(department: AdminDepartment) {
        departmentsState.clearActionError();
        setEditingDepartment(department);
        setModalOpen(true);
    }

    async function saveDepartment(payload: DepartmentPayload) {
        if (editingDepartment) await departmentsState.updateDepartment(editingDepartment.id, payload);
        else await departmentsState.createDepartment(payload);
    }

    async function deleteDepartment(department: AdminDepartment) {
        if (department.staffCount > 0) return;
        if (!window.confirm(`Bạn có chắc muốn xóa đơn vị “${department.name}” không?`)) return;
        try { await departmentsState.deleteDepartment(department.id); }
        catch { /* The hook keeps the API error visible in this section. */ }
    }

    return <section id="settings-departments" className="scroll-mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div><h2 className="text-base font-bold text-neutral-900">Đơn Vị Xử Lý</h2><p className="mt-1 text-xs text-neutral-500">Quản lý khu vực phụ trách và trưởng đội</p></div>
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary/90"><Plus size={16} />Thêm Đơn Vị</button>
        </div>
        <div className="p-5">
            {(departmentsState.actionError || departmentsState.staffError) && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-danger">{departmentsState.actionError || `Không thể tải danh sách trưởng đội: ${departmentsState.staffError}`}</div>}
            {departmentsState.loading ? <div className="space-y-3" aria-label="Đang tải đơn vị" aria-busy="true">{[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
                : departmentsState.error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-danger">Không thể tải đơn vị: {departmentsState.error}<button type="button" onClick={departmentsState.refresh} className="ml-3 font-semibold underline">Thử lại</button></div>
                    : <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-neutral-500"><tr>{['Tên Đơn Vị', 'Khu Vực Phụ Trách', 'Số Nhân Viên', 'Trưởng Đội', 'Hành Động'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {departmentsState.departments.map((department) => <tr key={department.id} className="hover:bg-background">
                                    <td className="px-4 py-3 font-semibold text-neutral-900">{department.name}</td>
                                    <td className="px-4 py-3 text-neutral-600">{department.area || 'Chưa phân khu vực'}</td>
                                    <td className="px-4 py-3"><span className="inline-flex min-w-8 justify-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-info">{department.staffCount.toLocaleString('vi-VN')}</span></td>
                                    <td className="px-4 py-3 text-neutral-600">{department.leadName || 'Chưa phân công'}</td>
                                    <td className="px-4 py-3"><div className="flex items-center gap-1"><button type="button" onClick={() => openEdit(department)} className="rounded-md p-2 text-neutral-500 hover:bg-primary-light hover:text-primary" aria-label={`Sửa đơn vị ${department.name}`}><Edit2 size={16} /></button><button type="button" onClick={() => void deleteDepartment(department)} disabled={department.staffCount > 0 || departmentsState.deletingId === department.id} title={department.staffCount > 0 ? 'Không thể xóa đơn vị đang có nhân viên sử dụng' : 'Xóa đơn vị'} className="rounded-md p-2 text-neutral-500 hover:bg-red-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Xóa đơn vị ${department.name}`}><Trash2 size={16} /></button></div></td>
                                </tr>)}
                                {!departmentsState.departments.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-neutral-500">Chưa có đơn vị xử lý.</td></tr>}
                            </tbody>
                        </table>
                    </div>}
        </div>
        {modalOpen && <DepartmentModal department={editingDepartment} staff={departmentsState.staff} staffError={departmentsState.staffError} saving={departmentsState.saving} onClose={() => setModalOpen(false)} onSave={saveDepartment} />}
    </section>;
}