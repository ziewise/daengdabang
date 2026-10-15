"use client";

/**
 * useAppMode — 지금 "앱으로 보고 있는가" 판별 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 탭바는 앱에서만 보인다. 앱으로 보는 경우:
 *  1) 네이티브 앱(Capacitor) 안 · 2) 홈 화면에 설치한 PWA(standalone) 실행
 *  3) 브라우저에서 /app/ 화면에 들어온 뒤 — 같은 탭(세션)에서는 쇼핑몰 화면으로 가도 앱 틀 유지
 * 로컬 확인용: 주소 끝에 ?app=0 을 붙이면 앱 모드를 끄고, ?app=1 이면 켠다.
 */

import { useEffect, useSyncExternalStore } from "react";
import { usePwaInstall } from "@/components/pwa/PwaInstallProvider";

const FLAG_KEY = "ddb.appMode.v1";
const CHANGE_EVENT = "ddb-app-mode-change";

// sessionStorage 는 사생활 보호 모드 등에서 막힐 수 있어 항상 try/catch
function readFlag(): boolean {
    try {
        return window.sessionStorage.getItem(FLAG_KEY) === "1";
    } catch {
        return false;
    }
}

function writeFlag(on: boolean) {
    try {
        if (on) window.sessionStorage.setItem(FLAG_KEY, "1");
        else window.sessionStorage.removeItem(FLAG_KEY);
    } catch {
        /* 저장 못 해도 /app/ 화면에서는 경로로 앱 모드가 켜진다 */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** 효과(useEffect) 안에서 바로 쓰는 판별 — 앱 틀보다 먼저 실행되는 자식 화면용(예: 쇼핑 탭에서 인트로 영상 건너뛰기) */
export function isAppModeNow(): boolean {
    const nav = navigator as Navigator & { standalone?: boolean };
    const native = Boolean((window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
    return native || readFlag() || window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export const isAppPath = (pathname: string) => pathname === "/app" || pathname.startsWith("/app/");

export function useAppMode(pathname: string): boolean {
    const { isStandalone, isNativeApp } = usePwaInstall();
    // 서버 렌더 · 첫 하이드레이션은 false — 브라우저에서 저장값을 읽은 뒤 다시 그린다
    const stored = useSyncExternalStore(subscribe, readFlag, () => false);

    useEffect(() => {
        const param = new URLSearchParams(window.location.search).get("app");
        if (param === "0") writeFlag(false);
        else if (param === "1" || isAppPath(pathname)) {
            if (!readFlag()) writeFlag(true);
        }
    }, [pathname]);

    // /app/ 화면은 항상 앱 틀 — 그 밖의 화면은 네이티브 · 설치 앱 · 저장값으로
    return isNativeApp || isStandalone || stored || isAppPath(pathname);
}
