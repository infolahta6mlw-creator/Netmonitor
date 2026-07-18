import React from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
    LayoutDashboard, Server, Activity, Bell, Share2, ScrollText,
    Users as UsersIcon, Radio, Settings as SettingsIcon, LogOut,
    Sun, Moon, Languages,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { NAV } from "../constants/testIds";
import { Button } from "./ui/button";
import { Toaster } from "./ui/sonner";

const NAV_ITEMS = [
    { key: "dashboard", to: "/", icon: LayoutDashboard, testId: NAV.linkDashboard },
    { key: "devices", to: "/devices", icon: Server, testId: NAV.linkDevices },
    { key: "traffic", to: "/traffic", icon: Activity, testId: NAV.linkTraffic },
    { key: "alerts", to: "/alerts", icon: Bell, testId: NAV.linkAlerts },
    { key: "topology", to: "/topology", icon: Share2, testId: NAV.linkTopology },
    { key: "logs", to: "/logs", icon: ScrollText, testId: NAV.linkLogs },
    { key: "users", to: "/users", icon: UsersIcon, testId: NAV.linkUsers, roles: ["superadmin", "admin"] },
    { key: "agents", to: "/agents", icon: Radio, testId: NAV.linkAgents, roles: ["superadmin", "admin"] },
    { key: "settings", to: "/settings", icon: SettingsIcon, testId: NAV.linkSettings },
];

export default function Layout() {
    const { user, logout, t, theme, setTheme, language, setLanguage, updateMySettings } = useApp();
    const navigate = useNavigate();

    const doLogout = async () => {
        await logout();
        navigate("/login");
    };

    const toggleTheme = async () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        try { await updateMySettings({ theme: next }); } catch {}
    };

    const toggleLang = async () => {
        const next = language === "id" ? "en" : "id";
        setLanguage(next);
        try { await updateMySettings({ language: next }); } catch {}
    };

    const items = NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(user?.role));

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            <aside
                data-testid={NAV.sidebar}
                className="w-60 shrink-0 border-r border-border/60 bg-card/40 flex flex-col relative z-10"
            >
                <div className="px-5 py-6 border-b border-border/60">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 border border-primary/40 bg-primary/10 flex items-center justify-center">
                            <div className="h-2 w-2 bg-primary rounded-full pulse-dot text-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold tracking-tight font-sans">{t("appName")}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{t("tagline")}</div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    {items.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.key}
                                to={item.to}
                                end={item.to === "/"}
                                data-testid={item.testId}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wider transition-colors border-l-2 ${
                                        isActive
                                            ? "border-primary bg-accent/40 text-foreground"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/20"
                                    }`
                                }
                            >
                                <Icon className="h-4 w-4" />
                                <span>{t(item.key)}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="px-3 py-3 border-t border-border/60 space-y-1">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            data-testid={NAV.themeToggle}
                            className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 border border-border/60 text-[10px] uppercase tracking-wider hover:bg-accent/40 transition-colors"
                        >
                            {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                            {theme === "dark" ? t("dark") : t("light")}
                        </button>
                        <button
                            onClick={toggleLang}
                            data-testid={NAV.langToggle}
                            className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 border border-border/60 text-[10px] uppercase tracking-wider hover:bg-accent/40 transition-colors"
                        >
                            <Languages className="h-3.5 w-3.5" />
                            {language.toUpperCase()}
                        </button>
                    </div>
                    <div className="px-2 py-2 border border-border/40 bg-secondary/30">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{user?.role}</div>
                        <div className="text-xs truncate font-mono">{user?.email}</div>
                    </div>
                    <button
                        onClick={doLogout}
                        data-testid={NAV.logoutBtn}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive hover:bg-accent/20 transition-colors"
                    >
                        <LogOut className="h-3.5 w-3.5" /> {t("logout")}
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0 relative z-10">
                <div className="w-full max-w-[2000px] mx-auto p-4 md:p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
            <Toaster position="top-right" richColors closeButton />
        </div>
    );
}
