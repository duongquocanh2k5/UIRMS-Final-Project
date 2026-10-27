import { BarChart3, FileText, LayoutDashboard, MapPin, Settings, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AdminRole } from '../services/api';

const menuItems = [
    { label: 'Tổng Quan', to: '/', icon: LayoutDashboard, end: true, roles: ['super_admin'] },
    { label: 'Danh Sách Báo Cáo', to: '/incidents', icon: FileText, roles: ['super_admin', 'manager'] },
    { label: 'Sự Cố Được Giao', to: '/incidents', icon: FileText, roles: ['technician'] },
    { label: 'Bản Đồ', to: '/map', icon: MapPin, roles: ['super_admin', 'manager'] },
    { label: 'Thống Kê', to: '/stats', icon: BarChart3, roles: ['super_admin', 'manager'] },
    { label: 'Nhân Viên', to: '/staff', icon: Users, roles: ['super_admin', 'manager'] },
    { label: 'Cài Đặt', to: '/settings', icon: Settings, roles: ['super_admin', 'manager', 'technician'] },
];

export default function Sidebar() {
    const { user } = useAuth();
    const visibleItems = menuItems.filter(({ roles }) => roles.includes(user.role as AdminRole));
    const initials = user.name.split(' ').map((part) => part[0]).join('').slice(-2).toUpperCase();

    return (
        <aside className="fixed inset-y-0 left-0 flex w-[260px] flex-col bg-[#0F2A3D] px-4 py-6 text-white">
            <div className="border-b border-white/10 px-3 pb-6">
                <div className="text-2xl font-extrabold tracking-[0.18em] text-white">UIRMS</div>
                <div className="mt-1 text-xs font-medium tracking-wide text-slate-300">TP. Hồ Chí Minh</div>
            </div>

            <nav className="mt-7 flex-1 space-y-1" aria-label="Điều hướng chính">
                {visibleItems.map(({ label, to, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Icon size={19} strokeWidth={1.9} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="border-t border-white/10 pt-4">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{initials}</div>}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{user.role}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
