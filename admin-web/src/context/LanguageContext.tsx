import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type AdminLanguage = 'vi' | 'en';

interface LanguageContextValue {
    language: AdminLanguage;
    setLanguage: (language: AdminLanguage) => void;
    toggleLanguage: () => void;
    t: (vi: string, en?: string) => string;
    translateCategory: (name?: string | null) => string;
}

const STORAGE_KEY = 'adminLanguage';

const categoryNames: Array<{ aliases: string[]; vi: string; en: string }> = [
    { aliases: ['road damage', 'đường hỏng', 'ổ gà'], vi: 'Đường hỏng & Ổ gà', en: 'Road Damage' },
    { aliases: ['streetlight & power', 'streetlight and power', 'mất điện', 'đèn đường'], vi: 'Đèn đường & Điện', en: 'Streetlight & Power' },
    { aliases: ['traffic congestion', 'tắc đường'], vi: 'Ùn tắc giao thông', en: 'Traffic Congestion' },
    { aliases: ['waste & litter', 'waste and litter', 'rác thải'], vi: 'Rác thải & Vệ sinh', en: 'Waste & Litter' },
    { aliases: ['public safety', 'an toàn công cộng'], vi: 'An toàn công cộng', en: 'Public Safety' },
    { aliases: ['fallen / damaged trees', 'fallen/damaged trees', 'cây cối'], vi: 'Cây xanh & Công viên', en: 'Fallen / Damaged Trees' },
    { aliases: ['flooding & wastewater', 'flooding and wastewater', 'nước thải', 'ngập nước'], vi: 'Ngập nước & Nước thải', en: 'Flooding & Wastewater' },
    { aliases: ['clogged drain', 'cống tắc'], vi: 'Cống tắc & Hố ga', en: 'Clogged Drain' },
    { aliases: ['public facility / elevator', 'public facility/elevator', 'thang máy'], vi: 'Tiện ích & Thang máy', en: 'Public Facility / Elevator' },
    { aliases: ['sidewalk & encroachment', 'sidewalk and encroachment', 'vỉa hè & lấn chiếm'], vi: 'Vỉa hè & Lấn chiếm', en: 'Sidewalk & Encroachment' },
    { aliases: ['traffic signals & signs', 'traffic signals and signs', 'biển báo & đèn tín hiệu'], vi: 'Biển báo & Tín hiệu', en: 'Traffic Signals & Signs' },
    { aliases: ['noise & air pollution', 'noise and air pollution', 'tiếng ồn & khói bụi'], vi: 'Tiếng ồn & Khói bụi', en: 'Noise & Air Pollution' },
    { aliases: ['overhead cables & wiring', 'overhead cables and wiring', 'dây cáp & dây điện'], vi: 'Dây cáp & Dây điện', en: 'Overhead Cables & Wiring' },
    { aliases: ['fire & emergency hazard', 'fire and emergency hazard', 'cháy nổ & khẩn cấp'], vi: 'Cháy nổ & Khẩn cấp', en: 'Fire & Emergency Hazard' },
    { aliases: ['other urban issues', 'other', 'khác', 'sự cố khác'], vi: 'Sự cố đô thị khác', en: 'Other Urban Issues' },
];

const englishLabels: Record<string, string> = {
    'Mới': 'Pending',
    'Đã tiếp nhận': 'Assigned',
    'Đang xử lý': 'In Progress',
    'Hoàn tất': 'Completed',
    'Từ chối': 'Rejected',
    'Thấp': 'Low',
    'Nhẹ': 'Low',
    'Trung bình': 'Medium',
    'Cao': 'High',
    'Nghiêm trọng': 'High',
    'Khẩn cấp': 'Critical',
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getStoredLanguage(): AdminLanguage {
    if (typeof window === 'undefined') return 'vi';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'vi';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<AdminLanguage>(getStoredLanguage);

    const setLanguage = useCallback((nextLanguage: AdminLanguage) => {
        window.localStorage.setItem(STORAGE_KEY, nextLanguage);
        setLanguageState(nextLanguage);
    }, []);

    const toggleLanguage = useCallback(() => {
        setLanguage(language === 'vi' ? 'en' : 'vi');
    }, [language, setLanguage]);

    const translateCategory = useCallback((name?: string | null) => {
        if (!name) return '';
        const normalized = name.trim().toLowerCase();
        const match = categoryNames.find((category) =>
            category.aliases.some((alias) => alias.toLowerCase() === normalized)
        );
        return match ? match[language] : name;
    }, [language]);

    const value = useMemo<LanguageContextValue>(() => ({
        language,
        setLanguage,
        toggleLanguage,
        t: (vi, en) => language === 'vi' ? vi : en || englishLabels[vi] || vi,
        translateCategory,
    }), [language, setLanguage, toggleLanguage, translateCategory]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within a LanguageProvider.');
    return context;
}
