"use client";

/**
 * daily-life/ui — 앱용 "매일 댕생활" 화면 공용 조각 · 프리미엄 디자인 언어 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 원칙: 따뜻한 무채색 바탕 + 탭마다 강조색 하나 · 얇은 테두리와 부드러운 그림자 · 큰 제목만 카페24, 나머지는 원티드 산스
 *       장식(떠다니는 아이콘 · 젤리 두께 · 반짝이)은 쓰지 않고, 움직임은 흐림→또렷 · 스프링 전환 · 차오르는 선/링으로만.
 *  - TONES: 강조색 다섯(blue · violet · rose · green · amber) — 각 accent(강조) · tint(옅은 바탕) · ink(진한 글자)
 *  - toneOf: 기존 섹션 데이터의 tone(coral · teal · orange) → 강조색
 *  - IconDot(옅은 동그라미 + 아이콘) · SectionHead · Pill · Reveal · useInView · BottomSheet · DL_CSS
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

export const TEXT = "#1f1a18";
export const TEXT_SOFT = "#6f625c";
export const TEXT_FAINT = "#a3968f";

// 로그인 · 회원가입 뒤 매일 댕생활로 돌아오는 주소 (기존 화면과 같은 주소)
export const LOGIN_HREF = "/auth/login/?redirect=%2Ftreasure-mine%2F";
export const SIGNUP_HREF = "/auth/signup/?redirect=%2Ftreasure-mine%2F";
export const PROGRAMS_LOGIN_HREF = "/auth/login/?redirect=%2Ftreasure-mine%2F%23growth-programs";

export type ToneKey = "blue" | "violet" | "rose" | "green" | "amber";
export type Tone = { accent: string; tint: string; ink: string };

export const TONES: Record<ToneKey, Tone> = {
    blue: { accent: "#2f7fd8", tint: "rgba(47,127,216,0.09)", ink: "#1d5ea8" },
    violet: { accent: "#7a5cf0", tint: "rgba(122,92,240,0.09)", ink: "#5a3fc4" },
    rose: { accent: "#e2547e", tint: "rgba(226,84,126,0.09)", ink: "#b8335d" },
    green: { accent: "#13a184", tint: "rgba(19,161,132,0.09)", ink: "#0d7a63" },
    amber: { accent: "#e07a2f", tint: "rgba(224,122,47,0.10)", ink: "#a9551a" },
};

/** 기존 데이터의 tone(coral · teal · orange) → 강조색 */
export function toneOf(tone: string): Tone {
    if (tone === "coral") return TONES.rose;
    if (tone === "teal") return TONES.green;
    if (tone === "orange") return TONES.amber;
    return TONES[(tone as ToneKey)] ?? TONES.blue;
}

/** 옅은 강조색 동그라미 + 아이콘 (Font Awesome) */
export function IconDot({ icon, tone, size = 40, className = "" }: { icon: string; tone: Tone; size?: number; className?: string }) {
    return (
        <span className={`grid shrink-0 place-items-center rounded-full ${className}`} style={{ width: size, height: size, background: tone.tint, color: tone.accent }} aria-hidden="true">
            <i className={`fa-solid ${icon}`} style={{ fontSize: Math.round(size * 0.4) }} />
        </span>
    );
}

/** 섹션 머리 — 작은 강조 글자 · 큰 제목 · 설명 */
export function SectionHead({ kicker, title, children, tone, extra }: { kicker?: string; title: ReactNode; children?: ReactNode; tone: Tone; extra?: ReactNode }) {
    return (
        <header className="px-0.5">
            {(kicker || extra) && (
                <div className="flex flex-wrap items-center gap-2">
                    {kicker && <p className="pv-kicker" style={{ color: tone.accent }}>{kicker}</p>}
                    {extra}
                </div>
            )}
            <h2 className="pv-title mt-1.5">{title}</h2>
            {children && <p className="pv-body mt-2">{children}</p>}
        </header>
    );
}

/** 작은 표시 (상태 · 안내) */
export function Pill({ children, tone, solid = false, style }: { children: ReactNode; tone: Tone; solid?: boolean; style?: CSSProperties }) {
    return (
        <span className="pv-pill" style={solid ? { background: tone.accent, color: "#fff", ...style } : { background: tone.tint, color: tone.ink, ...style }}>
            {children}
        </span>
    );
}

/** 요소가 화면에 들어왔는지 — 한 번 들어오면 계속 true (once) */
export function useInView<T extends Element>(ref: RefObject<T | null>, { once = true, threshold = 0.25 } = {}) {
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // 움직임 줄이기 설정이면 바로 보이게
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const t = window.setTimeout(() => setInView(true), 0);
            return () => window.clearTimeout(t);
        }
        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setInView(true);
                if (once) io.disconnect();
            } else if (!once) setInView(false);
        }, { threshold });
        io.observe(el);
        return () => io.disconnect();
    }, [ref, once, threshold]);
    return inView;
}

/** 화면에 들어올 때 흐릿함에서 또렷하게 떠오름 — order 로 차례 지연(80ms 간격) */
export function Reveal({ children, order = 0, className = "" }: { children: ReactNode; order?: number; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { threshold: 0.12 });
    return (
        <div ref={ref} className={`pv-reveal ${inView ? "is-in" : ""} ${className}`} style={{ "--d": `${order * 80}ms` } as CSSProperties}>
            {children}
        </div>
    );
}

/** 아래에서 올라오는 판 — 바깥 누르기 · 닫기 · Esc 로 닫힘, 열린 동안 뒤 화면 스크롤 잠금 */
export function BottomSheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
    const closeRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);
    if (!open) return null;
    return createPortal(
        // 탭바(z 2150) · 옵션 시트(2301) 보다 위
        <div className="fixed inset-0 z-[2400] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={label}>
            <button type="button" className="pv-sheet-dim absolute inset-0 bg-[#1f1a18]/40 backdrop-blur-[2px]" onClick={onClose} aria-label="닫기" tabIndex={-1} />
            <div className="pv-sheet relative max-h-[86vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[calc(22px+env(safe-area-inset-bottom,0px))] pt-3 shadow-[0_-20px_50px_-20px_rgba(31,26,24,0.45)]">
                <div className="sticky top-0 z-10 -mx-5 mb-2 flex items-center justify-center bg-white px-5 pb-2">
                    <span className="h-1 w-10 rounded-full bg-[#e7dfda]" aria-hidden="true" />
                    <button ref={closeRef} type="button" onClick={onClose} className="absolute right-4 top-0 grid h-8 w-8 place-items-center rounded-full bg-[#f4efec] text-[#6f625c]" aria-label="닫기">
                        <i className="fa-solid fa-xmark text-[13px]" aria-hidden="true" />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );
}

/** 화면 공용 스타일 — DailyLifeApp 에서 한 번만 넣는다 */
export const DL_CSS = `
/* 바탕 — 따뜻한 무채색, 위쪽에만 고른 탭 강조색이 아주 옅게 (--bg-tint) */
.pv-bg { background: radial-gradient(120% 50% at 50% 0%, var(--bg-tint, rgba(47,127,216,0.07)) 0%, rgba(255,255,255,0) 70%), #faf7f4; transition: background .6s ease; }
html[data-ddb-android-dark="true"] .pv-bg { background: #151316; }

/* 글씨 */
.pv-title { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-size: 22px; line-height: 1.28; letter-spacing: -0.025em; color: ${TEXT}; }
.pv-h3 { font-family: var(--font-wanted-sans), sans-serif; font-size: 15.5px; font-weight: 700; line-height: 1.35; letter-spacing: -0.02em; color: ${TEXT}; }
.pv-body { font-family: var(--font-wanted-sans), "Apple SD Gothic Neo", sans-serif; font-size: 13.5px; line-height: 1.62; color: ${TEXT_SOFT}; letter-spacing: -0.01em; }
.pv-small { font-family: var(--font-wanted-sans), sans-serif; font-size: 12px; line-height: 1.55; color: ${TEXT_FAINT}; letter-spacing: -0.01em; }
.pv-kicker { font-family: var(--font-wanted-sans), sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.pv-num { font-family: var(--font-wanted-sans), sans-serif; font-variant-numeric: tabular-nums; font-weight: 800; letter-spacing: -0.04em; }
.pv-pill { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 4px 9px; font-family: var(--font-wanted-sans), sans-serif; font-size: 11.5px; font-weight: 700; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; }

/* 카드 — 흰 판 + 머리카락 같은 테두리 + 겹 그림자 */
.pv-card { background: #fff; border-radius: 24px; box-shadow: 0 0 0 1px rgba(31,26,24,0.05), 0 1px 2px rgba(31,26,24,0.04), 0 14px 34px -18px rgba(60,40,30,0.22); }
.pv-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.pv-row + .pv-row, .pv-sep + .pv-sep { box-shadow: inset 0 1px 0 rgba(31,26,24,0.06); }
html[data-ddb-android-dark="true"] .pv-card { background: #1f1c21; box-shadow: 0 0 0 1px rgba(255,255,255,.06); }

/* 버튼 — 짙은 기본 · 흰 · 테두리만 */
.pv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; padding: 0 22px; border-radius: 16px;
  background: ${TEXT}; color: #fff; font-family: var(--font-wanted-sans), sans-serif; font-size: 15px; font-weight: 700; letter-spacing: -0.02em;
  box-shadow: 0 10px 22px -12px rgba(31,26,24,.55); transition: transform .4s cubic-bezier(.22,1,.36,1), box-shadow .3s ease, opacity .2s; }
.pv-btn:active { transform: scale(.97); box-shadow: 0 4px 10px -6px rgba(31,26,24,.5); }
.pv-btn:disabled { opacity: .55; }
.pv-btn-light { background: #fff; color: ${TEXT}; box-shadow: none; }
.pv-btn-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 46px; padding: 0 18px; border-radius: 14px;
  background: #fff; color: ${TEXT}; font-family: var(--font-wanted-sans), sans-serif; font-size: 14px; font-weight: 700; letter-spacing: -0.02em;
  box-shadow: inset 0 0 0 1px rgba(31,26,24,.12); transition: transform .4s cubic-bezier(.22,1,.36,1), background .2s; }
.pv-btn-ghost:active { transform: scale(.97); background: #f7f3f0; }
.pv-press { transition: transform .45s cubic-bezier(.22,1,.36,1); -webkit-tap-highlight-color: transparent; }
.pv-press:active { transform: scale(.975); transition-duration: .15s; }

/* 들어올 때 — 흐림에서 또렷하게 */
.pv-reveal { opacity: 0; transform: translateY(14px); filter: blur(8px); transition: opacity .7s cubic-bezier(.22,1,.36,1) var(--d,0ms), transform .8s cubic-bezier(.22,1,.36,1) var(--d,0ms), filter .7s ease var(--d,0ms); }
.pv-reveal.is-in { opacity: 1; transform: none; filter: none; }

/* 탭 화면 바뀔 때 — 넘긴 방향에서 스프링처럼 */
@keyframes pv-in-next { from { opacity: 0; transform: translateX(36px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes pv-in-prev { from { opacity: 0; transform: translateX(-36px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes pv-in-up { from { opacity: 0; transform: translateY(14px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
.pv-panel { animation: pv-in-up .55s cubic-bezier(.22,1,.36,1) both; }
.pv-panel[data-dir="next"] { animation-name: pv-in-next; }
.pv-panel[data-dir="prev"] { animation-name: pv-in-prev; }

/* 아래에서 올라오는 판 */
@keyframes pv-sheet-up { from { transform: translateY(100%); } to { transform: none; } }
@keyframes pv-dim-in { from { opacity: 0; } to { opacity: 1; } }
.pv-sheet { animation: pv-sheet-up .45s cubic-bezier(.22,1,.36,1) both; }
.pv-sheet-dim { animation: pv-dim-in .3s ease both; }

/* 완료 표시 톡 */
@keyframes pv-pop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: none; } }
.pv-pop { animation: pv-pop .5s cubic-bezier(.22,1.4,.36,1) both; }

/* 검정 푸들 — 눈꺼풀 깜빡 · 출근할 때 한 번 깡충 */
.pv-lid { position: absolute; width: 8.8%; height: 9.4%; border-radius: 50% 50% 46% 46%; background: radial-gradient(ellipse at 50% 30%, #2a2a33 0%, #141419 70%);
  transform: scaleY(0); transform-origin: 50% 0; transition: transform .07s ease-in; pointer-events: none; }
.pv-lid.is-shut { transform: scaleY(1); }
@keyframes pv-hop { 0% { transform: translateY(0) scale(1.04, .94); } 35% { transform: translateY(-14px) scale(.97, 1.04); } 65% { transform: translateY(0) scale(1.03, .96); } 100% { transform: none; } }
.pv-hop { transform-origin: 50% 100%; animation: pv-hop .7s cubic-bezier(.3,1.3,.5,1) both; }

/* 스티커 그림 — 기울기(--rot) · 얇은 그림자. 아직 안 모은 것은 흐린 회색 실루엣 */
.pv-sticker-img { overflow: hidden; transform: rotate(var(--rot, 0deg)); box-shadow: 0 1px 1px rgba(31,26,24,.08), 0 8px 14px -8px rgba(90,50,90,.45);
  transition: transform .5s cubic-bezier(.22,1,.36,1), filter .4s ease, opacity .4s ease; }
.pv-sticker-img.is-ghost { filter: grayscale(1) contrast(.85); opacity: .22; box-shadow: none; }
/* 붙일 때 광택이 한 번 스침 */
.pv-sticker-img::after { content: ""; position: absolute; top: -20%; bottom: -20%; left: 0; width: 40%; z-index: 1; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.8), transparent); transform: translateX(-180%) skewX(-18deg); }
.pv-stick::after { animation: pv-gloss .7s ease-out .5s both; }
@keyframes pv-gloss { from { transform: translateX(-180%) skewX(-18deg); } to { transform: translateX(320%) skewX(-18deg); } }
/* 붙이기 — 들린 채(크게 · 그림자 진하게) 내려와 꾹 눌러 붙고 제 각도로 */
@keyframes pv-stick {
  0% { transform: translateY(-70px) scale(1.7) rotate(calc(var(--rot) - 26deg)); opacity: 0; box-shadow: 0 30px 30px -10px rgba(60,40,30,.35); }
  40% { transform: translateY(-14px) scale(1.25) rotate(calc(var(--rot) - 10deg)); opacity: 1; box-shadow: 0 22px 22px -10px rgba(60,40,30,.32); }
  68% { transform: translateY(0) scale(.9, .86) rotate(var(--rot)); box-shadow: 0 1px 1px rgba(31,26,24,.1), 0 2px 4px -2px rgba(60,40,30,.3); }
  84% { transform: scale(1.05) rotate(var(--rot)); }
  100% { transform: rotate(var(--rot)); }
}
.pv-stick { animation: pv-stick .7s cubic-bezier(.3,.9,.4,1) both; }
/* 쾅 — 도장처럼 크게 기울어 내려와 요일 글자 위에 내리찍고(납작) 튀어 제자리 */
@keyframes pv-slam {
  0% { transform: translateY(-38px) scale(2) rotate(calc(var(--rot) - 22deg)); opacity: 0; box-shadow: 0 26px 26px -12px rgba(90,50,90,.4); }
  38% { transform: translateY(0) scale(1.12) rotate(calc(var(--rot) - 6deg)); opacity: 1; }
  48% { transform: scale(.86, .8) rotate(var(--rot)); box-shadow: 0 1px 2px rgba(31,26,24,.12); }
  66% { transform: scale(1.08) rotate(var(--rot)); }
  82% { transform: scale(.97) rotate(var(--rot)); }
  100% { transform: rotate(var(--rot)); }
}
.pv-slam { animation: pv-slam .75s cubic-bezier(.25,.9,.35,1) both; }
.pv-slam::after { animation: pv-gloss .7s ease-out .5s both; }
/* 잉크 물결 — 찍히는 순간 칸 둘레로 퍼짐 */
@keyframes pv-ink { 0%, 34% { transform: scale(.8); opacity: 0; box-shadow: 0 0 0 0 rgba(240,87,127,.55); } 40% { opacity: 1; } 100% { transform: scale(1.5); opacity: 0; box-shadow: 0 0 0 6px rgba(240,87,127,0); } }
.pv-ink { animation: pv-ink .8s ease-out both; }
/* 판이 한 번 쿵 */
@keyframes pv-thud { 0% { transform: translateY(0); } 30% { transform: translateY(3px); } 60% { transform: translateY(-1px); } 100% { transform: none; } }
.pv-thud { animation: pv-thud .3s ease-out; }

/* 고급 카드 — 분홍 · 연보라 빛이 번진 판 + 위쪽 흰 하이라이트 + 겹 그림자 */
.pv-luxe { border-radius: 30px;
  background: radial-gradient(75% 60% at 0% 0%, rgba(255,214,228,.8) 0%, rgba(255,214,228,0) 62%), radial-gradient(70% 70% at 100% 100%, rgba(228,218,255,.85) 0%, rgba(228,218,255,0) 62%), linear-gradient(180deg, #fffdfe 0%, #ffffff 100%);
  box-shadow: 0 0 0 1px rgba(150,90,140,.08), inset 0 1px 0 rgba(255,255,255,.95), 0 2px 6px -2px rgba(140,80,150,.12), 0 26px 50px -30px rgba(140,80,150,.55); }
.pv-luxe-pink { background: radial-gradient(80% 70% at 100% 0%, rgba(230,220,255,.9) 0%, rgba(230,220,255,0) 60%), radial-gradient(70% 70% at 0% 100%, rgba(255,205,222,.85) 0%, rgba(255,205,222,0) 62%), linear-gradient(170deg, #fff8fb 0%, #ffeef4 100%); }
/* 겹친 카드 — 뒤에 한 장이 아래로 살짝 비침 */
.pv-deck-back { position: absolute; left: 16px; right: 16px; top: 14px; bottom: 0; z-index: -1; border-radius: 28px;
  background: linear-gradient(180deg, #efe6ff 0%, #ffdfe9 100%); box-shadow: 0 12px 26px -18px rgba(140,80,150,.5), 0 0 0 1px rgba(150,90,140,.06); }
/* 도장판 — 반투명 판 위에 오목하게 파인 칸들 */
.pv-tray { border-radius: 22px; padding: 12px 10px 6px; background: rgba(255,255,255,.62); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  box-shadow: inset 0 1px 3px rgba(130,80,120,.10), inset 0 0 0 1px rgba(255,255,255,.85); }
.pv-slot { background: linear-gradient(180deg, #f2eaee 0%, #faf6f8 100%); box-shadow: inset 0 2px 4px rgba(120,70,110,.16), inset 0 -1px 0 rgba(255,255,255,.95); }
.pv-slot.is-today { background: linear-gradient(180deg, #ffe6ee 0%, #fff6f9 100%); box-shadow: inset 0 2px 4px rgba(200,70,110,.18), inset 0 -1px 0 rgba(255,255,255,.95), 0 0 0 2px rgba(240,87,127,.35); }

/* 기록 보관함 — 둥실 떠오름 · 아래 그림자는 떠오를수록 작고 옅게 */
@keyframes pv-box-float { 0%, 100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-7px) rotate(1deg); } }
.pv-box-float { animation: pv-box-float 4.2s ease-in-out infinite; }
@keyframes pv-box-shadow { 0%, 100% { transform: translateX(-50%) scale(1); opacity: .55; } 50% { transform: translateX(-50%) scale(.82); opacity: .32; } }
.pv-box-shadow { background: radial-gradient(closest-side, rgba(140,80,150,.45), rgba(140,80,150,0)); animation: pv-box-shadow 4.2s ease-in-out infinite; }

/* 스티커판 — 옅은 종이 바탕 */
.pv-board { background: radial-gradient(120% 90% at 0% 0%, #fff7f9 0%, rgba(255,255,255,0) 60%), #fbf8f6; box-shadow: inset 0 0 0 1px rgba(31,26,24,.04); }
/* 오늘 빈 칸 — 천천히 숨쉬기 */
@keyframes pv-slot-today { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: .75; } }
.pv-slot-today { animation: pv-slot-today 2s ease-in-out infinite; }

/* 오늘 칸 발도장 — 살짝 내려와 찍힘 */
@keyframes pv-stamp-land { 0% { transform: scale(1.5); opacity: 0; } 60% { transform: scale(.92); opacity: 1; } 100% { transform: none; } }
.pv-stamp-land { animation: pv-stamp-land .45s cubic-bezier(.22,1.2,.36,1) both; }

/* 사진이 천천히 다가오고 살짝 흐름 (켄 번스) */
@keyframes pv-kenburns { 0% { transform: scale(1.04) translate(-1.5%, 0); } 100% { transform: scale(1.14) translate(1.5%, -2%); } }
.pv-kenburns { animation: pv-kenburns 16s ease-in-out infinite alternate; }
.pv-glass-dark { background: rgba(20,16,15,.38); backdrop-filter: blur(14px) saturate(150%); -webkit-backdrop-filter: blur(14px) saturate(150%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.16); }

/* 메탈 성장 카드 — 기울기(--rx · --ry) · 광택 위치(--mx · --my) · 뒤집기 */
.pv-metal-wrap { --rx: 0deg; --ry: 0deg; --mx: 30%; --my: 20%; perspective: 1000px; }
.pv-metal { position: relative; display: block; width: 100%; aspect-ratio: 1.62; transform-style: preserve-3d; border-radius: 24px;
  transform: rotateX(var(--rx)) rotateY(var(--ry)); transition: transform .6s cubic-bezier(.22,1,.36,1); }
.pv-metal.is-flipped { transform: rotateX(var(--rx)) rotateY(calc(var(--ry) + 180deg)); transition-duration: .8s; }
.pv-metal-face { position: absolute; inset: 0; border-radius: 24px; overflow: hidden; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.pv-metal-front { background: radial-gradient(120% 90% at 0% 0%, #4a3a8f 0%, rgba(74,58,143,0) 55%), radial-gradient(90% 90% at 100% 100%, #7b4a8a 0%, rgba(123,74,138,0) 60%), linear-gradient(140deg, #231d3d 0%, #2c2350 50%, #1c1830 100%);
  box-shadow: 0 26px 44px -24px rgba(40,25,90,.75), inset 0 0 0 1px rgba(255,255,255,.12); }
.pv-metal-back { transform: rotateY(180deg); background: #fff; box-shadow: 0 26px 44px -26px rgba(40,25,90,.45), inset 0 0 0 1px rgba(31,26,24,.06); }
/* 광택 — 손가락 위치를 따라 비스듬한 빛 + 아주 옅은 진주빛 결 */
.pv-metal-sheen { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,.26), rgba(255,255,255,0) 42%),
    linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(214,200,255,.14) 45%, rgba(255,214,236,.12) 52%, rgba(255,255,255,0) 66%);
  background-size: 100% 100%, 220% 100%; animation: pv-sheen 7s ease-in-out infinite; }
@keyframes pv-sheen { 0%, 100% { background-position: 0 0, 100% 0; } 50% { background-position: 0 0, 0% 0; } }
.pv-metal-bar { background: linear-gradient(90deg, #b9a6ff, #ffc2dc); }

/* 위치 신호 — 얇은 원이 퍼짐 */
@keyframes pv-sonar { 0% { transform: scale(.35); opacity: .7; } 100% { transform: scale(2.3); opacity: 0; } }
.pv-sonar { position: absolute; left: 50%; top: 50%; width: 80px; height: 80px; margin: -40px 0 0 -40px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px rgba(19,161,132,.55); animation: pv-sonar 3s cubic-bezier(.22,1,.36,1) infinite; }
.pv-sonar.is-fast { animation-duration: 1.2s; }

/* 탭 안 다른 구역으로 이동했을 때 상단바들에 가리지 않게 */
.dl-anchor { scroll-margin-top: calc(var(--app-topbar-h, 56px) + var(--app-subbar-h, 0px) + 72px); }

@media (prefers-reduced-motion: reduce) {
  .pv-panel, .pv-sheet, .pv-sheet-dim, .pv-pop, .pv-kenburns, .pv-metal-sheen, .pv-sonar, .pv-hop, .pv-stamp-land, .pv-stick, .pv-stick::after, .pv-slot-today, .pv-slam, .pv-slam::after, .pv-ink, .pv-thud, .pv-box-float, .pv-box-shadow { animation: none; }
  .pv-reveal { opacity: 1; transform: none; filter: none; transition: none; }
}
`;
