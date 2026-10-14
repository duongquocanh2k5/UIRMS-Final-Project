import type { ReactNode } from 'react';

interface AuthLayoutProps {
    children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
            <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
                <div className="relative hidden overflow-hidden bg-[#0F2A3D] p-10 text-white lg:flex lg:flex-col lg:justify-between">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[32px] border-primary/20" />
                    <div className="relative"><p className="text-3xl font-extrabold tracking-[0.18em]">UIRMS</p><p className="mt-2 text-sm text-slate-300">TP. Hồ Chí Minh</p></div>
                    <div className="relative"><p className="max-w-xs text-2xl font-bold leading-tight">Điều phối hạ tầng đô thị, rõ ràng và kịp thời.</p><p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">Không gian làm việc dành cho đội ngũ quản lý và xử lý phản ánh từ cộng đồng.</p></div>
                    <p className="relative text-xs text-slate-400">Urban Incident Reporting & Management System</p>
                </div>
                <main className="p-8 sm:p-12">{children}</main>
            </div>
        </div>
    );
}
