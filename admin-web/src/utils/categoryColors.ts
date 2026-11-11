const FALLBACK_PALETTE = [
    '#E11D48', // Rose Red
    '#0284C7', // Ocean Blue
    '#F59E0B', // Amber
    '#16A34A', // Emerald Green
    '#8B5CF6', // Violet
    '#EA580C', // Deep Orange
    '#0D9488', // Teal
    '#4F46E5', // Indigo
    '#DB2777', // Pink
    '#65A30D', // Lime
];

function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .trim();
}

export function getCategoryColor(
    categoryId?: number | null,
    categoryName?: string | null,
    customColor?: string | null
): string {
    if (customColor && /^#[0-9a-f]{3,8}$/i.test(customColor.trim())) {
        return customColor.trim();
    }

    if (categoryName) {
        const key = normalize(categoryName);
        if (key.includes('pothole') || key.includes('o ga') || key.includes('road damage') || key.includes('duong hong')) {
            return '#E11D48'; // Rose Red - Đường hỏng / Ổ gà
        }
        if (key.includes('streetlight') || key.includes('power') || key.includes('den') || key.includes('dien')) {
            return '#F59E0B'; // Amber - Đèn đường & Điện
        }
        if (key.includes('flood') || key.includes('wastewater') || key.includes('ngap') || key.includes('nuoc')) {
            return '#0284C7'; // Ocean Blue - Ngập nước & Nước thải
        }
        if (key.includes('drain') || key.includes('cong')) {
            return '#0D9488'; // Teal - Cống tắc
        }
        if (key.includes('waste') || key.includes('litter') || key.includes('rac')) {
            return '#8B5CF6'; // Violet - Rác thải
        }
        if (key.includes('tree') || key.includes('cay')) {
            return '#16A34A'; // Emerald Green - Cây cối
        }
        if (key.includes('traffic') || key.includes('tac duong') || key.includes('giao thong')) {
            return '#EA580C'; // Deep Orange - Tắc đường
        }
        if (key.includes('safety') || key.includes('an toan')) {
            return '#DC2626'; // Crimson - An toàn công cộng
        }
        if (key.includes('elevator') || key.includes('facility') || key.includes('thang may')) {
            return '#4F46E5'; // Indigo - Thang máy & Tiện ích
        }
    }

    const index = Math.abs(Number(categoryId || 0)) % FALLBACK_PALETTE.length;
    return FALLBACK_PALETTE[index];
}
