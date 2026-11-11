import { ClipboardCopy, Eye, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Incident } from '../pages/Incidents';
import { useLanguage } from '../context/LanguageContext';

interface IncidentTableProps {
    incidents: Incident[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    onToggleAll: () => void;
    selectable?: boolean;
}

const priorityClasses: Record<Incident['priority'], string> = {
    Nhẹ: 'bg-slate-100 text-neutral-500',
    'Trung bình': 'bg-blue-50 text-info',
    'Nghiêm trọng': 'bg-orange-50 text-warning',
    'Khẩn cấp': 'bg-red-50 text-danger',
};

const statusClasses: Record<Incident['status'], string> = {
    Mới: 'bg-blue-50 text-info',
    'Đã tiếp nhận': 'bg-blue-50 text-info',
    'Đang xử lý': 'bg-orange-50 text-warning',
    'Hoàn tất': 'bg-green-50 text-success',
    'Từ chối': 'bg-red-50 text-danger',
};

export default function IncidentTable({ incidents, selectedIds, onToggle, onToggleAll, selectable = true }: IncidentTableProps) {
    const { t } = useLanguage();
    const allSelected = incidents.length > 0 && incidents.every((incident) => selectedIds.includes(incident.id));
    const [openActionsFor, setOpenActionsFor] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [copyError, setCopyError] = useState('');

    async function copyIncidentId(incident: Incident) {
        try {
            await navigator.clipboard.writeText(incident.id);
            setCopiedId(incident.databaseId);
            setCopyError('');
        } catch {
            setCopyError('Không thể sao chép mã báo cáo trên trình duyệt này.');
        }
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {copyError && <p role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">{t(copyError, 'Could not copy the report ID in this browser.')}</p>}
            <table className="w-full min-w-[1280px] table-fixed text-left text-sm">
                <colgroup>{selectable && <col className="w-[48px]" />}<col className="w-[145px]" /><col className="w-[240px]" /><col className="w-[150px]" /><col className="w-[175px]" /><col className="w-[125px]" /><col className="w-[125px]" /><col className="w-[150px]" /><col className="w-[130px]" /><col className="w-[90px]" /></colgroup>
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-neutral-500"><tr>
                    {selectable && <th className="px-4 py-3"><input type="checkbox" checked={allSelected} onChange={onToggleAll} className="h-4 w-4 accent-primary" aria-label={t('Chọn tất cả báo cáo', 'Select all reports')} /></th>}
                    {['Mã|ID', 'Tiêu Đề|Title', 'Khu Vực|Area', 'Người Gửi|Reporter', 'Mức Độ|Priority', 'Trạng Thái|Status', 'Nhân Viên|Assignee', 'Ngày Tạo|Created', 'Hành Động|Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{t(...heading.split('|') as [string, string])}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                    {incidents.map((incident) => <tr key={incident.id} className="hover:bg-background">
                        {selectable && <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(incident.id)} onChange={() => onToggle(incident.id)} className="h-4 w-4 accent-primary" aria-label={`Chọn ${incident.id}`} /></td>}
                        <td className="px-4 py-4"><Link to={`/incidents/${incident.databaseId}`} className="font-semibold text-primary hover:underline">{incident.id}</Link></td>
                        <td className="px-4 py-4"><p className="truncate font-semibold text-neutral-900" title={incident.title}>{incident.title}</p></td>
                        <td className="px-4 py-4"><p className="truncate text-neutral-500" title={incident.area}>{incident.area}</p></td>
                        <td className="px-4 py-4"><p className="truncate text-neutral-500" title={incident.reporter}>{incident.reporter}</p></td>
                        <td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityClasses[incident.priority]}`}>{t(incident.priority, ({ 'Nhẹ': 'Low', 'Trung bình': 'Medium', 'Nghiêm trọng': 'High', 'Khẩn cấp': 'Critical' })[incident.priority])}</span></td>
                        <td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses[incident.status]}`}>{t(incident.status, ({ 'Mới': 'Pending', 'Đã tiếp nhận': 'Assigned', 'Đang xử lý': 'In Progress', 'Hoàn tất': 'Completed', 'Từ chối': 'Rejected' })[incident.status])}</span></td>
                        <td className="px-4 py-4 text-neutral-500">{incident.assignee}</td>
                        <td className="px-4 py-4 text-xs text-neutral-500">{incident.createdAt}</td>
                        <td className="px-4 py-4"><div className="relative flex items-center gap-1"><Link to={`/incidents/${incident.databaseId}`} className="rounded-md p-2 text-neutral-500 hover:bg-primary-light hover:text-primary" aria-label={t(`Xem ${incident.id}`, `View ${incident.id}`)}><Eye size={17} /></Link><button type="button" onClick={() => setOpenActionsFor((current) => current === incident.databaseId ? null : incident.databaseId)} className="rounded-md p-2 text-neutral-500 hover:bg-slate-100 hover:text-neutral-900" aria-label={t(`Thao tác cho ${incident.id}`, `Actions for ${incident.id}`)} aria-expanded={openActionsFor === incident.databaseId}><MoreVertical size={17} /></button>{openActionsFor === incident.databaseId && <div className="absolute right-0 top-full z-20 min-w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"><Link to={`/incidents/${incident.databaseId}`} onClick={() => setOpenActionsFor(null)} className="block rounded-md px-3 py-2 text-left text-xs font-medium text-neutral-700 hover:bg-slate-50">{t('Mở chi tiết', 'Open details')}</Link><button type="button" onClick={() => void copyIncidentId(incident)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-neutral-700 hover:bg-slate-50"><ClipboardCopy size={14} />{copiedId === incident.databaseId ? t('Đã sao chép mã', 'ID copied') : t('Sao chép mã', 'Copy ID')}</button></div>}</div></td>
                    </tr>)}
                </tbody>
            </table>
        </div>
    );
}
