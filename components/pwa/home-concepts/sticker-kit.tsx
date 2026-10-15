"use client";

/**
 * 스티커북(다꾸 속지) 결 공통 부품 — 홈 · 매일 댕생활 · 댕자랑 · 연구소 · 마이 (로컬 시안 전용, 배포 X)
 * ---------------------------------------------------------------------
 *  - Tape: 끝이 찢긴 마스킹테이프 · PostIt: 포스트잇
 *  - Patch: 자수 와펜 버튼(새틴 실 테두리 + 바느질 땀 + 천 결, 누르면 폭신하게 꺼짐) — 스티커북의 모든 주요 버튼
 *  - LoginInvite: 로그인 전 편지지 초대 카드(제목 · 펜 체크 목록 · 로그인 버튼 · 가입 링크)
 *  - STICKER_CSS: 속지 · 테이프 · 포스트잇 · 스티커 떼기 · 손으로 놓기 · 속지 넘기기 · 편지지 CSS
 */

import Image from "next/image";
import Link from "next/link";
import { forwardRef, useState, type CSSProperties, type ReactNode } from "react";
import { appLoginHref, appSignupHref } from "@/components/app-shell/appTabs";
import { haptic } from "./gestures";
import { SAMPLE } from "./shared";

/** 마스킹테이프 조각 */
export function Tape({ className = "", color = "rgba(255,190,210,.75)", style }: { className?: string; color?: string; style?: CSSProperties }) {
    return <span aria-hidden="true" className={`st-tape absolute block ${className}`} style={{ background: color, ...style }} />;
}

/** 포스트잇 */
export function PostIt({ children, color, rot, className = "" }: { children: ReactNode; color: string; rot: number; className?: string }) {
    return (
        <span className={`st-postit ah-light absolute z-10 block px-2 py-1 text-center text-[10.5px] leading-tight ${className}`} style={{ background: color, rotate: `${rot}deg` }}>
            {children}
        </span>
    );
}

/** 자수 와펜 색 — 면(fill) · 글씨(ink) · 새틴 테두리 실 두 가닥(edge, edge2) · 바느질 땀(stitch) */
const PATCH_TONES = {
    pink: { fill: "#f2789d", ink: "#fff", edge: "#d9547d", edge2: "#ea6d93", stitch: "rgba(255,255,255,.75)" },
    cream: { fill: "#fff6ee", ink: "#c4456f", edge: "#f4a9bf", edge2: "#f8c3d2", stitch: "rgba(226,107,145,.55)" },
    mint: { fill: "#7fcfa9", ink: "#fff", edge: "#4fae84", edge2: "#68c299", stitch: "rgba(255,255,255,.75)" },
    lavender: { fill: "#a68ff0", ink: "#fff", edge: "#7f66d8", edge2: "#957de6", stitch: "rgba(255,255,255,.75)" },
    butter: { fill: "#f5b445", ink: "#fff", edge: "#d99520", edge2: "#e8a838", stitch: "rgba(255,255,255,.75)" },
} as const;
export type PatchTone = keyof typeof PATCH_TONES;

/**
 * 자수 와펜 버튼 — 강아지 옷에 붙는 자수 패치. href 가 있으면 링크, 없으면 버튼(type=submit 이면 폼 보내기).
 * 누름 표시는 포인터로 직접(휴대폰에서도 확실하게) · 천이라 들리지 않고 폭신하게 꺼짐
 */
export const Patch = forwardRef<HTMLButtonElement, { children: ReactNode; onClick?: () => void; href?: string; className?: string; small?: boolean; tone?: PatchTone; disabled?: boolean; type?: "button" | "submit" }>(
    function Patch({ children, onClick, href, className = "", small = false, tone = "pink", disabled = false, type = "button" }, ref) {
        const [down, setDown] = useState(false);
        const t = PATCH_TONES[tone];
        const cls = `st-patch ah-display ${small ? "is-small" : ""} ${down ? "is-down" : ""} ${className}`;
        const style = { "--fill": t.fill, "--ink": t.ink, "--edge": t.edge, "--edge2": t.edge2, "--stitch": t.stitch } as CSSProperties;
        const press = {
            onPointerDown: () => { setDown(true); haptic("light"); },
            onPointerUp: () => setDown(false),
            onPointerLeave: () => setDown(false),
            onPointerCancel: () => setDown(false),
        };
        const face = <span className="st-patch-face">{children}</span>;
        if (href) return <Link href={href} className={cls} style={style} {...press}>{face}</Link>;
        return <button ref={ref} type={type} onClick={onClick} disabled={disabled} className={cls} style={style} {...press}>{face}</button>;
    },
);

/** 로그인 전 — 편지지 초대 카드: 로그인하면 할 수 있는 것(펜 체크) + 로그인하고 출근하기 */
export const INVITE = [
    { icon: "fa-calendar-check", text: "매일 출근 스티커 붙이고 코인 받기" },
    { icon: "fa-camera", text: "우리 아이 사진 기록 · 연구소 분석" },
    { icon: "fa-heart", text: "댕자랑에서 응원 주고받기" },
];
export function LoginInvite({ redirect = "/app/home-1/", title = ["로그인하고", "오늘부터 출근해요!"], items = INVITE, cta = "로그인하고 출근하기" }: { redirect?: string; title?: [string, string]; items?: { icon: string; text: string }[]; cta?: string }) {
    return (
        <div className="st-place st-invite relative mt-4 rounded-[1.2rem] pb-4 pl-6 pr-4 pt-6" style={{ ["--r" as string]: "-1deg", ["--d" as string]: "380ms", rotate: "-1deg" }}>
            <Tape className="-top-2 left-1/2 h-5 w-20 -translate-x-1/2" color="repeating-linear-gradient(90deg, rgba(255,200,215,.85) 0 8px, rgba(255,226,234,.85) 8px 16px)" style={{ rotate: "2deg" }} />
            {/* 귀퉁이에 붙여 둔 스티커 두 장(장식) */}
            <Image src="/images/ui/stickers/sticker-mon.webp" alt="" width={48} height={48} aria-hidden="true" className="st-diecut-img absolute -left-4 -top-4 h-12 w-12" style={{ rotate: "-14deg" }} />
            {/* 제목 + 오른쪽 우리 아이 기록 보관함(출근 · 돌봄 · 기록, 둥실) — 작게, 제목보다 살짝 아래에. 체크리스트는 그 아래 */}
            <div className="flex items-start justify-between gap-2">
                <p className="ah-display text-[17px] leading-snug">
                    <span className="st-marker">{title[0]}</span><br />{title[1]}
                </p>
                <span aria-hidden="true" className="st-box relative -mr-1 mt-4 block h-[4.2rem] w-[4.2rem] shrink-0">
                    <Image src="/images/ui/stickers/record-box.webp" alt="" fill sizes="90px" className="object-contain drop-shadow-[0_10px_10px_rgba(120,80,140,.28)]" />
                </span>
            </div>
            <ul className="mt-3 space-y-1.5">
                {items.map((it, i) => (
                    <li key={it.text} className="flex items-center gap-2">
                        {/* 펜으로 그린 체크가 차례로 그려짐 */}
                        <svg viewBox="0 0 28 28" className="h-6 w-6 shrink-0" aria-hidden="true">
                            <path d="M7 14 L12 19 L23 6" fill="none" stroke="#ea4c7c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="st-check" style={{ animationDelay: `${700 + i * 220}ms` }} />
                        </svg>
                        <i aria-hidden="true" className={`fa-solid ${it.icon} w-4 text-center text-[12px] text-[#f48fac]`} />
                        <span className="ah-light text-[13.5px]">{it.text}</span>
                    </li>
                ))}
            </ul>
            <Patch href={appLoginHref(redirect)} className="mt-4">{cta}<i aria-hidden="true" className="fa-solid fa-paw text-[14px]" /></Patch>
            <Link href={appSignupHref(redirect)} className="ah-display mt-3 block text-center text-[13px]" style={{ color: "#ea4c7c" }}>
                처음이에요 · 가입하면 {SAMPLE.signupBonus}코인 선물
            </Link>
        </div>
    );
}

/* 스티커북 결 공통 CSS */
export const STICKER_CSS = `
/* 자수 와펜 버튼 — 바깥(새틴 실 테두리 사선 결) + 안쪽 천(가로세로 결) + 바느질 땀(점선) */
.st-patch { display: block; width: 100%; padding: 4px; border-radius: 999px;
  background: repeating-linear-gradient(72deg, var(--edge) 0 2px, var(--edge2) 2px 3.4px);
  box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 7px 9px -6px rgba(110,60,60,.45), inset 0 1px 0 rgba(255,255,255,.35);
  transition: transform .45s cubic-bezier(.3,1.6,.5,1), box-shadow .25s; -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; }
.st-patch-face { position: relative; display: flex; height: 46px; align-items: center; justify-content: center; gap: 8px; border-radius: 999px; color: var(--ink); font-size: 16.5px;
  text-shadow: 0 1px 0 rgba(0,0,0,.13);
  background: repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 1px, transparent 1px 3px),
              repeating-linear-gradient(90deg, rgba(0,0,0,.035) 0 1px, transparent 1px 3px), var(--fill);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.05); transition: box-shadow .25s; }
/* 바느질 땀 — 테두리 안쪽을 따라 한 바퀴 */
.st-patch-face::after { content: ""; position: absolute; inset: 4px; border-radius: 999px; border: 2px dashed var(--stitch); pointer-events: none; }
.st-patch.is-small { padding: 3px; }
.st-patch.is-small .st-patch-face { height: 38px; font-size: 14px; gap: 6px; }
.st-patch.is-small .st-patch-face::after { inset: 3px; border-width: 1.5px; }
/* 천이라 누르면 폭신하게 꺼짐 — 작아지고 안쪽 그늘 */
.st-patch.is-down { transform: scale(.96); transition-duration: .12s; box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 3px 4px -3px rgba(110,60,60,.45); }
.st-patch.is-down .st-patch-face { box-shadow: inset 0 3px 8px rgba(0,0,0,.16); }
.st-patch:disabled { opacity: .55; }
@media (prefers-reduced-motion: reduce) { .st-patch { transition: none; } }
/* 다이어리 속지: 크림 종이 + 점 모눈 + 종이 그림자 */
.st-page { background-color: #fffdf8; background-image: radial-gradient(circle, rgba(196,160,140,.28) 1px, transparent 1.3px); background-size: 15px 15px; background-position: 7px 7px;
  box-shadow: 0 22px 40px -26px rgba(150,90,70,.55), 0 2px 0 #f3e6dc, inset 0 0 0 1.5px rgba(255,255,255,.9); }
/* 마스킹테이프: 끝이 지그재그로 찢긴 반투명 띠 */
.st-tape { mix-blend-mode: multiply; clip-path: polygon(3% 0, 97% 0, 100% 20%, 96% 40%, 100% 60%, 96% 80%, 100% 100%, 3% 100%, 0 80%, 4% 60%, 0 40%, 4% 20%, 0 0); }
/* 기록 보관함: 천천히 위아래로 둥실 */
.st-box { animation: st-float 3.6s ease-in-out infinite; }
@keyframes st-float { 0%, 100% { translate: 0 0; rotate: 4deg; } 50% { translate: 0 -6px; rotate: -2deg; } }
@media (prefers-reduced-motion: reduce) { .st-box { animation: none; } }
/* 로그인 초대 카드: 줄 없는 크림 편지지 + 오른쪽 위 분홍 빛 */
.st-invite { background: radial-gradient(120% 70% at 100% 0%, rgba(255,236,242,.7), transparent 60%), #fffefb;
  box-shadow: 0 14px 24px -16px rgba(150,90,70,.5), inset 0 0 0 1.5px #f3e3da; }
/* 형광펜 밑줄 제목 */
.st-marker { background: linear-gradient(transparent 58%, rgba(255,214,228,.9) 58%, rgba(255,214,228,.9) 92%, transparent 92%); padding: 0 .15em; }
/* 폴라로이드 · 스티커 흰 테두리(다이컷) */
.st-polaroid { box-shadow: 0 10px 18px -10px rgba(90,60,50,.45), 0 1px 2px rgba(90,60,50,.15); }
.st-diecut { box-shadow: 0 0 0 3px #fff, 0 6px 12px -6px rgba(90,60,50,.45); }
.st-diecut-img { filter: drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 5px 6px rgba(90,60,50,.3)); }
.st-diecut-card { box-shadow: 0 10px 18px -12px rgba(90,60,50,.55); }
/* 포스트잇: 아래 모서리가 살짝 들린 그림자 */
.st-postit { border-radius: 2px 2px 14px 2px; box-shadow: 0 8px 12px -8px rgba(90,60,50,.45); color: #5a4038; }
/* 빈 칸: 점선 동그라미 · 오늘 칸은 숨쉬듯 */
.st-slot { border: 2px dashed #ecd2c6; }
.st-slot.is-today { border-color: #f4a9bd; background: rgba(255,226,234,.6); animation: ah-wait 1.8s ease-in-out infinite; }
.st-stuck { filter: drop-shadow(0 3px 3px rgba(90,60,50,.25)); }
/* 스티커 받침: 매끈한 이형지 */
.st-sheet { background: linear-gradient(160deg, #ffffff, #fbf3ee); box-shadow: inset 0 0 0 1.5px #f3e3da, 0 6px 14px -10px rgba(90,60,50,.4); }
/* 떼어 드는 스티커: 들리면 커지고 그림자가 깊어짐 */
.st-peel { transition: transform .35s cubic-bezier(.3,1.4,.5,1), filter .2s; z-index: 20; cursor: grab; }
.st-peel.is-lifted { transition: none; cursor: grabbing; filter: drop-shadow(0 16px 14px rgba(90,60,50,.35)); scale: 1.15; }
.st-peel:not(.is-lifted) { animation: st-wiggle 2.6s ease-in-out 1.5s infinite; }
@keyframes st-wiggle { 0%, 80%, 100% { rotate: 0deg; } 85% { rotate: -6deg; } 90% { rotate: 5deg; } 95% { rotate: -2deg; } }
.st-hint { animation: st-hint 1.6s ease-in-out infinite; }
@keyframes st-hint { 50% { translate: -6px -4px; } }
/* 카드 스티커: 누르면 종이에서 들리고(그림자 깊어짐) 테이프가 젖혀짐 → 떼면 말랑하게 다시 붙음 */
.st-card { transition: transform .5s cubic-bezier(.3,1.7,.45,1); -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
.st-card .st-diecut-card { transition: box-shadow .3s; }
.st-card.is-pressed { transform: translateY(-7px) scale(1.05); transition-duration: .16s; transition-timing-function: ease-out; }
.st-card.is-pressed .st-diecut-card { box-shadow: 0 22px 26px -14px rgba(90,60,50,.55); }
.st-card-tape { transition: transform .3s cubic-bezier(.3,1.5,.5,1); transform-origin: 0 50%; }
.st-card.is-pressed .st-card-tape { transform: translateY(-4px) rotate(-10deg) scaleY(.9); }
/* 떼어 드는 스티커: 오른쪽 아래 모서리가 들려 보임 */
.st-peel::after { content: ""; position: absolute; right: 8%; bottom: 8%; width: 0; height: 0; border-radius: 0 0 70% 0; pointer-events: none;
  background: linear-gradient(135deg, rgba(255,255,255,0) 50%, #ffffff 51%, #efe6e1 100%); box-shadow: -3px -3px 6px rgba(90,60,50,.22); transition: width .18s, height .18s; }
.st-peel.is-lifted::after { width: 30%; height: 30%; }
/* 출근 칸 속지 넘기기: 왼쪽 링을 축으로 넘어갔다 새 쪽이 펼쳐짐 */
.st-week { transform-origin: 0% 50%; }
.st-week.is-out { transform: perspective(700px) rotateY(-78deg); opacity: .35; transition: transform .22s ease-in, opacity .22s; }
.st-week.is-in { animation: st-flipin .32s cubic-bezier(.2,1.2,.4,1); }
@keyframes st-flipin { from { transform: perspective(700px) rotateY(70deg); opacity: .35; } }
/* 펜 체크 · 취소선 */
.st-check { stroke-dasharray: 30; stroke-dashoffset: 30; animation: st-draw .45s ease-out forwards; }
@keyframes st-draw { to { stroke-dashoffset: 0; } }
.st-strike { background: linear-gradient(transparent 52%, #ea4c7c 52%, #ea4c7c 60%, transparent 60%) no-repeat; background-size: 100% 100%; animation: st-strike .4s ease-out both; color: #b7a9a1; }
@keyframes st-strike { from { background-size: 0% 100%; } }
/* 손으로 놓기: 위에서 살짝 비뚤게 내려와 자리 잡음 */
.st-place { animation: st-place .6s cubic-bezier(.25,1.35,.45,1) both; animation-delay: var(--d, 0ms); }
@keyframes st-place { from { opacity: 0; transform: translateY(-16px) scale(1.06); rotate: calc(var(--r, 0deg) + 7deg); } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .st-place, .st-peel, .st-hint, .st-slot.is-today, .st-check, .st-strike { animation: none; } .st-check { stroke-dashoffset: 0; } }
`;
