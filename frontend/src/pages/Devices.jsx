import React, { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { DEVICES } from "../constants/testIds";
import { StatusBadge } from "../components/StatusBadge";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const TYPES = ["router", "switch", "server", "workstation", "printer", "iot", "camera", "access_point", "phone", "unknown"];
const STATUSES = ["online", "offline", "warning", "unknown"];

function formatUptime(sec) {
    if (!sec) return "—";
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    if (d > 0) return `${d}d ${h}h`;
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export default function Devices() {
    const { t, user } = useApp();
    const [devices, setDevices] = useState([]);
    const [q, setQ] = useState("");
    const [dialog, setDialog] = useState(null); // null | 'new' | {device}
    const canEdit = ["superadmin", "admin"].includes(user?.role);

    const load = async () => {
        try {
            const { data } = await api.get("/devices");
            setDevices(data);
        } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => { load(); }, []);

    const filtered = devices.filter((d) =>
        !q || [d.hostname, d.ip_address, d.mac_address, d.location, d.device_type].some((v) => (v || "").toLowerCase().includes(q.toLowerCase()))
    );

    const del = async (id) => {
        if (!window.confirm(t("confirmDelete"))) return;
        try {
            await api.delete(`/devices/${id}`);
            toast.success(t("success"));
            load();
        } catch (e) { toast.error(formatApiError(e)); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-baseline justify-between">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">// INVENTORY</div>
                    <h1 className="text-3xl font-sans font-semibold tracking-tight">{t("devices")}</h1>
                </div>
                {canEdit && (
                    <button
                        onClick={() => setDialog("new")}
                        data-testid={DEVICES.addBtn}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 text-[10px] uppercase tracking-widest font-semibold hover:opacity-90"
                    >
                        <Plus className="h-3.5 w-3.5" /> {t("addDevice")}
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 border border-border/60 bg-card/40 px-3 py-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                    value={q} onChange={(e) => setQ(e.target.value)}
                    placeholder={t("search")}
                    data-testid={DEVICES.searchInput}
                    className="flex-1 bg-transparent text-xs font-mono focus:outline-none"
                />
                <span className="text-[10px] font-mono text-muted-foreground">{filtered.length} / {devices.length}</span>
            </div>

            <div className="border border-border/60 bg-card/40 overflow-auto">
                <table data-testid={DEVICES.table} className="w-full text-xs font-mono">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/60">
                            <th className="text-left px-3 py-2">{t("hostname")}</th>
                            <th className="text-left px-3 py-2">{t("ipAddress")}</th>
                            <th className="text-left px-3 py-2">{t("macAddress")}</th>
                            <th className="text-left px-3 py-2">{t("deviceType")}</th>
                            <th className="text-left px-3 py-2">{t("location")}</th>
                            <th className="text-left px-3 py-2">{t("status")}</th>
                            <th className="text-left px-3 py-2">{t("uptime")}</th>
                            <th className="text-left px-3 py-2">{t("latency")}</th>
                            {canEdit && <th className="text-right px-3 py-2">{t("actions")}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((d) => (
                            <tr key={d.id} data-testid={DEVICES.row(d.id)} className="border-b border-border/30 hover:bg-accent/20 transition-colors">
                                <td className="px-3 py-2 text-foreground">{d.hostname}</td>
                                <td className="px-3 py-2 text-muted-foreground">{d.ip_address}</td>
                                <td className="px-3 py-2 text-muted-foreground">{d.mac_address || "—"}</td>
                                <td className="px-3 py-2 text-muted-foreground uppercase text-[10px]">{d.device_type}</td>
                                <td className="px-3 py-2 text-muted-foreground">{d.location || "—"}</td>
                                <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                                <td className="px-3 py-2 text-muted-foreground">{formatUptime(d.uptime_seconds)}</td>
                                <td className="px-3 py-2 text-muted-foreground">{d.latency_ms}ms</td>
                                {canEdit && (
                                    <td className="px-3 py-2 text-right">
                                        <div className="inline-flex gap-1">
                                            <button onClick={() => setDialog({ device: d })} data-testid={DEVICES.editBtn(d.id)} className="p-1 hover:bg-accent/40 text-muted-foreground hover:text-foreground">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => del(d.id)} data-testid={DEVICES.deleteBtn(d.id)} className="p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">{t("empty")}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {dialog && (
                <DeviceDialog
                    devices={devices}
                    initial={dialog.device}
                    onClose={() => setDialog(null)}
                    onSaved={() => { setDialog(null); load(); }}
                />
            )}
        </div>
    );
}

function DeviceDialog({ initial, devices, onClose, onSaved }) {
    const { t } = useApp();
    const [form, setForm] = useState(initial || {
        hostname: "", ip_address: "", mac_address: "",
        device_type: "unknown", location: "", notes: "", parent_id: "", status: "unknown",
    });
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const payload = { ...form, parent_id: form.parent_id || null };
            if (initial?.id) await api.patch(`/devices/${initial.id}`, payload);
            else await api.post("/devices", payload);
            toast.success(t("saved"));
            onSaved();
        } catch (e) { toast.error(formatApiError(e)); }
        finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={submit} className="w-full max-w-lg border border-border bg-card p-6 space-y-4 fade-up">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-sans font-semibold uppercase tracking-widest">{initial ? t("edit") : t("addDevice")}</h3>
                    <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                    <Field label={t("hostname")} value={form.hostname} onChange={(v) => setForm({ ...form, hostname: v })} required />
                    <Field label={t("ipAddress")} value={form.ip_address} onChange={(v) => setForm({ ...form, ip_address: v })} required />
                    <Field label={t("macAddress")} value={form.mac_address} onChange={(v) => setForm({ ...form, mac_address: v })} />
                    <SelectField label={t("deviceType")} value={form.device_type} options={TYPES} onChange={(v) => setForm({ ...form, device_type: v })} />
                    <Field label={t("location")} value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
                    <SelectField label={t("status")} value={form.status} options={STATUSES} onChange={(v) => setForm({ ...form, status: v })} />
                    <div className="col-span-2">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("parent")}</label>
                        <select value={form.parent_id || ""} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                            className="mt-1 w-full bg-input/30 border border-border px-2 py-1.5 font-mono focus:outline-none focus:border-primary">
                            <option value="">—</option>
                            {devices.filter((d) => d.id !== initial?.id).map((d) => <option key={d.id} value={d.id}>{d.hostname} ({d.ip_address})</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("notes")}</label>
                        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                            className="mt-1 w-full bg-input/30 border border-border px-2 py-1.5 font-mono focus:outline-none focus:border-primary" />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                    <button type="button" onClick={onClose} data-testid="device-dialog-cancel"
                        className="px-3 py-1.5 text-[10px] uppercase tracking-widest border border-border hover:bg-accent/40">{t("cancel")}</button>
                    <button type="submit" disabled={busy} data-testid="device-dialog-submit"
                        className="px-3 py-1.5 text-[10px] uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">{t("save")}</button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, value, onChange, required, type = "text" }) {
    return (
        <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
            <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required}
                className="mt-1 w-full bg-input/30 border border-border px-2 py-1.5 font-mono focus:outline-none focus:border-primary" />
        </div>
    );
}

function SelectField({ label, value, options, onChange }) {
    return (
        <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
            <select value={value} onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full bg-input/30 border border-border px-2 py-1.5 font-mono focus:outline-none focus:border-primary">
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}
