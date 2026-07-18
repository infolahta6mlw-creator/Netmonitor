import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Router, Network, Server as SvrIcon, Monitor, Printer, Cpu, Camera, Wifi, Phone, HelpCircle } from "lucide-react";

const ICON = {
    router: Router,
    switch: Network,
    server: SvrIcon,
    workstation: Monitor,
    printer: Printer,
    iot: Cpu,
    camera: Camera,
    access_point: Wifi,
    phone: Phone,
    unknown: HelpCircle,
};

const STATUS_COLOR = {
    online: "#00E676",
    offline: "#FF3366",
    warning: "#FFD700",
    unknown: "#888888",
};

// Custom SVG-based radial tree layout (no external heavy libs) with basic force-lite simulation
export default function Topology() {
    const { t, theme } = useApp();
    const [data, setData] = useState({ nodes: [], links: [] });
    const svgRef = useRef(null);
    const [size, setSize] = useState({ w: 800, h: 600 });
    const [hover, setHover] = useState(null);

    useEffect(() => {
        const load = async () => {
            const { data } = await api.get("/topology");
            setData(data);
        };
        load();
        const i = setInterval(load, 8000);
        return () => clearInterval(i);
    }, []);

    useEffect(() => {
        const onResize = () => {
            if (svgRef.current) {
                const r = svgRef.current.getBoundingClientRect();
                setSize({ w: r.width, h: Math.max(500, r.height) });
            }
        };
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // Layout: BFS tree from root(s)
    const positions = useMemo(() => {
        const map = new Map();
        const children = new Map();
        const parents = new Map();
        data.nodes.forEach((n) => children.set(n.id, []));
        data.links.forEach((l) => {
            children.get(l.source)?.push(l.target);
            parents.set(l.target, l.source);
        });
        const roots = data.nodes.filter((n) => !parents.has(n.id));
        // Assign levels
        const level = new Map();
        const queue = roots.map((r) => ({ id: r.id, lvl: 0 }));
        while (queue.length) {
            const { id, lvl } = queue.shift();
            if (level.has(id)) continue;
            level.set(id, lvl);
            (children.get(id) || []).forEach((c) => queue.push({ id: c, lvl: lvl + 1 }));
        }
        // Group by level
        const byLevel = new Map();
        level.forEach((lvl, id) => {
            if (!byLevel.has(lvl)) byLevel.set(lvl, []);
            byLevel.get(lvl).push(id);
        });
        const levels = [...byLevel.keys()].sort((a, b) => a - b);
        const centerX = size.w / 2;
        const topY = 80;
        const vGap = Math.min(160, (size.h - 120) / Math.max(levels.length, 1));
        levels.forEach((lvl) => {
            const ids = byLevel.get(lvl);
            const y = topY + lvl * vGap;
            const hGap = size.w / (ids.length + 1);
            ids.forEach((id, idx) => {
                map.set(id, { x: hGap * (idx + 1), y });
            });
        });
        return map;
    }, [data, size]);

    const nodeById = useMemo(() => {
        const m = new Map();
        data.nodes.forEach((n) => m.set(n.id, n));
        return m;
    }, [data.nodes]);

    return (
        <div className="space-y-4">
            <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">// TOPOLOGY</div>
                <h1 className="text-3xl font-sans font-semibold tracking-tight">{t("topology")}</h1>
                <p className="text-xs font-mono text-muted-foreground mt-1">{data.nodes.length} nodes · {data.links.length} links</p>
            </div>

            <div className="border border-border/60 bg-card/40 relative overflow-hidden">
                <svg ref={svgRef} width="100%" height={size.h} data-testid="topology-svg">
                    <defs>
                        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="hsl(var(--border))" strokeOpacity="0.3" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height={size.h} fill="url(#grid)" />

                    {data.links.map((l, i) => {
                        const s = positions.get(l.source);
                        const t = positions.get(l.target);
                        if (!s || !t) return null;
                        const sourceNode = nodeById.get(l.source);
                        const stroke = sourceNode?.status === "online" ? (theme === "dark" ? "#00FF41" : "#0000FF") : "hsl(var(--border))";
                        return (
                            <g key={i}>
                                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={stroke} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 3" />
                            </g>
                        );
                    })}

                    {data.nodes.map((n) => {
                        const p = positions.get(n.id);
                        if (!p) return null;
                        const color = STATUS_COLOR[n.status] || STATUS_COLOR.unknown;
                        return (
                            <g key={n.id} transform={`translate(${p.x}, ${p.y})`}
                                onMouseEnter={() => setHover(n)}
                                onMouseLeave={() => setHover(null)}
                                style={{ cursor: "pointer" }}
                            >
                                {n.status === "online" && (
                                    <circle r="24" fill={color} opacity="0.15">
                                        <animate attributeName="r" from="18" to="30" dur="2s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                                    </circle>
                                )}
                                <circle r="18" fill="hsl(var(--card))" stroke={color} strokeWidth="1.5" />
                                <circle r="4" fill={color} cx="0" cy="0" transform="translate(12, -12)" />
                                <text textAnchor="middle" y="34" fontFamily="JetBrains Mono" fontSize="9" fill="hsl(var(--foreground))">
                                    {n.label}
                                </text>
                                <text textAnchor="middle" y="46" fontFamily="JetBrains Mono" fontSize="8" fill="hsl(var(--muted-foreground))">
                                    {n.ip}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {hover && (
                    <div className="absolute top-4 right-4 border border-border bg-popover/90 backdrop-blur-md p-3 text-xs font-mono space-y-1 pointer-events-none">
                        <div className="text-[10px] uppercase tracking-widest text-primary">NODE</div>
                        <div><span className="text-muted-foreground">HOST:</span> {hover.label}</div>
                        <div><span className="text-muted-foreground">IP:</span> {hover.ip}</div>
                        <div><span className="text-muted-foreground">TYPE:</span> {hover.type}</div>
                        <div><span className="text-muted-foreground">STATUS:</span> <span style={{ color: STATUS_COLOR[hover.status] }}>{hover.status}</span></div>
                    </div>
                )}

                <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] font-mono">
                    {Object.entries(STATUS_COLOR).map(([k, c]) => (
                        <div key={k} className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                            <span className="uppercase text-muted-foreground">{k}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
