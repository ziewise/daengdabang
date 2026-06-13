"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    CATEGORY_LABEL,
    SUBCATEGORY_LABEL,
    formatKRW,
    getBestRank,
    isNewProduct,
    type CatalogProduct,
} from "@/lib/catalog";
import { useCart, useStore } from "@/lib/store";

interface Props {
    product: CatalogProduct;
}

export default function ProductInfo({ product: p }: Props) {
    const router = useRouter();
    const [qty, setQty] = useState(1);
    const { addToCart } = useCart();
    const { toggleWishlist, isWished } = useStore();
    const wished = isWished(p.id);
    const bestRank = getBestRank(p);
    const isNew = isNewProduct(p);
    const total = p.price * qty;
    const point = Math.floor(p.price * 0.01);

    const handleCart = () => addToCart(p.id, qty);
    const handleBuyNow = () => {
        addToCart(p.id, qty);
        router.push("/checkout");
    };

    return (
        <div className="space-y-6">
            <nav className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-neutral-500">
                <Link href="/" className="hover:text-indigo-600">홈</Link>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <Link href={`/category/${p.category}`} className="hover:text-indigo-600">
                    {CATEGORY_LABEL[p.category]}
                </Link>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <Link href={`/products?sub=${p.subcategory}`} className="hover:text-indigo-600">
                    {SUBCATEGORY_LABEL[p.subcategory]}
                </Link>
            </nav>

            <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                    {p.brandEn || p.brandKo}
                </p>
                <h1 className="mt-2 text-2xl font-black leading-tight text-neutral-950 md:text-3xl">
                    {p.name}
                </h1>
                {(bestRank !== null || isNew) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {bestRank !== null && (
                            <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white">
                                BEST {bestRank}
                            </span>
                        )}
                        {isNew && (
                            <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-black text-white">
                                NEW
                            </span>
                        )}
                    </div>
                )}
            </div>

            {p.reviewCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                    <i className="fa-solid fa-star text-amber-400" />
                    <span className="font-black">{p.rating.toFixed(1)}</span>
                    <span className="text-neutral-300">|</span>
                    <a href="#tab-review" className="font-bold text-neutral-600 hover:text-indigo-600">
                        리뷰 {p.reviewCount.toLocaleString()}개
                    </a>
                </div>
            )}

            <div>
                {p.discountRate > 0 && p.originalPrice && (
                    <div className="mb-1 flex items-center gap-2">
                        <span className="text-lg font-black text-rose-600">{p.discountRate}%</span>
                        <span className="text-sm text-neutral-400 line-through">{formatKRW(p.originalPrice)}원</span>
                    </div>
                )}
                <p className="text-4xl font-black text-neutral-950">
                    {formatKRW(p.price)}
                    <span className="text-2xl">원</span>
                </p>
            </div>

            <div className="h-px bg-neutral-200" />

            <ul className="space-y-2 text-sm text-neutral-700">
                <li className="flex items-center gap-2">
                    <i className="fa-solid fa-coins text-amber-500" />
                    <span>적립금</span>
                    <b className="text-neutral-950">{formatKRW(point)}원</b>
                </li>
                <li className="flex items-center gap-2">
                    <i className="fa-solid fa-truck text-indigo-600" />
                    <span>배송</span>
                    <b className="text-neutral-950">무료배송</b>
                    <span className="text-neutral-500">1~2일 내 출고</span>
                </li>
            </ul>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-neutral-600">수량</span>
                    <div className="inline-flex h-10 items-center rounded-md border border-neutral-200 bg-white">
                        <button
                            type="button"
                            onClick={() => setQty((value) => Math.max(1, value - 1))}
                            disabled={qty <= 1}
                            className="flex h-full w-10 items-center justify-center text-neutral-600 disabled:opacity-30"
                            aria-label="수량 감소"
                        >
                            <i className="fa-solid fa-minus text-xs" />
                        </button>
                        <span className="w-10 text-center text-sm font-black">{qty}</span>
                        <button
                            type="button"
                            onClick={() => setQty((value) => Math.min(99, value + 1))}
                            disabled={qty >= 99}
                            className="flex h-full w-10 items-center justify-center text-neutral-600 disabled:opacity-30"
                            aria-label="수량 증가"
                        >
                            <i className="fa-solid fa-plus text-xs" />
                        </button>
                    </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-sm font-black text-neutral-600">합계</span>
                    <b className="text-2xl font-black text-indigo-700">{formatKRW(total)}원</b>
                </div>
            </div>

            <div className="grid grid-cols-[56px_1fr_1fr] gap-2">
                <button
                    type="button"
                    onClick={() => toggleWishlist(p.id)}
                    className={`flex h-14 items-center justify-center rounded-md border-2 transition ${
                        wished
                            ? "border-rose-500 bg-rose-50 text-rose-600"
                            : "border-neutral-200 bg-white text-neutral-500 hover:border-rose-300 hover:text-rose-600"
                    }`}
                    aria-label={wished ? "찜 해제" : "찜하기"}
                    title={wished ? "찜 해제" : "찜하기"}
                >
                    <i className={`${wished ? "fa-solid" : "fa-regular"} fa-heart text-lg`} />
                </button>
                <button
                    type="button"
                    onClick={handleCart}
                    className="h-14 rounded-md border-2 border-neutral-200 bg-white text-base font-black transition hover:border-indigo-500 hover:text-indigo-700"
                >
                    <i className="fa-solid fa-bag-shopping mr-2 text-sm" />
                    장바구니
                </button>
                <button
                    type="button"
                    onClick={handleBuyNow}
                    className="h-14 rounded-md bg-neutral-950 text-base font-black text-white transition hover:bg-indigo-700"
                >
                    <i className="fa-solid fa-credit-card mr-2 text-sm" />
                    바로구매
                </button>
            </div>
        </div>
    );
}
