import { Eye, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Incident } from '../pages/Incidents';

interface IncidentTableProps {
    incidents: Incident[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    onToggleAll: () => void;
}

const priorityClasses: Record<Incident['priority'], string> = {
    Nhẹ: 'bg-slate-100 text-neutral-500',
    'Trung bình': 'bg-blue-50 text-info',
    'Nghiêm trọng': 'bg-orange-50 text-warning',
    'Khẩn cấp': 'bg-red-50 text-danger',
};

const statusClasses: Record<Incident['status'], string> = {
    Mới: 'bg-blue-50 text-info',
    'Đang xử lý': 'bg-orange-50 text-warning',
    'Hoàn tất': 'bg-green-50 text-success',
};

export default function IncidentTable({ incidents, selectedIds, onToggle, onToggleAll }: IncidentTableProps) {
    const allSelected = incidents.length > 0 && incidents.every((incident) => selectedIds.includes(incident.id));

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[1280px] table-fixed text-left text-sm">
                <colgroup><col className="w-[48px]" /><col className="w-[145px]" /><col className="w-[240px]" /><col className="w-[150px]" /><col className="w-[175px]" /><col className="w-[125px]" /><col className="w-[125px]" /><col className="w-[150px]" /><col className="w-[130px]" /><col className="w-[90px]" /></colgroup>
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-neutral-500"><tr>
                    <th className="px-4 py-3"><input type="checkbox" checked={allSelected} onChange={onToggleAll} className="h-4 w-4 accent-primary" aria-label="Chọn tất cả báo cáo" /></th>
                    {['Mã', 'Tiêu Đề', 'Khu Vực', 'Người Gửi', 'Mức Độ', 'Trạng Thái', 'Nhân Viên', 'Ngày Tạo', 'Hành Động'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                    {incidents.map((incident) => <tr key={incident.id} className="hover:bg-background">
                        <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(incident.id)} onChange={() => onToggle(incident.id)} className="h-4 w-4 accent-primary" aria-label={`Chọn ${incident.id}`} /></td>
                        <td className="px-4 py-4"><Link to={`/incidents/${incident.databaseId}`} className="font-semibold text-primary hover:underline">{incident.id}</Link></td>
                        <td className="px-4 py-4"><p className="truncate font-semibold text-neutral-900" title={incident.title}>{incident.title}</p></td>
                        <td className="px-4 py-4"><p className="truncate text-neutral-500" title={incident.area}>{incident.area}</p></td>
                        <td className="px-4 py-4"><p className="truncate text-neutral-500" title={incident.reporter}>{incident.reporter}</p></td>
                        <td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityClasses[incident.priority]}`}>{incident.priority}</span></td>
                        <td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses[incident.status]}`}>{incident.status}</span></td>
                        <td className="px-4 py-4 text-neutral-500">{incident.assignee}</td>
                        <td className="px-4 py-4 text-xs text-neutral-500">{incident.createdAt}</td>
                        <td className="px-4 py-4"><div className="flex items-center gap-1"><Link to={`/incidents/${incident.databaseId}`} className="rounded-md p-2 text-neutral-500 hover:bg-primary-light hover:text-primary" aria-label={`Xem ${incident.id}`}><Eye size={17} /></Link><button type="button" className="rounded-md p-2 text-neutral-500 hover:bg-slate-100 hover:text-neutral-900" aria-label={`Thêm thao tác cho ${incident.id}`}><MoreVertical size={17} /></button></div></td>
                    </tr>)}
                </tbody>
            </table>
        </div>
    );
}
