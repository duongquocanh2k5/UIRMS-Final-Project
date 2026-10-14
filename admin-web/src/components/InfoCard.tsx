import type { ReactNode } from 'react';

export interface InfoRow {
    label: string;
    value: ReactNode;
}

interface InfoCardProps {
    title: string;
    rows: InfoRow[];
}

export default function InfoCard({ title, rows }: InfoCardProps) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-neutral-900">{title}</h2>
            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5">
                {rows.map((row) => <div key={row.label} className="min-w-0"><p className="text-xs font-medium text-neutral-500">{row.label}</p><div className="mt-1 text-sm font-semibold text-neutral-900">{row.value}</div></div>)}
            </div>
        </section>
    );
}
