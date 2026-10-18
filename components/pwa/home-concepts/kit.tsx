"use client";

/**
 * 원래 시안 3(/app/mockup-c, ClassicHome)의 그림체를 그대로 옮긴 공통 부품 — 홈 새 시안 1·2·3 전용 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 느낌은 원래 시안 그대로: 크림 바탕 + 파스텔 빛 · 흰 구름 속 청록·빨강·주황 제목 · 눈 깜빡이는 검정 푸들 ·
 *   직접 만든 카드 그림 3장(매일 댕생활 · 댕자랑 · 댕다방 연구소) · 말랑한 분홍 버튼 · 반짝이·하트·발바닥.
 * 새로 더한 것: 스쿼클 모서리(지원 브라우저) · 카드 위 실시간 소식 · 출근도장 발바닥 줄 · 코인 칩.
 *  - COVERS: 카드 그림 3장 + 구름 속 제목 자리 + 카드별 파스텔 팔레트
 *  - Cloud · Sparkle · TriTitle(글자마다 로고 3색) · Poodle(눈 깜빡) · PetFace(우리 아이 동그라미)
 *  - CoverArt: 카드 그림 + 구름 제목 + 아래 판 글(실시간 문구로 바꿀 수 있음) · CoverWindow: 그림 윗부분만 창문처럼
 *  - PawWeek: 최근 7일 출근도장(오늘이 맨 끝) · Squishy: 말랑한 버튼 · CoinChip
 *  - KIT_CSS: 원래 시안의 바탕 · 글꼴 · 버튼 · 반짝이 · 눈꺼풀 CSS
 */

import Image from "next/image";
import Link from "next/link";
import { forwardRef, useEffect, useState, type CSSProperties, type ReactNode } from "react";

export const TEXT = "#3a2f2c";
export const TEXT_SOFT = "#7a6a63";
// 로고 "댕다방" 크레파스 색 — 청록 · 빨강 · 주황
export const LOGO_INKS = ["#0aa3b8", "#ec1c45", "#ff8a00"] as const;

/* 카드 그림 3장 — 원래 시안과 같은 그림 · 구름 위치(측정값) · 팔레트 */
export const COVERS = [
    {
        key: "daily", href: "/treasure-mine/", title: "매일 댕생활", img: "/images/ui/card-daily.webp",
        heads: [{ t: "매일", c: "#2f8fe2" }, { t: "댕생활", c: "#1766b5" }], cloud: { x: 45, y: 20, size: 17 },
        paw: "#5cb2fd", lines: ["출근도장 찍고", "돌봄 루틴 채우기!"],
        tone: { from: "#eaf6ff", to: "#cfe7ff", ink: "#1f5f99", deep: "#2f86d6", glow: "rgba(92,178,253,.45)" },
    },
    {
        key: "show", href: "/daeng-showcase/", title: "댕자랑", img: "/images/ui/card-showcase.webp",
        heads: [{ t: "댕자랑", c: "#e0285f" }], cloud: { x: 47, y: 18, size: 19.5 },
        paw: "#fe6b8d", lines: ["우리 아이", "귀여운 순간 자랑!"],
        tone: { from: "#fff0f4", to: "#ffd3e0", ink: "#b23a5e", deep: "#e8507a", glow: "rgba(254,107,141,.45)" },
    },
    {
        key: "lab", href: "/pet-lens/", title: "댕다방 연구소", img: "/images/ui/card-lab.webp",
        heads: [{ t: "댕다방", c: "#6b4532" }, { t: "연구소", c: "#e2681c" }], cloud: { x: 40.5, y: 17.5, size: 15 },
        paw: "#feae3e", lines: ["행복한 반려생활", "함께 연구해요!"],
        tone: { from: "#fff8e0", to: "#ffe7a8", ink: "#8f5e12", deep: "#e0951c", glow: "rgba(254,174,62,.45)" },
    },
] as const;
export type Cover = (typeof COVERS)[number];

/** 반짝이(네 갈래 별) */
export function Sparkle({ className = "", style }: { className?: string; style?: CSSProperties }) {
    return <span aria-hidden="true" className={`ah-sparkle absolute block ${className}`} style={style} />;
}

/** 흰 구름 — 카드 그림 속 제목 구름과 같은 모양 */
export function Cloud({ className = "" }: { className?: string }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 220 120" className={`absolute ${className}`} preserveAspectRatio="none">
            <path d="M38 104 C14 104 6 86 14 72 C2 58 14 36 36 40 C40 18 66 8 86 20 C98 4 128 2 142 20 C162 8 190 18 192 42 C214 46 220 72 202 84 C206 100 190 108 172 104 Z" fill="#fff" />
        </svg>
    );
}

/** 구름 속 제목 — 글자마다 로고 3색 */
export function TriTitle({ text, className = "" }: { text: string; className?: string }) {
    return (
        <span className={`relative block px-3 pb-2.5 pt-3.5 ${className}`}>
            <Cloud className="inset-0 h-full w-full drop-shadow-[0_6px_10px_rgba(220,110,150,0.18)]" />
            <span className="ah-display relative block text-center leading-none" aria-label={text}>
                {Array.from(text).map((ch, i) => (
                    <span key={i} aria-hidden="true" style={{ color: LOGO_INKS[i % LOGO_INKS.length] }}>{ch === " " ? " " : ch}</span>
                ))}
            </span>
        </span>
    );
}

/** 3~5초마다 한 번 눈 깜빡 */
function useBlink() {
    const [blink, setBlink] = useState(false);
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let t: number;
        const loop = () => {
            t = window.setTimeout(() => {
                setBlink(true);
                window.setTimeout(() => setBlink(false), 150);
                loop();
            }, 3000 + Math.random() * 2000);
        };
        loop();
        return () => window.clearTimeout(t);
    }, []);
    return blink;
}

/** 검정 푸들(로고 캐릭터) — 가끔 눈 깜빡 */
export function Poodle({ className = "" }: { className?: string }) {
    const blink = useBlink();
    return (
        <span className={`relative block ${className}`}>
            <span aria-hidden="true" className="absolute bottom-[21%] left-1/2 h-3.5 w-[66%] -translate-x-1/2 rounded-[50%] bg-[#e98fab]/40 blur-[3px]" />
            <Image src="/images/logo-black-poodle-v2.png" alt="댕다방 검정 푸들" fill sizes="132px" priority className="object-contain" />
            <span aria-hidden="true" className={`ah-lid ${blink ? "is-shut" : ""}`} style={{ left: "35.1%", top: "45.6%" }} />
            <span aria-hidden="true" className={`ah-lid ${blink ? "is-shut" : ""}`} style={{ left: "57.5%", top: "43.6%" }} />
        </span>
    );
}

/**
 * 카드 그림 한 장 — 그림 + 구름 속 제목 + 아래 판 두 줄
 *  - lines 를 넘기면 아래 판 글을 실시간 문구로 바꾼다
 *  - 글자 크기는 카드 폭 비율(cqw) → 카드가 커지든 작아지든 그림과 같은 비율
 */
export function CoverArt({ cover, lines, className = "", children, sizes = "45vw" }: {
    cover: Cover; lines?: readonly [string, string]; className?: string; children?: ReactNode; sizes?: string;
}) {
    const l = lines ?? cover.lines;
    return (
        <span className={`relative block aspect-[51/100] w-full overflow-hidden [container-type:inline-size] ${className}`}>
            <Image src={cover.img} alt="" fill sizes={sizes} loading="eager" className="object-cover" />
            <span className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={{ left: `${cover.cloud.x}%`, top: `${cover.cloud.y}%` }}>
                {cover.heads.map((h) => (
                    <span key={h.t} className="ah-display block whitespace-nowrap leading-[1.08] tracking-[-0.03em]" style={{ color: h.c, fontSize: `${cover.cloud.size}cqw` }}>{h.t}</span>
                ))}
            </span>
            <span className="absolute inset-x-[4%] bottom-0 flex h-[20%] flex-col items-center justify-center text-center">
                <i aria-hidden="true" className="fa-solid fa-paw" style={{ color: cover.paw, fontSize: "7.5cqw" }} />
                <span className="ah-card-desc mt-[2cqw] block whitespace-nowrap">{l[0]}<br />{l[1]}</span>
            </span>
            {children}
        </span>
    );
}

/** 카드 그림 윗부분만 창문처럼 — 구름 제목은 그림 기준 위치 그대로(카드 높이 = 폭 ÷ 0.51) */
export function CoverWindow({ cover, className = "" }: { cover: Cover; className?: string }) {
    return (
        <span className={`absolute inset-0 overflow-hidden [container-type:inline-size] ${className}`}>
            <span className="cw-img bt-img absolute inset-x-0 top-0 block aspect-[51/100]">
                <Image src={cover.img} alt="" fill sizes="45vw" className="object-cover" />
                <span className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={{ left: `${cover.cloud.x}%`, top: `${cover.cloud.y}%` }}>
                    {cover.heads.map((h) => (
                        <span key={h.t} className="ah-display block whitespace-nowrap leading-[1.08] tracking-[-0.03em]" style={{ color: h.c, fontSize: `${cover.cloud.size}cqw` }}>{h.t}</span>
                    ))}
                </span>
            </span>
        </span>
    );
}

/** 최근 7일 요일 — 오늘이 맨 끝 */
const WEEK_KO = ["일", "월", "화", "수", "목", "금", "토"];
export function recentDays() {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return WEEK_KO[d.getDay()];
    });
}

/**
 * 최근 7일 출근도장 — 원래 시안의 발바닥 동그라미 줄
 *  past: 오늘 전 6일 찍힘 여부 · claimed: 오늘 찍었는지 · size: 동그라미 크기(px)
 */
export function PawWeek({ days, past, claimed, size = 32 }: { days: string[]; past: boolean[]; claimed: boolean; size?: number }) {
    return (
        <ol className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
                const isToday = i === 6;
                const done = isToday ? claimed : past[i];
                return (
                    <li key={i} className="flex flex-col items-center gap-1">
                        <span className={`grid place-items-center rounded-full ${done ? "text-white" : ""} ${isToday && claimed ? "ah-stamp" : ""} ${isToday && !claimed ? "ah-wait" : ""}`}
                            style={{
                                width: size, height: size, fontSize: size * 0.38,
                                ...(done
                                    ? { background: "linear-gradient(180deg, #ff8eab, #f0577f)", boxShadow: "0 3px 6px -3px rgba(220,60,110,0.7)" }
                                    : { border: "2px dashed #f4a9bd", color: "#f4a9bd" }),
                            }}>
                            <i aria-hidden="true" className="fa-solid fa-paw" />
                        </span>
                        <span className="ah-light text-[10.5px]" style={{ color: isToday ? "#ea4c7c" : TEXT_SOFT }}>{isToday ? "오늘" : d}</span>
                    </li>
                );
            })}
        </ol>
    );
}

/** 말랑한 분홍 버튼 — 아랫면 두께 + 윗쪽 광택 + 가끔 빛이 지나감. href 가 있으면 링크 */
export const Squishy = forwardRef<HTMLButtonElement, { children: ReactNode; onClick?: () => void; href?: string; className?: string; small?: boolean }>(
    function Squishy({ children, onClick, href, className = "", small = false }, ref) {
        const cls = `ah-display ah-btn relative flex items-center justify-center gap-2 overflow-hidden rounded-full ${small ? "h-[2.6rem] text-[15px]" : "h-[3.25rem] text-[18px]"} ${className}`;
        const inner = (
            <>
                <span aria-hidden="true" className="absolute inset-x-6 top-1 h-[34%] rounded-full bg-white/20" />
                <span aria-hidden="true" className="ah-shine" />
                {children}
            </>
        );
        if (href) return <Link href={href} className={cls} style={{ color: "#fff" }}>{inner}</Link>;
        return <button ref={ref} type="button" onClick={onClick} className={`${cls} w-full`} style={{ color: "#fff" }}>{inner}</button>;
    },
);

/** 코인 칩 — 코인이 날아와 꽂히는 곳 */
export const CoinChip = forwardRef<HTMLSpanElement, { coins: number }>(function CoinChip({ coins }, ref) {
    return (
        <span ref={ref} className="ah-display flex items-center gap-1 rounded-full bg-white/90 py-1 pl-1 pr-2.5 text-[13px] shadow-[0_4px_12px_-6px_rgba(200,80,120,0.5)]" style={{ color: TEXT }}>
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff3b0,#ffc93d_55%,#e9a514)] text-[10px] text-[#7a4b00] ah-display">C</span>
            <span className="tabular-nums">{coins}</span>
        </span>
    );
});

/* 원래 시안 CSS(바탕 · 글꼴 · 버튼 · 반짝이 · 눈꺼풀) + 새로 더한 스쿼클 · 기다리는 오늘 칸 */
export const KIT_CSS = `
.ah-bg { background:
  radial-gradient(70% 40% at 0% 0%, rgba(255,214,228,0.55) 0%, rgba(255,214,228,0) 70%),
  radial-gradient(60% 35% at 100% 45%, rgba(214,236,255,0.6) 0%, rgba(214,236,255,0) 70%),
  radial-gradient(70% 35% at 10% 100%, rgba(255,240,196,0.55) 0%, rgba(255,240,196,0) 70%),
  #fffaf5; }
@font-face { font-family: "Cafe24Ssurround"; src: url("/fonts/Cafe24Ssurround.woff2") format("woff2"); font-display: swap; }
.ah-display { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; letter-spacing: -0.02em; }
/* 본문 · 설명 · 안내 · 입력칸 — 나눔스퀘어라운드(굵게, 2026-10-15 확정).
   제목 · 버튼 · 이름표는 .ah-display(카페24 써라운드). 끝이 둥근 글꼴끼리라 결이 맞고, 얇은 카페24 에어보다 작은 글씨가 또렷함 */
@font-face { font-family: "NanumSquareRound"; font-weight: 400; src: url("/fonts/NanumSquareRoundR.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "NanumSquareRound"; font-weight: 700; src: url("/fonts/NanumSquareRoundB.woff2") format("woff2"); font-display: swap; }
.ah-light { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; letter-spacing: -0.01em; }
.ah-card-desc { font-family: "NanumSquareRound", "Cafe24Ssurround", sans-serif; font-weight: 700; font-size: 9.4cqw; line-height: 1.3; letter-spacing: -0.03em; color: #4f413c; }
/* 온도 '°' — 써라운드 글꼴의 '°'는 모양이 어색해 둥근 본문 글꼴(나눔스퀘어라운드)로. 원티드 산스는 쓰지 않음(글꼴 두 가지 규칙, 2026-10-17) */
.ah-deg { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 800; }

/* 스쿼클 모서리 — 지원 브라우저(크롬 139+)에선 더 매끈한 곡선, 아니면 일반 둥근 모서리 */
@supports (corner-shape: squircle) { .ah-sq { corner-shape: squircle; } }

@keyframes ah-stamp { 0% { transform: scale(1.9) rotate(-18deg); opacity: 0; } 55% { transform: scale(.88) rotate(4deg); opacity: 1; } 100% { transform: none; opacity: 1; } }
.ah-stamp { animation: ah-stamp .45s cubic-bezier(.3,1.3,.5,1) both; }
/* 아직 안 찍은 오늘 칸 — 숨쉬듯 */
/* 분홍 고리는 고리 조각의 투명도만 바꿈 — 그림자 크기를 매 장면 다시 그리던 것 대신(같은 모양, 2026-10-18 앱 속도). 오늘 도장 칸(.st-slot.is-today)도 같은 숨쉬기 */
@keyframes ah-wait { 50% { transform: scale(1.1); } }
@keyframes ah-wait-ring { 50% { opacity: 1; } }
.ah-wait { position: relative; animation: ah-wait 1.8s ease-in-out infinite; }
.ah-wait::after, .st-slot.is-today::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: 0 0 0 5px rgba(244,169,189,.25); opacity: 0; animation: ah-wait-ring 1.8s ease-in-out infinite; pointer-events: none; }
.ah-badge { box-shadow: 0 4px 10px -4px rgba(200,90,30,.6), inset 0 0 0 1.5px rgba(255,255,255,.6); }

.ah-sparkle { clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); }
@keyframes ah-twinkle { 0%, 82%, 100% { transform: scale(1) rotate(0); opacity: 1; } 91% { transform: scale(.55) rotate(30deg); opacity: .6; } }
.ah-twinkle { animation: ah-twinkle 4.5s ease-in-out var(--td, 0s) infinite; }

.ah-btn { background: linear-gradient(180deg, #ff8eab 0%, #f0577f 100%); box-shadow: 0 5px 0 #d8416b, 0 14px 22px -12px rgba(220,60,110,0.75); transition: transform .12s ease, box-shadow .12s ease; }
.ah-btn:active { transform: translateY(4px); box-shadow: 0 1px 0 #d8416b, 0 6px 12px -8px rgba(220,60,110,0.7); }
@keyframes ah-shine { 0%, 70% { transform: translateX(-140%) skewX(-20deg); } 100% { transform: translateX(460%) skewX(-20deg); } }
.ah-shine { position: absolute; inset: -20% auto -20% 0; width: 22%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent); animation: ah-shine 5s ease-in-out 1.4s infinite; pointer-events: none; }

.ah-lid { position: absolute; width: 8.8%; height: 9.4%; border-radius: 50% 50% 46% 46%; background: radial-gradient(ellipse at 50% 30%, #2a2a33 0%, #141419 70%); transform: scaleY(0); transform-origin: 50% 0; transition: transform .07s ease-in; pointer-events: none; }
.ah-lid.is-shut { transform: scaleY(1); }

.ah-press { -webkit-tap-highlight-color: transparent; transition: transform .15s ease; }
.ah-press:active { transform: scale(.97); }
@media (prefers-reduced-motion: reduce) { .ah-twinkle, .ah-shine, .ah-wait, .ah-wait::after, .st-slot.is-today::after { animation: none; } .ah-shine { display: none; } }
`;
