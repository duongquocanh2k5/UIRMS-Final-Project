import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const inputClass = 'mt-2 h-11 w-full rounded-lg border border-slate-200 bg-background pl-10 pr-11 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        if (password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return; }
        try { await register(name, email, password); setSubmitted(true); window.setTimeout(() => navigate('/login'), 900); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Đăng ký thất bại.'); }
    };

    return <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">UIRMS Admin</p>
        <h1 className="mt-3 text-3xl font-bold text-neutral-900">Tạo tài khoản admin</h1>
        <p className="mt-2 text-sm text-neutral-500">Thiết lập thông tin cho thành viên điều phối.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block text-sm font-semibold text-neutral-900">Họ và tên<span className="relative block"><UserRound size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nguyễn Minh Anh" className={inputClass} required /></span></label>
            <label className="block text-sm font-semibold text-neutral-900">Email quản trị<span className="relative block"><Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@uirms.vn" className={inputClass} required /></span></label>
            <label className="block text-sm font-semibold text-neutral-900">Mật khẩu<span className="relative block"><LockKeyhole size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tối thiểu 8 ký tự" className={inputClass} minLength={8} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-primary" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            <label className="block text-sm font-semibold text-neutral-900">Xác nhận mật khẩu<span className="relative block"><LockKeyhole size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" /><input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Nhập lại mật khẩu" className={inputClass} required /><button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-primary" aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiển thị mật khẩu xác nhận'}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
            {submitted && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">Đăng ký thành công.</p>}
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white transition hover:bg-primary/90">Đăng ký <ArrowRight size={17} /></button>
        </form>
        <p className="mt-7 text-center text-sm text-neutral-500">Đã có tài khoản? <Link to="/login" className="font-bold text-primary hover:underline">Đăng nhập</Link></p>
    </div>;
}
