import { Activity, BriefcaseBusiness, UserRoundPlus, Users } from 'lucide-react';
import { useState } from 'react';
import AddStaffModal from '../components/AddStaffModal';
import StaffDetailPanel from '../components/StaffDetailPanel';
import StaffTable from '../components/StaffTable';
import { useStaffDetail, useStaffList } from '../hooks/useStaffData';
import { adminApi, type CreateStaffPayload } from '../services/api';

const PAGE_SIZE = 10;

function KpiCard({ title, value, description, icon: Icon, tone }: {
    title: string;
    value: string;
    description: string;
    icon: typeof Users;
    tone: string;
}) {
    return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><div className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}><Icon size={21} /></div><div className="min-w-0"><p className="text-xs font-medium text-neutral-500">{title}</p><p className="mt-1 truncate text-2xl font-bold text-neutral-900">{value}</p><p className="mt-1 truncate text-xs text-neutral-500">{description}</p></div></div></article>;
}

export default function Staff() {
    const [page, setPage] = useState(1);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const { staff, total, totalPages, summary, loading, error, summaryError, refresh } = useStaffList(page, PAGE_SIZE);
    const detail = useStaffDetail(selectedStaffId);

    async function createStaff(payload: CreateStaffPayload) {
        const response = await adminApi.createStaff(payload);
        setPage(1);
        refresh();
        setSelectedStaffId(response.data.id);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-sm font-medium text-neutral-500">Quản lý nhân sự tiếp nhận và xử lý sự cố</p><h1 className="mt-1 text-2xl font-bold text-neutral-900">Quản Lý Nhân Viên</h1></div>
                <button type="button" onClick={() => setAddModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"><UserRoundPlus size={17} />Thêm Nhân Viên</button>
            </div>

            {summaryError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">Không thể tải KPI nhân viên: {summaryError}</div>}
            <section className="grid gap-4 md:grid-cols-3">
                {summary ? <>
                    <KpiCard title="Tổng Nhân Viên" value={summary.totalStaff.toLocaleString('vi-VN')} description="Kỹ thuật viên trong hệ thống" icon={Users} tone="bg-blue-50 text-info" />
                    <KpiCard title="Đang Hoạt Động" value={summary.activeStaff.toLocaleString('vi-VN')} description="Kỹ thuật viên đang làm việc" icon={Activity} tone="bg-green-50 text-success" />
                    <KpiCard title="Đội Nhiều Việc Nhất" value={summary.busiestDepartment.name} description={`${summary.busiestDepartment.activeCount.toLocaleString('vi-VN')} sự cố đang xử lý`} icon={BriefcaseBusiness} tone="bg-orange-50 text-warning" />
                </> : <>{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</>}
            </section>

            <StaffTable
                staff={staff}
                loading={loading}
                error={error}
                page={page}
                total={total}
                totalPages={totalPages}
                pageSize={PAGE_SIZE}
                selectedStaffId={selectedStaffId}
                onSelect={setSelectedStaffId}
                onPageChange={setPage}
                onRetry={refresh}
            />

            {selectedStaffId !== null && <StaffDetailPanel staff={detail.staff} loading={detail.loading} error={detail.error} onRetry={detail.refresh} />}
            {addModalOpen && <AddStaffModal onClose={() => setAddModalOpen(false)} onCreate={createStaff} />}
        </div>
    );
}