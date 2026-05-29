/**
 * BestSection — 베스트 상품 (4탭 × 4상품)
 * ---------------------------------------------------------------------
 * 탭: 실시간 / 일간 / 주간 / 월간
 * 상품 카드: 랭킹 배지 + 찜 버튼 + 브랜드/이름/가격 (할인 시 할인율·원가)
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BEST_PRODUCTS, BEST_TAB_LABELS, formatKRW, type BestPeriod, type Product } from "@/lib/products";
import styles from "./best.module.css";

const TABS: BestPeriod[] = ["realtime", "daily", "weekly", "monthly"];

export default function BestSection() {
    const [period, setPeriod] = useState<BestPeriod>("realtime");
    const [wished, setWished] = useState<Set<string>>(new Set());
    const items = BEST_PRODUCTS[period];

    const toggleWish = (key: string) => {
        setWished((s) => {
            const next = new Set(s);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <section id="best" className="py-10 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* 섹션 헤더 — 좌측 타이틀 / 우측 탭 (모바일에선 세로) */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">
                            댕다방 베스트
                        </h2>
                        <p className="text-sm text-neutral-500">
                            지금 가장 많이 사랑받는 댕댕이 아이템
                        </p>
                    </div>

                    {/* 탭 */}
                    <div className="inline-flex bg-white/70 backdrop-blur-md rounded-full p-1 shadow-card self-start md:self-auto">
                        {TABS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriod(p)}
                                className={`px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition ${
                                    period === p
                                        ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white shadow-card"
                                        : "text-neutral-600 hover:text-aurora-indigo"
                                }`}
                            >
                                {BEST_TAB_LABELS[p]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4상품 그리드 */}
                <div
                    key={period}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 animate-in fade-in duration-300"
                >
                    {items.map((p, i) => {
                        const wishKey = `${period}-${i}`;
                        return (
                            <ProductCard
                                key={wishKey}
                                product={p}
                                period={period}
                                rank={i + 1}
                                isWished={wished.has(wishKey)}
                                onToggleWish={() => toggleWish(wishKey)}
                            />
                        );
                    })}
                </div>

                {/* 우측 하단 — 전체 보기 */}
                <div className="flex justify-end mt-6 md:mt-7">
                    <Link
                        href="/best"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo hover:text-aurora-indigo text-xs md:text-sm font-extrabold shadow-card transition"
                    >
                        베스트 상품 보기
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* ============ 상품 카드 ============
 * 데스크탑: 정적 이미지 → 마우스 hover 시 영상 페이드 인 + play
 * 모바일(터치): 우하단 ▶ 버튼 탭으로 영상 재생/정지 토글
 *   - 터치 디바이스 감지: `(hover: none)` 미디어 쿼리
 *   - 자동 재생을 하지 않는 이유: 사용자가 정적 상품 이미지를 먼저 볼 수 있어야 함
 * preload="metadata" — 영상 본체는 재생 시점에 다운로드, 초기엔 메타데이터(~5KB)만 */
function ProductCard({
    product, period, rank, isWished, onToggleWish,
}: {
    product: Product;
    period: BestPeriod;
    rank: number;
    isWished: boolean;
    onToggleWish: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoActive, setVideoActive] = useState(false);
    const [isTouch, setIsTouch] = useState(false);

    /** 터치 디바이스 여부 감지 (mount 후 한 번) — SSR/CSR hydration 안전 */
    useEffect(() => {
        if (typeof window === "undefined") return;
        setIsTouch(window.matchMedia("(hover: none)").matches);
    }, []);

    /** 영상 재생 + 활성 표시 (이미지 fade out / 영상 fade in) */
    const activate = () => {
        setVideoActive(true);
        videoRef.current?.play().catch(() => {});
    };
    /** 영상 정지 + 이미지로 되돌림 */
    const deactivate = () => {
        setVideoActive(false);
        const v = videoRef.current;
        if (!v) return;
        v.pause();
        v.currentTime = 0;
    };

    /** 이미지 영역 클릭 핸들러
     *  - 모바일(터치) + 영상 있음 → 영상 토글 (네비게이션 X)
     *  - 그 외 (데스크탑, 영상 없음) → 상세 페이지로 이동 */
    const handleImageClick = (e: React.MouseEvent) => {
        if (isTouch && product.video) {
            e.preventDefault();
            e.stopPropagation();
            if (videoActive) deactivate();
            else activate();
            return;
        }
        // 데스크탑/영상 없음 → 해시 네비게이션
        window.location.hash = `product-${period}-${rank}`;
    };

    const hasImage = !!product.image;
    const detailHref = `#product-${period}-${rank}`;

    return (
        <article
            className="group block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 transition-all"
        >
            {/* 이미지 영역
                - onMouseEnter/Leave: 데스크탑 hover 시 영상 자동 재생
                - onClick: 모바일에선 영상 토글 / 데스크탑에선 상세 페이지 이동 */}
            <div
                onClick={handleImageClick}
                onMouseEnter={activate}
                onMouseLeave={deactivate}
                role="button"
                tabIndex={0}
                aria-label={isTouch && product.video ? (videoActive ? "영상 정지" : "영상 재생") : `${product.name} 상세 보기`}
                className={`relative aspect-square overflow-hidden cursor-pointer ${!hasImage ? styles[`ph${product.ph}`] : "bg-[#F7F2E8]"} flex items-center justify-center`}
            >
                {hasImage ? (
                    <>
                        {/* 기본 이미지 — videoActive 시 fade out */}
                        <Image
                            src={product.image!}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className={`object-cover transition-opacity duration-300 ${videoActive ? "opacity-0" : "opacity-100"}`}
                        />
                        {/* 영상 — videoActive 시 fade in. hover(데스크탑) 또는 IntersectionObserver(모바일) 로 토글 */}
                        {product.video && (
                            <video
                                ref={videoRef}
                                src={product.video}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${videoActive ? "opacity-100" : "opacity-0"}`}
                            />
                        )}
                    </>
                ) : (
                    /* fallback — 이미지 미등록 상품: ph 색상 + 아이콘 */
                    <i className={`fa-solid ${product.icon} text-5xl md:text-6xl text-white/95 drop-shadow-md`} />
                )}

                {/* 랭킹 배지 — image/video 위에 z-index 로 띄움 */}
                <span
                    className={`absolute top-3 left-3 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                        rank === 1
                            ? "bg-foreground text-white"
                            : "bg-white/95 text-foreground shadow-card"
                    }`}
                >
                    {rank}
                </span>
                {/* 찜 버튼 */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        onToggleWish();
                    }}
                    className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 hover:bg-white shadow-card flex items-center justify-center"
                    aria-label="찜하기"
                >
                    <i
                        className={`${isWished ? "fa-solid text-danger" : "fa-regular text-neutral-400 hover:text-danger"} fa-heart`}
                    />
                </button>

            </div>

            {/* 정보 영역 — 항상 상세 페이지로 이동하는 링크 */}
            <Link href={detailHref} className="block hover:bg-neutral-50/40 transition">
                <div className="p-4">
                    <p className="text-[11px] font-extrabold tracking-wider text-aurora-indigo mb-1.5">
                        {product.brand}
                    </p>
                    <p className="text-sm md:text-base font-bold text-foreground line-clamp-2 mb-3 min-h-[2.6em]">
                        {product.name}
                    </p>
                    {/* 가격 — 우측 정렬, 할인율 → 원가 → 최종가 순 */}
                    <div className="flex items-baseline justify-end gap-2 flex-wrap">
                        {product.discount !== null && (
                            <span className="text-xs font-extrabold text-danger">
                                {product.discount}%
                            </span>
                        )}
                        {product.original !== null && (
                            <span className="text-xs text-neutral-400 line-through">
                                {formatKRW(product.original)}원
                            </span>
                        )}
                        <span className="text-base md:text-lg font-black text-foreground">
                            {formatKRW(product.price)}원
                        </span>
                    </div>
                </div>
            </Link>
        </article>
    );
}
