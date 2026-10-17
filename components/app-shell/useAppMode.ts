"use client";

/**
 * useAppMode — 지금 "앱으로 보고 있는가" 판별 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 앱 틀(앱 상단바 · 탭바)은 진짜 앱으로 열었을 때만 보인다(배포 기준):
 *  1) 네이티브 앱(Capacitor, APK) 안 · 2) 홈 화면에 설치한 PWA(standalone, 아이폰 포함)
 *  일반 브라우저(PC · 모바일)는 어떤 주소든 앱 틀 없음 — /app 은 협업자가 만든 대로 웹 상단바 + 앱 홈(설치 안내)
 * 개발 서버(npm run dev)에서만 시안 확인용으로: /app/ 화면은 앱 틀, 주소 끝 ?app=1 이면 같은 탭에서 계속 앱 틀, ?app=0 이면 끔.
 * 운영 빌드에서는 개발용 규칙이 꺼져 브라우저 방문자에게 앱 틀이 보이지 않는다.
 */

import { useEffect, useSyncExternalStore } from "react";
import { usePwaInstall } from "@/components/pwa/PwaInstallProvider";

const FLAG_KEY = "ddb.appMode.v1";
// 개발 서버에서만 켜지는 시안 확인용 규칙(운영 빌드는 false)
const DEV_PREVIEW = process.env.NODE_ENV !== "production";
const CHANGE_EVENT = "ddb-app-mode-change";

// sessionStorage 는 사생활 보호 모드 등에서 막힐 수 있어 항상 try/catch
function readFlag(): boolean {
    if (!DEV_PREVIEW) return false;
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
    return native || window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true || readFlag();
}

export const isAppPath = (pathname: string) => pathname === "/app" || pathname.startsWith("/app/");
// /app/ 자체는 브라우저 앱 설치 안내 페이지(2026-10-18) — 개발 서버에서도 운영처럼 웹 화면으로 보이게 시안 규칙에서 뺀다
const isInstallGuidePath = (pathname: string) => pathname === "/app" || pathname === "/app/";
const isDevAppPath = (pathname: string) => isAppPath(pathname) && !isInstallGuidePath(pathname);

export function useAppMode(pathname: string): boolean {
    const { isStandalone, isNativeApp } = usePwaInstall();
    // 서버 렌더 · 첫 하이드레이션은 false — 브라우저에서 저장값을 읽은 뒤 다시 그린다
    const stored = useSyncExternalStore(subscribe, readFlag, () => false);

    // 개발 서버에서만: 주소의 ?app= 값과 /app/ 화면으로 시안 확인용 앱 모드를 켜고 끔
    useEffect(() => {
        if (!DEV_PREVIEW) return;
        const param = new URLSearchParams(window.location.search).get("app");
        if (param === "0") writeFlag(false);
        else if (param === "1" || isDevAppPath(pathname)) {
            if (!readFlag()) writeFlag(true);
        }
    }, [pathname]);

    // 배포: 네이티브 앱 · 설치 앱만 / 개발 서버: 시안 확인용으로 /app/ 화면 · 저장값도
    return isNativeApp || isStandalone || (DEV_PREVIEW && !isInstallGuidePath(pathname) && (stored || isDevAppPath(pathname)));
}
