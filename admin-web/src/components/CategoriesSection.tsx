import { CircleAlert, Edit2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CategoryModal from './CategoryModal';
import { useCategories } from '../hooks/useCategories';
import type { AdminCategory, CategoryPayload } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function CategoriesSection() {
    const { t, translateCategory } = useLanguage();
    const categoriesState = useCategories();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);

    function openCreate() {
        categoriesState.clearActionError();
        setEditingCategory(null);
        setModalOpen(true);
    }

    function openEdit(category: AdminCategory) {
        categoriesState.clearActionError();
        setEditingCategory(category);
        setModalOpen(true);
    }

    async function saveCategory(payload: CategoryPayload) {
        if (editingCategory) await categoriesState.updateCategory(editingCategory.id, payload);
        else await categoriesState.createCategory(payload);
    }

    async function deleteCategory(category: AdminCategory) {
        if (category.reportCount > 0) return;
        if (!window.confirm(t(`Bạn có chắc muốn xóa danh mục “${category.name}” không?`, `Are you sure you want to delete the “${category.name}” category?`))) return;
        try { await categoriesState.deleteCategory(category.id); }
        catch { /* The hook keeps the API error visible in this section. */ }
    }

    return <section id="settings-categories" className="scroll-mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div><h2 className="text-base font-bold text-neutral-900">{t('Danh Mục Sự Cố', 'Incident Categories')}</h2><p className="mt-1 text-xs text-neutral-500">{t('Quản lý tên, biểu tượng và màu nhận diện', 'Manage names, icons, and display colors')}</p></div>
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary/90"><Plus size={16} />{t('Thêm Danh Mục', 'Add Category')}</button>
        </div>
        <div className="p-5">
            {categoriesState.actionError && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-danger">{categoriesState.actionError}</div>}
            {categoriesState.loading ? <div className="space-y-3" aria-label={t('Đang tải danh mục', 'Loading categories')} aria-busy="true">{[0, 1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
                : categoriesState.error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-danger">{t('Không thể tải danh mục:', 'Could not load categories:')} {categoriesState.error}<button type="button" onClick={categoriesState.refresh} className="ml-3 font-semibold underline">{t('Thử lại', 'Retry')}</button></div>
                    : <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-neutral-500"><tr>{['Icon|Icon', 'Tên Danh Mục|Category', 'Màu Sắc|Color', 'Số Báo Cáo|Reports', 'Hành Động|Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{t(...heading.split('|') as [string, string])}</th>)}</tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {categoriesState.categories.map((category) => {
                                    const color = category.color || category.color_code || '#0A9E96';
                                    return <tr key={category.id} className="hover:bg-background">
                                        <td className="px-4 py-3 text-2xl">{category.icon || '📌'}</td>
                                        <td className="px-4 py-3 font-semibold text-neutral-900">{translateCategory(category.name)}</td>
                                        <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><span className="h-5 w-5 rounded border border-black/10" style={{ backgroundColor: color }} /><span className="font-mono text-xs uppercase text-neutral-600">{color}</span></span></td>
                                        <td className="px-4 py-3"><span className="inline-flex min-w-8 justify-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-info">{category.reportCount.toLocaleString('vi-VN')}</span></td>
                                        <td className="px-4 py-3"><div className="flex items-center gap-1"><button type="button" onClick={() => openEdit(category)} className="rounded-md p-2 text-neutral-500 hover:bg-primary-light hover:text-primary" aria-label={t(`Sửa danh mục ${category.name}`, `Edit category ${category.name}`)}><Edit2 size={16} /></button><button type="button" onClick={() => void deleteCategory(category)} disabled={category.reportCount > 0 || categoriesState.deletingId === category.id} title={category.reportCount > 0 ? t('Không thể xóa danh mục đang được báo cáo sử dụng', 'This category cannot be deleted while reports use it') : t('Xóa danh mục', 'Delete category')} className="rounded-md p-2 text-neutral-500 hover:bg-red-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40" aria-label={t(`Xóa danh mục ${category.name}`, `Delete category ${category.name}`)}><Trash2 size={16} /></button>{category.reportCount > 0 && <span className="sr-only">{t(`Đang có ${category.reportCount} báo cáo sử dụng`, `Used by ${category.reportCount} reports`)}</span>}</div></td>
                                    </tr>;
                                })}
                                {!categoriesState.categories.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-neutral-500">{t('Chưa có danh mục sự cố.', 'No incident categories yet.')}</td></tr>}
                            </tbody>
                        </table>
                    </div>}
        </div>
        {categoriesState.deletingId !== null && <p className="sr-only" role="status"><CircleAlert size={14} />{t('Đang xóa danh mục...', 'Deleting category...')}</p>}
        {modalOpen && <CategoryModal category={editingCategory} saving={categoriesState.saving} onClose={() => setModalOpen(false)} onSave={saveCategory} />}
    </section>;
}