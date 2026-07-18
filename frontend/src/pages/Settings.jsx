import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { SETTINGS } from "../constants/testIds";
import { Sun, Moon, Check } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "../lib/api";

export default function Settings() {
    const { t, user, updateMySettings, theme, language } = useApp();
    const [name, setName] = useState(user?.name || "");
    const [busy, setBusy] = useState(false);

    const setTheme = async (v) => {
        try { await updateMySettings({ theme: v }); toast.success(t("saved")); } catch (e) { toast.error(formatApiError(e)); }
    };
    const setLang = async (v) => {
        try { await updateMySettings({ language: v }); toast.success(t("saved")); } catch (e) { toast.error(formatApiError(e)); }
    };
    const saveName = async () => {
        setBusy(true);
        try { await updateMySettings({ name }); toast.success(t("saved")); } catch (e) { toast.error(formatApiError(e)); }
        setBusy(false);
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">// PREFERENCES</div>
                <h1 className="text-3xl font-sans font-semibold tracking-tight">{t("settings")}</h1>
            </div>

            <section className="border border-border/60 bg-card/40 p-5 space-y-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">{t("profile")}</div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("email")}</label>
                        <div className="mt-1 border border-border/60 px-3 py-2 font-mono bg-secondary/30">{user?.email}</div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("role")}</label>
                        <div className="mt-1 border border-border/60 px-3 py-2 font-mono bg-secondary/30 uppercase">{user?.role}</div>
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("name")}</label>
                        <div className="flex gap-2 mt-1">
                            <input value={name} onChange={(e) => setName(e.target.value)}
                                data-testid={SETTINGS.nameInput}
                                className="flex-1 bg-input/30 border border-border px-3 py-2 font-mono focus:outline-none focus:border-primary" />
                            <button onClick={saveName} disabled={busy} data-testid={SETTINGS.saveBtn}
                                className="px-3 py-2 text-[10px] uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                                {t("save")}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border border-border/60 bg-card/40 p-5 space-y-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">{t("theme")}</div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setTheme("dark")} data-testid={SETTINGS.themeDark}
                        className={`border ${theme === "dark" ? "border-primary bg-primary/10" : "border-border"} p-4 flex items-center gap-3 hover:bg-accent/40 transition-colors`}>
                        <Moon className="h-5 w-5" />
                        <div className="text-left flex-1">
                            <div className="text-xs font-sans font-medium">{t("dark")}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">NOC / Terminal</div>
                        </div>
                        {theme === "dark" && <Check className="h-4 w-4 text-primary" />}
                    </button>
                    <button onClick={() => setTheme("light")} data-testid={SETTINGS.themeLight}
                        className={`border ${theme === "light" ? "border-primary bg-primary/10" : "border-border"} p-4 flex items-center gap-3 hover:bg-accent/40 transition-colors`}>
                        <Sun className="h-5 w-5" />
                        <div className="text-left flex-1">
                            <div className="text-xs font-sans font-medium">{t("light")}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">Swiss / High-Contrast</div>
                        </div>
                        {theme === "light" && <Check className="h-4 w-4 text-primary" />}
                    </button>
                </div>
            </section>

            <section className="border border-border/60 bg-card/40 p-5 space-y-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">{t("language")}</div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setLang("id")} data-testid={SETTINGS.langId}
                        className={`border ${language === "id" ? "border-primary bg-primary/10" : "border-border"} p-4 flex items-center gap-3 hover:bg-accent/40 transition-colors`}>
                        <div className="h-6 w-6 border border-border grid grid-rows-2">
                            <div className="bg-red-600" />
                            <div className="bg-white" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="text-xs font-sans font-medium">Bahasa Indonesia</div>
                            <div className="text-[10px] font-mono text-muted-foreground">ID</div>
                        </div>
                        {language === "id" && <Check className="h-4 w-4 text-primary" />}
                    </button>
                    <button onClick={() => setLang("en")} data-testid={SETTINGS.langEn}
                        className={`border ${language === "en" ? "border-primary bg-primary/10" : "border-border"} p-4 flex items-center gap-3 hover:bg-accent/40 transition-colors`}>
                        <div className="h-6 w-8 border border-border bg-blue-800 flex items-center justify-center text-white text-[10px] font-bold">EN</div>
                        <div className="text-left flex-1">
                            <div className="text-xs font-sans font-medium">English</div>
                            <div className="text-[10px] font-mono text-muted-foreground">EN</div>
                        </div>
                        {language === "en" && <Check className="h-4 w-4 text-primary" />}
                    </button>
                </div>
            </section>
        </div>
    );
}
