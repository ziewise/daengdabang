/**
 * ProductInfo — 상품 상세 우측 정보 영역
 * ---------------------------------------------------------------------
 * 브랜드 / 상품명 / 배지(BEST·NEW) / 평점 / 가격 / 수량 / 버튼
 *
 * 구매 버튼: 찜 / 장바구니 / 바로 구매 (그라데이션 강조)
 * 현재 mock — 클릭 시 alert 또는 토스트 (백엔드 단계에서 실제 동작).
 */
"use client";

import { useState } from "react";
import { formatKRW, getBestRank, isNewProduct, type CatalogProduct, CATEGORY_LABEL, SUBCATEGORY_LABEL } from "@/lib/catalog";
import Link from "next/link";

interface Props {
    product: CatalogProduct;
}

export default function ProductInfo({ product: p }: Props) {
    const [qty, setQty] = useState(1);
    const [wished, setWished] = useState(false);

    const bestRank = getBestRank(p);
    const isNew = isNewProduct(p);
    const total = p.price * qty;
    const point = Math.floor(p.price * 0.01);  // 1% 적립 mock

    return (
        <div className="space-y-5 md:space-y-6">
            {/* 브레드크럼 — 카테고리·서브카테고리 링크 */}
            <nav className="text-xs text-neutral-400 flex items-center gap-1.5 flex-wrap">
                <Link href="/main" className="hover:text-aurora-indigo">홈</Link>
                <i className="fa-solid fa-chevron-right text-[7px]" />
                <Link href={`/category/${p.category}`} className="hover:text-aurora-indigo">
                    {CATEGORY_LABEL[p.category]}
                </Link>
                <i className="fa-solid fa-chevron-right text-[7px]" />
                <Link href={`/category/${p.category}?sub=${p.subcategory}`} className="hover:text-aurora-indigo">
                    {SUBCATEGORY_LABEL[p.subcategory]}
                </Link>
            </nav>

            {/* 브랜드 + 상품명 + 배지 */}
            <div>
                <p className="text-xs font-extrabold tracking-[0.2em] text-aurora-indigo uppercase mb-2">
                    {p.brandEn || p.brandKo}
                </p>
                <div className="flex items-start gap-2 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground flex-1 leading-tight">
                        {p.name}
                    </h1>
                </div>
                {/* 배지 */}
                {(bestRank !== null || isNew) && (
                    <div className="flex gap-1.5 mt-3">
                        {bestRank !== null && (
                            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-danger to-orange-500 text-white text-[10px] font-black tracking-wider shadow-sm">
                                BEST
                            </span>
                        )}
                        {isNew && (
                            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-aurora-indigo to-aurora-pink text-white text-[10px] font-black tracking-wider shadow-sm">
                                NEW
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* 평점 + 리뷰 수 */}
            {p.reviewCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                        <i className="fa-solid fa-star text-amber-400" />
                        <span className="font-black text-foreground">{p.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-neutral-300">·</span>
                    <a href="#tab-review" className="text-neutral-500 hover:text-aurora-indigo font-bold">
                        리뷰 {p.reviewCount.toLocaleString()}개
                    </a>
                </div>
            )}

            {/* 가격 */}
            <div className="pt-2">
                {p.discountRate > 0 && p.originalPrice && (
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-base md:text-lg font-extrabold text-danger">
                            {p.discountRate}%
                        </span>
                        <span className="text-sm text-neutral-400 line-through">
                            {formatKRW(p.originalPrice)}원
                        </span>
                    </div>
                )}
                <div className="text-3xl md:text-4xl font-black text-foreground">
                    {formatKRW(p.price)}<span className="text-xl md:text-2xl">원</span>
                </div>
            </div>

            <div className="h-px bg-neutral-100" />

            {/* 적립금·배송 안내 */}
            <ul className="space-y-2 text-xs md:text-sm">
                <li className="flex items-center gap-2 text-neutral-600">
                    <i className="fa-solid fa-coins text-aurora-amber" />
                    <span>적립금</span>
                    <span className="font-extrabold text-foreground ml-1">{formatKRW(point)}원</span>
                </li>
                <li className="flex items-center gap-2 text-neutral-600">
                    <i className="fa-solid fa-truck text-aurora-indigo" />
                    <span>배송</span>
                    <span className="font-extrabold text-foreground ml-1">무료배송</span>
                    <span className="text-neutral-400">· 1~2일 내 출고</span>
                </li>
            </ul>

            <div className="h-px bg-neutral-100" />

            {/* 수량 + 합계 */}
            <div className="bg-neutral-50/60 rounded-2xl p-4 md:p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-extrabold text-neutral-500">수량</p>
                    <div className="inline-flex items-center bg-white rounded-full border border-neutral-200">
                        <button
                            type="button"
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            disabled={qty <= 1}
                            className="w-9 h-9 flex items-center justify-center text-neutral-600 hover:text-aurora-indigo disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="수량 감소"
                        >
                            <i className="fa-solid fa-minus text-xs" />
                        </button>
                        <span className="w-10 text-center text-sm font-black">{qty}</span>
                        <button
                            type="button"
                            onClick={() => setQty((q) => Math.min(99, q + 1))}
                            disabled={qty >= 99}
                            className="w-9 h-9 flex items-center justify-center text-neutral-600 hover:text-aurora-indigo disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="수량 증가"
                        >
                            <i className="fa-solid fa-plus text-xs" />
                        </button>
                    </div>
                </div>
                <div className="flex items-baseline justify-between">
                    <p className="text-xs font-extrabold text-neutral-500">합계</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl md:text-3xl font-black text-aurora-indigo">{formatKRW(total)}</span>
                        <span className="text-sm font-extrabold text-aurora-indigo">원</span>
                    </div>
                </div>
            </div>

            {/* 액션 버튼 row */}
            <div className="flex gap-2 md:gap-3">
                <button
                    type="button"
                    onClick={() => setWished((w) => !w)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                        wished
                            ? "bg-danger/10 border-danger text-danger"
                            : "bg-white border-neutral-200 text-neutral-400 hover:border-danger hover:text-danger"
                    }`}
                    aria-label="찜하기"
                >
                    <i className={`${wished ? "fa-solid" : "fa-regular"} fa-heart text-lg`} />
                </button>
                <button
                    type="button"
                    className="flex-1 h-12 md:h-14 rounded-2xl border-2 border-neutral-200 bg-white text-sm md:text-base font-extrabold hover:border-aurora-indigo hover:text-aurora-indigo transition-all"
                >
                    <i className="fa-solid fa-bag-shopping mr-1.5" />
                    장바구니
                </button>
                <button
                    type="button"
                    className="flex-1 h-12 md:h-14 rounded-2xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm md:text-base font-extrabold shadow-card hover:shadow-hover hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <i className="fa-solid fa-credit-card mr-1.5" />
                    바로 구매
                </button>
            </div>

            {/* 안내 — 작은 텍스트 */}
            <p className="text-[10px] text-neutral-400 text-center">
                현재 데모용 — 실제 주문/결제는 백엔드 연동 후 동작합니다.
            </p>
        </div>
    );
}
