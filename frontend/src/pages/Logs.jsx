import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";

function formatDateTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
}

export default function Logs() {
    const { t } = useApp();
    const [logs, setLogs] = useState([]);
    const [q, setQ] = useState("");
    const [limit, setLimit] = useState(200);

    const load = async () => {
        const { data } = await api.get(`/logs?limit=${limit}`);
        setLogs(data);
    };

    useEffect(() => { load(); }, [limit]);

    const filtered = logs.filter((l) =>
        !q || [l.action, l.target, l.user_email].some((v) => (v || "").toLowerCase().includes(q.toLowerCase()))
    );

    return (
        <div className="space-y-4">
            <div className="flex items-baseline justify-between">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">// AUDIT TRAIL</div>
                    <h1 className="text-3xl font-sans font-semibold tracking-tight">{t("logs")}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")}
                        data-testid="logs-search"
                        className="bg-input/30 border border-border px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-primary" />
                    <select value={limit} onChange={(e) => setLimit(+e.target.value)}
                        className="bg-input/30 border border-border px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary">
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={500}>500</option>
                    </select>
                </div>
            </div>

            <div data-testid="logs-list" className="border border-border/60 bg-card/40">
                <div className="grid grid-cols-[160px_140px_1fr_160px] gap-3 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/60">
                    <div>Timestamp</div>
                    <div>Action</div>
                    <div>Target</div>
                    <div>User</div>
                </div>
                <div>
                    {filtered.map((l) => (
                        <div key={l.id} className="grid grid-cols-[160px_140px_1fr_160px] gap-3 px-3 py-1.5 text-xs font-mono border-b border-border/20 hover:bg-accent/20">
                            <div className="text-muted-foreground">{formatDateTime(l.created_at)}</div>
                            <div className="text-primary">{l.action}</div>
                            <div className="truncate">{l.target}</div>
                            <div className="text-muted-foreground truncate">{l.user_email}</div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="py-8 text-center text-xs font-mono text-muted-foreground">{t("empty")}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
