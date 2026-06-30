"use client";

/**
 * ProductInfo — 제품 구매 정보 + 색상 미리보기 + 옵션 시트 트리거 + 스크롤 추적 하단 바.
 * --------------------------------------------------------------------------------
 * - 색상 칩은 페이지에 미리보기로 노출(클릭 시 좌측 메인 이미지 교체 — 부모가 담당).
 * - [장바구니 담기]/[구매하기]는 위쪽·하단 바 어디서 누르든 OptionSheet(옵션 선택 시트)를 연다.
 *   → 수량·색상·누적은 시트에서 확정(위/아래 동작 통일, 스크롤 위치와 무관하게 옵션 선택 가능).
 * - 메인 액션 버튼이 스크롤로 화면을 벗어나면 하단 고정 바를 띄운다(상세/리뷰까지 내려가도 구매 가능).
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    CATEGORY_LABEL,
    SUBCATEGORY_LABEL,
    formatKRW,
    getBestRank,
    isNewProduct,
    type CatalogProduct,
} from "@/lib/catalog";
import { useStore } from "@/lib/store";
import ProductShareActions from "./ProductShareActions";
import OptionSheet from "./OptionSheet";
import ColorSelect from "./ColorSelect";

interface Props {
    product: CatalogProduct;
    /** 색상 변형 선택 인덱스(null=미선택 → 진입 시 대표 이미지). 부모와 공유 */
    colorIdx?: number | null;
    onColorChange?: (idx: number) => void;
}

export default function ProductInfo({ product: p, colorIdx = null, onColorChange }: Props) {
    const { toggleWishlist, isWished } = useStore();
    const wished = isWished(p.id);
    const bestRank = getBestRank(p);
    const isNew = isNewProduct(p);
    const point = Math.floor(p.price * 0.01);

    const colors = p.colors ?? [];
    const hasColors = colors.length > 0;

    // 옵션 선택 시트 모드(null=닫힘) + 담기 완료 토스트
    const [sheetMode, setSheetMode] = useState<null | "cart" | "buy">(null);
    const [toast, setToast] = useState(false);

    // 메인 액션 버튼이 스크롤로 화면을 벗어나면 하단 고정 바 노출
    const actionRef = useRef<HTMLDivElement>(null);
    const [showBar, setShowBar] = useState(false);
    useEffect(() => {
        const el = actionRef.current;
        if (!el || typeof IntersectionObserver === "undefined") return;
        const io = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting));
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // 하단 바 노출 여부를 FloatingDock(펫렌즈·챗봇)에 알려, 겹치지 않게 그 위로 비켜준다
    useEffect(() => {
        window.dispatchEvent(new CustomEvent("ddb:buybar", { detail: showBar }));
        return () => {
            window.dispatchEvent(new CustomEvent("ddb:buybar", { detail: false }));
        };
    }, [showBar]);

    // 시트에서 담기가 확정되면 토스트(구매는 결제 페이지로 이동하므로 토스트 없음)
    const handleCommitted = (mode: "cart" | "buy") => {
        if (mode !== "cart") return;
        setToast(true);
        window.setTimeout(() => setToast(false), 2000);
    };

    // 하단 바 썸네일 = 선택한 색상 이미지(없으면 기본 제품 이미지)
    const barImage = (hasColors && colorIdx != null ? colors[colorIdx]?.image : p.image) || p.image || "";

    return (
        <>
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

                {/* 색상 — PC(lg+)는 여기(우측 구매정보), 모바일은 이미지 바로 아래(ProductDetailClient)에서 표시 */}
                <ColorSelect
                    colors={colors}
                    colorIdx={colorIdx}
                    onColorChange={onColorChange}
                    className="hidden lg:block"
                />

                {/* 메인 액션 — 누르면 옵션 시트. 이 영역이 화면 밖이면 하단 바 노출 */}
                <div ref={actionRef} className="grid grid-cols-[56px_1fr_1fr] gap-2">
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
                        onClick={() => setSheetMode("cart")}
                        className="h-14 rounded-md border-2 border-neutral-200 bg-white text-base font-black transition hover:border-indigo-500 hover:text-indigo-700"
                    >
                        <i className="fa-solid fa-bag-shopping mr-2 text-sm" />
                        장바구니 담기
                    </button>
                    <button
                        type="button"
                        onClick={() => setSheetMode("buy")}
                        className="h-14 rounded-md bg-indigo-600 text-base font-black text-white transition hover:bg-indigo-700"
                    >
                        <i className="fa-solid fa-credit-card mr-2 text-sm" />
                        구매하기
                    </button>
                </div>

                <ProductShareActions product={p} />
            </div>

            {/* 스크롤 추적 하단 고정 바 — 버튼을 누르면 옵션 시트가 열린다 */}
            <div
                className={`fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur transition-transform duration-300 ${
                    showBar ? "translate-y-0" : "pointer-events-none translate-y-full"
                }`}
            >
                <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2.5 md:px-6">
                    <div className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-[#f7f2e8] sm:block">
                        {barImage ? (
                            <Image key={barImage} src={barImage} alt={p.name} fill sizes="48px" className="object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-center text-neutral-300"><i className={`fa-solid ${p.icon}`} /></div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-neutral-900">{p.name}</p>
                        <p className="text-sm font-black text-indigo-700">{formatKRW(p.price)}원</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSheetMode("cart")}
                        className="h-11 shrink-0 rounded-md border-2 border-neutral-200 bg-white px-3 text-sm font-black text-neutral-800 transition hover:border-indigo-500 hover:text-indigo-700 sm:px-4"
                    >
                        <i className="fa-solid fa-bag-shopping text-sm sm:mr-1.5" />
                        <span className="hidden sm:inline">장바구니</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSheetMode("buy")}
                        className="h-11 shrink-0 rounded-md bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 sm:px-6"
                    >
                        구매하기
                    </button>
                </div>
            </div>

            {/* 옵션 선택 시트 (PC 우측 슬라이드 / 모바일 바텀시트) */}
            <OptionSheet
                product={p}
                open={sheetMode !== null}
                mode={sheetMode ?? "cart"}
                initialColorIdx={colorIdx}
                onClose={() => setSheetMode(null)}
                onCommitted={handleCommitted}
            />

            {/* 담기 완료 토스트 */}
            <div
                className={`fixed left-1/2 z-[70] -translate-x-1/2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-black text-white shadow-lg transition-all duration-300 ${
                    toast ? "bottom-24 opacity-100" : "pointer-events-none bottom-16 opacity-0"
                }`}
            >
                <i className="fa-solid fa-circle-check mr-1.5 text-emerald-400" />
                장바구니에 담았어요
            </div>
        </>
    );
}
