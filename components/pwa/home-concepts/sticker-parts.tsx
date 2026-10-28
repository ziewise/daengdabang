"use client";

/**
 * 스티커북 결 화면 부품 — 매일 댕생활 · 댕자랑 · 연구소 · 마이 (로컬 시안 전용, 배포 X)
 * ---------------------------------------------------------------------
 * 휴대폰 손가락 동작 기준(hover 없음).
 *  - DiaryTabs: 다이어리 위로 튀어나온 색인 종이 탭 — 고른 탭은 속지와 이어져 올라옴
 *  - DiaryBody: 점 모눈 속지(왼쪽 링) — 옆으로 밀면 다음/이전 쪽으로 넘어가며(넘기는 방향으로 기울어 들어옴) 탭이 바뀜
 *  - InkStamp: 잉크 도장(원형 테두리 · 비스듬) · BoneBurst: 두 번 톡 응원 때 크레파스 뼈다귀가 터짐
 *  - NoteToast: 탭바 위에 잠깐 붙었다 떨어지는 포스트잇 알림
 *  - SectionLabel: 형광펜 밑줄 소제목 + 점선
 */

import { useEffect, useRef, type ReactNode } from "react";
import { haptic } from "./gestures";

/** 색인 탭 */
export function DiaryTabs({ tabs, active, onPick, compact = false }: { tabs: { label: string; color: string }[]; active: number; onPick: (i: number) => void; compact?: boolean }) {
    // compact — 탭이 6칸 이상이라 한 줄에 안 들어갈 때 좁은 탭(글자 · 안쪽 여백만 줄임, 2026-10-28)
    return (
        <div className={`relative z-[1] -mb-[3px] flex pl-8 pr-2 ${compact ? "gap-1" : "gap-1.5"}`} role="tablist" aria-label="쪽 고르기">
            {tabs.map((t, i) => (
                <button key={t.label} type="button" role="tab" aria-selected={active === i} onClick={() => { if (i !== active) { haptic("light"); onPick(i); } }}
                    className={`dt-tab ah-display whitespace-nowrap ${active === i ? "is-on" : ""} ${compact ? "is-compact" : ""}`} style={{ ["--c" as string]: t.color }}>
                    {t.label}
                </button>
            ))}
        </div>
    );
}

/** 속지 — 옆으로 밀면 쪽이 넘어감 */
export function DiaryBody({ pageKey, dir, onSwipe, children, className = "" }: { pageKey: string | number; dir: number; onSwipe?: (step: 1 | -1) => void; children: ReactNode; className?: string }) {
    const start = useRef<{ x: number; y: number } | null>(null);
    return (
        <article className={`st-page ah-sq relative rounded-[1.6rem] pb-6 pl-9 pr-4 pt-6 touch-pan-y ${className}`}
            onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY }; }}
            onPointerUp={(e) => {
                const s = start.current;
                start.current = null;
                if (!s || !onSwipe) return;
                const dx = e.clientX - s.x;
                const dy = e.clientY - s.y;
                // 가로로 충분히(60px) 밀었을 때만 — 세로 스크롤과 헷갈리지 않게
                if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
            }}
            onPointerCancel={() => { start.current = null; }}>
            {/* 왼쪽 링 구멍 */}
            <span aria-hidden="true" className="absolute bottom-6 left-2.5 top-6 flex flex-col justify-between">
                {Array.from({ length: 12 }, (_, i) => <span key={i} className="block h-3 w-3 rounded-full bg-[#f3e6dc] shadow-[inset_0_1px_2px_rgba(120,80,60,.35)]" />)}
            </span>
            <div key={pageKey} className={dir >= 0 ? "dt-in-next" : "dt-in-prev"}>{children}</div>
        </article>
    );
}

/** 형광펜 밑줄 소제목 + 점선 */
export function SectionLabel({ children, icon, className = "" }: { children: ReactNode; icon?: string; className?: string }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="ah-display st-marker text-[15px]">{children}</span>
            <span className="h-px flex-1 border-t-2 border-dashed border-[#f0d9cf]" />
            {icon ? <i aria-hidden="true" className={`fa-solid ${icon} text-[12px] text-[#ff8fae]`} /> : null}
        </div>
    );
}

/** 잉크 도장 */
export function InkStamp({ children, color = "#e0557f", rot = -12, className = "" }: { children: ReactNode; color?: string; rot?: number; className?: string }) {
    return <span className={`ink-stamp ah-display ${className}`} style={{ ["--c" as string]: color, rotate: `${rot}deg` }}>{children}</span>;
}

/** 두 번 톡 응원 — 크레파스 뼈다귀가 터지고 사라짐 (위치는 부모 기준 %) */
export function BoneBurst({ x, y }: { x: number; y: number }) {
    return (
        <span aria-hidden="true" className="bone-burst" style={{ left: `${x}%`, top: `${y}%` }}>
            {/* 뼈다귀: 같은 모양을 두껍게(분홍 테두리) 한 번, 그 위에 흰색으로 한 번 → 겉선만 남음 */}
            <svg viewBox="0 0 100 50" className="h-12 w-24">
                {(["#e0557f", "#fff"] as const).map((fill, k) => (
                    <g key={fill} fill={fill} stroke={k === 0 ? "#e0557f" : "none"} strokeWidth={k === 0 ? 7 : 0}>
                        <rect x="22" y="17" width="56" height="16" rx="4" />
                        <circle cx="20" cy="15" r="10" /><circle cx="20" cy="35" r="10" />
                        <circle cx="80" cy="15" r="10" /><circle cx="80" cy="35" r="10" />
                    </g>
                ))}
            </svg>
            {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="bone-dot" style={{ ["--a" as string]: `${i * 60}deg` }} />)}
        </span>
    );
}

/** 포스트잇 알림 — 탭바 위에 잠깐 */
export function NoteToast({ text, onDone }: { text: string; onDone: () => void }) {
    useEffect(() => {
        const id = window.setTimeout(onDone, 2200);
        return () => window.clearTimeout(id);
    }, [text, onDone]);
    return (
        <div role="status" className="note-toast st-postit ah-display fixed left-1/2 z-[2300] max-w-[86vw] -translate-x-1/2 px-4 py-2.5 text-[13.5px]"
            style={{ bottom: "calc(var(--app-tabbar-h, 88px) + 10px)", background: "#fff3a6" }}>
            {text}
        </div>
    );
}

/* 스티커북 화면 부품 CSS */
export const PARTS_CSS = `
/* 색인 탭: 안 고른 탭은 살짝 내려가 파스텔, 고른 탭은 속지 색으로 올라와 이어짐 */
.dt-tab { position: relative; padding: 7px 12px 11px; border-radius: 13px 13px 0 0; background: var(--c); font-size: 13px; color: #7a6a63;
  translate: 0 6px; transition: translate .35s cubic-bezier(.3,1.6,.5,1), background .25s, color .25s; box-shadow: inset 0 1px 0 rgba(255,255,255,.7); -webkit-tap-highlight-color: transparent; }
.dt-tab.is-on { background: #fffdf8; color: #3a2f2c; translate: 0 0; box-shadow: 0 -6px 12px -8px rgba(150,90,70,.45), inset 0 1.5px 0 #fff; }
.dt-tab:active { translate: 0 8px; }
.dt-tab.is-compact { padding: 7px 9px 11px; font-size: 12px; }
/* 쪽 넘김: 넘기는 방향으로 기울어 들어옴 */
.dt-in-next { animation: dt-next .5s cubic-bezier(.2,1,.3,1); transform-origin: 0 50%; }
.dt-in-prev { animation: dt-prev .5s cubic-bezier(.2,1,.3,1); transform-origin: 100% 50%; }
@keyframes dt-next { from { opacity: 0; transform: perspective(900px) rotateY(-28deg) translateX(26px); } }
@keyframes dt-prev { from { opacity: 0; transform: perspective(900px) rotateY(24deg) translateX(-26px); } }
/* 잉크 도장: 이중 원 테두리 + 살짝 번진 느낌 */
.ink-stamp { display: inline-grid; place-items: center; text-align: center; color: var(--c); border: 2.5px solid var(--c); outline: 1.5px solid var(--c); outline-offset: -6px;
  border-radius: 999px; padding: 8px 12px; line-height: 1.1; mix-blend-mode: multiply; opacity: .88; filter: drop-shadow(0 0 .4px var(--c)); }
/* 두 번 톡 응원 */
.bone-burst { position: absolute; z-index: 5; translate: -50% -50%; pointer-events: none; animation: bone-pop .9s cubic-bezier(.2,1.4,.4,1) forwards; }
@keyframes bone-pop { 0% { scale: .2; opacity: 0; rotate: -20deg; } 25% { scale: 1.15; opacity: 1; rotate: 6deg; } 60% { scale: 1; opacity: 1; } 100% { scale: .9; opacity: 0; translate: -50% -110%; } }
.bone-dot { position: absolute; left: 50%; top: 50%; width: 7px; height: 7px; border-radius: 999px; background: #ff8fb0; rotate: var(--a); animation: bone-dot .7s ease-out forwards; }
@keyframes bone-dot { from { transform: translateX(0) scale(1); opacity: 1; } to { transform: translateX(46px) scale(.3); opacity: 0; } }
/* 포스트잇 알림: 휙 붙었다가 떨어짐 */
.note-toast { animation: note-in .45s cubic-bezier(.3,1.5,.5,1) both, note-out .35s ease-in 1.85s forwards; }
@keyframes note-in { from { opacity: 0; transform: translateY(16px) rotate(-6deg) scale(.9); } to { transform: rotate(-1.5deg); } }
@keyframes note-out { to { opacity: 0; transform: translateY(12px) rotate(4deg); } }
/* 티켓(굿즈 공모전): 양옆이 둥글게 파이고 가운데 절취선 */
.st-ticket { background: linear-gradient(160deg, #fff8e0, #ffeab0); border-radius: 18px; position: relative;
  -webkit-mask: radial-gradient(circle 11px at 0 62%, transparent 98%, #000) left / 51% 100% no-repeat, radial-gradient(circle 11px at 100% 62%, transparent 98%, #000) right / 51% 100% no-repeat;
          mask: radial-gradient(circle 11px at 0 62%, transparent 98%, #000) left / 51% 100% no-repeat, radial-gradient(circle 11px at 100% 62%, transparent 98%, #000) right / 51% 100% no-repeat;
  box-shadow: 0 12px 22px -16px rgba(150,100,30,.6); }
.st-ticket-cut { border-top: 2px dashed rgba(170,120,40,.35); }
/* 영수증: 아래가 지그재그 */
.st-receipt { background: #fff; padding-bottom: 14px; box-shadow: 0 8px 14px -10px rgba(90,60,50,.4);
  -webkit-mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 12px 6px repeat-x, linear-gradient(#000 0 0) top / 100% calc(100% - 6px) no-repeat;
          mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 12px 6px repeat-x, linear-gradient(#000 0 0) top / 100% calc(100% - 6px) no-repeat; }
/* 메뉴 목록 — 종이에 줄(괘선) 없이(사용자 규칙): 흰 메모 카드 안에 한 줄씩, 사이는 간격만 */
.st-lined { padding: 4px 12px; border-radius: 6px 6px 16px 6px; background: #fffdf8; box-shadow: 0 0 0 1.5px #f3e6d6, 0 8px 14px -11px rgba(110,80,40,.45); }
.st-lined > * + * { margin-top: 1px; }
@media (prefers-reduced-motion: reduce) { .dt-in-next, .dt-in-prev, .bone-burst, .note-toast { animation-duration: .01ms; } .dt-tab { transition: none; } }
`;
