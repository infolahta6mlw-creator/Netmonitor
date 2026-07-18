import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { AUTH } from "../constants/testIds";
import { formatApiError } from "../lib/api";
import { Terminal, ArrowRight } from "lucide-react";

export default function Login() {
    const { login, t } = useApp();
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setErr("");
        try {
            await login(email, password);
            nav("/");
        } catch (e) {
            setErr(formatApiError(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-background text-foreground">
            <div className="hidden lg:flex flex-1 relative border-r border-border/60 overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1456428746267-a1756408f782?crop=entropy&cs=srgb&fm=jpg&q=85"
                    alt="network"
                    className="absolute inset-0 h-full w-full object-cover opacity-30"
                />
                <div className="absolute inset-0 grid-bg opacity-20" />
                <div className="relative z-10 p-12 flex flex-col justify-between w-full">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-primary" />
                        <span className="font-sans font-semibold tracking-tight text-lg">NetMon</span>
                    </div>
                    <div className="max-w-md">
                        <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-4">// NOC.DASHBOARD</div>
                        <h1 className="text-4xl font-sans font-light tracking-tight leading-tight mb-6">
                            Pantau seluruh jaringan lokal Anda.
                        </h1>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Device inventory, real-time bandwidth, alert center, topology map, dan audit trail — semua di satu tempat.
                        </p>
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        v1.0 · SECURE · JWT
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-[480px] flex items-center justify-center p-8">
                <form onSubmit={submit} className="w-full max-w-sm space-y-6 fade-up">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">// AUTH</div>
                        <h2 className="text-2xl font-sans font-medium tracking-tight">{t("loginTitle")}</h2>
                        <p className="text-xs text-muted-foreground mt-1">{t("loginSubtitle")}</p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("email")}</label>
                            <input
                                type="email" required autoFocus autoComplete="email"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                data-testid={AUTH.emailInput}
                                className="mt-1 w-full bg-input/30 border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
                                placeholder="admin@netmon.local"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("password")}</label>
                            <input
                                type="password" required autoComplete="current-password"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                data-testid={AUTH.passwordInput}
                                className="mt-1 w-full bg-input/30 border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {err && (
                        <div data-testid={AUTH.errorMsg} className="border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono">
                            {err}
                        </div>
                    )}

                    <button
                        type="submit" disabled={busy}
                        data-testid={AUTH.submitBtn}
                        className="w-full inline-flex items-center justify-between gap-2 bg-primary text-primary-foreground px-4 py-2.5 text-xs uppercase tracking-widest font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {busy ? t("signingIn") : t("signIn")}
                        <ArrowRight className="h-4 w-4" />
                    </button>

                    <div className="text-xs text-muted-foreground text-center">
                        {t("noAccount")}{" "}
                        <Link to="/register" data-testid={AUTH.toggleModeBtn} className="text-primary hover:underline">
                            {t("signUp")}
                        </Link>
                    </div>

                    <div className="border-t border-border/40 pt-4 text-[10px] font-mono text-muted-foreground space-y-0.5">
                        <div>DEMO SUPERADMIN → admin@netmon.io / Admin@2026</div>
                        <div>DEMO VIEWER → viewer@netmon.io / Viewer@2026</div>
                    </div>
                </form>
            </div>
        </div>
    );
}
