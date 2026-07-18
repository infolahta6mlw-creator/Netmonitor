import React from "react";

const CFG = {
    online: { label: "ONLINE", dot: "bg-success text-success", pulse: true },
    offline: { label: "OFFLINE", dot: "bg-destructive text-destructive", pulse: false },
    warning: { label: "WARNING", dot: "bg-warning text-warning", pulse: false },
    unknown: { label: "UNKNOWN", dot: "bg-muted-foreground text-muted-foreground", pulse: false },
    critical: { label: "CRITICAL", dot: "bg-destructive text-destructive", pulse: true },
    info: { label: "INFO", dot: "bg-chart-2 text-chart-2", pulse: false },
};

export function StatusBadge({ status, label }) {
    const cfg = CFG[status] || CFG.unknown;
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider">
            <span className="relative inline-flex h-1.5 w-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot.split(" ")[0]}`} />
                {cfg.pulse && (
                    <span className={`absolute inset-0 rounded-full ${cfg.dot.split(" ")[0]} pulse-dot`} />
                )}
            </span>
            <span className="text-foreground/80">{label || cfg.label}</span>
        </span>
    );
}
