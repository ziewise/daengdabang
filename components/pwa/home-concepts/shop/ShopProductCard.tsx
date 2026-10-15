"use client";

/**
 * 스티커북 시안 — 쇼핑 상품 카드 (로컬 시안 전용, 배포 X)
 * ---------------------------------------------------------------------
 * 협업자 공용 상품 카드(components/products/ProductCard)와 "같은 정보 · 같은 동작"을 스크랩 카드 모양으로.
 *  - 정보: 사진/영상 · BEST/NEW · 찜 · 색상 미리보기(n가지 색상) · 브랜드 · 상품명 · 구매 상태 · 할인 · 가격표(가격 배지 + 가격) ·
 *          외부 판매점 후기(별점 · 수 · 판매처)
 *  - 영상: 협업자 useProductVideo 그대로 — 휴대폰에서 절반 이상 보이면 사진 → 영상 자동 전환, 스크롤 중엔 멈춤,
 *          화면 밖이면 되감기, 색상을 누르면 영상 멈추고 그 색상 사진
 *  - 산책 친구 안내용 표시(data-pet-*)도 웹 카드와 같게 붙임
 * 모양: 테이프 붙인 크래프트 종이 · 사진은 흰 테두리로 오려 붙임 · 가격은 노란 가격표 태그 · 기울기 ±1도.
 */

import Link from "next/link";
import { useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { getBestRank, isNewProduct } from "@/lib/catalog";
import { catalogPriceBadgeLabel } from "@/lib/catalog/price-badge";
import { reviewSellerLabel } from "@/lib/catalog/review-groups";
import { hoverVideoFraming, hoverVideoStyle } from "@/lib/catalog/hover-video-framing";
import { productPurchaseState, purchaseStateLabel } from "@/lib/catalog/inventory";
import { useLiveInventoryProduct } from "@/lib/catalog/live-inventory";
import { productHref } from "@/lib/shop";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import ProductColorImage from "@/components/products/ProductColorImage";
import VideoBrandOverlay from "@/components/products/VideoBrandOverlay";
import { useProductVideo } from "@/components/products/useProductVideo";
import { Tape } from "../sticker-kit";

const TAPES = ["rgba(255,200,218,.85)", "rgba(190,224,255,.85)", "rgba(255,232,170,.9)", "rgba(200,240,215,.9)"];

export default function ShopProductCard({ product, index = 0, showBest = false, width }: { product: CatalogProduct; index?: number; showBest?: boolean; width?: string }) {
    const p = useLiveInventoryProduct(product);
    const { toggleWishlist, isWished } = useStore();
    const { locale, productName, formatPrice } = useI18n();
    const wished = isWished(p.id);
    const name = productName(p);
    const href = productHref(p);
    const rank = showBest ? getBestRank(p) : null;
    const isNew = isNewProduct(p);
    const purchase = productPurchaseState(p);
    const hasDiscount = p.discountRate > 0 && p.originalPrice !== null;
    const colors = p.colors ?? [];
    const [colorIdx, setColorIdx] = useState<number | null>(null);
    const color = colorIdx === null ? undefined : colors[colorIdx];
    const thumb = color?.image || p.image;

    // 영상 — 협업자 훅 그대로(휴대폰 자동 재생 · 스크롤 멈춤 · 색상 미리보기 시 정지)
    const { videoRef, videoActive, previewColor, onPlaying, onSeeked, onError } = useProductVideo(p.video);
    const hasVideo = Boolean(p.video);
    const playOnce = (p.raw?.videoProvider === "ddb_original_video_editor"
        || p.raw?.videoZiewcraftIdentity?.kind === "ziewcraft_human_review_single_4s.v1"
        || p.raw?.videoZiewcraftIdentity?.kind === "ziewcraft_owner_delegated_ai.v1")
        && p.raw.videoPlaybackMode === "once_hold_last_frame";
    const rot = [-1, 0.8, 0.6, -0.8][index % 4];

    return (
        <article data-pet-product="true" data-pet-name={name} data-pet-category={p.category} data-pet-subcategory={p.subcategory} data-pet-href={href}
            className="sp-card relative flex flex-col px-2 pb-2.5 pt-2" style={{ rotate: `${rot}deg`, width }}>
            <Tape className="-top-2 left-1/2 z-10 h-3.5 w-12 -translate-x-1/2" color={TAPES[index % TAPES.length]} style={{ rotate: `${index % 2 ? 5 : -5}deg` }} />

            {/* 사진 / 영상 — 흰 테두리로 오려 붙인 사진 */}
            <div className="sp-photo relative aspect-square overflow-hidden rounded-[4px] bg-white">
                <Link href={href} aria-label={`${name} 상세 보기`} className="absolute inset-0 flex items-center justify-center">
                    {thumb ? (
                        <ProductColorImage src={thumb} color={color} alt={color ? `${name} · ${color.name}` : name} sizes="170px"
                            className={`object-contain transition-opacity duration-300 ${videoActive ? "opacity-0" : "opacity-100"}`} />
                    ) : (
                        <i aria-hidden="true" className={`fa-solid ${p.icon} text-4xl text-[#e8c9b8]`} />
                    )}
                    {hasVideo ? (
                        <video ref={videoRef} src={p.video} style={hoverVideoStyle(p.video)} data-hover-video-fit="cover" muted loop={!playOnce} playsInline preload="metadata"
                            onPlaying={onPlaying} onSeeked={onSeeked} onError={onError}
                            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${videoActive ? "opacity-100" : "opacity-0"}`} />
                    ) : null}
                    {hasVideo && videoActive ? <VideoBrandOverlay src={p.video} forceOverlay={hoverVideoFraming(p.video)?.restoreBrandOverlay} /> : null}
                </Link>
                {/* BEST · NEW — 잉크 도장 */}
                {rank !== null || isNew ? (
                    <span className="pointer-events-none absolute left-1.5 top-1.5 z-[1] flex flex-col items-start gap-1">
                        {rank !== null ? <span className="sp-stamp ah-display" style={{ ["--c" as string]: "#e0557f", rotate: "-8deg" }}>BEST</span> : null}
                        {isNew ? <span className="sp-stamp ah-display" style={{ ["--c" as string]: "#1f9e75", rotate: "6deg" }}>NEW</span> : null}
                    </span>
                ) : null}
                {/* 찜 — 동그란 하트 스티커 */}
                <button type="button" onClick={() => toggleWishlist(p.id)} aria-label={wished ? "찜 해제" : "찜하기"} aria-pressed={wished}
                    className="sp-heart absolute right-1.5 top-1.5 z-10 grid h-8 w-8 place-items-center rounded-full">
                    <i aria-hidden="true" className={`fa-heart text-[12px] ${wished ? "fa-solid text-[#f2557f]" : "fa-regular text-[#b9a49a]"}`} />
                </button>
            </div>

            {/* 색상 미리보기 — 작은 동그라미 칩 · 고른 색 이름(없으면 n가지 색상) */}
            {colors.length > 0 ? (
                <div className="mt-1.5">
                    <div role="group" aria-label={`${name} 색상 미리보기`} className="sp-chips -mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-0.5">
                        {colors.map((c, i) => (
                            <button key={`${c.name}-${i}`} type="button" aria-label={`${c.name} 미리보기`} aria-pressed={i === colorIdx}
                                onClick={() => { previewColor(); setColorIdx((cur) => (cur === i ? null : i)); }}
                                className={`sp-chip relative block h-6 w-6 shrink-0 overflow-hidden rounded-full ${i === colorIdx ? "is-on" : ""}`}>
                                <ProductColorImage src={c.chip || c.image} color={c} alt="" sizes="24px" className="object-cover" />
                            </button>
                        ))}
                    </div>
                    <p aria-live="polite" className="ah-light mt-0.5 text-[10.5px] text-[#9c8a80]">{color?.name ?? `${colors.length}가지 색상`}</p>
                </div>
            ) : null}

            {/* 정보 — 웹 카드와 같은 항목 */}
            <Link href={href} className="mt-1.5 flex flex-1 flex-col">
                <span className="ah-display block truncate text-[10.5px] uppercase tracking-wide text-[#8b6fd6]">{p.brandEn || p.brandKo}</span>
                <span className="ah-light mt-0.5 line-clamp-2 min-h-[2.5em] text-[12px] leading-snug text-[#3d2f2a]">{name}</span>
                {!purchase.purchasable ? <span data-inventory-state={purchase.state} className="ah-display mt-1 text-[11px] text-[#c2413b]">{purchaseStateLabel(purchase, locale)}</span> : null}
                {/* 가격표 태그 — 할인 · 가격 배지 · 가격 */}
                <span className="mt-auto flex flex-col items-end pt-1.5">
                    {hasDiscount && p.originalPrice ? (
                        <span className="flex items-center gap-1 text-[10.5px]">
                            <b className="ah-display font-normal text-[#e0455f]">{p.discountRate}%</b>
                            <s className="text-[#b5a49b]">{formatPrice(p.originalPrice)}</s>
                        </span>
                    ) : null}
                    <span className="sp-price relative inline-flex flex-col items-end py-0.5 pl-3.5 pr-2 leading-tight">
                        <span className="ah-light text-[9.5px]">{catalogPriceBadgeLabel(p.priceBadgeKind, locale)}</span>
                        <span className="ah-display text-[14px]">{formatPrice(p.price)}</span>
                    </span>
                </span>
                {/* 외부 판매점 후기 */}
                {(p.externalReviewCount ?? 0) > 0 ? (
                    <span className="ah-light mt-1 text-right text-[10px] leading-snug text-[#9c8a80]">
                        외부 판매점 후기 <i aria-hidden="true" className="fa-solid fa-star text-[9px] text-[#f5b82e]" /> <b className="font-normal text-[#5c4a42]">{p.externalReviewAverage?.toFixed(1) ?? "—"}</b> ({p.externalReviewCount})
                        <span className="block">{reviewSellerLabel(p.externalReviewUrl)}</span>
                    </span>
                ) : null}
            </Link>
        </article>
    );
}

export const SHOP_CARD_CSS = `
/* 상품 스크랩 카드: 크래프트 종이 + 오려 붙인 사진 */
.sp-card { background: #fffaf2; border-radius: 6px; box-shadow: inset 0 0 0 1.5px #f3e6d6, 0 10px 18px -12px rgba(110,80,40,.5); -webkit-tap-highlight-color: transparent; }
.sp-photo { box-shadow: 0 0 0 3px #fff, 0 4px 8px -5px rgba(90,60,50,.4); }
.sp-stamp { font-size: 10px; line-height: 1; padding: 3px 5px 2px; border-radius: 4px; color: var(--c); background: rgba(255,255,255,.88); box-shadow: inset 0 0 0 1.5px var(--c); letter-spacing: .04em; }
.sp-heart { background: rgba(255,255,255,.95); box-shadow: 0 0 0 1.5px #fff, 0 3px 6px -3px rgba(90,60,50,.45); transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.sp-heart:active { transform: scale(.85); }
.sp-chips { scrollbar-width: none; }
.sp-chip { box-shadow: 0 0 0 1px #eadbd2; }
.sp-chip.is-on { box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px #f47aa0; }
/* 가격표: 노란 꼬리표(구멍 뚫린 태그) */
.sp-price { background: #fff3a6; color: #6b4708; border-radius: 3px 6px 6px 3px; clip-path: polygon(9px 0, 100% 0, 100% 100%, 9px 100%, 0 50%); }
.sp-price::before { content: ""; position: absolute; left: 6px; top: 50%; width: 4px; height: 4px; margin-top: -2px; border-radius: 999px; background: #fffaf2; box-shadow: inset 0 0 0 1px rgba(170,120,40,.35); }
`;
