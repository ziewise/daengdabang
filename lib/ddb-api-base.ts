import { Capacitor } from "@capacitor/core";

function inferredApiBase() {
    if (typeof window === "undefined") return "";
    if (Capacitor.isNativePlatform()) return "https://api.daengdabang.com";
    if (window.location.hostname === "daengdabang.com" || window.location.hostname === "www.daengdabang.com") {
        return "https://api.daengdabang.com";
    }
    return "";
}

/**
 * Production builds accept only the deployed environment configuration or the
 * fixed DaengDaBang origin mapping. The localStorage override is a development
 * convenience and must not even be read in production.
 */
export function ddbApiBase() {
    const envBase = process.env.NEXT_PUBLIC_DDB_API_BASE || process.env.NEXT_PUBLIC_API_URL || "";
    if (typeof window === "undefined") return envBase;

    const trustedBase = envBase || inferredApiBase();
    if (trustedBase || process.env.NODE_ENV === "production") return trustedBase;

    return window.localStorage.getItem("ddb.apiBase") || "";
}
