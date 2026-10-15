"use client";

/**
 * 모바일 손가락 동작 부품 — 홈 새 시안 공통 (로컬 시안 전용, 배포 X)
 * ---------------------------------------------------------------------
 * 휴대폰 기준: 마우스 hover 효과는 쓰지 않는다. 조작한 그 요소만 반응한다.
 *  - haptic: 짧은 진동 (앱=Capacitor Haptics, 웹=지원 기기만 navigator.vibrate)
 *  - usePressable: 누름(눌림 표시) · 톡(tap) · 꾹 누르기(long press, 0.42초) · 스크롤하려고 움직이면 취소
 *  - useExpandNav: 누른 카드가 그 자리에서 화면 가득 커진 뒤 그 페이지로 이동
 *  - Peek: 꾹 누르면 카드 자리에서 미리보기 판이 커져 나옴(바깥을 누르면 다시 줄어듦)
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const EASE = "cubic-bezier(.2,.9,.2,1)";
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 짧은 진동 */
export function haptic(strength: "light" | "medium" = "light") {
    try {
        const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
        if (cap?.isNativePlatform?.()) {
            import("@capacitor/haptics")
                .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: strength === "medium" ? ImpactStyle.Medium : ImpactStyle.Light }))
                .catch(() => undefined);
            return;
        }
        navigator.vibrate?.(strength === "medium" ? 18 : 8);
    } catch {
        /* 진동을 못 쓰는 기기는 조용히 넘어감 */
    }
}

/**
 * 누름 · 톡 · 꾹 누르기
 *  - 손가락을 대면 pressed(눌림 표시), 10px 넘게 움직이면 스크롤로 보고 취소
 *  - 0.42초 안에 떼면 onTap, 그 이상 누르고 있으면 onLongPress(진동과 함께)
 */
export function usePressable({ onTap, onLongPress, delay = 420 }: { onTap?: (el: HTMLElement) => void; onLongPress?: (el: HTMLElement) => void; delay?: number }) {
    const [pressed, setPressed] = useState(false);
    const st = useRef<{ x: number; y: number; timer: number; fired: boolean; el: HTMLElement } | null>(null);
    const cancel = () => {
        if (st.current) window.clearTimeout(st.current.timer);
        st.current = null;
        setPressed(false);
    };
    const handlers = {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
            const el = e.currentTarget;
            const timer = window.setTimeout(() => {
                if (!st.current) return;
                st.current.fired = true;
                setPressed(false);
                haptic("medium");
                onLongPress?.(el);
            }, delay);
            st.current = { x: e.clientX, y: e.clientY, timer, fired: false, el };
            setPressed(true);
        },
        onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
            const s = st.current;
            if (s && !s.fired && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) cancel();
        },
        onPointerUp: () => {
            const s = st.current;
            if (!s) return;
            window.clearTimeout(s.timer);
            st.current = null;
            setPressed(false);
            if (!s.fired) {
                haptic("light");
                onTap?.(s.el);
            }
        },
        onPointerCancel: cancel,
        onPointerLeave: cancel,
        // 꾹 누를 때 뜨는 기본 메뉴(이미지 저장 등) 막기
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTap?.(e.currentTarget);
            }
        },
    };
    return { pressed, handlers };
}

/** 카드 자리 → 화면 기준 잘라 보기 틀 */
const insetOf = (r: DOMRect, round = 22) =>
    `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round ${round}px)`;

/**
 * 누른 카드가 화면 가득 커진 뒤 이동
 *  go(카드 요소, 이동할 주소, 덮을 색, 위에 얹을 내용)
 */
export function useExpandNav() {
    const router = useRouter();
    const [state, setState] = useState<{ rect: DOMRect; href: string; bg: string; face?: ReactNode } | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const go = useCallback((el: HTMLElement, href: string, bg: string, face?: ReactNode) => {
        if (reduced()) return router.push(href);
        setState({ rect: el.getBoundingClientRect(), href, bg, face });
    }, [router]);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!state || !el) return;
        const anim = el.animate([{ clipPath: insetOf(state.rect) }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], { duration: 430, easing: EASE, fill: "both" });
        anim.onfinish = () => router.push(state.href);
    }, [state, router]);
    const overlay = state
        ? createPortal(
            <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[2400] overflow-hidden" style={{ background: state.bg }}>
                {state.face}
            </div>,
            document.body,
        )
        : null;
    return { go, overlay };
}

/**
 * 꾹 눌러 미리보기 — 카드 자리에서 판이 커져 나오고, 바깥을 누르면 다시 카드 자리로 줄어든다
 */
export function Peek({ from, bg, onClose, children }: { from: DOMRect | null; bg: string; onClose: () => void; children: ReactNode }) {
    const panelRef = useRef<HTMLDivElement>(null);
    const dimRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const el = panelRef.current;
        if (!el || !from || reduced()) return;
        const s = el.getBoundingClientRect();
        const inset = `inset(${from.top - s.top}px ${s.right - from.right}px ${s.bottom - from.bottom}px ${from.left - s.left}px round 22px)`;
        el.animate([{ clipPath: inset }, { clipPath: "inset(0px 0px 0px 0px round 30px)" }], { duration: 480, easing: "cubic-bezier(.2,1.1,.3,1)", fill: "both" });
        el.querySelector(".pk-body")?.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 360, delay: 200, easing: EASE, fill: "both" });
        dimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "both" });
    }, [from]);
    const close = useCallback(() => {
        const el = panelRef.current;
        if (!el || !from || reduced()) return onClose();
        const s = el.getBoundingClientRect();
        const inset = `inset(${from.top - s.top}px ${s.right - from.right}px ${s.bottom - from.bottom}px ${from.left - s.left}px round 22px)`;
        dimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: "both" });
        el.animate([{ clipPath: "inset(0px 0px 0px 0px round 30px)" }, { clipPath: inset }], { duration: 340, easing: EASE, fill: "both" }).onfinish = onClose;
    }, [from, onClose]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [close]);
    return createPortal(
        <div className="fixed inset-0 z-[2350]" role="dialog" aria-modal="true">
            <div ref={dimRef} className="absolute inset-0 bg-[#3a2f2c]/30 backdrop-blur-[6px]" onClick={close} />
            <div ref={panelRef} className="ah-sq absolute inset-x-4 top-1/2 max-h-[78dvh] -translate-y-1/2 overflow-y-auto rounded-[30px]" style={{ background: bg, boxShadow: "0 30px 60px -24px rgba(60,30,40,.45)" }}>
                {children}
                <p className="ah-light pb-3 text-center text-[11.5px] text-[#7a6a63]">바깥을 누르면 닫혀요</p>
            </div>
        </div>,
        document.body,
    );
}
