interface StaffAvatarProps {
    name: string;
    url: string | null;
    size?: 'small' | 'large';
}

export function Avatar({ name, url, size = 'small' }: StaffAvatarProps) {
    const dimensions = size === 'large' ? 'h-20 w-20 text-xl' : 'h-10 w-10 text-sm';
    return url
        ? <img src={url} alt="" className={`${dimensions} shrink-0 rounded-full bg-slate-100 object-cover`} />
        : <div className={`${dimensions} flex shrink-0 items-center justify-center rounded-full bg-primary-light font-bold text-primary`} aria-hidden="true">{name.trim().charAt(0).toUpperCase() || '?'}</div>;
}