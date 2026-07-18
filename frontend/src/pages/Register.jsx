import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { AUTH } from "../constants/testIds";
import { formatApiError } from "../lib/api";
import { Terminal, ArrowRight } from "lucide-react";

export default function Register() {
    const { register, t } = useApp();
    const nav = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setErr("");
        try {
            await register(email, password, name);
            nav("/");
        } catch (e) {
            setErr(formatApiError(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
            <form onSubmit={submit} className="w-full max-w-sm space-y-6 fade-up border border-border/60 p-8 bg-card/60">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Terminal className="h-4 w-4 text-primary" />
                        <span className="font-sans font-semibold tracking-tight">NetMon</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">// REGISTER</div>
                    <h2 className="text-2xl font-sans font-medium tracking-tight">{t("registerTitle")}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{t("registerSubtitle")}</p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("name")}</label>
                        <input
                            type="text" value={name} onChange={(e) => setName(e.target.value)}
                            data-testid={AUTH.nameInput}
                            className="mt-1 w-full bg-input/30 border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("email")}</label>
                        <input
                            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            data-testid={AUTH.emailInput}
                            className="mt-1 w-full bg-input/30 border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("password")}</label>
                        <input
                            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                            data-testid={AUTH.passwordInput}
                            className="mt-1 w-full bg-input/30 border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
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
                    className="w-full inline-flex items-center justify-between bg-primary text-primary-foreground px-4 py-2.5 text-xs uppercase tracking-widest font-semibold hover:opacity-90 disabled:opacity-50"
                >
                    {t("signUp")} <ArrowRight className="h-4 w-4" />
                </button>

                <div className="text-xs text-muted-foreground text-center">
                    {t("haveAccount")}{" "}
                    <Link to="/login" data-testid={AUTH.toggleModeBtn} className="text-primary hover:underline">
                        {t("signIn")}
                    </Link>
                </div>
            </form>
        </div>
    );
}
