import { CheckCircle2, KeyRound, RefreshCw, Save, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import SettingsAvatar from './SettingsAvatar';
import type { AdminProfile, UpdateAdminProfilePayload } from '../services/api';

interface AccountSettingsState {
    profile: AdminProfile | null;
    loading: boolean;
    loadError: string;
    profileSaving: boolean;
    profileMessage: string;
    profileSaveError: string;
    passwordSaving: boolean;
    passwordMessage: string;
    passwordError: string;
    saveProfile: (payload: UpdateAdminProfilePayload) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    refresh: () => void;
}

interface AccountSectionProps {
    settings: AccountSettingsState;
}

function ProfileCard({ profile, settings }: { profile: AdminProfile; settings: AccountSettingsState }) {
    const [name, setName] = useState(profile.name);
    const [phone, setPhone] = useState(profile.phone ?? '');
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        try {
            await settings.saveProfile({ name: name.trim(), phone: phone.trim() || null, avatar_url: avatarUrl.trim() || null });
        } catch {
            // The hook retains and displays the API error.
        }
    }

    return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><UserRound size={18} className="text-primary" /><h2 className="text-base font-bold text-neutral-900">Thông Tin Cá Nhân</h2></div>
        <form onSubmit={submit} className="mt-5">
            <div className="grid gap-6 lg:grid-cols-[132px_minmax(0,1fr)]">
                <div className="flex flex-col items-center gap-3"><SettingsAvatar name={name} url={avatarUrl || null} /><span className={`rounded-full px-3 py-1 text-xs font-semibold ${profile.is_active ? 'bg-green-50 text-success' : 'bg-slate-100 text-neutral-500'}`}>{profile.is_active ? 'Đang hoạt động' : 'Tạm khóa'}</span></div>
                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-neutral-600">Họ và tên<input required minLength={2} maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
                    <label className="text-xs font-semibold text-neutral-600">Email<input readOnly value={profile.email} className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-neutral-500" /></label>
                    <div className="text-xs font-semibold text-neutral-600">Vai trò<div className="mt-1.5"><span className="inline-flex rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-info">{profile.role === 'super_admin' ? 'Quản trị viên cấp cao' : profile.role === 'manager' ? 'Điều phối viên' : 'Kỹ thuật viên'}</span></div></div>
                    <label className="text-xs font-semibold text-neutral-600">Số điện thoại<input maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Chưa cập nhật" /></label>
                    <label className="text-xs font-semibold text-neutral-600 sm:col-span-2">Đường dẫn ảnh đại diện<input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="https://..." /></label>
                </div>
            </div>
            {settings.profileMessage && <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 size={16} />{settings.profileMessage}</p>}
            {settings.profileSaveError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{settings.profileSaveError}</p>}
            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4"><button type="submit" disabled={settings.profileSaving || !name.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-wait disabled:opacity-50"><Save size={16} />{settings.profileSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</button></div>
        </form>
    </section>;
}

function PasswordCard({ settings }: { settings: AccountSettingsState }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [validationError, setValidationError] = useState('');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setValidationError('');
        if (newPassword !== confirmation) {
            setValidationError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
            return;
        }
        try {
            await settings.changePassword(currentPassword, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmation('');
        } catch {
            // The hook retains and displays the API error.
        }
    }

    return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><KeyRound size={18} className="text-primary" /><h2 className="text-base font-bold text-neutral-900">Đổi Mật Khẩu</h2></div>
        <p className="mt-1 text-sm text-neutral-500">Chọn mật khẩu mạnh và không dùng lại mật khẩu cũ</p>
        <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="text-xs font-semibold text-neutral-600">Mật khẩu hiện tại<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            <label className="text-xs font-semibold text-neutral-600">Mật khẩu mới<input required type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            <label className="text-xs font-semibold text-neutral-600">Xác nhận mật khẩu mới<input required type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            {(validationError || settings.passwordError) && <p role="alert" className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{validationError || settings.passwordError}</p>}
            {settings.passwordMessage && <p role="status" className="md:col-span-3 flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 size={16} />{settings.passwordMessage}</p>}
            <div className="flex justify-end border-t border-slate-100 pt-4 md:col-span-3"><button type="submit" disabled={settings.passwordSaving || !currentPassword || !newPassword || !confirmation} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50">{settings.passwordSaving ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}</button></div>
        </form>
    </section>;
}

export default function AccountSection({ settings }: AccountSectionProps) {
    if (settings.loading) return <div className="space-y-5" aria-label="Đang tải tài khoản" aria-busy="true"><div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" /><div className="h-60 animate-pulse rounded-xl border border-slate-200 bg-white" /></div>;
    if (settings.loadError || !settings.profile) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-danger">Không thể tải tài khoản: {settings.loadError || 'Không tìm thấy hồ sơ.'}<button type="button" onClick={settings.refresh} className="ml-3 inline-flex items-center gap-1 font-semibold underline"><RefreshCw size={14} />Thử lại</button></div>;

    const profileKey = [settings.profile.id, settings.profile.name, settings.profile.phone, settings.profile.avatar_url].join('-');
    return <div className="space-y-5"><ProfileCard key={profileKey} profile={settings.profile} settings={settings} /><PasswordCard settings={settings} /></div>;
}