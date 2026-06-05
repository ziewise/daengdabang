/**
 * ProductCard — 공용 상품 카드 (메인 신상품 카드 사이즈 통일)
 * ---------------------------------------------------------------------
 * 사용처: /products, /category/[slug], /brand/[slug], /promo/[slug]
 *        (전체 카탈로그 기반 페이지에서 동일 디자인)
 *
 * 카드 사이즈: 메인 NewArrivalsSection 의 카드와 동일
 *   mobile 160px / sm 200px / md+ 230px (responsive grid 컨테이너에서 자동 적응)
 *
 * 이미지: image 있으면 <Image>, 없으면 ph 그라데이션 + 아이콘
 * 링크:  /product/[id]
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import { formatKRW, getBestRank, isNewProduct } from "@/lib/catalog";
import bestStyles from "@/components/main/best.module.css";

interface Props {
    product: CatalogProduct;
    /** NEW 배지 강제 — undefined 면 자동 (상품명 "(2026)" 포함 시 자동 표시) */
    showNewBadge?: boolean;
    /** 베스트 랭킹 강제 표시 — 명시 안 하면 자동(getBestRank).
     *  베스트 페이지에서 큰 랭킹 숫자, 다른 페이지에선 작은 BEST 라벨. */
    rank?: number;
    /** 랭킹 표시 스타일 — "large" (베스트 페이지) | "label" (다른 페이지) | "off"  */
    rankStyle?: "large" | "label" | "off";
    /** 카드 크기 우선순위 — 명시 시 외부 grid 와 맞추도록 강제 */
    sizeClass?: string;
}

export default function ProductCard({
    product: p,
    showNewBadge,
    rank,
    rankStyle = "label",
    sizeClass,
}: Props) {
    // rank 가 안 주어졌으면 catalog 의 베스트 랭킹 자동 조회
    const effectiveRank = rank ?? getBestRank(p);
    // showNewBadge 가 안 주어졌으면 큐레이션된 신상품 리스트로 자동 결정
    const shouldShowNew = showNewBadge ?? isNewProduct(p);
    // 베스트 + 신상품 둘 다일 때 둘 다 표시 (배지 세로 스택)
    const showBest = effectiveRank !== null && rankStyle !== "off";
    return (
        <Link
            href={`/product/${p.folder ?? p.id}`}
            className={`block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 transition-all ${sizeClass ?? ""}`}
        >
            {/* 이미지 영역 — aspect-square (정사각형) 통일 */}
            <div className={`relative aspect-square overflow-hidden flex items-center justify-center ${p.image ? "bg-[#F7F2E8]" : bestStyles[`ph${p.ph}`]}`}>
                {p.image ? (
                    <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, 230px"
                        className="object-cover"
                    />
                ) : (
                    <i className={`fa-solid ${p.icon} text-4xl md:text-5xl text-white/95 drop-shadow-md`} />
                )}

                {/* 좌상단 배지
                 *  rankStyle="large" (베스트 페이지) → 큰 순위 숫자만 (탭마다 동적)
                 *  rankStyle="label" (다른 페이지)    → "BEST" 라벨 (숫자 없음 — 순위는 베스트 페이지에서 확인)
                 *  NEW 는 모든 페이지에서 동일 컴팩트 라벨
                 *  둘 다일 땐 세로 스택. */}
                {(showBest || shouldShowNew) && (
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                        {showBest && (
                            rankStyle === "large" ? (
                                // 베스트 페이지 — 큰 순위 숫자 (스마트스토어 스타일)
                                <span className="min-w-[26px] h-[26px] px-1.5 rounded-md bg-foreground/85 text-white text-xs font-black flex items-center justify-center backdrop-blur-sm shadow-md">
                                    {effectiveRank}
                                </span>
                            ) : (
                                // 다른 페이지 — "BEST" 라벨 (숫자 없음)
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

                {/* 찜 버튼 — preventDefault 로 카드 링크 막음 */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // TODO: wishlist toggle
                    }}
                    className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white shadow-card flex items-center justify-center"
                    aria-label="찜하기"
                >
                    <i className="fa-regular fa-heart text-neutral-400 text-xs" />
                </button>
            </div>

            <div className="p-3 md:p-4">
                <p className="text-[10px] font-extrabold tracking-wider text-aurora-indigo mb-1 uppercase">
                    {p.brandEn || p.brandKo}
                </p>
                <p className="text-xs md:text-sm font-bold line-clamp-2 mb-2 min-h-[2.6em]">
                    {p.name}
                </p>

                {/* 가격 — 할인 있으면 [할인율 + 원가 취소선 + 할인가], 없으면 정가만 */}
                <div className="text-right">
                    {p.discountRate > 0 && p.originalPrice ? (
                        <>
                            <div className="flex items-center justify-end gap-1.5 mb-0.5">
                                <span className="text-[11px] md:text-xs font-extrabold text-danger">
                                    {p.discountRate}%
                                </span>
                                <span className="text-[10px] md:text-[11px] text-neutral-400 line-through">
                                    {formatKRW(p.originalPrice)}원
                                </span>
                            </div>
                            <p className="text-sm md:text-base font-black">
                                {formatKRW(p.price)}원
                            </p>
                        </>
                    ) : (
                        <p className="text-sm md:text-base font-black">
                            {formatKRW(p.price)}원
                        </p>
                    )}
                </div>

                {/* 평점 + 리뷰 수 — 리뷰 있을 때만 */}
                {p.reviewCount > 0 && (
                    <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] md:text-[11px] text-neutral-500">
                        <i className="fa-solid fa-star text-amber-400" />
                        <span className="font-bold text-neutral-700">{p.rating.toFixed(1)}</span>
                        <span className="text-neutral-400">({p.reviewCount})</span>
                    </div>
                )}
            </div>
        </Link>
    );
}
