"use client";

import { useI18n } from "@/lib/i18n";
import LocalizedMenuLabel from "@/components/i18n/LocalizedMenuLabel";
import Image from "next/image";
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { showcasePhotoRetryUrl, showcaseThumbnailUrl } from "@/lib/showcase-image";
import { TEXT } from "./kit";
import PreparedShowcaseImage from "@/components/daeng-showcase/PreparedShowcaseImage";

/* eslint-disable @next/next/no-img-element -- Already-sized API thumbnails; preserve private/no-store responses and the in-flight image node. */

/** Retain a dialog after its first opening, without loading or mounting it on
 * the feed's critical path. Closing still preserves the existing draft state. */
export function MountOnFirstOpen({ open, children }: { open: boolean; children: ReactNode }) {
    const [mounted, setMounted] = useState(open);
    if (open && !mounted) setMounted(true);
    return mounted ? children : null;
}

/** 게시물 사진 — 로딩/실패 상태를 표시하고 실패한 사진만 다시 요청한다. */
export const PostPhoto = memo(function PostPhoto({ src, sizes, className = "", eager = false, thumbnail = false, preparedImage }: { src: string; sizes: string; className?: string; eager?: boolean; thumbnail?: boolean; preparedImage?: HTMLImageElement }) {
    const imageSrc = thumbnail ? showcaseThumbnailUrl(src) : src;
    // A handed-off node can already be ready, especially on a return visit.
    // Do not mount four loading covers and synchronously remove them from
    // layout effects before the browser can paint those same four photos.
    const [loaded, setLoaded] = useState(() => preparedImage?.src === imageSrc
        && preparedImage.complete && preparedImage.naturalWidth > 0 ? `${imageSrc}:0` : "");
    const [failed, setFailed] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [nearby, setNearby] = useState(false);
    const sentinel = useRef<HTMLSpanElement>(null);
    const normalImage = useRef<HTMLImageElement>(null);
    const automaticallyRetried = useRef<string | null>(null);
    const requested = eager || nearby || src.startsWith("blob:");
    const key = `${imageSrc}:${attempt}`;
    const onLoaded = useCallback(() => setLoaded(key), [key]);
    const onFailed = useCallback(() => setFailed(key), [key]);
    const prepared = attempt === 0 && preparedImage?.src === imageSrc ? preparedImage : undefined;
    useEffect(() => {
        if (!requested || loaded === key || failed === key) return;
        // A stalled request otherwise leaves a card loading indefinitely. Give
        // it one fresh connection, then expose the existing manual retry. Never
        // retry missing/deleted photos or keep retrying an offline background app.
        let timer: ReturnType<typeof setTimeout>;
        const check = () => {
            if (document.hidden || !navigator.onLine) return;
            const image = prepared ?? normalImage.current;
            if (image?.complete && image.naturalWidth > 0) { setLoaded(key); return; }
            image?.removeAttribute("src");
            if (automaticallyRetried.current !== imageSrc) {
                automaticallyRetried.current = imageSrc;
                setAttempt(value => value + 1);
            } else setFailed(key);
        };
        const arm = () => {
            clearTimeout(timer);
            if (!document.hidden && navigator.onLine) timer = setTimeout(check, 8_000);
        };
        arm();
        document.addEventListener("visibilitychange", arm);
        window.addEventListener("online", arm);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("visibilitychange", arm);
            window.removeEventListener("online", arm);
        };
    }, [requested, loaded, failed, key, imageSrc, prepared]);
    useEffect(() => {
        if (requested || !sentinel.current) return;
        // Browser lazy loading can fetch several screens at once on Android.
        // Admit photos only just before they enter the visible scroll area.
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                setNearby(true);
                observer.disconnect();
            }
        }, { rootMargin: "200px" });
        observer.observe(sentinel.current);
        return () => observer.disconnect();
    }, [requested]);
    return <>
        <span ref={sentinel} className="pointer-events-none absolute inset-0" aria-hidden="true" />
        {requested ? prepared
            ? <PreparedShowcaseImage image={prepared} className={`absolute inset-0 h-full w-full object-cover ${className}`} onLoad={onLoaded} onError={onFailed} />
            : <img key={key} ref={normalImage} data-showcase-image src={showcasePhotoRetryUrl(imageSrc, attempt)} alt="" sizes={sizes} loading="eager" decoding="async" fetchPriority={eager ? "high" : "auto"}
                onLoad={onLoaded} onError={onFailed}
                className={`absolute inset-0 h-full w-full object-cover ${className}`} draggable={false} /> : null}
        {loaded !== key ? <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#fff3e8] text-[#9b7467]" role="status">
            <Image src="/images/ui/stickers/caretalk-photo.webp" alt="" width={40} height={40} className="h-10 w-10" />
            {failed === key ? <button type="button" className="ah-light rounded-full bg-white px-2.5 py-1.5 text-[11px]"
                onClick={event => { event.stopPropagation(); setAttempt(value => value + 1); }}><LocalizedMenuLabel label={"사진 다시 불러오기"} /></button>
                : <span className="ah-light text-[11px]"><LocalizedMenuLabel label={"사진을 불러오고 있어요"} /></span>}
        </span> : null}
    </>;
});

/** 작성자 동그라미(이름 첫 글자) — 모두 같은 크림(웹 댕자랑에는 공식 배지가 없음) */
export function AuthorDot({ name, size = "h-9 w-9 text-[14px]" }: { name: string; size?: string }) {
    return <span className={`ah-display grid shrink-0 place-items-center rounded-full ${size} bg-[#fff1c4] text-[#a8720f]`} style={{ boxShadow: "0 0 0 2px #fff, 0 3px 6px -3px rgba(90,60,50,.4)" }}>{name.slice(0, 1)}</span>;
}

/** 아래에서 올라오는 다이어리 속지 — 바깥 · 닫기 · Esc 로 닫힘, 열린 동안 뒤 화면 스크롤 잠금 */
export function Sheet({ open, onClose, title, children, label }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; label: string }) {
    const { menuLabel: labelText } = useI18n();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        if (!open) return;
        const id = window.setTimeout(() => setMounted(true), 0);
        return () => window.clearTimeout(id);
    }, [open]);
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
    }, [open, onClose]);
    if (!mounted || !open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[2400]" role="dialog" aria-modal="true" aria-label={label}>
            <button type="button" tabIndex={-1} aria-label={labelText("닫기")} className="sp-dim absolute inset-0 bg-[#3a2f2c]/35 backdrop-blur-[4px]" onClick={onClose} />
            <section className="sp-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-[28px]" style={{ color: TEXT }}>
                <div className="flex h-8 shrink-0 items-center justify-center">
                    <span aria-hidden="true" className="st-tape block h-3.5 w-16" style={{ background: "repeating-linear-gradient(90deg, rgba(255,200,215,.9) 0 7px, rgba(255,226,234,.9) 7px 14px)", rotate: "-2deg" }} />
                </div>
                <div className="flex items-center gap-2 px-5 pb-2">
                    <div className="min-w-0 flex-1">{title}</div>
                    <button type="button" onClick={onClose} aria-label={labelText("닫기")} className="sp-close grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#c4567a]"><i aria-hidden="true" className="fa-solid fa-xmark" /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">{children}</div>
            </section>
        </div>,
        document.body,
    );
}

export const SHOW_PARTS_CSS = `
/* 속지: 점 모눈 크림 종이 · 통통 올라옴 */
.sp-sheet { background-color: #fffdf8; background-image: radial-gradient(circle, rgba(196,160,140,.26) 1px, transparent 1.3px); background-size: 15px 15px; background-position: 7px 7px;
  box-shadow: 0 -16px 40px -12px rgba(60,30,20,.45), inset 0 1.5px 0 #fff; animation: sp-up .42s cubic-bezier(.2,.9,.25,1.04) both; }
@keyframes sp-up { from { transform: translateY(104%); } }
.sp-dim { animation: sp-fade .3s ease both; }
@keyframes sp-fade { from { opacity: 0; } }
.sp-close { box-shadow: 0 0 0 1.5px #f3e3da, 0 5px 9px -6px rgba(150,90,70,.55); -webkit-tap-highlight-color: transparent; }
/* 폴라로이드 칸 */
.sp-pol { box-shadow: 0 12px 20px -12px rgba(90,60,50,.55), inset 0 0 0 1px #f5ebe4; -webkit-tap-highlight-color: transparent; transition: transform .4s cubic-bezier(.3,1.6,.5,1); }
.sp-pol:active { transform: scale(.98); }
.sp-pol.is-on { animation: hc-pop .45s cubic-bezier(.3,1.6,.5,1); }
.sp-hole { background: #fff6f8; outline: 2px dashed #f4b6c8; outline-offset: -8px; }
/* 메모지 · 종이 판 · 라벨 스티커 */
.sp-memo { background: #fff6c9; box-shadow: 0 8px 12px -9px rgba(120,80,60,.45); }
.sp-paper { background: #fff; box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 10px 16px -12px rgba(120,80,60,.45); }
.sp-label { border-radius: 12px; background: #fff; overflow: hidden; box-shadow: inset 0 0 0 1.5px #f3e3da, 0 7px 12px -9px rgba(150,90,70,.45); }
.sp-label:focus-within { box-shadow: inset 0 0 0 2px #d2457a, 0 7px 12px -9px rgba(150,90,70,.45); }
.sp-stub { background: #ffe1ea; color: #d2457a; border-right: 2px dashed rgba(255,255,255,.95); }
/* 체크 스티커 */
.sp-check { background: #fff; box-shadow: inset 0 0 0 2px #f2b8c9; transition: transform .35s cubic-bezier(.3,1.6,.5,1), background .2s; }
.sp-check.is-on { background: #f47aa0; box-shadow: 0 0 0 2px #fff, 0 3px 6px -3px rgba(200,80,120,.6); transform: rotate(-6deg) scale(1.06); }
/* 고르기 칩(반려견 · 신고 이유) */
.sp-pet { background: #fff; color: #7a6a63; box-shadow: inset 0 0 0 1.5px #f3e3da; transition: transform .3s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.sp-pet.is-on { background: #ffe1ea; color: #c4456f; box-shadow: inset 0 0 0 1.5px #f6a9bf; }
.sp-pet:active { transform: scale(.94); }
/* 팔로우 · 응원 · 공유 */
.sp-follow { background: #f47aa0; color: #fff; box-shadow: 0 0 0 2px #fff, 0 4px 8px -5px rgba(200,80,120,.6); -webkit-tap-highlight-color: transparent; }
.sp-follow.is-on { background: #f3ece8; color: #7a6a63; box-shadow: inset 0 0 0 1.5px #e8dcd5; }
.sp-bone { background: #fff; color: #9c8f88; box-shadow: inset 0 0 0 1.5px #f3e3da; -webkit-tap-highlight-color: transparent; transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.sp-bone.is-on { background: #ffe1ea; color: #e0557f; box-shadow: inset 0 0 0 1.5px #f6a9bf; }
.sp-bone:active, .sp-ghost:active, .sp-follow:active { transform: scale(.93); }
.sp-ghost { background: #fff; color: #7a6a63; box-shadow: inset 0 0 0 1.5px #f3e3da; -webkit-tap-highlight-color: transparent; transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.sp-stat { background: #fff; box-shadow: inset 0 0 0 1.5px #f3e6dc; }
.sp-url { background: #fff; color: #9c8f88; box-shadow: inset 0 0 0 1.5px #f3e3da; outline: none; }
.sp-err { animation: hc-pop .35s cubic-bezier(.3,1.6,.5,1) both; }
@media (prefers-reduced-motion: reduce) { .sp-sheet, .sp-dim, .sp-pol.is-on, .sp-err { animation: none; } }
`;
