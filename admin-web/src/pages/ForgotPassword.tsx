import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
    const { forgotPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        try { await forgotPassword(email); setSent(true); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể gửi yêu cầu.'); }
    };

    return <div><Link to="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-primary"><ArrowLeft size={16} />Quay lại đăng nhập</Link><p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-primary">Khôi phục tài khoản</p><h1 className="mt-3 text-3xl font-bold text-neutral-900">Quên mật khẩu?</h1><p className="mt-2 text-sm leading-6 text-neutral-500">Nhập email quản trị của bạn. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.</p>{sent ? <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5"><p className="font-semibold text-success">Đã gửi hướng dẫn đặt lại mật khẩu.</p><p className="mt-1 text-sm text-neutral-500">Vui lòng kiểm tra hộp thư của {email}.</p></div> : <form onSubmit={handleSubmit} className="mt-8 space-y-5"><label className="block text-sm font-semibold text-neutral-900">Email quản trị<span className="relative block"><Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@uirms.vn" className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-background pl-10 pr-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" autoComplete="email" required /></span></label>{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}<button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white hover:bg-primary/90">Gửi hướng dẫn <ArrowRight size={17} /></button></form>}</div>;
}
