import React, { useEffect, useState } from "react";
import { api, formatApiError, BACKEND_URL } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { AGENTS } from "../constants/testIds";
import { Copy, Download, Plus, Trash2, X, Terminal } from "lucide-react";
import { toast } from "sonner";

function formatDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
}

export default function Agents() {
    const { t } = useApp();
    const [agents, setAgents] = useState([]);
    const [dialog, setDialog] = useState(false);
    const [name, setName] = useState("");
    const [cidr, setCidr] = useState("192.168.1.0/24");

    const load = async () => {
        try { const { data } = await api.get("/agents"); setAgents(data); } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i); }, []);

    const create = async (e) => {
        e.preventDefault();
        try {
            await api.post("/agents", { name, network_cidr: cidr });
            toast.success(t("saved"));
            setDialog(false); setName(""); setCidr("192.168.1.0/24");
            load();
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const del = async (id) => {
        if (!window.confirm(t("confirmDelete"))) return;
        try { await api.delete(`/agents/${id}`); load(); } catch (e) { toast.error(formatApiError(e)); }
    };

    const copy = (txt) => {
        navigator.clipboard.writeText(txt);
        toast.success("Copied");
    };

    const downloadScript = async () => {
        try {
            const { data } = await api.get("/agents/install-script");
            const blob = new Blob([data.script], { type: "text/x-python" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = data.filename;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
            toast.success("Downloaded");
        } catch (e) { toast.error(formatApiError(e)); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-baseline justify-between">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">// AGENTS</div>
                    <h1 className="text-3xl font-sans font-semibold tracking-tight">{t("agents")}</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={downloadScript} data-testid={AGENTS.downloadBtn}
                        className="inline-flex items-center gap-2 border border-border px-3 py-2 text-[10px] uppercase tracking-widest hover:bg-accent/40">
                        <Download className="h-3.5 w-3.5" /> {t("downloadScript")}
                    </button>
                    <button onClick={() => setDialog(true)} data-testid={AGENTS.addBtn}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 text-[10px] uppercase tracking-widest font-semibold hover:opacity-90">
                        <Plus className="h-3.5 w-3.5" /> {t("addAgent")}
                    </button>
                </div>
            </div>

            <div className="border border-border/60 bg-card/40 p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-3">
                    <Terminal className="h-3.5 w-3.5" /> {t("agentSetup")}
                </div>
                <div className="text-xs font-mono text-muted-foreground space-y-1">
                    <p>{t("agentInstructions")}</p>
                    <pre className="mt-3 bg-secondary/50 border border-border p-3 overflow-x-auto text-[11px] leading-relaxed">
{`# On a machine inside your LAN:
export AGENT_KEY="<paste-agent-api-key>"
export BACKEND_URL="${BACKEND_URL}"
export CIDR="192.168.1.0/24"
python3 netmon_agent.py`}
                    </pre>
                </div>
            </div>

            <div data-testid={AGENTS.list} className="border border-border/60 bg-card/40 overflow-x-auto">
                <table className="w-full text-xs font-mono">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/60">
                            <th className="text-left px-3 py-2">{t("agentName")}</th>
                            <th className="text-left px-3 py-2">{t("networkCidr")}</th>
                            <th className="text-left px-3 py-2">{t("apiKey")}</th>
                            <th className="text-left px-3 py-2">{t("status")}</th>
                            <th className="text-left px-3 py-2">{t("lastSeen")}</th>
                            <th className="text-right px-3 py-2">{t("actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agents.map((a) => (
                            <tr key={a.id} className="border-b border-border/30 hover:bg-accent/20">
                                <td className="px-3 py-2">{a.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">{a.network_cidr}</td>
                                <td className="px-3 py-2">
                                    <button onClick={() => copy(a.api_key)} data-testid={AGENTS.keyCopy(a.id)}
                                        className="inline-flex items-center gap-1.5 border border-border px-2 py-1 hover:bg-accent/40 text-[10px]">
                                        <Copy className="h-3 w-3" /> {a.api_key.substring(0, 12)}…
                                    </button>
                                </td>
                                <td className="px-3 py-2 uppercase text-[10px]">
                                    <span className={a.last_seen && (Date.now() - new Date(a.last_seen).getTime()) < 120000 ? "text-success" : "text-muted-foreground"}>
                                        {a.last_seen && (Date.now() - new Date(a.last_seen).getTime()) < 120000 ? "ONLINE" : "OFFLINE"}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{formatDateTime(a.last_seen)}</td>
                                <td className="px-3 py-2 text-right">
                                    <button onClick={() => del(a.id)} className="p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {agents.length === 0 && (
                            <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">{t("empty")}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {dialog && (
                <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={create} className="w-full max-w-md border border-border bg-card p-6 space-y-4 fade-up">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-sans font-semibold uppercase tracking-widest">{t("addAgent")}</h3>
                            <button type="button" onClick={() => setDialog(false)}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
                        </div>
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("agentName")}</label>
                                <input value={name} onChange={(e) => setName(e.target.value)} required
                                    className="mt-1 w-full bg-input/30 border border-border px-2 py-1.5 font-mono focus:outline-none focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("networkCidr")}</label>
                                <input value={cidr} onChange={(e) => setCidr(e.target.value)} required
                                    className="mt-1 w-full bg-input/30 border border-border px-2 py-1.5 font-mono focus:outline-none focus:border-primary" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                            <button type="button" onClick={() => setDialog(false)}
                                className="px-3 py-1.5 text-[10px] uppercase tracking-widest border border-border hover:bg-accent/40">{t("cancel")}</button>
                            <button type="submit"
                                className="px-3 py-1.5 text-[10px] uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90">{t("save")}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
