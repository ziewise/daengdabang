"use client";

/**
 * 헤더 "앱 설치" 동그라미 아이콘 (모바일 웹 · 설치 전) — 누르면 앱 설치 안내 페이지(/app/)
 * ---------------------------------------------------------------------
 * 2026-10-18 사용자 결정: 로고 옆 검은 "앱 홈" 알약 → 펫렌즈(사진기 강아지) 버튼 왼쪽 3D 그림 아이콘(42px — 로고보다 작게).
 * 가는 곳은 전과 같은 /app/ (지금은 설치 안내 페이지). 설치한 앱 · 네이티브 앱은 웹 헤더 대신 앱 틀이라 안 보임.
 * 말풍선 "댕다방, 앱에서 더 편하게 즐겨보세요 🐾" — 아이콘 아래로 가끔 열림(스티커북 메모지 모양):
 *  - 들어오고 3초 뒤 처음, 5초 보였다가 닫히고 같은 화면에 머물면 20초마다 다시(횟수 제한 없음)
 *  - "오늘 안 보기"를 누르면 오늘(이 기기 날짜)은 더 열지 않음(localStorage)
 *  - 아이콘 · 말풍선 글자를 누르면 /app/ 으로 가고, 그 방문(탭) 동안은 열지 않음(sessionStorage)
 *  - 장바구니 · 결제 · 로그인 · 가입 · 비밀번호 화면에서는 열지 않음(구매 · 입력 방해 X)
 *  - 다른 창(정식 오픈 안내 · 메뉴 · 상담 등)이 열려 있으면 그 차례는 건너뜀
 *  - 휴대폰 폭(768px 미만)에서만 · 움직임 줄이기 설정이면 움직임 없이
 * 말풍선은 열릴 때만 그려서 글꼴(나눔스퀘어라운드)도 그때만 받는다.
 * 아이콘 링크 안에 버튼을 넣을 수 없어(링크 안 버튼 금지) 아이콘과 말풍선을 나란히 둔다.
 */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const HIDE_TODAY_KEY = "ddb.appInstallBubble.hideDate"; // "오늘 안 보기"를 누른 날짜(localStorage)
const VISITED_KEY = "ddb.appInstallBubble.visited"; // 이번 방문에 설치 안내로 이미 갔음(sessionStorage)
const BUBBLE_FIRST_MS = 3000;
const BUBBLE_SHOW_MS = 5000;
const BUBBLE_EVERY_MS = 20000;
const QUIET_PATHS = ["/cart", "/checkout", "/auth", "/login", "/signup", "/forgot-password"];

// 이 기기 기준 오늘 날짜(YYYY-MM-DD)
function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 저장소는 사생활 보호 모드에서 막힐 수 있어 항상 try/catch — 막히면 저장 없이 이번 화면에서만 적용
function shouldStayQuiet() {
    try {
        if (window.localStorage.getItem(HIDE_TODAY_KEY) === today()) return true;
        if (window.sessionStorage.getItem(VISITED_KEY) === "1") return true;
    } catch {
        /* 읽지 못하면 보여 준다 */
    }
    return false;
}

function remember(storage: "local" | "session") {
    try {
        if (storage === "local") window.localStorage.setItem(HIDE_TODAY_KEY, today());
        else window.sessionStorage.setItem(VISITED_KEY, "1");
    } catch {
        /* 저장 못 해도 이번 화면에서는 닫힘 */
    }
}

export default function InstalledAppHomeButton() {
    const pathname = usePathname();
    const [bubble, setBubble] = useState<"in" | "out" | null>(null); // 말풍선 상태: 열림 · 닫히는 중 · 없음
    const [stopped, setStopped] = useState(false); // 이번 화면에서 그만(오늘 안 보기 · 설치 안내로 이동)
    const onAppRoute = pathname === "/app" || pathname.startsWith("/app/");
    const quiet = stopped || onAppRoute || QUIET_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

    useEffect(() => {
        if (quiet || !window.matchMedia("(max-width: 767px)").matches) return;
        const timers: number[] = [];
        let repeat = 0;
        const open = () => {
            if (shouldStayQuiet()) {
                window.clearInterval(repeat);
                return;
            }
            // 다른 창이 열려 있으면 이번 차례는 건너뜀(정식 오픈 안내 · 메뉴 · 상담 창 등 위에 겹치지 않게) — 20초 뒤 다시
            if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not([aria-hidden="true"])')) return;
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

    const goInstallGuide = () => {
        remember("session");
        setStopped(true);
    };
    const hideToday = () => {
        remember("local");
        setStopped(true);
    };

    return (
        <span className="relative inline-flex shrink-0 md:hidden">
            <style>{APP_INSTALL_BUBBLE_CSS}</style>
            <Link
                href="/app/"
                data-installed-app-home-button
                onClick={goInstallGuide}
                className="group relative inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 md:hidden"
                aria-label="댕다방 앱 설치 안내"
            >
                {/* 앱 설치 아이콘 — 원형 배지 그림(자체 원/테두리 포함, 사용자 3D 그림) */}
                <Image src="/images/ui/header-app-install.webp" alt="" fill sizes="42px" className="object-contain" />
                <span className="sr-only">앱 설치 안내</span>
            </Link>
            {bubble ? (
                <span role="status" className={`ddb-aib ${bubble === "out" ? "is-out" : ""}`}>
                    <span aria-hidden="true" className="ddb-aib-tape" />
                    <Link href="/app/" onClick={goInstallGuide} className="ddb-aib-text">
                        <b>댕다방,</b> 앱에서 더 편하게 즐겨보세요 🐾
                    </Link>
                    <button type="button" onClick={hideToday} className="ddb-aib-hide">
                        오늘 안 보기 <span aria-hidden="true">×</span>
                    </button>
                </span>
            ) : null}
        </span>
    );
}

/** 말풍선 — 노란 메모지 · 분홍 마스킹테이프 · 아이콘 쪽 꼬리, 위에서 살짝 내려오며 열림. 아래 줄 오른쪽에 "오늘 안 보기" */
const APP_INSTALL_BUBBLE_CSS = `
/* 나눔스퀘어라운드 글꼴 선언은 app/globals.css 한 곳(2026-10-21) */
.ddb-aib { position: absolute; top: calc(100% + 9px); right: -58px; z-index: 5; display: flex; flex-direction: column; align-items: flex-end; gap: 3px;
  width: max-content; padding: 9px 12px 6px; white-space: nowrap;
  background: #fff6c9; border-radius: 6px 6px 14px 6px; color: #5a4038; font-family: "NanumSquareRound", sans-serif; font-weight: 700;
  font-size: 12.5px; line-height: 1.45; letter-spacing: -0.01em; text-align: left;
  box-shadow: 0 10px 16px -10px rgba(120,90,40,.55), 0 0 0 1px rgba(232,206,120,.55); rotate: -1deg;
  animation: ddb-aib-in .35s cubic-bezier(.3,1.4,.5,1) both; }
.ddb-aib-text { align-self: stretch; color: inherit; -webkit-tap-highlight-color: transparent; }
.ddb-aib-text b { color: #d6457a; font-weight: 700; }
.ddb-aib-hide { margin-right: -4px; padding: 3px 4px; border-radius: 6px; font: inherit; font-size: 11px; color: #9a8070;
  background: none; border: 0; text-decoration: underline; text-underline-offset: 2px; -webkit-tap-highlight-color: transparent; }
.ddb-aib-hide:active { background: rgba(232,206,120,.35); }
.ddb-aib::before { content: ""; position: absolute; top: -6px; right: 73px; width: 12px; height: 12px; background: #fff6c9; rotate: 45deg;
  box-shadow: -1px -1px 0 0 rgba(232,206,120,.55); }
.ddb-aib-tape { position: absolute; top: -6px; left: 14px; width: 34px; height: 11px; background: rgba(255,190,210,.85); rotate: -4deg; }
.ddb-aib.is-out { animation: ddb-aib-out .35s ease both; pointer-events: none; }
@keyframes ddb-aib-in { from { opacity: 0; transform: translateY(-6px) scale(.92); } to { opacity: 1; transform: none; } }
@keyframes ddb-aib-out { from { opacity: 1; } to { opacity: 0; transform: translateY(-4px); } }
@media (prefers-reduced-motion: reduce) { .ddb-aib, .ddb-aib.is-out { animation: none; } }
`;
