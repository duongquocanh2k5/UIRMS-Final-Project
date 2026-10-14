import { CheckSquare, ClipboardList } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import FilterBar, { type IncidentFilters } from '../components/FilterBar';
import IncidentTable from '../components/IncidentTable';
import Pagination from '../components/Pagination';
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
    status: 'Mới' | 'Đang xử lý' | 'Hoàn tất';
    assignee: string;
    createdAt: string;
    createdDate: string;
}

const defaultFilters: IncidentFilters = { search: '', status: 'Tất cả', category: 'Tất cả', priority: 'Tất cả', fromDate: '', toDate: '' };
const statusMap: Record<AdminIncident['status'], Incident['status']> = { pending: 'Mới', assigned: 'Đang xử lý', in_progress: 'Đang xử lý', completed: 'Hoàn tất', rejected: 'Mới' };
const priorityMap: Record<AdminIncident['priority'], Incident['priority']> = { low: 'Nhẹ', medium: 'Trung bình', high: 'Nghiêm trọng', critical: 'Khẩn cấp' };

function mapIncident(item: AdminIncident): Incident {
    const date = new Date(item.created_at);
    return { id: `BC-${date.getFullYear()}-${String(item.id).padStart(4, '0')}`, databaseId: item.id, title: item.title, category: item.category_name || `Danh mục ${item.category_id}`, area: item.location_name || 'Chưa cập nhật', reporter: item.user_name || item.user_email || 'Không xác định', priority: priorityMap[item.priority] || 'Trung bình', status: statusMap[item.status] || 'Mới', assignee: item.assigned_technician || 'Chưa phân công', createdAt: date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }), createdDate: date.toISOString().slice(0, 10) };
}

export default function Incidents() {
    const { categories: categoryData, error: categoryError } = useCategories();
    const categories = categoryData.filter((category) => category.is_active).map((category) => category.name);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [filters, setFilters] = useState(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
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

    const loadIncidents = useCallback(async (nextPage = page) => {
        setLoading(true); setError('');
        try {
            const response = await adminApi.getIncidents(nextPage, 10, appliedFilters.status === 'Đang xử lý' ? 'in_progress' : appliedFilters.status === 'Hoàn tất' ? 'completed' : appliedFilters.status === 'Mới' ? 'pending' : undefined, appliedFilters.priority === 'Khẩn cấp' ? 'critical' : appliedFilters.priority === 'Nghiêm trọng' ? 'high' : appliedFilters.priority === 'Trung bình' ? 'medium' : appliedFilters.priority === 'Nhẹ' ? 'low' : undefined, undefined, appliedFilters.search, appliedFilters.fromDate, appliedFilters.toDate);
            setIncidents(response.data.map(mapIncident)); setTotal(response.pagination.total); setTotalPages(response.pagination.totalPages || 1);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách báo cáo.'); } finally { setLoading(false); }
    }, [appliedFilters, page]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadIncidents(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadIncidents]);
    const visibleIncidents = useMemo(() => incidents.filter((incident) => { const search = appliedFilters.search.toLowerCase().trim(); return (!search || `${incident.id} ${incident.title}`.toLowerCase().includes(search)) && (appliedFilters.category === 'Tất cả' || incident.category === appliedFilters.category) && (appliedFilters.status === 'Tất cả' || appliedFilters.status === 'Khẩn cấp' || incident.status === appliedFilters.status) && (appliedFilters.priority === 'Tất cả' || incident.priority === appliedFilters.priority) && (!appliedFilters.fromDate || incident.createdDate >= appliedFilters.fromDate) && (!appliedFilters.toDate || incident.createdDate <= appliedFilters.toDate); }), [incidents, appliedFilters]);
    const toggleIncident = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
    const toggleAll = () => setSelectedIds(visibleIncidents.every((incident) => selectedIds.includes(incident.id)) ? [] : visibleIncidents.map((incident) => incident.id));
    const applyFilters = () => { setAppliedFilters(filters); setPage(1); setSelectedIds([]); };

    const openAssignment = async () => {
        setShowAssignmentForm(true);
        setAssignmentError('');
        setAssignmentNotice('');
        if (assignableStaff.length) return;
        setStaffLoading(true);
        try {
            const response = await adminApi.getAssignableStaff();
            setAssignableStaff(response.data.filter((person) => person.is_active && ['technician', 'manager'].includes(person.role)));
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

    return (
        <div className="space-y-6">
            <div><p className="text-sm font-medium text-neutral-500">Quản lý phản ánh từ người dân</p><h1 className="mt-1 text-2xl font-bold text-neutral-900">Danh Sách Báo Cáo</h1><p className="mt-2 text-sm text-neutral-500">Quản lý và xử lý phản ánh hạ tầng đô thị · {total.toLocaleString('vi-VN')} báo cáo</p></div>
            <FilterBar filters={filters} categories={categories} onChange={setFilters} onFilter={applyFilters} />
            {categoryError && <div role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Không tải được danh mục để lọc: {categoryError}</div>}
            <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm font-medium text-neutral-500"><input type="checkbox" checked={visibleIncidents.length > 0 && visibleIncidents.every((incident) => selectedIds.includes(incident.id))} onChange={toggleAll} className="h-4 w-4 accent-primary" />Chọn tất cả</label><div className="flex items-center gap-2"><span className="text-xs text-neutral-500">{selectedIds.length} dòng đã chọn</span><button type="button" disabled={!selectedIds.length || assigning} onClick={() => void openAssignment()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"><ClipboardList size={15} />Phân Công</button><button type="button" disabled={!selectedIds.length} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><CheckSquare size={15} />Đổi Trạng Thái</button></div></div>
            {showAssignmentForm && <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"><label className="min-w-56 flex-1 text-xs font-semibold text-neutral-600">Nhân viên xử lý<select value={assignedStaffId} onChange={(event) => setAssignedStaffId(event.target.value)} disabled={staffLoading || assigning} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900"><option value="">{staffLoading ? 'Đang tải nhân viên...' : 'Chọn nhân viên'}</option>{assignableStaff.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.username}</option>)}</select></label><button type="button" onClick={() => void assignSelected()} disabled={!assignedStaffId || !selectedIds.length || assigning || staffLoading} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{assigning ? 'Đang phân công...' : `Phân công ${selectedIds.length} báo cáo`}</button><button type="button" onClick={() => setShowAssignmentForm(false)} disabled={assigning} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-neutral-600">Hủy</button></section>}
            {assignmentError && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{assignmentError}</div>}
            {assignmentNotice && <div role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-success">{assignmentNotice}</div>}
            {error ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : loading ? <div className="rounded-xl bg-white p-10 text-center text-sm text-neutral-500">Đang tải dữ liệu...</div> : <IncidentTable incidents={visibleIncidents} selectedIds={selectedIds} onToggle={toggleIncident} onToggleAll={toggleAll} />}
            <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={10} onPageChange={(nextPage) => { setPage(nextPage); setSelectedIds([]); }} />
        </div>
    );
}
