"use client";

/**
 * 앱 쇼핑 화면 사진 · 영상 주소 (스티커북 쇼핑 · 상품 카드 · 히어로 공용)
 * ---------------------------------------------------------------------
 * 네이티브 앱(APK · iOS)은 /app 화면을 앱 안 파일로 열지만, 쇼핑 사진(브랜드 · 기획전 · 상품 · 히어로 영상)은
 * 앱 안에 넣지 않는다(협업자 scripts/prepare-native-web.mjs 의 묶음 목록). 그래서 네이티브에서는
 * 운영 사이트(https://www.daengdabang.com)의 같은 파일을 쓰고, 웹 · 설치 앱(PWA)은 주소 그대로 쓴다.
 * 화면이 브라우저에서 시작된 뒤에만 주소를 넘긴다 — 미리 만든 HTML 에 앱 밖 사진 주소가 들어가면
 * 앱 묶음 검사(native:sync)가 "없는 파일"로 막기 때문(2026-10-18 운영 CI 실패 수정).
 */

import { useCallback, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

const WEB_ORIGIN = "https://www.daengdabang.com";
// 앱 안에 함께 들어가는 폴더(협업자 묶음 목록과 같게) — 이 폴더 파일은 앱 안 파일 그대로 쓴다
const BUNDLED_PREFIXES = ["/images/ui/", "/images/brand/", "/images/breeds/", "/images/pwa/", "/fonts/"];

const noopSubscribe = () => () => {};

/** 화면이 브라우저에서 시작되기 전에는 null(사진 자리만), 시작된 뒤에는 주소 바꾸개를 돌려준다 */
export function useShopMedia() {
    // 미리 만든 HTML · 첫 hydration 은 false, 그 뒤(브라우저)는 true
    const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
    const resolve = useCallback((src: string | null | undefined) => {
        if (!src) return undefined;
        if (!src.startsWith("/") || src.startsWith("//")) return src; // CDN 등 이미 전체 주소
        if (!Capacitor.isNativePlatform()) return src; // 웹 · PWA 는 그대로
        if (BUNDLED_PREFIXES.some((prefix) => src.startsWith(prefix))) return src; // 앱 안에 있는 파일
        return `${WEB_ORIGIN}${src}`;
    }, []);
    return ready ? resolve : null;
}
