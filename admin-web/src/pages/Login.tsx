import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AdminRole } from '../services/api';

const inputClass = 'mt-2 h-11 w-full rounded-lg border border-slate-200 bg-background pl-10 pr-11 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
const roleSelectClass = 'mt-2 h-11 w-full rounded-lg border border-slate-200 bg-background px-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<AdminRole | ''>('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        if (!role) { setError('Vui lòng chọn vai trò.'); return; }
        setLoading(true);
        try {
            await login(email, password, role);
            const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
            const destination = from?.pathname?.startsWith('/') ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/';
            navigate(destination, { replace: true });
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Đăng nhập thất bại.'); } finally { setLoading(false); }
    };

    return <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">UIRMS Admin</p>
        <h1 className="mt-3 text-3xl font-bold text-neutral-900">Chào mừng trở lại</h1>
        <p className="mt-2 text-sm text-neutral-500">Đăng nhập để tiếp tục quản lý báo cáo đô thị.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold text-neutral-900">Email quản trị<span className="relative block"><Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@uirms.vn" className={inputClass} autoComplete="email" required /></span></label>
            <label className="block text-sm font-semibold text-neutral-900">Mật khẩu<span className="relative block"><LockKeyhole size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" className={inputClass} autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-primary" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            <label className="block text-sm font-semibold text-neutral-900">Vai trò<span className="block"><select value={role} onChange={(event) => setRole(event.target.value as AdminRole | '')} className={roleSelectClass} required><option value="" disabled>Chọn vai trò</option><option value="super_admin">Quản trị viên hệ thống</option><option value="manager">Quản lý</option><option value="technician">Nhân viên kỹ thuật</option></select></span></label>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
            <div className="flex justify-end"><Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline">Quên mật khẩu?</Link></div>
            <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Đang đăng nhập...' : <>Đăng nhập <ArrowRight size={17} /></>}</button>
        </form>
    </div>;
}
