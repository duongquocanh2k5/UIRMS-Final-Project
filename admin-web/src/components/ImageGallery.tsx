import { ImagePlus, X } from 'lucide-react';
import { useState } from 'react';
import type { AdminIncidentImage } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface ImageGalleryProps {
    images: AdminIncidentImage[];
    canUploadAfter: boolean;
    uploadingAfter: boolean;
    uploadError: string;
    onUploadAfter: (file: File) => Promise<void>;
}

export default function ImageGallery({ images, canUploadAfter, uploadingAfter, uploadError, onUploadAfter }: ImageGalleryProps) {
    const { language, t } = useLanguage();
    const [selectedImage, setSelectedImage] = useState<AdminIncidentImage | null>(null);
    const beforeImages = images.filter((image) => image.is_before);
    const afterImages = images.filter((image) => !image.is_before);

    function renderImages(group: AdminIncidentImage[], label: string, badgeLabel: string, badgeClass: string) {
        return <div>
            <h3 className="text-sm font-semibold text-neutral-700">{label} ({group.length})</h3>
            {group.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{group.map((image) => <button key={image.id} type="button" onClick={() => setSelectedImage(image)} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100"><img src={image.image_url} alt={t(label, label === 'Trước xử lý' ? 'Before resolution' : 'After resolution')} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /><span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow ${badgeClass}`}>{t(badgeLabel, badgeLabel === 'Nghiệm thu' ? 'Verified' : badgeLabel === 'Trước xử lý' ? 'Before resolution' : 'After resolution')}</span><time className="absolute inset-x-0 bottom-0 bg-slate-950/65 px-2 py-1 text-left text-[10px] text-white">{new Date(image.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</time></button>)}</div> : <p className="mt-2 rounded-lg bg-slate-50 px-3 py-4 text-sm text-neutral-500">{t('Chưa có ảnh.', 'No images available.')}</p>}
        </div>;
    }

    return (
        <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold text-neutral-900">{t('Minh Chứng Hiện Trường', 'Field Evidence')}</h2><p className="mt-1 text-xs text-neutral-500">{t('Ảnh tiếp nhận và ảnh nghiệm thu sau xử lý', 'Intake photos and post-resolution verification photos')}</p></div>{canUploadAfter && <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${uploadingAfter ? 'cursor-wait bg-primary/60' : 'bg-primary hover:bg-primary/90'}`}><ImagePlus size={16} />{uploadingAfter ? t('Đang tải ảnh...', 'Uploading image...') : t('Tải ảnh sau xử lý', 'Upload resolution photo')}<input type="file" accept="image/*" className="sr-only" disabled={uploadingAfter} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUploadAfter(file); event.currentTarget.value = ''; }} /></label>}</div>
                {uploadError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{uploadError}</p>}
                <div className="mt-5 grid gap-6 lg:grid-cols-2">
                    {renderImages(beforeImages, 'Trước xử lý', 'Trước xử lý', 'bg-orange-500')}
                    {renderImages(afterImages, 'Sau xử lý', 'Nghiệm thu', 'bg-green-600')}
                </div>
            </section>
            {selectedImage && <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/90 p-8" role="dialog" aria-modal="true" aria-label={t('Xem ảnh hiện trường', 'View field photo')} onClick={() => setSelectedImage(null)}><button type="button" onClick={() => setSelectedImage(null)} className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label={t('Đóng ảnh', 'Close image')}><X size={22} /></button><img src={selectedImage.image_url} alt={t('Ảnh hiện trường phóng to', 'Enlarged field photo')} className="max-h-[75vh] max-w-[90vw] rounded-xl object-contain" onClick={(event) => event.stopPropagation()} /><div className="text-center text-white"><p className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${selectedImage.is_before ? 'bg-orange-500' : 'bg-green-600'}`}>{selectedImage.is_before ? t('Trước xử lý', 'Before resolution') : t('Sau xử lý', 'After resolution')}</p><time className="mt-2 block text-sm text-slate-200">{new Date(selectedImage.created_at).toLocaleString('vi-VN')}</time></div></div>}
        </>
    );
}
