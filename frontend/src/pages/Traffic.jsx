import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";

function formatTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const RANGES = [
    { label: "15m", value: 15 },
    { label: "30m", value: 30 },
    { label: "1h", value: 60 },
    { label: "2h", value: 120 },
];

export default function Traffic() {
    const { t, theme } = useApp();
    const [range, setRange] = useState(60);
    const [data, setData] = useState([]);
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState("");
    const [devMetrics, setDevMetrics] = useState([]);

    useEffect(() => {
        api.get("/devices").then((r) => setDevices(r.data));
    }, []);

    useEffect(() => {
        const load = async () => {
            const { data } = await api.get(`/metrics/traffic?minutes=${range}`);
            setData(data.map((p) => ({ ...p, label: formatTime(p.ts) })));
        };
        load();
        const i = setInterval(load, 5000);
        return () => clearInterval(i);
    }, [range]);

    useEffect(() => {
        if (!selectedDevice) { setDevMetrics([]); return; }
        const load = async () => {
            const { data } = await api.get(`/metrics/device/${selectedDevice}?minutes=${range}`);
            setDevMetrics(data.map((p) => ({ ...p, label: formatTime(p.ts) })));
        };
        load();
        const i = setInterval(load, 5000);
        return () => clearInterval(i);
    }, [selectedDevice, range]);

    const c1 = theme === "dark" ? "#00FF41" : "#0000FF";
    const c2 = theme === "dark" ? "#00F0FF" : "#00A2FF";
    const c3 = theme === "dark" ? "#FFD700" : "#E6AC00";
    const c4 = theme === "dark" ? "#FF3366" : "#E60033";

    return (
        <div className="space-y-6">
            <div className="flex items-baseline justify-between">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">// BANDWIDTH</div>
                    <h1 className="text-3xl font-sans font-semibold tracking-tight">{t("traffic")}</h1>
                </div>
                <div className="flex gap-1">
                    {RANGES.map((r) => (
                        <button key={r.value} onClick={() => setRange(r.value)}
                            data-testid={`range-${r.value}`}
                            className={`px-3 py-1.5 text-[10px] uppercase tracking-widest border ${range === r.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent/40"}`}>
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="border border-border/60 bg-card/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2">{t("trafficLast")}</div>
                <div className="h-[340px]">
                    <ResponsiveContainer>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="gAIn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={c1} stopOpacity={0.5} />
                                    <stop offset="100%" stopColor={c1} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gAOut" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={c2} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={c2} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={45} unit=" Mbps" />
                            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontFamily: "JetBrains Mono", fontSize: 11 }} />
                            <Area type="monotone" dataKey="in_mbps" name={t("inbound")} stroke={c1} strokeWidth={1.5} fill="url(#gAIn)" />
                            <Area type="monotone" dataKey="out_mbps" name={t("outbound")} stroke={c2} strokeWidth={1.5} fill="url(#gAOut)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="border border-border/60 bg-card/40 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">PER-DEVICE METRICS</div>
                    <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}
                        className="bg-input/30 border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary">
                        <option value="">— select device —</option>
                        {devices.map((d) => <option key={d.id} value={d.id}>{d.hostname} · {d.ip_address}</option>)}
                    </select>
                </div>
                <div className="h-[280px]">
                    {selectedDevice ? (
                        <ResponsiveContainer>
                            <LineChart data={devMetrics}>
                                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontFamily: "JetBrains Mono", fontSize: 11 }} />
                                <Line type="monotone" dataKey="cpu" name="CPU %" stroke={c1} strokeWidth={1.5} dot={false} />
                                <Line type="monotone" dataKey="memory" name="MEM %" stroke={c2} strokeWidth={1.5} dot={false} />
                                <Line type="monotone" dataKey="latency_ms" name="Latency ms" stroke={c3} strokeWidth={1.5} dot={false} />
                                <Line type="monotone" dataKey="bandwidth_mbps" name="Mbps" stroke={c4} strokeWidth={1.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs font-mono text-muted-foreground">Select a device to inspect metrics</div>
                    )}
                </div>
            </div>
        </div>
    );
}
