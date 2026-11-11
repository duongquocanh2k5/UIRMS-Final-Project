import { Eye } from 'lucide-react';
import Pagination from './Pagination';
import { Avatar } from './StaffAvatar';
import { roleLabels } from './staff.constants';
import type { StaffListItem } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface StaffTableProps {
    staff: StaffListItem[];
    loading: boolean;
    error: string;
    page: number;
    total: number;
    totalPages: number;
    pageSize: number;
    selectedStaffId: number | null;
    onSelect: (staffId: number) => void;
    onPageChange: (page: number) => void;
    onRetry: () => void;
}

export default function StaffTable({ staff, loading, error, page, total, totalPages, pageSize, selectedStaffId, onSelect, onPageChange, onRetry }: StaffTableProps) {
    const { t } = useLanguage();
    const displayRole = (role: keyof typeof roleLabels) => t(roleLabels[role], role === 'manager' ? 'Manager' : 'Technician');
    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-neutral-900">{t('Danh sách nhân sự hiện tại', 'Current Staff')}</h2>
                <p className="mt-1 text-xs text-neutral-500">{t('Nhân viên đang tham gia tiếp nhận và xử lý sự cố', 'Staff handling incident intake and response')}</p>
            </div>
            {loading ? (
                <div className="space-y-3 p-5" aria-label={t('Đang tải danh sách nhân viên', 'Loading staff list')} aria-busy="true">
                    {[0, 1, 2, 3, 4].map((row) => <div key={row} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
                </div>
            ) : error ? (
                <div role="alert" className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-danger">
                    <p>{t('Không thể tải danh sách:', 'Could not load list:')} {error}</p>
                    <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">{t('Thử lại', 'Retry')}</button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
                        <colgroup><col className="w-[220px]" /><col className="w-[145px]" /><col className="w-[180px]" /><col className="w-[150px]" /><col className="w-[125px]" /><col className="w-[125px]" /><col className="w-[145px]" /><col className="w-[90px]" /></colgroup>
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-neutral-500">
                            <tr>{['Họ Tên|Name', 'Vai Trò|Role', 'Đơn Vị|Department', 'Số Điện Thoại|Phone', 'Đang Xử Lý|In Progress', 'Đã Hoàn Tất|Completed', 'Trạng Thái|Status', 'Hành Động|Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{t(...heading.split('|') as [string, string])}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {staff.map((person) => <tr
                                key={person.id}
                                onClick={() => onSelect(person.id)}
                                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(person.id); } }}
                                tabIndex={0}
                                aria-selected={selectedStaffId === person.id}
                                className={`cursor-pointer transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${selectedStaffId === person.id ? 'bg-primary-light/70' : ''}`}
                            >
                                <td className="px-4 py-3"><div className="flex min-w-0 items-center gap-3"><Avatar name={person.name} url={person.avatar_url} /><div className="min-w-0"><p className="truncate font-semibold text-neutral-900">{person.name}</p><p className="mt-0.5 text-xs text-neutral-500">{displayRole(person.role)}</p></div></div></td>
                                <td className="px-4 py-3 text-neutral-600">{displayRole(person.role)}</td>
                                <td className="px-4 py-3"><span className="block truncate text-neutral-600" title={person.department || undefined}>{person.department || t('Chưa phân đơn vị', 'Not assigned')}</span></td>
                                <td className="px-4 py-3 text-neutral-600">{person.phone || t('Chưa cập nhật', 'Not provided')}</td>
                                <td className="px-4 py-3"><span className="inline-flex min-w-8 justify-center rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-warning">{person.inProgressCount}</span></td>
                                <td className="px-4 py-3"><span className="inline-flex min-w-8 justify-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-success">{person.completedCount}</span></td>
                                <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${person.is_active ? 'bg-green-50 text-success' : 'bg-slate-100 text-neutral-500'}`}>{person.is_active ? t('Đang làm việc', 'Active') : t('Nghỉ', 'Inactive')}</span></td>
                                <td className="px-4 py-3"><button type="button" onClick={(event) => { event.stopPropagation(); onSelect(person.id); }} className="rounded-md p-2 text-neutral-500 hover:bg-primary-light hover:text-primary" aria-label={t(`Xem hồ sơ ${person.name}`, `View profile for ${person.name}`)}><Eye size={17} /></button></td>
                            </tr>)}
                            {!staff.length && <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-neutral-500">{t('Chưa có nhân viên trong hệ thống.', 'No staff members found.')}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
            {!loading && !error && <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} onPageChange={onPageChange} />}
        </section>
    );
}