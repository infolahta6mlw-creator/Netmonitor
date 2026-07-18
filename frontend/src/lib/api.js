import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
    baseURL: API,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

export function formatApiError(err) {
    const d = err?.response?.data?.detail;
    if (d == null) return err?.message || "Terjadi kesalahan";
    if (typeof d === "string") return d;
    if (Array.isArray(d))
        return d.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
    if (d && typeof d.msg === "string") return d.msg;
    return String(d);
}
