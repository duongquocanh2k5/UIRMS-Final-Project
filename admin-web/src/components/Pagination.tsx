import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
    const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
        <div className="flex items-center justify-between gap-4 px-1 py-4">
            <p className="text-sm text-neutral-500">Hiển thị <span className="font-semibold text-neutral-900">{start}-{end}</span> của <span className="font-semibold text-neutral-900">{totalItems.toLocaleString('vi-VN')}</span> kết quả</p>
            <nav className="flex items-center gap-1" aria-label="Phân trang">
                <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-neutral-500 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} />Trước</button>
                {pages.map((pageNumber) => <button key={pageNumber} type="button" onClick={() => onPageChange(pageNumber)} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold ${page === pageNumber ? 'bg-primary text-white' : 'text-neutral-500 hover:bg-white'}`} aria-current={page === pageNumber ? 'page' : undefined}>{pageNumber}</button>)}
                <button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-neutral-500 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">Sau<ChevronRight size={14} /></button>
            </nav>
        </div>
    );
}
