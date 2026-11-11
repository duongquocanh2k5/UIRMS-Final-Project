const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function parseDatabaseDateTime(value: string): Date {
    const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
    const normalized = hasTimeZone ? value : `${value.replace(' ', 'T')}Z`;
    return new Date(normalized);
}

export function formatVietnamDateTime(value: string): string {
    return parseDatabaseDateTime(value).toLocaleString('vi-VN', {
        timeZone: VIETNAM_TIME_ZONE,
    });
}
