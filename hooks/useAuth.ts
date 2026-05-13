/**
 * hooks/useAuth — 클라이언트 인증 상태 hook
 * ---------------------------------------------------------------------
 * useSyncExternalStore 패턴 — localStorage 변화가 자동 sync.
 * SSR 시점엔 null, 마운트 후 실제 값으로 hydrate.
 */
"use client";
import { useSyncExternalStore } from "react";
import { authStorage, migratePendingPet, snapshots, subscribeStorage } from "@/lib/storage";
import type { AuthProvider } from "@/lib/types";

const subscribe = (cb: () => void) => subscribeStorage("AUTH", cb);
const getServerSnapshot = () => null;

export function useAuth() {
    const state = useSyncExternalStore(subscribe, snapshots.auth, getServerSnapshot);
    // hydrated — useSyncExternalStore 자체가 SSR/CSR 불일치 처리하지만,
    // 컴포넌트에서 "첫 paint vs mount 후" 구분이 필요할 때 사용.
    // CSR 에선 마운트 시점부터 항상 true, SSR snapshot 은 null 반환하므로 hydration 안전.
    const hydrated = typeof window !== "undefined";

    const login = (provider: AuthProvider = "email") => {
        authStorage.set({ provider, ts: Date.now() });
        migratePendingPet();
        // useSyncExternalStore 가 storage 이벤트로 자동 갱신 — 다만 같은 탭은
        // storage 이벤트 발화 안 함. 강제 갱신 위해 dispatchEvent.
        if (typeof window !== "undefined") {
            window.dispatchEvent(new StorageEvent("storage", { key: "daengdabang_logged_in" }));
        }
    };

    const logout = () => {
        authStorage.clear();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new StorageEvent("storage", { key: "daengdabang_logged_in" }));
        }
    };

    return {
        state,
        isLoggedIn: !!state,
        hydrated,
        login,
        logout,
    };
}
