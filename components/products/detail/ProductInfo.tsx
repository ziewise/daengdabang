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
    getBestRank,
    isNewProduct,
    type CatalogProduct,
} from "@/lib/catalog";
import { useAuth, useStore } from "@/lib/store";
import { usePets } from "@/hooks/usePets";
import { cartPetOptions } from "@/lib/pet-attribution";
import { loadTwinProductStats, type TwinProductStat } from "@/lib/storefront-analytics";
import { useI18n } from "@/lib/i18n";
import { getPetTryOnEligibility } from "@/lib/pet-tryon-eligibility";
import ProductShareActions from "./ProductShareActions";
import OptionSheet from "./OptionSheet";
import ColorSelect from "./ColorSelect";

interface Props {
    product: CatalogProduct;
    /** 색상 변형 선택 인덱스(null=미선택 → 진입 시 대표 이미지). 부모와 공유 */
    colorIdx?: number | null;
    onColorChange?: (idx: number) => void;
    onTryOn?: () => void;
}

export default function ProductInfo({ product: p, colorIdx = null, onColorChange, onTryOn }: Props) {
    const { toggleWishlist, isWished } = useStore();
    const { user } = useAuth();
    const { pets: profilePets } = usePets();
    const { locale, t, formatPrice, productName, categoryLabel, subcategoryLabel } = useI18n();
    const wished = isWished(p.id);
    const bestRank = getBestRank(p);
    const isNew = isNewProduct(p);
    const point = Math.floor(p.price * 0.01);
    const displayName = productName(p);
    const canTryOn = getPetTryOnEligibility(p).eligible;

    const colors = p.colors ?? [];
    const hasColors = colors.length > 0;

    // 옵션 선택 시트 모드(null=닫힘) + 담기 완료 토스트
    const [sheetMode, setSheetMode] = useState<null | "cart" | "buy">(null);
    const [toast, setToast] = useState(false);
    const [twinStat, setTwinStat] = useState<TwinProductStat | null>(null);

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

    useEffect(() => {
        const petOption = cartPetOptions(user?.pets ?? [], profilePets)[0];
        if (!petOption) {
            const timer = window.setTimeout(() => setTwinStat(null), 0);
            return () => window.clearTimeout(timer);
        }
        let ignore = false;
        loadTwinProductStats({
            cohortKey: petOption.assignment.cohortKey,
            productIds: [p.id],
            limit: 1,
        }).then((stats) => {
            if (ignore) return;
            setTwinStat(stats[0] ?? null);
        });
        return () => {
            ignore = true;
        };
    }, [p.id, profilePets, user?.pets]);

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
                    <Link href="/" className="hover:text-indigo-600">{t("home")}</Link>
                    <i className="fa-solid fa-chevron-right text-[8px]" />
                    <Link href={`/category/${p.category}`} className="hover:text-indigo-600">
                        {categoryLabel(p.category)}
                    </Link>
                    <i className="fa-solid fa-chevron-right text-[8px]" />
                    <Link href={`/products?sub=${p.subcategory}`} className="hover:text-indigo-600">
                        {subcategoryLabel(p.subcategory)}
                    </Link>
                </nav>

                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                        {p.brandEn || p.brandKo}
                    </p>
                    <h1 className="mt-2 text-2xl font-black leading-tight text-neutral-950 md:text-3xl">
                        {displayName}
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
                            {t("reviews")} {p.reviewCount.toLocaleString(locale === "en" ? "en-US" : "ko-KR")}
                        </a>
                    </div>
                )}

                {twinStat && twinStat.sampleSize >= 5 && typeof twinStat.repurchaseRate === "number" && (
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-black text-indigo-700">{t("twin")}</span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-indigo-700">
                                {t("sample")} {twinStat.sampleSize}
                            </span>
                        </div>
                        <p className="mt-1 text-sm font-bold leading-6 text-neutral-700">
                            {t("repurchaseRate")}{" "}
                            <b className="text-neutral-950">{Math.round(twinStat.repurchaseRate * 100)}%</b>
                            {twinStat.cohortLevel && <span className="text-neutral-500"> · {twinStat.cohortLevel}</span>}
                        </p>
                    </div>
                )}

                {/* 가격 라인 — 착용 가능 상품은 금액 옆에서 바로 입혀보기를 시작한다 */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            {p.discountRate > 0 && p.originalPrice && (
                                <div className="mb-1 flex items-center gap-2">
                                    <span className="text-lg font-black text-rose-600">{p.discountRate}%</span>
                                    <span className="text-sm text-neutral-400 line-through">{formatPrice(p.originalPrice)}</span>
                                </div>
                            )}
                            <p className="text-4xl font-black text-neutral-950">
                                {formatPrice(p.price)}
                            </p>
                        </div>
                        {canTryOn && onTryOn && (
                            <button
                                type="button"
                                onClick={onTryOn}
                                aria-label={locale === "en" ? "Preview this product on my dog" : "우리 아이에게 이 상품 입혀보기"}
                                className="group relative inline-flex min-h-14 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 px-4 py-2.5 text-left text-white shadow-[0_12px_28px_-12px_rgba(79,70,229,0.9)] ring-1 ring-white/30 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-12px_rgba(124,58,237,0.95)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none md:px-5"
                            >
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/20 transition-[left] duration-700 group-hover:left-[120%] motion-reduce:hidden"
                                />
                                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18 shadow-inner ring-1 ring-white/35 transition group-hover:scale-105 motion-reduce:transform-none">
                                    <i className="fa-solid fa-paw text-sm" />
                                </span>
                                <span className="relative min-w-0">
                                    <span className="block text-[10px] font-bold tracking-wide text-indigo-100">
                                        {locale === "en" ? "Preview the fit with a photo" : "사진으로 착용 모습 미리보기"}
                                    </span>
                                    <span className="mt-0.5 block text-sm font-black md:text-[15px]">
                                        {locale === "en" ? "Try it on my dog" : "우리 아이에게 바로 입혀보기"}
                                    </span>
                                </span>
                                <i className="fa-solid fa-chevron-right relative ml-0.5 text-[10px] text-white/85 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
                            </button>
                        )}
                    </div>
                    {/* 링크·공유 — 금액 라인 우측 끝(아이콘만) */}
                    <ProductShareActions product={p} />
                </div>

                <div className="h-px bg-neutral-200" />

                <ul className="space-y-2 text-sm text-neutral-700">
                    <li className="flex items-center gap-2">
                        <i className="fa-solid fa-coins text-amber-500" />
                        <span>{t("point")}</span>
                        <b className="text-neutral-950">{formatPrice(point)}</b>
                    </li>
                    <li className="flex items-center gap-2">
                        <i className="fa-solid fa-truck text-indigo-600" />
                        <span>{t("shipping")}</span>
                        <b className="text-neutral-950">{t("freeShipping")}</b>
                        <span className="text-neutral-500">{t("shipsIn")}</span>
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
                <div ref={actionRef} data-pet-guide-target="product-actions" className="grid grid-cols-[56px_1fr_1fr] gap-2">
                    <button
                        type="button"
                        onClick={() => toggleWishlist(p.id)}
                        className={`flex h-14 items-center justify-center rounded-md border-2 transition ${
                            wished
                                ? "border-rose-500 bg-rose-50 text-rose-600"
                                : "border-neutral-200 bg-white text-neutral-500 hover:border-rose-300 hover:text-rose-600"
                        }`}
                        aria-label={wished ? t("wishlistRemove") : t("wishlistAdd")}
                        title={wished ? t("wishlistRemove") : t("wishlistAdd")}
                    >
                        <i className={`${wished ? "fa-solid" : "fa-regular"} fa-heart text-lg`} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setSheetMode("cart")}
                        className="h-14 rounded-md border-2 border-neutral-200 bg-white text-base font-black transition hover:border-indigo-500 hover:text-indigo-700"
                    >
                        <i className="fa-solid fa-bag-shopping mr-2 text-sm" />
                        {t("addToCart")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setSheetMode("buy")}
                        className="h-14 rounded-md bg-indigo-600 text-base font-black text-white transition hover:bg-indigo-700"
                    >
                        <i className="fa-solid fa-credit-card mr-2 text-sm" />
                        {t("buyNow")}
                    </button>
                </div>
            </div>

            {/* 스크롤 추적 하단 고정 바 — 버튼을 누르면 옵션 시트가 열린다 */}
            <div
                data-pet-guide-target="product-actions"
                className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-white/65 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-transform duration-300 ${
                    showBar ? "translate-y-0" : "pointer-events-none translate-y-full"
                }`}
            >
                <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2.5 md:px-6">
                    <div className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-[#f7f2e8] sm:block">
                        {barImage ? (
                            <Image key={barImage} src={barImage} alt={displayName} fill sizes="48px" className="object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-center text-neutral-300"><i className={`fa-solid ${p.icon}`} /></div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-neutral-900">{displayName}</p>
                        <p className="text-sm font-black text-indigo-700">{formatPrice(p.price)}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSheetMode("cart")}
                        className="h-11 shrink-0 rounded-md border-2 border-neutral-200 bg-white px-3 text-sm font-black text-neutral-800 transition hover:border-indigo-500 hover:text-indigo-700 sm:px-4"
                    >
                        <i className="fa-solid fa-bag-shopping text-sm sm:mr-1.5" />
                        <span className="hidden sm:inline">{t("cart")}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSheetMode("buy")}
                        className="h-11 shrink-0 rounded-md bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 sm:px-6"
                    >
                        {t("buyNow")}
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
                {t("addedToCart")}
            </div>
        </>
    );
}
