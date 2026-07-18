import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";
import { translations } from "../i18n/translations";

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [user, setUser] = useState(null); // null=loading, false=logged out, obj=logged in
    const [language, setLanguage] = useState(() => localStorage.getItem("netmon.lang") || "id");
    const [theme, setTheme] = useState(() => localStorage.getItem("netmon.theme") || "dark");

    // apply theme to document
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
        localStorage.setItem("netmon.theme", theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem("netmon.lang", language);
    }, [language]);

    // load session
    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/auth/me");
                setUser(data);
                if (data.language) setLanguage(data.language);
                if (data.theme) setTheme(data.theme);
            } catch {
                setUser(false);
            }
        })();
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        setUser(data);
        if (data.language) setLanguage(data.language);
        if (data.theme) setTheme(data.theme);
        return data;
    };

    const register = async (email, password, name) => {
        const { data } = await api.post("/auth/register", { email, password, name });
        setUser(data);
        return data;
    };

    const logout = async () => {
        try { await api.post("/auth/logout"); } catch {}
        setUser(false);
    };

    const updateMySettings = async (patch) => {
        const { data } = await api.patch("/users/me/settings", patch);
        setUser(data);
        if (patch.language) setLanguage(patch.language);
        if (patch.theme) setTheme(patch.theme);
        return data;
    };

    const t = useCallback((key) => translations[language]?.[key] ?? translations.en[key] ?? key, [language]);

    return (
        <AppContext.Provider value={{
            user, setUser,
            language, setLanguage,
            theme, setTheme,
            login, register, logout,
            updateMySettings,
            t, formatApiError,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
