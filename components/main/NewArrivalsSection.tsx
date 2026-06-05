/**
 * NewArrivalsSection — 메인 페이지 신상품 가로 캐러셀
 * ---------------------------------------------------------------------
 * 카탈로그 단일 출처 — getNewProducts() (큐레이션된 신상품 17~18개)
 *
 * 캐러셀 트릭:
 *   카드 3세트 (앞 클론 + 실제 + 뒤 클론) 를 렌더 → 중앙 부분만 사용자에게 보임.
 *   양 끝 클론에 진입하면 scrollBehavior auto 로 silent jump → 무한 느낌.
 *
 * 자동: 2.8초 간격, hover 시에도 멈추지 않음 (사용자 피드백 반영)
 * 수동: prev/next 버튼 → 2.5초 일시정지 → 재개
 *
 * 카드는 공용 ProductCard 사용 — 영상 호버 자동 적용.
 */
"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { getNewProducts } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";

const AUTO_INTERVAL = 2800;
const MANUAL_PAUSE = 2500;
const RESUME_DELAY = 500;
const NEW_LIMIT = 8;

export default function NewArrivalsSection() {
    const trackRef = useRef<HTMLDivElement>(null);
    const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const manualPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 카탈로그에서 최신 신상품 8개 (큐레이션 순서 그대로)
    const items = getNewProducts().slice(0, NEW_LIMIT);

    /** 카드 1장 + gap 너비 (한 칸 스크롤 단위) */
    const getCardStep = useCallback((): number => {
        const track = trackRef.current;
        if (!track) return 220;
        const card = track.querySelector<HTMLElement>("[data-new-card]");
        if (!card) return 220;
        const gap = parseInt(getComputedStyle(track).gap || "16", 10);
        return card.getBoundingClientRect().width + gap;
    }, []);

    /** 1세트(items.length 개) 총 너비 */
    const getOneSetWidth = useCallback(
        () => getCardStep() * items.length,
        [getCardStep, items.length]
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

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const onScroll = () => checkInfiniteJump();
        track.addEventListener("scroll", onScroll, { passive: true });
        return () => track.removeEventListener("scroll", onScroll);
    }, [checkInfiniteJump]);

    // 3 세트 = N*3 카드 (무한 루프)
    const tripleSet = [...items, ...items, ...items];

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

                {/* 캐러셀 트랙 — overflow-x scroll, snap, 공용 ProductCard 사용 */}
                <div
                    ref={trackRef}
                    className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
                    style={{ scrollbarWidth: "none" }}
                >
                    {tripleSet.map((p, i) => (
                        <div
                            key={`${p.id}-${i}`}
                            data-new-card
                            className="snap-start flex-shrink-0 w-[160px] sm:w-[200px] md:w-[230px]"
                        >
                            <ProductCard product={p} />
                        </div>
                    ))}
                </div>

                {/* 우측 하단 — 신상품 모두 보기 */}
                <div className="flex justify-end mt-6 md:mt-7">
                    <Link
                        href="/new"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo hover:text-aurora-indigo text-xs md:text-sm font-extrabold shadow-card transition"
                    >
                        신상품 보기
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Link>
                </div>

                {/* 스크롤바 hide */}
                <style jsx>{`
                    div::-webkit-scrollbar { display: none; }
                `}</style>
            </div>
        </section>
    );
}
