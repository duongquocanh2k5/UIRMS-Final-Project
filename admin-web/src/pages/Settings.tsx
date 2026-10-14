import { useState } from 'react';
import AccountSection from '../components/AccountSection';
import CategoriesSection from '../components/CategoriesSection';
import DepartmentsSection from '../components/DepartmentsSection';
import { useAccountSettings } from '../hooks/useAccountSettings';

const settingsSections = [
    { id: 'settings-account', label: 'Tài khoản' },
    { id: 'settings-categories', label: 'Danh Mục Sự Cố' },
    { id: 'settings-departments', label: 'Đơn Vị Xử Lý' },
];

export default function Settings() {
    const [activeSection, setActiveSection] = useState(settingsSections[0]!.id);
    const accountSettings = useAccountSettings();

    function jumpToSection(sectionId: string) {
        setActiveSection(sectionId);
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return <div className="space-y-6">
        <div><p className="text-sm font-medium text-neutral-500">Tùy chỉnh tài khoản và dữ liệu hệ thống</p><h1 className="mt-1 text-2xl font-bold text-neutral-900">Cài Đặt</h1><p className="mt-2 text-sm text-neutral-500">Quản lý hồ sơ, danh mục sự cố và đơn vị xử lý.</p></div>
        <div className="grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
            <nav aria-label="Mục cài đặt" className="top-6 self-start rounded-xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky">
                <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500">Cấu hình</p>
                {settingsSections.map((section) => <button key={section.id} type="button" onClick={() => jumpToSection(section.id)} aria-current={activeSection === section.id ? 'location' : undefined} className={`mb-1 w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors last:mb-0 ${activeSection === section.id ? 'bg-primary-light text-primary' : 'text-neutral-600 hover:bg-slate-50 hover:text-neutral-900'}`}>{section.label}</button>)}
            </nav>
            <div className="min-w-0 space-y-7">
                <section id="settings-account" className="scroll-mt-6 space-y-5"><div><h2 className="text-lg font-bold text-neutral-900">Tài khoản</h2><p className="mt-1 text-sm text-neutral-500">Thông tin cá nhân và bảo mật đăng nhập</p></div><AccountSection settings={accountSettings} /></section>
                <CategoriesSection />
                <DepartmentsSection />
            </div>
        </div>
    </div>;
}