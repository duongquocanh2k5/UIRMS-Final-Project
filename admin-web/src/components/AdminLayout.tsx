import type { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface AdminLayoutProps {
    children: ReactNode;
    fullBleed?: boolean;
}

export default function AdminLayout({ children, fullBleed = false }: AdminLayoutProps) {
    return (
        <div className="min-h-screen bg-background font-sans text-neutral-900">
            <Sidebar />
            <div className="ml-[260px] min-h-screen">
                <Header />
                <main className={fullBleed ? 'h-[calc(100vh-76px)] overflow-hidden' : 'min-h-[calc(100vh-76px)] px-8 py-7'}>{children}</main>
            </div>
        </div>
    );
}
