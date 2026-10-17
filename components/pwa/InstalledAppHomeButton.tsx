"use client";

/**
 * 헤더 "앱 설치" 동그라미 아이콘 (모바일 웹 · 설치 전) — 누르면 앱 설치 안내 페이지(/app/)
 * ---------------------------------------------------------------------
 * 2026-10-18 사용자 결정: 로고 옆 검은 "앱 홈" 알약 → 펫렌즈(사진기 강아지) 버튼 왼쪽 3D 그림 아이콘.
 * 가는 곳은 전과 같은 /app/ (지금은 설치 안내 페이지). 설치한 앱 · 네이티브 앱은 웹 헤더 대신 앱 틀이라 안 보임.
 * 말풍선 "댕다방, 앱에서 더 편하게 즐겨보세요 🐾" — 아이콘 아래로 가끔 열림(스티커북 메모지 모양):
 *  - 들어오고 3초 뒤 처음, 4초 보였다가 닫히고 30초마다 다시 · 한 번 방문(탭)에 최대 3번 · 아이콘을 누르면 그 방문 동안 그만
 *  - 장바구니 · 결제 · 로그인 · 가입 · 비밀번호 화면에서는 열지 않음(구매 · 입력 방해 X)
 *  - 휴대폰 폭(768px 미만)에서만 · 움직임 줄이기 설정이면 움직임 없이
 * 말풍선은 열릴 때만 그려서 글꼴(나눔스퀘어라운드)도 그때만 받는다.
 */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const BUBBLE_KEY = "ddb.appInstallBubble.v1"; // 이번 방문에 말풍선을 연 횟수(sessionStorage)
const BUBBLE_MAX = 3;
const BUBBLE_FIRST_MS = 3000;
const BUBBLE_SHOW_MS = 4000;
const BUBBLE_EVERY_MS = 30000;
const QUIET_PATHS = ["/cart", "/checkout", "/auth", "/login", "/signup", "/forgot-password"];

// sessionStorage 는 사생활 보호 모드에서 막힐 수 있어 항상 try/catch — 막히면 말풍선은 열지 않음
function readCount() {
    try {
        return Number(window.sessionStorage.getItem(BUBBLE_KEY) || 0);
    } catch {
        return BUBBLE_MAX;
    }
}

function writeCount(count: number) {
    try {
        window.sessionStorage.setItem(BUBBLE_KEY, String(count));
    } catch {
        /* 저장 못 하면 이번 화면에서만 센다 */
    }
}

export default function InstalledAppHomeButton() {
    const pathname = usePathname();
    const [bubble, setBubble] = useState<"in" | "out" | null>(null); // 말풍선 상태: 열림 · 닫히는 중 · 없음
    const onAppRoute = pathname === "/app" || pathname.startsWith("/app/");
    const quiet = onAppRoute || QUIET_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

    useEffect(() => {
        if (quiet || !window.matchMedia("(max-width: 767px)").matches) return;
        const timers: number[] = [];
        let repeat = 0;
        const open = () => {
            const count = readCount();
            if (count >= BUBBLE_MAX) {
                window.clearInterval(repeat);
                return;
            }
            writeCount(count + 1);
            setBubble("in");
            timers.push(window.setTimeout(() => setBubble("out"), BUBBLE_SHOW_MS));
            timers.push(window.setTimeout(() => setBubble(null), BUBBLE_SHOW_MS + 350));
        };
        timers.push(window.setTimeout(() => {
            open();
            repeat = window.setInterval(open, BUBBLE_EVERY_MS);
        }, BUBBLE_FIRST_MS));
        return () => {
            timers.forEach((timer) => window.clearTimeout(timer));
            window.clearInterval(repeat);
            setBubble(null);
        };
    }, [quiet, pathname]);

    if (onAppRoute) return null;

    return (
        <Link
            href="/app/"
            data-installed-app-home-button
            onClick={() => writeCount(BUBBLE_MAX)}
            className="group relative inline-flex h-[50px] w-[50px] shrink-0 items-center justify-center transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 md:hidden"
            aria-label="댕다방 앱 설치 안내"
        >
            <style>{APP_INSTALL_BUBBLE_CSS}</style>
            {/* 앱 설치 아이콘 — 원형 배지 그림(자체 원/테두리 포함, 사용자 3D 그림) */}
            <Image src="/images/ui/header-app-install.webp" alt="" fill sizes="50px" className="object-contain" />
            <span className="sr-only">앱 설치 안내</span>
            {bubble ? (
                <span aria-hidden="true" className={`ddb-aib ${bubble === "out" ? "is-out" : ""}`}>
                    <span className="ddb-aib-tape" />
                    <b>댕다방,</b> 앱에서 더 편하게 즐겨보세요 🐾
                </span>
            ) : null}
        </Link>
    );
}

/** 말풍선 — 노란 메모지 · 분홍 마스킹테이프 · 아이콘 쪽 꼬리, 위에서 살짝 내려오며 열림 */
const APP_INSTALL_BUBBLE_CSS = `
@font-face { font-family: "NanumSquareRound"; font-weight: 700; src: url("/fonts/NanumSquareRoundB.woff2") format("woff2"); font-display: swap; }
.ddb-aib { position: absolute; top: calc(100% + 9px); right: -58px; z-index: 5; width: max-content; padding: 9px 12px; white-space: nowrap;
  background: #fff6c9; border-radius: 6px 6px 14px 6px; color: #5a4038; font-family: "NanumSquareRound", sans-serif; font-weight: 700;
  font-size: 12.5px; line-height: 1.45; letter-spacing: -0.01em; word-break: keep-all; text-align: left; pointer-events: auto;
  box-shadow: 0 10px 16px -10px rgba(120,90,40,.55), 0 0 0 1px rgba(232,206,120,.55); rotate: -1deg;
  animation: ddb-aib-in .35s cubic-bezier(.3,1.4,.5,1) both; }
.ddb-aib b { color: #d6457a; font-weight: 700; }
.ddb-aib::before { content: ""; position: absolute; top: -6px; right: 68px; width: 12px; height: 12px; background: #fff6c9; rotate: 45deg;
  box-shadow: -1px -1px 0 0 rgba(232,206,120,.55); }
.ddb-aib-tape { position: absolute; top: -6px; left: 14px; width: 34px; height: 11px; background: rgba(255,190,210,.85); rotate: -4deg; }
.ddb-aib.is-out { animation: ddb-aib-out .35s ease both; }
@keyframes ddb-aib-in { from { opacity: 0; transform: translateY(-6px) scale(.92); } to { opacity: 1; transform: none; } }
@keyframes ddb-aib-out { from { opacity: 1; } to { opacity: 0; transform: translateY(-4px); } }
@media (prefers-reduced-motion: reduce) { .ddb-aib, .ddb-aib.is-out { animation: none; } }
`;
