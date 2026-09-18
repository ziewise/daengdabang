"use client";

import { useSyncExternalStore } from "react";
import { ddbApiBase } from "../ddb-api-base";
import { applyLiveInventory, parseLiveInventory, type LiveInventory } from "./live-inventory-state";
import type { CatalogProduct } from "./types";

let snapshot: LiveInventory | null = null;
let pending: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

async function refresh() {
    if (pending) return pending;
    pending = (async () => {
        try {
            const response = await fetch(`${ddbApiBase()}/api/v1/products/availability`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
            if (!response.ok) throw new Error("Availability unavailable");
            snapshot = parseLiveInventory(await response.json());
        } catch {
            snapshot = { products: snapshot?.products || {}, receivedAt: snapshot?.receivedAt || 0, failed: true };
        } finally {
            pending = null;
            notify();
        }
    })();
    return pending;
}

function onFocus() { void refresh(); }
function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) {
        void refresh();
        timer = setInterval(() => {
            if (snapshot) snapshot = { ...snapshot };
            notify();
            void refresh();
        }, 60_000);
        window.addEventListener("focus", onFocus);
    }
    return () => {
        listeners.delete(listener);
        if (!listeners.size) {
            clearInterval(timer);
            window.removeEventListener("focus", onFocus);
        }
    };
}

export function liveInventoryProduct(product: CatalogProduct): CatalogProduct {
    return applyLiveInventory(product, snapshot);
}

export function useLiveInventoryProduct(product: CatalogProduct): CatalogProduct {
    const current = useSyncExternalStore(subscribe, () => snapshot, () => null);
    return applyLiveInventory(product, current);
}
