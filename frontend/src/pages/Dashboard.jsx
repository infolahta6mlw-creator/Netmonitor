import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { DASH } from "../constants/testIds";
import { StatusBadge } from "../components/StatusBadge";
import { Server, Wifi, WifiOff, AlertTriangle, Gauge, Activity } from "lucide-react";

function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function KPI({ label, value, sub, icon: Icon, tone = "default", testId }) {
    const tones = {
        default: "border-border/60",
        success: "border-success/60",
        destructive: "border-destructive/60",
        warning: "border-warning/60",
    };
    return (
        <div data-testid={testId} className={`border ${tones[tone]} bg-card/40 p-4 fade-up`}>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <span>{label}</span>
                {Icon && <Icon className="h-3.5 w-3.5" />}
            </div>
            <div className="mt-3 text-4xl font-mono font-light tracking-tight">{value}</div>
            {sub && <div className="mt-1 text-[10px] font-mono text-muted-foreground">{sub}</div>}
        </div>
    );
}

export default function Dashboard() {
    const { t, theme } = useApp();
    const [overview, setOverview] = useState(null);
    const [traffic, setTraffic] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [logs, setLogs] = useState([]);

    const load = async () => {
        try {
            const [o, tr, al, lg] = await Promise.all([
                api.get("/metrics/overview"),
                api.get("/metrics/traffic?minutes=30"),
                api.get("/alerts?status=unresolved"),
                api.get("/logs?limit=8"),
            ]);
            setOverview(o.data);
            setTraffic(tr.data.map((p) => ({ ...p, label: formatTime(p.ts) })));
            setAlerts(al.data.slice(0, 6));
            setLogs(lg.data);
        } catch {}
    };

    useEffect(() => {
        load();
        const int = setInterval(load, 5000);
        return () => clearInterval(int);
    }, []);

    const chartColor = theme === "dark" ? "#00FF41" : "#0000FF";
    const chartColor2 = theme === "dark" ? "#00F0FF" : "#00A2FF";

    return (
        <div className="space-y-6">
            <div className="flex items-baseline justify-between">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">// OVERVIEW</div>
                    <h1 className="text-3xl font-sans font-semibold tracking-tight">{t("dashboard")}</h1>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                    LIVE · {new Date().toLocaleTimeString()}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KPI testId={DASH.kpiTotal} label={t("totalDevices")} value={overview?.total_devices ?? "—"} icon={Server} />
                <KPI testId={DASH.kpiOnline} label={t("online")} value={overview?.online ?? "—"} tone="success" icon={Wifi} />
                <KPI testId={DASH.kpiOffline} label={t("offline")} value={overview?.offline ?? "—"} tone="destructive" icon={WifiOff} />
                <KPI testId={DASH.kpiAlerts} label={t("activeAlerts")} value={overview?.unacknowledged_alerts ?? "—"} sub={`${overview?.critical_alerts ?? 0} ${t("critical")}`} tone={overview?.unacknowledged_alerts > 0 ? "warning" : "default"} icon={AlertTriangle} />
                <KPI testId={DASH.kpiBandwidth} label={t("currentBandwidth")} value={`${overview?.current_bandwidth_mbps ?? 0}`} sub="Mbps" icon={Activity} />
                <KPI testId={DASH.kpiUptime} label={t("uptime")} value={`${overview?.uptime_percent ?? 0}%`} icon={Gauge} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                <div data-testid={DASH.trafficChart} className="lg:col-span-4 border border-border/60 bg-card/40 p-4 fade-up">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">{t("realtimeTraffic")}</div>
                        <div className="flex items-center gap-3 text-[10px] font-mono">
                            <span className="flex items-center gap-1.5"><span className="h-1.5 w-3" style={{ background: chartColor }} />{t("inbound")}</span>
                            <span className="flex items-center gap-1.5"><span className="h-1.5 w-3" style={{ background: chartColor2 }} />{t("outbound")}</span>
                        </div>
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={traffic}>
                                <defs>
                                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.5} />
                                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={chartColor2} stopOpacity={0.4} />
                                        <stop offset="100%" stopColor={chartColor2} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                                <Tooltip
                                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontFamily: "JetBrains Mono", fontSize: 11 }}
                                    labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}
                                />
                                <Area type="monotone" dataKey="in_mbps" stroke={chartColor} strokeWidth={1.5} fill="url(#gIn)" />
                                <Area type="monotone" dataKey="out_mbps" stroke={chartColor2} strokeWidth={1.5} fill="url(#gOut)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div data-testid={DASH.alertsList} className="lg:col-span-2 border border-border/60 bg-card/40 p-4 fade-up">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-3">{t("recentAlerts")}</div>
                    <div className="space-y-2">
                        {alerts.length === 0 && <div className="text-xs text-muted-foreground font-mono py-8 text-center">{t("empty")}</div>}
                        {alerts.map((a) => (
                            <div key={a.id} className={`border-l-2 ${a.severity === "critical" ? "border-destructive" : "border-warning"} bg-secondary/20 px-3 py-2 ${a.severity === "critical" && !a.acknowledged ? "critical-throb" : ""}`}>
                                <div className="flex items-center justify-between">
                                    <StatusBadge status={a.severity} />
                                    <span className="text-[10px] text-muted-foreground font-mono">{formatTime(a.created_at)}</span>
                                </div>
                                <div className="mt-1 text-xs font-mono truncate">{a.title}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div data-testid={DASH.activityList} className="border border-border/60 bg-card/40 p-4 fade-up">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-3">{t("recentActivity")}</div>
                <div className="space-y-1">
                    {logs.length === 0 && <div className="text-xs text-muted-foreground font-mono py-4 text-center">{t("empty")}</div>}
                    {logs.map((l) => (
                        <div key={l.id} className="flex items-center gap-3 text-xs font-mono py-1.5 border-b border-border/30 last:border-0">
                            <span className="text-muted-foreground w-20 shrink-0">{formatTime(l.created_at)}</span>
                            <span className="text-primary w-40 shrink-0 truncate">{l.action}</span>
                            <span className="text-muted-foreground shrink-0">→</span>
                            <span className="truncate flex-1">{l.target}</span>
                            <span className="text-muted-foreground text-[10px]">{l.user_email}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
