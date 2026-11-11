import { useState, type FormEvent } from 'react';
import type { AdminCategory, CategoryPayload } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface CategoryModalProps {
    category?: AdminCategory | null;
    saving: boolean;
    onClose: () => void;
    onSave: (payload: CategoryPayload) => Promise<void>;
}

const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

export default function CategoryModal({ category, saving, onClose, onSave }: CategoryModalProps) {
    const { t } = useLanguage();
    const [name, setName] = useState(category?.name ?? '');
    const [icon, setIcon] = useState(category?.icon ?? '📌');
    const [color, setColor] = useState(category?.color ?? category?.color_code ?? '#0A9E96');
    const [error, setError] = useState('');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        try {
            await onSave({ name: name.trim(), icon: icon.trim() || null, color: color || null });
            onClose();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : t('Không thể lưu danh mục.', 'Could not save category.'));
        }
    }

    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="category-modal-title" className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-5"><h2 id="category-modal-title" className="text-lg font-bold text-neutral-900">{category ? t('Sửa Danh Mục', 'Edit Category') : t('Thêm Danh Mục', 'Add Category')}</h2><p className="mt-1 text-sm text-neutral-500">{t('Thiết lập tên, biểu tượng và màu nhận diện', 'Set the category name, icon, and display color')}</p></div>
            <form onSubmit={submit} className="space-y-4 px-6 py-5">
                {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
                <label className="block text-xs font-semibold text-neutral-600">{t('Tên danh mục', 'Category name')}<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
                <label className="block text-xs font-semibold text-neutral-600">{t('Biểu tượng', 'Icon')}<input maxLength={10} value={icon} onChange={(event) => setIcon(event.target.value)} className={`${inputClass} text-lg`} placeholder={t('Nhập emoji hoặc ký tự', 'Enter an emoji or character')} /></label>
                <label className="block text-xs font-semibold text-neutral-600">{t('Màu sắc', 'Color')}<div className="mt-1.5 flex items-center gap-3"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-11 w-14 cursor-pointer rounded-md border border-slate-200 bg-white p-1" /><span className="font-mono text-sm font-semibold uppercase text-neutral-700">{color}</span></div></label>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-slate-50">{t('Hủy', 'Cancel')}</button><button type="submit" disabled={saving || !name.trim()} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? t('Đang lưu...', 'Saving...') : t('Lưu danh mục', 'Save Category')}</button></div>
            </form>
        </section>
    </div>;
}