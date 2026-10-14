import { Bell, ChevronDown, Search } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const initials = user.name.split(' ').map((part) => part[0]).join('').slice(-2).toUpperCase();

    return (
        <header className="flex h-[76px] items-center gap-6 border-b border-slate-200 bg-white px-8">
            <label className="relative min-w-0 flex-1">
                <span className="sr-only">Tìm kiếm báo cáo</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input className="h-11 w-full rounded-full border border-slate-200 bg-background pl-11 pr-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Tìm kiếm báo cáo..." />
            </label>

            <button type="button" className="relative rounded-full p-2 text-neutral-500 transition hover:bg-primary-light hover:text-primary" aria-label="Thông báo">
                <Bell size={21} />
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-danger" aria-label="3 thông báo mới" />
            </button>

            <div className="relative">
                <button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex items-center gap-2 rounded-lg p-1.5 pr-0 text-left hover:bg-slate-50" aria-expanded={menuOpen}>
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">{initials}</div>}
                    <span className="hidden text-sm font-semibold text-neutral-900 xl:block">{user.name}</span>
                    <ChevronDown size={16} className={`text-neutral-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>
                {menuOpen && <div className="absolute right-0 top-12 z-10 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"><button type="button" className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-900 hover:bg-background">Thông tin tài khoản</button><button type="button" onClick={logout} className="w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-red-50">Đăng xuất</button></div>}
            </div>
        </header>
    );
}
