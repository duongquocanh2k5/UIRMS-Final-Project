import { CheckSquare, ClipboardList } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterBar, { type IncidentFilters, type IncidentStatusLabel } from '../components/FilterBar';
import IncidentTable from '../components/IncidentTable';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { adminApi, type AdminIncident, type AssignableAdmin } from '../services/api';

export interface Incident {
    id: string;
    databaseId: number;
    title: string;
    category: string;
    area: string;
    reporter: string;
    priority: 'Nhẹ' | 'Trung bình' | 'Nghiêm trọng' | 'Khẩn cấp';
    status: IncidentStatusLabel;
    assignee: string;
    createdAt: string;
}

const defaultFilters: IncidentFilters = { search: '', status: 'Tất cả', category: 'Tất cả', priority: 'Tất cả', fromDate: '', toDate: '' };
const statusMap: Record<AdminIncident['status'], Incident['status']> = { pending: 'Mới', assigned: 'Đã tiếp nhận', in_progress: 'Đang xử lý', completed: 'Hoàn tất', rejected: 'Từ chối' };
const priorityMap: Record<AdminIncident['priority'], Incident['priority']> = { low: 'Nhẹ', medium: 'Trung bình', high: 'Nghiêm trọng', critical: 'Khẩn cấp' };

function mapIncident(item: AdminIncident): Incident {
    const date = new Date(item.created_at);
    return { id: `BC-${date.getFullYear()}-${String(item.id).padStart(4, '0')}`, databaseId: item.id, title: item.title, category: item.category_name || `Danh mục ${item.category_id}`, area: item.location_name || 'Chưa cập nhật', reporter: item.user_name || item.user_email || 'Không xác định', priority: priorityMap[item.priority] || 'Trung bình', status: statusMap[item.status] || 'Mới', assignee: item.assigned_technician || 'Chưa phân công', createdAt: date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) };
}

export default function Incidents() {
    const { user } = useAuth();
    const canAssign = user.role === 'super_admin' || user.role === 'manager';
    const [searchParams, setSearchParams] = useSearchParams();
    const routeSearch = searchParams.get('search') || '';
    const { categories: categoryData, error: categoryError } = useCategories();
    const categories = categoryData.filter((category) => category.is_active).map((category) => category.name);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [filters, setFilters] = useState({ ...defaultFilters, search: routeSearch });
    const [appliedFilters, setAppliedFilters] = useState({ ...defaultFilters, search: routeSearch });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [assignableStaff, setAssignableStaff] = useState<AssignableAdmin[]>([]);
    const [assignedStaffId, setAssignedStaffId] = useState('');
    const [showAssignmentForm, setShowAssignmentForm] = useState(false);
    const [staffLoading, setStaffLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [assignmentError, setAssignmentError] = useState('');
    const [assignmentNotice, setAssignmentNotice] = useState('');
    const [showStatusForm, setShowStatusForm] = useState(false);
    const [statusTarget, setStatusTarget] = useState('');
    const [batchRejectionReason, setBatchRejectionReason] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusError, setStatusError] = useState('');
    const [statusNotice, setStatusNotice] = useState('');

    const loadIncidents = useCallback(async (nextPage = page) => {
        setLoading(true); setError('');
        try {
            const selectedCategoryId = categoryData.find((category) => category.name === appliedFilters.category)?.id;
            const status = appliedFilters.status === 'Đã tiếp nhận' ? 'assigned' : appliedFilters.status === 'Đang xử lý' ? 'in_progress' : appliedFilters.status === 'Hoàn tất' ? 'completed' : appliedFilters.status === 'Mới' ? 'pending' : appliedFilters.status === 'Từ chối' ? 'rejected' : undefined;
            const priority = appliedFilters.priority === 'Khẩn cấp' ? 'critical' : appliedFilters.priority === 'Nghiêm trọng' ? 'high' : appliedFilters.priority === 'Trung bình' ? 'medium' : appliedFilters.priority === 'Nhẹ' ? 'low' : undefined;
            const response = await adminApi.getIncidents(nextPage, 10, status, priority, selectedCategoryId, appliedFilters.search, appliedFilters.fromDate, appliedFilters.toDate);
            setIncidents(response.data.map(mapIncident)); setTotal(response.pagination.total); setTotalPages(response.pagination.totalPages || 1);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách báo cáo.'); } finally { setLoading(false); }
    }, [appliedFilters, categoryData, page]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadIncidents(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadIncidents]);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setFilters((current) => ({ ...current, search: routeSearch }));
            setAppliedFilters((current) => ({ ...current, search: routeSearch }));
            setPage(1);
            setSelectedIds([]);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [routeSearch]);
    const toggleIncident = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
    const toggleAll = () => setSelectedIds(incidents.every((incident) => selectedIds.includes(incident.id)) ? [] : incidents.map((incident) => incident.id));
    const applyFilters = () => {
        setAppliedFilters(filters);
        setPage(1);
        setSelectedIds([]);
        const nextParams = new URLSearchParams(searchParams);
        if (filters.search.trim()) nextParams.set('search', filters.search.trim());
        else nextParams.delete('search');
        setSearchParams(nextParams, { replace: true });
    };

    const openAssignment = async () => {
        setShowAssignmentForm(true);
        setAssignmentError('');
        setAssignmentNotice('');
        if (assignableStaff.length) return;
        setStaffLoading(true);
        try {
            const response = await adminApi.getAssignableStaff();
            setAssignableStaff(response.data.filter((person) => person.is_active && person.role === 'technician'));
        } catch (reason) {
            setAssignmentError(reason instanceof Error ? reason.message : 'Không thể tải danh sách nhân viên.');
        } finally { setStaffLoading(false); }
    };

    const assignSelected = async () => {
        const selectedIncidents = incidents.filter((incident) => selectedIds.includes(incident.id));
        if (!assignedStaffId || !selectedIncidents.length) return;
        setAssigning(true);
        setAssignmentError('');
        setAssignmentNotice('');
        const results = await Promise.allSettled(selectedIncidents.map((incident) => adminApi.assignIncident(incident.databaseId, { assigned_to: Number(assignedStaffId) })));
        const failedIncidents = selectedIncidents.filter((_, index) => results[index].status === 'rejected');
        const successCount = results.length - failedIncidents.length;
        await loadIncidents();
        setSelectedIds(failedIncidents.map((incident) => incident.id));
        if (failedIncidents.length) {
            setAssignmentError(`Đã phân công ${successCount}/${results.length} báo cáo; ${failedIncidents.length} báo cáo chưa cập nhật.`);
        } else {
            setAssignmentNotice(`Đã phân công ${successCount} báo cáo.`);
            setShowAssignmentForm(false);
            setAssignedStaffId('');
        }
        setAssigning(false);
    };

    const updateSelectedStatus = async () => {
        const selectedIncidents = incidents.filter((incident) => selectedIds.includes(incident.id));
        if (!statusTarget || !selectedIncidents.length) return;
        if (statusTarget === 'rejected' && !batchRejectionReason.trim()) {
            setStatusError('Vui lòng nhập lý do từ chối.');
            return;
        }
        setUpdatingStatus(true);
        setStatusError('');
        setStatusNotice('');
        const results = await Promise.allSettled(selectedIncidents.map((incident) => adminApi.updateIncidentStatus(incident.databaseId, statusTarget, statusTarget === 'rejected' ? batchRejectionReason.trim() : undefined)));
        const failedIncidents = selectedIncidents.filter((_, index) => results[index].status === 'rejected');
        const successCount = results.length - failedIncidents.length;
        await loadIncidents();
        setSelectedIds(failedIncidents.map((incident) => incident.id));
        if (failedIncidents.length) setStatusError(`Đã cập nhật ${successCount}/${results.length} báo cáo; ${failedIncidents.length} báo cáo chưa cập nhật.`);
        else {
            setStatusNotice(`Đã cập nhật trạng thái ${successCount} báo cáo.`);
            setShowStatusForm(false);
            setStatusTarget('');
            setBatchRejectionReason('');
        }
        setUpdatingStatus(false);
    };

    return (
        <div className="space-y-6">
            <div><p className="text-sm font-medium text-neutral-500">Quản lý phản ánh từ người dân</p><h1 className="mt-1 text-2xl font-bold text-neutral-900">Danh Sách Báo Cáo</h1><p className="mt-2 text-sm text-neutral-500">Quản lý và xử lý phản ánh hạ tầng đô thị · {total.toLocaleString('vi-VN')} báo cáo</p></div>
            <FilterBar filters={filters} categories={categories} onChange={setFilters} onFilter={applyFilters} />
            {categoryError && <div role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Không tải được danh mục để lọc: {categoryError}</div>}
            {canAssign && <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm font-medium text-neutral-500"><input type="checkbox" checked={incidents.length > 0 && incidents.every((incident) => selectedIds.includes(incident.id))} onChange={toggleAll} className="h-4 w-4 accent-primary" />Chọn tất cả</label><div className="flex items-center gap-2"><span className="text-xs text-neutral-500">{selectedIds.length} dòng đã chọn</span><button type="button" disabled={!selectedIds.length || assigning} onClick={() => void openAssignment()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"><ClipboardList size={15} />Phân Công</button><button type="button" disabled={!selectedIds.length || updatingStatus} onClick={() => { setShowStatusForm((visible) => !visible); setStatusError(''); setStatusNotice(''); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><CheckSquare size={15} />Đổi Trạng Thái</button></div></div>}
            {canAssign && showAssignmentForm && <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"><label className="min-w-56 flex-1 text-xs font-semibold text-neutral-600">Nhân viên xử lý<select value={assignedStaffId} onChange={(event) => setAssignedStaffId(event.target.value)} disabled={staffLoading || assigning} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900"><option value="">{staffLoading ? 'Đang tải nhân viên...' : 'Chọn nhân viên'}</option>{assignableStaff.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.username}</option>)}</select></label><button type="button" onClick={() => void assignSelected()} disabled={!assignedStaffId || !selectedIds.length || assigning || staffLoading} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{assigning ? 'Đang phân công...' : `Phân công ${selectedIds.length} báo cáo`}</button><button type="button" onClick={() => setShowAssignmentForm(false)} disabled={assigning} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-neutral-600">Hủy</button></section>}
            {canAssign && showStatusForm && <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"><label className="min-w-56 flex-1 text-xs font-semibold text-neutral-600">Trạng thái mới<select value={statusTarget} onChange={(event) => { setStatusTarget(event.target.value); setStatusError(''); }} disabled={updatingStatus} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900"><option value="">Chọn trạng thái</option><option value="pending">Mới</option><option value="assigned">Đã tiếp nhận</option><option value="in_progress">Đang xử lý</option><option value="rejected">Từ chối</option></select></label>{statusTarget === 'rejected' && <label className="min-w-64 flex-[2] text-xs font-semibold text-neutral-600">Lý do từ chối <span className="text-danger">*</span><textarea required value={batchRejectionReason} onChange={(event) => { setBatchRejectionReason(event.target.value); setStatusError(''); }} maxLength={1000} rows={2} disabled={updatingStatus} placeholder="Nhập lý do áp dụng cho các báo cáo đã chọn" className="mt-1.5 w-full resize-y rounded-lg border border-red-200 bg-red-50/40 p-3 text-sm font-normal text-neutral-900 outline-none focus:border-danger focus:ring-2 focus:ring-danger/20" /></label>}<button type="button" onClick={() => void updateSelectedStatus()} disabled={!statusTarget || (statusTarget === 'rejected' && !batchRejectionReason.trim()) || !selectedIds.length || updatingStatus} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{updatingStatus ? 'Đang cập nhật...' : `Cập nhật ${selectedIds.length} báo cáo`}</button><button type="button" onClick={() => setShowStatusForm(false)} disabled={updatingStatus} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-neutral-600">Hủy</button></section>}
            {assignmentError && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{assignmentError}</div>}
            {assignmentNotice && <div role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-success">{assignmentNotice}</div>}
            {statusError && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{statusError}</div>}
            {statusNotice && <div role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-success">{statusNotice}</div>}
            {error ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : loading ? <div className="rounded-xl bg-white p-10 text-center text-sm text-neutral-500">Đang tải dữ liệu...</div> : <IncidentTable incidents={incidents} selectedIds={selectedIds} onToggle={toggleIncident} onToggleAll={toggleAll} selectable={canAssign} />}
            <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={10} onPageChange={(nextPage) => { setPage(nextPage); setSelectedIds([]); }} />
        </div>
    );
}
