/**
 * hooks/useAuth — 클라이언트 인증 상태 hook
 * ---------------------------------------------------------------------
 * localStorage 변화 (다른 탭/페이지)도 storage 이벤트로 자동 반영.
 */
"use client";
import { useEffect, useState } from "react";
import { authStorage, migratePendingPet, onStorageChange } from "@/lib/storage";
import type { LoginState, AuthProvider } from "@/lib/types";

export function useAuth() {
    const [state, setState] = useState<LoginState | null>(null);
    const [hydrated, setHydrated] = useState(false);

    // 마운트 시 로컬 상태 동기화 (SSR 직후 hydrate)
    useEffect(() => {
        setState(authStorage.get());
        setHydrated(true);
        const unsubscribe = onStorageChange("AUTH", () => {
            setState(authStorage.get());
        });
        return unsubscribe;
    }, []);

    const login = (provider: AuthProvider = "email") => {
        const next: LoginState = { provider, ts: Date.now() };
        authStorage.set(next);
        migratePendingPet();   // 비회원 분석 결과 자동 이관
        setState(next);
    };

    const logout = () => {
        authStorage.clear();
        setState(null);
    };

    return {
        state,
        isLoggedIn: !!state,
        hydrated,            // SSR 깜빡임 방지 — 첫 paint 에서 false
        login,
        logout,
    };
}
