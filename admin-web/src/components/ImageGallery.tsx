import { X } from 'lucide-react';
import { useState } from 'react';

interface ImageGalleryProps {
    images: string[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    return (
        <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-neutral-900">Hình Ảnh Hiện Trường ({images.length})</h2>
                <div className="mt-4 grid grid-cols-3 gap-3">
                    {images.map((image) => <button key={image} type="button" onClick={() => setSelectedImage(image)} className="group aspect-[4/3] overflow-hidden rounded-lg bg-slate-100"><img src={image} alt="Ảnh hiện trường" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /></button>)}
                </div>
            </section>
            {selectedImage && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-8" role="dialog" aria-modal="true" aria-label="Xem ảnh hiện trường" onClick={() => setSelectedImage(null)}><button type="button" onClick={() => setSelectedImage(null)} className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Đóng ảnh"><X size={22} /></button><img src={selectedImage} alt="Ảnh hiện trường phóng to" className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain" onClick={(event) => event.stopPropagation()} /></div>}
        </>
    );
}
