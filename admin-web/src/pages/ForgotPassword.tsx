import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function ForgotPassword() {
    const { t } = useLanguage();
    return <div>
        <Link to="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-primary"><ArrowLeft size={16} />{t('Quay lại đăng nhập', 'Back to Sign In')}</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('Khôi phục tài khoản', 'Account Recovery')}</p>
        <h1 className="mt-3 text-3xl font-bold text-neutral-900">{t('Quên mật khẩu?', 'Forgot Password?')}</h1>
        <section role="status" className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-info" />
                <p className="text-sm leading-6 text-neutral-700">{t('Vui lòng liên hệ Quản trị viên hệ thống (Super Admin) của đơn vị để cấp lại mật khẩu.', 'Please contact your organization’s System Administrator (Super Admin) to reset your password.')}</p>
            </div>
        </section>
    </div>;
}
