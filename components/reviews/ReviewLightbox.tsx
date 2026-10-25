/**
 * ReviewLightbox — 후기 사진 크게 보기 창 · 2026-10-25 후기 시안(웹)
 * ---------------------------------------------------------------------
 * 포토 후기 모아보기 · 후기 카드 사진을 누르면 열림.
 *  - 왼쪽: 흰 안테 + 둥근 사진(정사각, 꽉 채움 아님 — 사진 비율 그대로) · 이전/다음 동그라미 단추 · "2 / 5" 알약
 *  - 오른쪽(휴대폰은 아래): 그 사진을 올린 후기(가린 이름 · 별점 · 옵션 · 글 4줄)
 *  - 키보드: ← → 넘기기 · Esc 닫기. 휴대폰: 사진을 좌우로 밀어 넘기기
 * 꾸밈: app/review-web.css(.rvl-*)
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { OwnReview } from "@/lib/reviews-preview";
import CrayonStars from "./CrayonStars";

export type LightboxItem = { src: string; review: OwnReview };

export default function ReviewLightbox({ items, start, onClose }: { items: LightboxItem[]; start: number; onClose: () => void }) {
    const [index, setIndex] = useState(start);
    const closeRef = useRef<HTMLButtonElement>(null);
    const touchX = useRef<number | null>(null);
    const count = items.length;
    const go = (step: number) => setIndex((value) => (value + step + count) % count);

    // 열려 있는 동안: 뒤 스크롤 막기 · 키보드 · 닫기 단추 초점
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowRight") setIndex((value) => (value + 1) % count);
            if (event.key === "ArrowLeft") setIndex((value) => (value - 1 + count) % count);
        };
        window.addEventListener("keydown", onKey);
        window.setTimeout(() => closeRef.current?.focus(), 0);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [count, onClose]);

    const item = items[index];
    if (!item) return null;
    const { review } = item;

    return createPortal(
        <div className="rvl-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <div className="rvl" role="dialog" aria-modal="true" aria-label="후기 사진 크게 보기">
                <button ref={closeRef} type="button" className="rvl-close" onClick={onClose} aria-label="닫기">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
                <div
                    className="rvl-stage"
                    onTouchStart={(event) => { touchX.current = event.touches[0]?.clientX ?? null; }}
                    onTouchEnd={(event) => {
                        const startX = touchX.current;
                        const endX = event.changedTouches[0]?.clientX;
                        touchX.current = null;
                        if (startX == null || endX == null || Math.abs(endX - startX) < 40) return;
                        go(endX < startX ? 1 : -1);
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img key={item.src + index} src={item.src} alt={`${review.maskedName}님의 후기 사진 ${index + 1}`} />
                    {count > 1 && (
                        <>
                            <button type="button" className="rvl-nav" data-dir="prev" onClick={() => go(-1)} aria-label="이전 사진">
                                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                            </button>
                            <button type="button" className="rvl-nav" data-dir="next" onClick={() => go(1)} aria-label="다음 사진">
                                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                            </button>
                        </>
                    )}
                    <span className="rvl-count">{index + 1} / {count}</span>
                </div>
                <aside className="rvl-info">
                    <p className="rvl-who"><b>{review.maskedName}</b> <span>{review.createdAt.replaceAll("-", ".")}</span></p>
                    <CrayonStars value={review.rating} size={18} />
                    {review.option && <p className="rvl-option"><i className="fa-solid fa-tag" aria-hidden="true" /> {review.option}</p>}
                    <p className="rvl-body">{review.body}</p>
                </aside>
            </div>
        </div>,
        document.body,
    );
}
