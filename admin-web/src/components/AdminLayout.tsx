import type { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <div className="min-h-screen bg-background font-sans text-neutral-900">
            <Sidebar />
            <div className="ml-[260px] min-h-screen">
                <Header />
                <main className="min-h-[calc(100vh-76px)] px-8 py-7">{children}</main>
            </div>
        </div>
    );
}
