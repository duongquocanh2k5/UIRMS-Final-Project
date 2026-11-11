import { Bell, ChevronDown, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Header() {
    const { user, logout } = useAuth();
    const { language, t, toggleLanguage } = useLanguage();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const initials = user.name.split(' ').map((part) => part[0]).join('').slice(-2).toUpperCase();

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const query = search.trim();
        navigate(query ? `/incidents?search=${encodeURIComponent(query)}` : '/incidents');
    }

    return (
        <header className="flex h-[76px] items-center gap-6 border-b border-slate-200 bg-white px-8">
            <form onSubmit={submitSearch} className="relative min-w-0 flex-1">
                <span className="sr-only">{t('Tìm kiếm báo cáo', 'Search reports')}</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-full border border-slate-200 bg-background pl-11 pr-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder={t('Tìm kiếm báo cáo...', 'Search reports...')} aria-label={t('Tìm kiếm báo cáo, nhấn Enter để tìm', 'Search reports, press Enter to search')} />
            </form>

            <button type="button" onClick={toggleLanguage} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-neutral-700 transition hover:border-primary hover:text-primary" aria-label={language === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'}>
                <span className={language === 'vi' ? 'text-primary' : ''}>VI</span>
                <span className="mx-1 text-slate-300">|</span>
                <span className={language === 'en' ? 'text-primary' : ''}>EN</span>
            </button>

            <div className="relative">
                <button type="button" onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-full p-2 text-neutral-500 transition hover:bg-primary-light hover:text-primary" aria-label={t('Thông báo', 'Notifications')} aria-expanded={notificationsOpen}>
                    <Bell size={21} />
                </button>
                {notificationsOpen && <div role="status" className="absolute right-0 top-12 z-20 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"><p className="text-sm font-semibold text-neutral-900">{t('Thông báo nội bộ chưa được cấu hình.', 'Internal notifications are not configured.')}</p><p className="mt-1 text-xs leading-5 text-neutral-500">{t('Không có hộp thư thông báo dành cho tài khoản quản trị viên.', 'There is no notification inbox for administrator accounts.')}</p></div>}
            </div>

            <div className="relative">
                <button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex items-center gap-2 rounded-lg p-1.5 pr-0 text-left hover:bg-slate-50" aria-expanded={menuOpen}>
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">{initials}</div>}
                    <span className="hidden text-sm font-semibold text-neutral-900 xl:block">{user.name}</span>
                    <ChevronDown size={16} className={`text-neutral-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>
                {menuOpen && <div className="absolute right-0 top-12 z-10 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"><Link to="/settings" onClick={() => setMenuOpen(false)} className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-900 hover:bg-background">{t('Thông tin tài khoản', 'Account Settings')}</Link><button type="button" onClick={logout} className="w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-red-50">{t('Đăng xuất', 'Log Out')}</button></div>}
            </div>
        </header>
    );
}
