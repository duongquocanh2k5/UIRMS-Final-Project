interface SettingsAvatarProps {
    name: string;
    url?: string | null;
}

export default function SettingsAvatar({ name, url }: SettingsAvatarProps) {
    return url
        ? <img src={url} alt="Ảnh đại diện" className="h-24 w-24 shrink-0 rounded-full border-4 border-white bg-slate-100 object-cover shadow-sm" />
        : <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-primary-light text-2xl font-bold text-primary shadow-sm" aria-label={`Ảnh đại diện ${name}`}>{name.trim().charAt(0).toUpperCase() || '?'}</div>;
}