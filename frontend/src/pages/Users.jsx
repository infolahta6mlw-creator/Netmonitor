import React, { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { USERS } from "../constants/testIds";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["superadmin", "admin", "viewer"];

export default function Users() {
    const { t, user } = useApp();
    const [users, setUsers] = useState([]);
    const isSuper = user?.role === "superadmin";

    const load = async () => {
        try { const { data } = await api.get("/users"); setUsers(data); } catch (e) { toast.error(formatApiError(e)); }
    };
    useEffect(() => { load(); }, []);

    const setRole = async (id, role) => {
        try {
            await api.patch(`/users/${id}`, { role });
            toast.success(t("saved"));
            load();
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const del = async (id) => {
        if (!window.confirm(t("confirmDelete"))) return;
        try { await api.delete(`/users/${id}`); load(); } catch (e) { toast.error(formatApiError(e)); }
    };

    return (
        <div className="space-y-4">
            <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">// RBAC</div>
                <h1 className="text-3xl font-sans font-semibold tracking-tight">{t("users")}</h1>
            </div>

            <div className="border border-border/60 bg-card/40 overflow-x-auto">
                <table data-testid={USERS.table} className="w-full text-xs font-mono">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/60">
                            <th className="text-left px-3 py-2">{t("email")}</th>
                            <th className="text-left px-3 py-2">{t("name")}</th>
                            <th className="text-left px-3 py-2">{t("role")}</th>
                            <th className="text-left px-3 py-2">{t("language")}</th>
                            <th className="text-left px-3 py-2">{t("theme")}</th>
                            <th className="text-right px-3 py-2">{t("actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id} className="border-b border-border/30 hover:bg-accent/20">
                                <td className="px-3 py-2">{u.email}</td>
                                <td className="px-3 py-2 text-muted-foreground">{u.name}</td>
                                <td className="px-3 py-2">
                                    {isSuper ? (
                                        <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)}
                                            data-testid={USERS.roleSelect(u.id)}
                                            className="bg-input/30 border border-border px-2 py-1 focus:outline-none focus:border-primary">
                                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    ) : (
                                        <span className="uppercase text-[10px]">{u.role}</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground uppercase text-[10px]">{u.language}</td>
                                <td className="px-3 py-2 text-muted-foreground uppercase text-[10px]">{u.theme}</td>
                                <td className="px-3 py-2 text-right">
                                    {isSuper && u.id !== user?.id && (
                                        <button onClick={() => del(u.id)} data-testid={USERS.deleteBtn(u.id)}
                                            className="p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">{t("empty")}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
