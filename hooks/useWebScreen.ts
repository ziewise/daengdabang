/**
 * useWebScreen — 지금 웹 화면인가(html 에 ddb-app-mode 가 없는가) · 2026-10-24
 * ---------------------------------------------------------------------
 * 앱 표시(ddb-app-mode)는 app/layout.tsx 머리 스크립트가 그리기 전에 붙임 → 브라우저에서는 바로 맞는 값.
 * 서버(미리 만든 HTML)에서는 false(앱 화면 기준) — 웹은 화면이 붙은 뒤 웹 전용 화면으로 바뀜.
 * html class 가 바뀌면(앱 표시 켜짐 · 꺼짐) 다시 그림.
 */
"use client";

import { useSyncExternalStore } from "react";

function subscribeHtmlClass(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
}

const isWebScreen = () => !document.documentElement.classList.contains("ddb-app-mode");

export function useWebScreen() {
    return useSyncExternalStore(subscribeHtmlClass, isWebScreen, () => false);
}
