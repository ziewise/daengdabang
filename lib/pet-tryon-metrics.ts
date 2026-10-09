"use client";

import { ddbApiBase, getCustomerToken } from "@/lib/customer-api";

export type PetTryOnMetric = "local_color_ready" | "local_color_unavailable" | "local_color_aborted"
    | "local_color_cache_hit" | "server_color_requested" | "result_image_cache_hit" | "result_image_download";
type Measurement = { event: PetTryOnMetric; duration_ms: number; bytes: number };
const ALLOWED = new Set<PetTryOnMetric>(["local_color_ready", "local_color_unavailable", "local_color_aborted",
    "local_color_cache_hit", "server_color_requested", "result_image_cache_hit", "result_image_download"]);
let pending: Measurement[] = [];
let owner = "";
let timer: ReturnType<typeof setTimeout> | undefined;
let lastFlush = 0;
let listening = false;

// Diagnostics never delay fitting work, contain no images/identities, and never retry.
export function recordPetTryOnMetric(event: PetTryOnMetric, durationMs = 0, bytes = 0) {
    try {
        if (typeof window === "undefined" || !ALLOWED.has(event)) return;
        const token = getCustomerToken();
        if (!token || !ddbApiBase()) { pending = []; owner = ""; return; }
        if (owner !== token) { pending = []; owner = token; }
        if (pending.length < 20) pending.push({ event,
            duration_ms: Math.round(Math.max(0, Math.min(60_000, Number.isFinite(durationMs) ? durationMs : 0))),
            bytes: Math.round(Math.max(0, Math.min(24 * 1024 * 1024, Number.isFinite(bytes) ? bytes : 0))),
        });
        if (!listening) {
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "hidden") flushPetTryOnMetrics();
            });
            window.addEventListener("pagehide", flushPetTryOnMetrics);
            listening = true;
        }
        if (timer === undefined) timer = setTimeout(flushPetTryOnMetrics, 30_000);
    } catch { /* Best-effort operational counters must not interrupt the customer. */ }
}

export function flushPetTryOnMetrics() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    try {
        const token = getCustomerToken();
        const base = ddbApiBase().replace(/\/$/, "");
        if (!token || token !== owner || !base) { pending = []; owner = ""; return; }
        if (!pending.length) return;
        const remaining = 30_000 - (Date.now() - lastFlush);
        if (remaining > 0) { timer = setTimeout(flushPetTryOnMetrics, remaining); return; }
        const batch = pending;
        pending = [];
        lastFlush = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        void fetch(`${base}/api/v1/pet-tryon/client-metrics`, {
            method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
            body: JSON.stringify({ events: batch }), credentials: "omit", cache: "no-store",
            redirect: "error", keepalive: true, signal: controller.signal,
        }).catch(() => undefined).finally(() => clearTimeout(timeout));
    } catch { pending = []; }
}
