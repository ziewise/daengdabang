/**
 * ProductCard — 공용 상품 카드 (영상 호버 지원)
 * ---------------------------------------------------------------------
 * 사용처: 모든 페이지의 상품 카드 (메인 베스트/신상품, /products, /category, ...)
 *
 * 영상 호버:
 *   - p.video 있는 경우 mousemove 시 영상 페이드 인 + 자동 재생
 *   - 모바일(터치) → 첫 탭 = 영상 토글, 두 번째 탭 = 상세 이동 (또는 정보 영역 탭)
 *   - 영상 없으면 정적 이미지만
 *
 * 영상 호버는 미래에 모든 상품이 영상 갖게 될 것을 전제로 일관 적용.
 * sync-images.mjs 가 products/{folder}/video.mp4 감지 시 catalog.video 자동 채움.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CatalogProduct } from "@/lib/catalog";
import { formatKRW, getBestRank, isNewProduct } from "@/lib/catalog";
import bestStyles from "@/components/main/best.module.css";
import VideoBrandOverlay from "@/components/products/VideoBrandOverlay";

interface Props {
    product: CatalogProduct;
    /** NEW 배지 강제 — undefined 면 자동 (큐레이션 신상품 리스트로 판단) */
    showNewBadge?: boolean;
    /** 베스트 랭킹 강제 표시 — 명시 안 하면 자동(getBestRank) */
    rank?: number;
    /** 랭킹 표시 스타일 — "large" (베스트 페이지) | "label" (다른) | "off" */
    rankStyle?: "large" | "label" | "off";
    sizeClass?: string;
}

export default function ProductCard({
    product: p,
    showNewBadge,
    rank,
    rankStyle = "label",
    sizeClass,
}: Props) {
    const router = useRouter();
    const effectiveRank = rank ?? getBestRank(p);
    const shouldShowNew = showNewBadge ?? isNewProduct(p);
    const showBest = effectiveRank !== null && rankStyle !== "off";
    const detailHref = `/product/${p.folder ?? p.id}`;

    // ===== 영상 호버 로직 =====
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoActive, setVideoActive] = useState(false);
    const [isTouch, setIsTouch] = useState(false);
    const hasVideo = !!p.video;

    /** 터치 디바이스 감지 (mount 후 한 번) */
    useEffect(() => {
        if (typeof window === "undefined") return;
        setIsTouch(window.matchMedia("(hover: none)").matches);
    }, []);

    const activate = () => {
        if (!hasVideo) return;
        setVideoActive(true);
        videoRef.current?.play().catch(() => {});
    };
    const deactivate = () => {
        if (!hasVideo) return;
        setVideoActive(false);
        const v = videoRef.current;
        if (!v) return;
        v.pause();
        v.currentTime = 0;
    };

    /** 이미지 영역 클릭
     *  - 모바일 + 영상 있음 → 토글 (네비게이션 X)
     *  - 그 외 → 상세 페이지로 이동 */
    const handleImageClick = (e: React.MouseEvent) => {
        if (isTouch && hasVideo) {
            e.preventDefault();
            e.stopPropagation();
            if (videoActive) deactivate();
            else activate();
            return;
        }
        router.push(detailHref);
    };

    return (
        <article
            className={`block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 transition-all ${sizeClass ?? ""}`}
        >
            {/* 이미지 영역 — 영상 호버 인터랙션 영역 */}
            <div
                onClick={handleImageClick}
                onMouseEnter={activate}
                onMouseLeave={deactivate}
                role="button"
                tabIndex={0}
                aria-label={
                    isTouch && hasVideo
                        ? videoActive ? "영상 정지" : "영상 재생"
                        : `${p.name} 상세 보기`
                }
                className={`relative aspect-square overflow-hidden cursor-pointer flex items-center justify-center ${p.image ? "bg-[#F7F2E8]" : bestStyles[`ph${p.ph}`]}`}
            >
                {p.image ? (
                    <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, 230px"
                        className={`object-cover transition-opacity duration-300 ${videoActive ? "opacity-0" : "opacity-100"}`}
                    />
                ) : (
                    <i className={`fa-solid ${p.icon} text-4xl md:text-5xl text-white/95 drop-shadow-md`} />
                )}

                {/* 영상 — videoActive 시 fade in. preload=metadata 로 처음에 메타데이터만 다운로드 */}
                {hasVideo && (
                    <video
                        ref={videoRef}
                        src={p.video}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${videoActive ? "opacity-100" : "opacity-0"}`}
                    />
                )}
                {hasVideo && videoActive && <VideoBrandOverlay />}

                {/* 좌상단 배지 — BEST + NEW */}
                {(showBest || shouldShowNew) && (
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start pointer-events-none">
                        {showBest && (
                            rankStyle === "large" ? (
                                <span className="min-w-[26px] h-[26px] px-1.5 rounded-md bg-foreground/85 text-white text-xs font-black flex items-center justify-center backdrop-blur-sm shadow-md">
                                    {effectiveRank}
                                </span>
                            ) : (
                                <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-danger to-orange-500 text-white text-[9px] font-black tracking-wider shadow">
                                    BEST
                                </span>
                            )
                        )}
                        {shouldShowNew && (
                            <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-aurora-indigo to-aurora-pink text-white text-[9px] font-black tracking-wider shadow">
                                NEW
                            </span>
                        )}
                    </div>
                )}

                {/* 찜 버튼 */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // TODO: wishlist toggle (백엔드 단계)
                    }}
                    className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white shadow-card flex items-center justify-center"
                    aria-label="찜하기"
                >
                    <i className="fa-regular fa-heart text-neutral-400 text-xs" />
                </button>

                {/* 영상 재생 인디케이터 — 모바일에서 영상 있을 때만 표시 */}
                {hasVideo && isTouch && !videoActive && (
                    <div className="absolute bottom-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-foreground/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                        <i className="fa-solid fa-play text-white text-[10px] ml-0.5" />
                    </div>
                )}
            </div>

            {/* 정보 영역 — 상세 페이지로 이동 */}
            <Link href={detailHref} className="block hover:bg-neutral-50/40 transition-colors">
                <div className="p-3 md:p-4">
                    <p className="text-[10px] font-extrabold tracking-wider text-aurora-indigo mb-1 uppercase">
                        {p.brandEn || p.brandKo}
                    </p>
                    <p className="text-xs md:text-sm font-bold line-clamp-2 mb-2 min-h-[2.6em]">
                        {p.name}
                    </p>

                    {/* 가격 — 할인 row 는 항상 공간 차지 (카드 높이 일관) */}
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 mb-0.5 h-[14px] md:h-[16px]">
                            {p.discountRate > 0 && p.originalPrice && (
                                <>
                                    <span className="text-[11px] md:text-xs font-extrabold text-danger">
                                        {p.discountRate}%
                                    </span>
                                    <span className="text-[10px] md:text-[11px] text-neutral-400 line-through">
                                        {formatKRW(p.originalPrice)}원
                                    </span>
                                </>
                            )}
                        </div>
                        <p className="text-sm md:text-base font-black">
                            {formatKRW(p.price)}원
                        </p>
                    </div>

                    {/* 평점 + 리뷰 수 — 항상 자리 (리뷰 0 시 빈 영역) */}
                    <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] md:text-[11px] text-neutral-500 h-[14px] md:h-[16px]">
                        {p.reviewCount > 0 && (
                            <>
                                <i className="fa-solid fa-star text-amber-400" />
                                <span className="font-bold text-neutral-700">{p.rating.toFixed(1)}</span>
                                <span className="text-neutral-400">({p.reviewCount})</span>
                            </>
                        )}
                    </div>
                </div>
            </Link>
        </article>
    );
}
