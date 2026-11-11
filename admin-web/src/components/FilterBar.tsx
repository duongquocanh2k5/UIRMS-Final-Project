import { Filter, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type IncidentStatusLabel = 'Mới' | 'Đã tiếp nhận' | 'Đang xử lý' | 'Hoàn tất' | 'Từ chối';

export interface IncidentFilters {
    search: string;
    status: 'Tất cả' | IncidentStatusLabel;
    category: string;
    priority: string;
    fromDate: string;
    toDate: string;
}

interface FilterBarProps {
    filters: IncidentFilters;
    categories: string[];
    onChange: (filters: IncidentFilters) => void;
    onFilter: () => void;
}

export default function FilterBar({ filters, categories, onChange, onFilter }: FilterBarProps) {
    const { t, translateCategory } = useLanguage();
    const updateFilter = (field: keyof IncidentFilters, value: string) => {
        onChange({ ...filters, [field]: value });
    };
    const statusLabels: Record<IncidentStatusLabel, string> = {
        'Mới': t('Mới', 'Pending'),
        'Đã tiếp nhận': t('Đã tiếp nhận', 'Assigned'),
        'Đang xử lý': t('Đang xử lý', 'In Progress'),
        'Hoàn tất': t('Hoàn tất', 'Completed'),
        'Từ chối': t('Từ chối', 'Rejected'),
    };
    const priorityLabels: Record<string, string> = {
        'Nhẹ': t('Nhẹ', 'Low'),
        'Trung bình': t('Trung bình', 'Medium'),
        'Nghiêm trọng': t('Nghiêm trọng', 'High'),
        'Khẩn cấp': t('Khẩn cấp', 'Critical'),
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-[minmax(240px,1.5fr)_minmax(150px,1fr)_minmax(170px,1fr)_minmax(150px,1fr)_minmax(145px,1fr)_minmax(145px,1fr)_auto] items-end gap-3">
                <label className="block min-w-0">
                    <span className="mb-1.5 block text-xs font-semibold text-neutral-500">{t('Tìm kiếm', 'Search')}</span>
                    <span className="relative block">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder={t('Mã, tiêu đề...', 'ID, title...')} className="h-10 w-full rounded-lg border border-slate-200 bg-background pl-9 pr-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    </span>
                </label>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-neutral-500">{t('Trạng thái', 'Status')}</span><select value={filters.status} onChange={(event) => updateFilter('status', event.target.value as IncidentFilters['status'])} className="h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900 outline-none focus:border-primary"><option value="Tất cả">{t('Tất cả', 'All')}</option>{(['Mới', 'Đã tiếp nhận', 'Đang xử lý', 'Hoàn tất', 'Từ chối'] as const).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-neutral-500">{t('Danh mục', 'Category')}</span><select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900 outline-none focus:border-primary"><option value="Tất cả">{t('Tất cả', 'All')}</option>{categories.map((category) => <option key={category} value={category}>{translateCategory(category)}</option>)}</select></label>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-neutral-500">{t('Mức độ', 'Priority')}</span><select value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900 outline-none focus:border-primary"><option value="Tất cả">{t('Tất cả', 'All')}</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-neutral-500">{t('Từ ngày', 'From date')}</span><input type="date" value={filters.fromDate} onChange={(event) => updateFilter('fromDate', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900 outline-none focus:border-primary" /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-neutral-500">{t('Đến ngày', 'To date')}</span><input type="date" value={filters.toDate} onChange={(event) => updateFilter('toDate', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900 outline-none focus:border-primary" /></label>
                <button type="button" onClick={onFilter} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90"><Filter size={16} />{t('Lọc', 'Filter')}</button>
            </div>
        </div>
    );
}
