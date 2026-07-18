import React, { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { ALERTS } from "../constants/testIds";
import { StatusBadge } from "../components/StatusBadge";
import { Check, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

function formatDateTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
}

const FILTERS = [
    { key: "all", value: null },
    { key: "unresolved", value: "unresolved" },
    { key: "unacknowledged", value: "unacknowledged" },
];

export default function Alerts() {
    const { t, user } = useApp();
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState("unresolved");
    const canManage = ["superadmin", "admin"].includes(user?.role);

    const load = async () => {
        const q = FILTERS.find((f) => f.key === filter)?.value;
        const { data } = await api.get(`/alerts${q ? `?status=${q}` : ""}`);
        setItems(data);
    };

    useEffect(() => {
        load();
        const i = setInterval(load, 5000);
        return () => clearInterval(i);
    }, [filter]);

    const ack = async (id) => {
        try { await api.post(`/alerts/${id}/ack`); toast.success(t("acknowledged")); load(); }
        catch (e) { toast.error(formatApiError(e)); }
    };
    const resolve = async (id) => {
        try { await api.post(`/alerts/${id}/resolve`); toast.success(t("resolved")); load(); }
        catch (e) { toast.error(formatApiError(e)); }
    };
    const del = async (id) => {
        if (!window.confirm(t("confirmDelete"))) return;
        try { await api.delete(`/alerts/${id}`); load(); } catch (e) { toast.error(formatApiError(e)); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-baseline justify-between">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">// ALERT CENTER</div>
                    <h1 className="text-3xl font-sans font-semibold tracking-tight">{t("alerts")}</h1>
                </div>
                <div className="flex gap-1">
                    {FILTERS.map((f) => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            data-testid={ALERTS.filter(f.key)}
                            className={`px-3 py-1.5 text-[10px] uppercase tracking-widest border ${filter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent/40"}`}>
                            {t(f.key)}
                        </button>
                    ))}
                </div>
            </div>

            <div data-testid={ALERTS.list} className="space-y-2">
                {items.length === 0 && (
                    <div className="border border-border/60 bg-card/40 py-16 text-center text-xs font-mono text-muted-foreground">{t("empty")}</div>
                )}
                {items.map((a) => (
                    <div key={a.id}
                        className={`border-l-4 ${a.severity === "critical" ? "border-destructive" : a.severity === "warning" ? "border-warning" : "border-chart-2"} border-y border-r border-border/60 bg-card/40 p-4 ${a.severity === "critical" && !a.acknowledged ? "critical-throb" : ""}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <StatusBadge status={a.severity} />
                                    {a.acknowledged && <span className="text-[10px] uppercase font-mono text-muted-foreground border border-border/60 px-1.5 py-0.5">{t("acknowledged")}</span>}
                                    {a.resolved && <span className="text-[10px] uppercase font-mono text-success border border-success/40 px-1.5 py-0.5">{t("resolved")}</span>}
                                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">{formatDateTime(a.created_at)}</span>
                                </div>
                                <div className="text-sm font-sans font-medium">{a.title}</div>
                                <div className="text-xs font-mono text-muted-foreground mt-0.5">{a.message}</div>
                                {a.device_hostname && (
                                    <div className="text-[10px] font-mono text-muted-foreground mt-1">DEVICE → {a.device_hostname}</div>
                                )}
                                {a.acknowledged_by && (
                                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">BY → {a.acknowledged_by}</div>
                                )}
                            </div>
                            {canManage && (
                                <div className="flex gap-1 shrink-0">
                                    {!a.acknowledged && (
                                        <button onClick={() => ack(a.id)} data-testid={ALERTS.ackBtn(a.id)}
                                            className="p-1.5 border border-border hover:bg-accent/40" title={t("acknowledge")}>
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {!a.resolved && (
                                        <button onClick={() => resolve(a.id)} data-testid={ALERTS.resolveBtn(a.id)}
                                            className="p-1.5 border border-border hover:bg-success/20 text-success" title={t("resolve")}>
                                            <CheckCheck className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    <button onClick={() => del(a.id)}
                                        className="p-1.5 border border-border hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
