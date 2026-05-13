/**
 * NewArrivalsSection — 신상품 가로 캐러셀 (자동 + 무한 루프 + 양방향)
 * ---------------------------------------------------------------------
 * 핵심 트릭:
 *   카드 3세트 (앞 클론 + 실제 + 뒤 클론) 를 렌더 → 중앙 부분만 사용자에게 보임.
 *   양 끝 클론에 진입하면 scrollBehavior auto 로 silent jump → 무한 느낌.
 *
 * 자동: 2.8초 간격, hover 시에도 멈추지 않음 (사용자 피드백 반영)
 * 수동: prev/next 버튼 → 2.5초 일시정지 → 재개
 *
 * 카드 디자인은 BestSection 의 그것과 일관 (NEW 배지 + 단순 가격).
 */
"use client";

import { useCallback, useEffect, useRef } from "react";
import { NEW_PRODUCTS, formatKRW } from "@/lib/products";
import bestStyles from "./best.module.css";

const AUTO_INTERVAL = 2800;
const MANUAL_PAUSE = 2500;
const RESUME_DELAY = 500;

export default function NewArrivalsSection() {
    const trackRef = useRef<HTMLDivElement>(null);
    const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const manualPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** 카드 1장 + gap 너비 (한 칸 스크롤 단위) */
    const getCardStep = useCallback((): number => {
        const track = trackRef.current;
        if (!track) return 220;
        const card = track.querySelector<HTMLElement>("[data-new-card]");
        if (!card) return 220;
        const gap = parseInt(getComputedStyle(track).gap || "16", 10);
        return card.getBoundingClientRect().width + gap;
    }, []);

    /** 1세트(12개 카드) 총 너비 */
    const getOneSetWidth = useCallback(
        () => getCardStep() * NEW_PRODUCTS.length,
        [getCardStep]
    );

    /** 초기 중앙 정렬 — 실제 영역 시작점으로 */
    const initScrollPosition = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        track.style.scrollBehavior = "auto";
        track.scrollLeft = getOneSetWidth();
        requestAnimationFrame(() => {
            track.style.scrollBehavior = "";
        });
    }, [getOneSetWidth]);

    /** 양 끝 진입 감지 → silent jump */
    const checkInfiniteJump = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        const oneSet = getOneSetWidth();
        const sl = track.scrollLeft;
        if (sl < oneSet - 1) {
            track.style.scrollBehavior = "auto";
            track.scrollLeft = sl + oneSet;
            requestAnimationFrame(() => (track.style.scrollBehavior = ""));
        } else if (sl >= oneSet * 2) {
            track.style.scrollBehavior = "auto";
            track.scrollLeft = sl - oneSet;
            requestAnimationFrame(() => (track.style.scrollBehavior = ""));
        }
    }, [getOneSetWidth]);

    /** 자동 한 칸 진행 */
    const autoAdvance = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        track.scrollBy({ left: getCardStep(), behavior: "smooth" });
    }, [getCardStep]);

    /** 자동 재생 시작 */
    const startAuto = useCallback(
        (immediate = false) => {
            if (autoRef.current) clearInterval(autoRef.current);
            if (immediate) {
                setTimeout(() => autoAdvance(), RESUME_DELAY);
            }
            autoRef.current = setInterval(autoAdvance, AUTO_INTERVAL);
        },
        [autoAdvance]
    );

    const stopAuto = useCallback(() => {
        if (autoRef.current) {
            clearInterval(autoRef.current);
            autoRef.current = null;
        }
    }, []);

    /** 수동 조작 — 2.5초 일시정지 후 재개 */
    const manualMove = useCallback(
        (dir: -1 | 1) => {
            const track = trackRef.current;
            if (!track) return;
            track.scrollBy({ left: getCardStep() * dir, behavior: "smooth" });
            stopAuto();
            if (manualPauseRef.current) clearTimeout(manualPauseRef.current);
            manualPauseRef.current = setTimeout(() => startAuto(false), MANUAL_PAUSE);
        },
        [getCardStep, startAuto, stopAuto]
    );

    useEffect(() => {
        // 첫 paint 직후 중앙 정렬
        const t = setTimeout(initScrollPosition, 50);
        return () => clearTimeout(t);
    }, [initScrollPosition]);

    useEffect(() => {
        startAuto(true);
        return () => {
            stopAuto();
            if (manualPauseRef.current) clearTimeout(manualPauseRef.current);
        };
    }, [startAuto, stopAuto]);

    // 스크롤 → 양끝 진입 시 silent jump
    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const onScroll = () => checkInfiniteJump();
        track.addEventListener("scroll", onScroll, { passive: true });
        return () => track.removeEventListener("scroll", onScroll);
    }, [checkInfiniteJump]);

    // 3 세트 = 36 카드
    const tripleSet = [
        ...NEW_PRODUCTS,
        ...NEW_PRODUCTS,
        ...NEW_PRODUCTS,
    ];

    return (
        <section id="new" className="py-8 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* 섹션 헤드 + 좌우 버튼 */}
                <div className="flex items-end justify-between mb-6 md:mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">
                            신상품
                        </h2>
                        <p className="text-sm text-neutral-500">2026 새로 들어온 컬렉션</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => manualMove(-1)}
                            className="w-10 h-10 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo hover:text-aurora-indigo shadow-card flex items-center justify-center transition"
                            aria-label="이전"
                        >
                            <i className="fa-solid fa-chevron-left text-sm" />
                        </button>
                        <button
                            type="button"
                            onClick={() => manualMove(1)}
                            className="w-10 h-10 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo hover:text-aurora-indigo shadow-card flex items-center justify-center transition"
                            aria-label="다음"
                        >
                            <i className="fa-solid fa-chevron-right text-sm" />
                        </button>
                    </div>
                </div>

                {/* 캐러셀 트랙 — overflow-x scroll, snap, 스크롤바 숨김 */}
                <div
                    ref={trackRef}
                    className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
                    style={{ scrollbarWidth: "none" }}
                >
                    {tripleSet.map((p, i) => (
                        <a
                            key={i}
                            href={`#new-${(i % NEW_PRODUCTS.length) + 1}`}
                            data-new-card
                            className="snap-start flex-shrink-0 w-[160px] sm:w-[200px] md:w-[230px] block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 transition-all"
                        >
                            <div className={`relative aspect-square ${bestStyles[`ph${p.ph}`]} flex items-center justify-center`}>
                                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-aurora-indigo to-aurora-pink text-white text-[10px] font-black tracking-wider">
                                    NEW
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => e.preventDefault()}
                                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 hover:bg-white shadow-card flex items-center justify-center"
                                    aria-label="찜하기"
                                >
                                    <i className="fa-regular fa-heart text-neutral-400 text-xs" />
                                </button>
                                <i className={`fa-solid ${p.icon} text-4xl md:text-5xl text-white/95 drop-shadow-md`} />
                            </div>
                            <div className="p-3 md:p-4">
                                <p className="text-[10px] font-extrabold tracking-wider text-aurora-indigo mb-1">
                                    {p.brand}
                                </p>
                                <p className="text-xs md:text-sm font-bold line-clamp-2 mb-2 min-h-[2.6em]">
                                    {p.name}
                                </p>
                                <p className="text-right text-sm md:text-base font-black">
                                    {formatKRW(p.price)}원
                                </p>
                            </div>
                        </a>
                    ))}
                </div>

                {/* 우측 하단 — 신상품 모두 보기 */}
                <div className="flex justify-end mt-6 md:mt-7">
                    <a
                        href="#new-all"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo hover:text-aurora-indigo text-xs md:text-sm font-extrabold shadow-card transition"
                    >
                        신상품 보기
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </a>
                </div>

                {/* 스크롤바 hide */}
                <style jsx>{`
                    div::-webkit-scrollbar { display: none; }
                `}</style>
            </div>
        </section>
    );
}
