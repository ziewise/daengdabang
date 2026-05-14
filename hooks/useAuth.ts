/**
 * hooks/useAuth — 클라이언트 인증 상태 hook
 * ---------------------------------------------------------------------
 * useSyncExternalStore 패턴 — localStorage 변화가 자동 sync.
 * SSR 시점엔 null, 마운트 후 실제 값으로 hydrate.
 */
"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { authStorage, migratePendingPet, snapshots, subscribeStorage } from "@/lib/storage";
import type { AuthProvider } from "@/lib/types";

const subscribe = (cb: () => void) => subscribeStorage("AUTH", cb);
const getServerSnapshot = () => null;

export function useAuth() {
    const state = useSyncExternalStore(subscribe, snapshots.auth, getServerSnapshot);

    // hydrated — 서버 첫 렌더와 클라이언트 첫 렌더 모두 false → 동일.
    // useEffect 는 클라이언트에서만 실행되므로 마운트 직후 true 로 전환.
    // typeof window 체크는 클라 첫 렌더에서 곧장 true 가 되어 hydration mismatch 유발 → 사용 금지.
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        setHydrated(true);
    }, []);

    // storage.ts 의 writeJSON/removeKey 가 같은 탭 구독자에게 자동 통지하므로
    // 별도의 dispatchEvent 호출 불필요.
    const login = (provider: AuthProvider = "email") => {
        authStorage.set({ provider, ts: Date.now() });
        migratePendingPet();
    };

    const logout = () => {
        authStorage.clear();
    };

    return {
        state,
        isLoggedIn: !!state,
        hydrated,
        login,
        logout,
    };
}
