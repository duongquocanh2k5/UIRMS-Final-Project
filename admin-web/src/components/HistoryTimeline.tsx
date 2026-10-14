export interface HistoryLog {
    id: string;
    action: string;
    timestamp: string;
    actor: string;
    detail?: string;
}

interface HistoryTimelineProps {
    logs: HistoryLog[];
}

export default function HistoryTimeline({ logs }: HistoryTimelineProps) {
    return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-neutral-900">Lịch Sử Xử Lý</h2>{logs.length ? <div className="mt-5 ml-2 border-l border-slate-200 pl-6">{logs.map((log, index) => <div key={log.id} className={`relative ${index === logs.length - 1 ? '' : 'pb-6'}`}><span className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${index === 0 ? 'bg-primary ring-2 ring-primary/20' : 'bg-slate-300'}`} /><p className="text-sm font-semibold text-neutral-900">{log.action}</p><p className="mt-1 text-xs text-neutral-500">{log.timestamp} · {log.actor}</p>{log.detail && <p className="mt-2 text-xs leading-5 text-neutral-500">{log.detail}</p>}</div>)}</div> : <p className="mt-4 text-sm text-neutral-500">Chưa có lịch sử xử lý.</p>}</section>;
}
