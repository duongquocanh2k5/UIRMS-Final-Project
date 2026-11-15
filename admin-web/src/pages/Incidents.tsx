import { AlertTriangle, CheckSquare, ClipboardList, Clock3 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterBar, { type IncidentFilters, type IncidentStatusLabel } from '../components/FilterBar';
import IncidentTable from '../components/IncidentTable';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { adminApi, type AdminIncident, type AssignableAdmin } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { parseDatabaseDateTime } from '../utils/dateTime';

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
    rawCreatedAt: string;
    rawPriority: AdminIncident['priority'];
    isUnassigned: boolean;
}

const defaultFilters: IncidentFilters = { search: '', status: 'Tất cả', category: 'Tất cả', priority: 'Tất cả', fromDate: '', toDate: '' };
const statusMap: Record<AdminIncident['status'], Incident['status']> = { pending: 'Mới', assigned: 'Đã tiếp nhận', in_progress: 'Đang xử lý', completed: 'Hoàn tất', rejected: 'Từ chối' };
const priorityMap: Record<AdminIncident['priority'], Incident['priority']> = { low: 'Nhẹ', medium: 'Trung bình', high: 'Nghiêm trọng', critical: 'Khẩn cấp' };
const slaHoursByPriority: Record<AdminIncident['priority'], number> = { critical: 24, high: 48, medium: 72, low: 120 };

function isNearOrPastSla(item: Incident): boolean {
    if (item.status === 'Hoàn tất' || item.status === 'Từ chối') return false;
    const createdMs = parseDatabaseDateTime(item.rawCreatedAt).getTime();
    const targetHours = slaHoursByPriority[item.rawPriority] || 72;
    const remainingHours = (createdMs + targetHours * 3600_000 - Date.now()) / 3600_000;
    return remainingHours <= 12;
}

function mapIncident(item: AdminIncident): Incident {
    const date = new Date(item.created_at);
    return {
        id: `BC-${date.getFullYear()}-${String(item.id).padStart(4, '0')}`,
        databaseId: item.id,
        title: item.title,
        category: item.category_name || `Danh mục ${item.category_id}`,
        area: item.location_name || 'Chưa cập nhật',
        reporter: item.user_name || item.user_email || 'Không xác định',
        priority: priorityMap[item.priority] || 'Trung bình',
        status: statusMap[item.status] || 'Mới',
        assignee: item.assigned_technician || 'Chưa phân công',
        createdAt: date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }),
        rawCreatedAt: item.created_at,
        rawPriority: item.priority,
        isUnassigned: !item.assigned_to && !item.assigned_technician,
    };
}

export default function Incidents() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const canAssign = user.role === 'super_admin' || user.role === 'manager';
    const [searchParams, setSearchParams] = useSearchParams();
    const routeSearch = searchParams.get('search') || '';
    const routeQuick = (searchParams.get('quick') as 'all' | 'unassigned' | 'sla' | null) || 'all';
    const rawRouteStatus = searchParams.get('status') as AdminIncident['status'] | null;
    const rawRoutePriority = searchParams.get('priority') as AdminIncident['priority'] | null;
    const routeStatus: IncidentFilters['status'] = rawRouteStatus && statusMap[rawRouteStatus] ? statusMap[rawRouteStatus] : 'Tất cả';
    const routePriority: IncidentFilters['priority'] = rawRoutePriority && priorityMap[rawRoutePriority] ? priorityMap[rawRoutePriority] : 'Tất cả';
    const { categories: categoryData, error: categoryError } = useCategories();
    const categories = categoryData.filter((category) => category.is_active).map((category) => category.name);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [quickFilter, setQuickFilter] = useState<'all' | 'unassigned' | 'sla'>(routeQuick);
    const [filters, setFilters] = useState({ ...defaultFilters, search: routeSearch, status: routeStatus, priority: routePriority });
    const [appliedFilters, setAppliedFilters] = useState({ ...defaultFilters, search: routeSearch, status: routeStatus, priority: routePriority });
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
            const limit = quickFilter === 'all' ? 10 : 50;
            const response = await adminApi.getIncidents(nextPage, limit, status, priority, selectedCategoryId, appliedFilters.search, appliedFilters.fromDate, appliedFilters.toDate);
            setIncidents(response.data.map(mapIncident)); setTotal(response.pagination.total); setTotalPages(response.pagination.totalPages || 1);
        } catch (reason) { setError(reason instanceof Error ? reason.message : t('Không thể tải danh sách báo cáo.', 'Could not load incident reports.')); } finally { setLoading(false); }
    }, [appliedFilters, categoryData, page, quickFilter, t]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadIncidents(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadIncidents]);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setFilters((current) => ({ ...current, search: routeSearch, status: routeStatus, priority: routePriority }));
            setAppliedFilters((current) => ({ ...current, search: routeSearch, status: routeStatus, priority: routePriority }));
            setQuickFilter(routeQuick);
            setPage(1);
            setSelectedIds([]);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [routeSearch, routeQuick, routeStatus, routePriority]);

    const displayedIncidents = useMemo(() => {
        if (quickFilter === 'unassigned') return incidents.filter((item) => item.isUnassigned);
        if (quickFilter === 'sla') return incidents.filter(isNearOrPastSla);
        return incidents;
    }, [incidents, quickFilter]);

    const selectQuickFilter = (mode: 'all' | 'unassigned' | 'sla') => {
        setQuickFilter(mode);
        setPage(1);
        setSelectedIds([]);
        const nextParams = new URLSearchParams(searchParams);
        if (mode === 'all') nextParams.delete('quick');
        else nextParams.set('quick', mode);
        setSearchParams(nextParams, { replace: true });
    };

    const toggleIncident = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
    const toggleAll = () => setSelectedIds(displayedIncidents.every((incident) => selectedIds.includes(incident.id)) ? [] : displayedIncidents.map((incident) => incident.id));
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
            setAssignmentError(reason instanceof Error ? reason.message : t('Không thể tải danh sách nhân viên.', 'Could not load the staff list.'));
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
            setAssignmentError(t(`Đã phân công ${successCount}/${results.length} báo cáo; ${failedIncidents.length} báo cáo chưa cập nhật.`, `Assigned ${successCount} of ${results.length} reports; ${failedIncidents.length} could not be updated.`));
        } else {
            setAssignmentNotice(t(`Đã phân công ${successCount} báo cáo.`, `${successCount} reports assigned.`));
            setShowAssignmentForm(false);
            setAssignedStaffId('');
        }
        setAssigning(false);
    };

    const updateSelectedStatus = async () => {
        const selectedIncidents = incidents.filter((incident) => selectedIds.includes(incident.id));
        if (!statusTarget || !selectedIncidents.length) return;
        if (statusTarget === 'rejected' && !batchRejectionReason.trim()) {
            setStatusError(t('Vui lòng nhập lý do từ chối.', 'Please enter a rejection reason.'));
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
        if (failedIncidents.length) setStatusError(t(`Đã cập nhật ${successCount}/${results.length} báo cáo; ${failedIncidents.length} báo cáo chưa cập nhật.`, `Updated ${successCount} of ${results.length} reports; ${failedIncidents.length} could not be updated.`));
        else {
            setStatusNotice(t(`Đã cập nhật trạng thái ${successCount} báo cáo.`, `Updated the status of ${successCount} reports.`));
            setShowStatusForm(false);
            setStatusTarget('');
            setBatchRejectionReason('');
        }
        setUpdatingStatus(false);
    };

    return (
        <div className="space-y-6">
            <div><p className="text-sm font-medium text-neutral-500">{user.role === 'technician' ? t('Danh sách sự cố được phân công cho bạn', 'Incidents assigned to you') : t('Quản lý phản ánh từ người dân', 'Manage reports submitted by residents')}</p><h1 className="mt-1 text-2xl font-bold text-neutral-900">{user.role === 'technician' ? t('Sự Cố Được Giao', 'Assigned Incidents') : t('Danh Sách Báo Cáo', 'Incident Reports')}</h1><p className="mt-2 text-sm text-neutral-500">{t('Quản lý và xử lý phản ánh hạ tầng đô thị', 'Manage and resolve urban infrastructure reports')} · {total.toLocaleString('vi-VN')} {t('báo cáo', 'reports')}</p></div>
            <FilterBar filters={filters} categories={categories} onChange={setFilters} onFilter={applyFilters} />
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => selectQuickFilter('all')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${quickFilter === 'all' ? 'bg-primary text-white' : 'border border-slate-200 bg-white text-neutral-600 hover:border-primary'}`}
                >
                    {t('Tất cả báo cáo', 'All reports')}
                </button>
                {canAssign && (
                    <button
                        type="button"
                        onClick={() => selectQuickFilter('unassigned')}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${quickFilter === 'unassigned' ? 'bg-amber-600 text-white' : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
                    >
                        <AlertTriangle size={13} />
                        {t('Chưa phân công', 'Unassigned')}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => selectQuickFilter('sla')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${quickFilter === 'sla' ? 'bg-danger text-white' : 'border border-red-200 bg-red-50 text-danger hover:bg-red-100'}`}
                >
                    <Clock3 size={13} />
                    {t('Sắp quá hạn / Quá hạn SLA (≤ 12h)', 'Near / Past SLA (≤ 12h)')}
                </button>
            </div>
            {categoryError && <div role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{t('Không tải được danh mục để lọc:', 'Could not load categories for filtering:')} {categoryError}</div>}
            {canAssign && <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm font-medium text-neutral-500"><input type="checkbox" checked={displayedIncidents.length > 0 && displayedIncidents.every((incident) => selectedIds.includes(incident.id))} onChange={toggleAll} className="h-4 w-4 accent-primary" />{t('Chọn tất cả', 'Select all')}</label><div className="flex items-center gap-2"><span className="text-xs text-neutral-500">{selectedIds.length} {t('dòng đã chọn', 'selected')}</span><button type="button" disabled={!selectedIds.length || assigning} onClick={() => void openAssignment()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"><ClipboardList size={15} />{t('Phân Công', 'Assign')}</button><button type="button" disabled={!selectedIds.length || updatingStatus} onClick={() => { setShowStatusForm((visible) => !visible); setStatusError(''); setStatusNotice(''); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><CheckSquare size={15} />{t('Đổi Trạng Thái', 'Change Status')}</button></div></div>}
            {canAssign && showAssignmentForm && <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"><label className="min-w-56 flex-1 text-xs font-semibold text-neutral-600">{t('Nhân viên xử lý', 'Assigned staff')}<select value={assignedStaffId} onChange={(event) => setAssignedStaffId(event.target.value)} disabled={staffLoading || assigning} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900"><option value="">{staffLoading ? t('Đang tải nhân viên...', 'Loading staff...') : t('Chọn nhân viên', 'Select staff')}</option>{assignableStaff.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.username} ({person.is_online ? 'Online' : 'Offline'} · {person.active_count ?? 0} {t('việc đang xử lý', 'active')})</option>)}</select></label><button type="button" onClick={() => void assignSelected()} disabled={!assignedStaffId || !selectedIds.length || assigning || staffLoading} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{assigning ? t('Đang phân công...', 'Assigning...') : t(`Phân công ${selectedIds.length} báo cáo`, `Assign ${selectedIds.length} reports`)}</button><button type="button" onClick={() => setShowAssignmentForm(false)} disabled={assigning} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-neutral-600">{t('Hủy', 'Cancel')}</button></section>}
            {canAssign && showStatusForm && <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"><label className="min-w-56 flex-1 text-xs font-semibold text-neutral-600">{t('Trạng thái mới', 'New status')}<select value={statusTarget} onChange={(event) => { setStatusTarget(event.target.value); setStatusError(''); }} disabled={updatingStatus} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900"><option value="">{t('Chọn trạng thái', 'Select a status')}</option><option value="pending">{t('Mới', 'Pending')}</option><option value="assigned">{t('Đã tiếp nhận', 'Assigned')}</option><option value="in_progress">{t('Đang xử lý', 'In Progress')}</option><option value="rejected">{t('Từ chối', 'Rejected')}</option></select></label>{statusTarget === 'rejected' && <label className="min-w-64 flex-[2] text-xs font-semibold text-neutral-600">{t('Lý do từ chối', 'Rejection reason')} <span className="text-danger">*</span><textarea required value={batchRejectionReason} onChange={(event) => { setBatchRejectionReason(event.target.value); setStatusError(''); }} maxLength={1000} rows={2} disabled={updatingStatus} placeholder={t('Nhập lý do áp dụng cho các báo cáo đã chọn', 'Enter a reason for the selected reports')} className="mt-1.5 w-full resize-y rounded-lg border border-red-200 bg-red-50/40 p-3 text-sm font-normal text-neutral-900 outline-none focus:border-danger focus:ring-2 focus:ring-danger/20" /></label>}<button type="button" onClick={() => void updateSelectedStatus()} disabled={!statusTarget || (statusTarget === 'rejected' && !batchRejectionReason.trim()) || !selectedIds.length || updatingStatus} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{updatingStatus ? t('Đang cập nhật...', 'Updating...') : t(`Cập nhật ${selectedIds.length} báo cáo`, `Update ${selectedIds.length} reports`)}</button><button type="button" onClick={() => setShowStatusForm(false)} disabled={updatingStatus} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-neutral-600">{t('Hủy', 'Cancel')}</button></section>}
            {assignmentError && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{assignmentError}</div>}
            {assignmentNotice && <div role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-success">{assignmentNotice}</div>}
            {statusError && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{statusError}</div>}
            {statusNotice && <div role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-success">{statusNotice}</div>}
            {error ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : loading ? <div className="rounded-xl bg-white p-10 text-center text-sm text-neutral-500">Đang tải dữ liệu...</div> : <IncidentTable incidents={displayedIncidents} selectedIds={selectedIds} onToggle={toggleIncident} onToggleAll={toggleAll} selectable={canAssign} />}
            <Pagination page={page} totalPages={totalPages} totalItems={quickFilter === 'all' ? total : displayedIncidents.length} pageSize={quickFilter === 'all' ? 10 : 50} onPageChange={(nextPage) => { setPage(nextPage); setSelectedIds([]); }} />
        </div>
    );
}
