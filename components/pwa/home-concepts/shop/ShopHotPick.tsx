"use client";

/**
 * 스티커북 앱 — 쇼핑 첫 화면 "댕다방 핫픽" (2026-10-26 사용자: 모바일 웹 핫픽처럼 앱에도)
 * ---------------------------------------------------------------------
 * 웹 메인 핫픽(components/main/HotPickSection — 휴대폰 한 줄 B안)과 같은 자료 · 같은 동작을 스티커북 결로.
 *  - 자료: lib/catalog/hot-picks — 제품군 5개(산책/아웃도어 · 먹거리 · 생활용품 · 장난감/놀이 · 케어)마다 1~3위(웹 · /best/ 와 같은 임시 순서)
 *  - 한 줄: 왼쪽 큰 폴라로이드 사진(순위 스티커) · 가운데 제품군 · 상품 이름 · 노란 가격표 · 오른쪽 다른 순위 작은 폴라로이드 둘
 *  - 작은 사진을 누르면 그 순위가 크게 올라오고(통 튀는 움직임 · 가벼운 진동), 크게 있던 순위는 작은 자리로 — 보기만 바뀜
 *    큰 사진 · 이름을 누르면 상품 상세, 제품군 이름을 누르면 그 제품군 전체
 *  - 옆으로 밀기는 쓰지 않음(색인 탭 넘기기와 겹치지 않게) · 한 줄 조작에 다른 줄은 움직이지 않음
 * 모양: 테이프 붙인 메모 종이 줄(기울기 ±0.8도) · 흰 테 폴라로이드 · 금 · 은 · 동 동그라미 순위 스티커 · 노란 가격표(앱 상품 카드와 같은 결)
 */

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { HOT_PICK_GROUPS, pickHotPickTopThree } from "@/lib/catalog/hot-picks";
import { catalogPriceBadgeLabel } from "@/lib/catalog/price-badge";
import { productPurchaseState, purchaseStateLabel } from "@/lib/catalog/inventory";
import { useLiveInventoryProduct } from "@/lib/catalog/live-inventory";
import { productCardImage } from "@/lib/catalog/card-image";
import { productHref } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import ProductColorImage from "@/components/products/ProductColorImage";
import { haptic } from "../gestures";
import { Tape } from "../sticker-kit";
import { useShopMedia } from "./useShopMedia";

// 순위 스티커 색 — 1위 금 · 2위 은 · 3위 동(웹 핫픽과 같은 색)
const RANK_TONE = [
    { bg: "#f6b73c", fg: "#5a3a00" },
    { bg: "#c9d3de", fg: "#2f3c4a" },
    { bg: "#e7aa84", fg: "#5a2c10" },
];
// 줄마다 테이프 색 · 기울기(±0.8도)
const TAPES = ["rgba(255,200,215,.9)", "rgba(190,224,255,.88)", "rgba(255,232,170,.92)", "rgba(200,240,215,.9)", "rgba(220,205,255,.9)"];
const TILTS = [-0.6, 0.7, -0.8, 0.6, -0.7];

export default function ShopHotPick() {
    // 제품군 5개 · 1~3위 — 웹 메인 핫픽과 같은 함수
    const picks = useMemo(() => HOT_PICK_GROUPS.map((g) => ({ group: g, items: pickHotPickTopThree(g.slug) })), []);
    return (
        <ol className="mt-4 grid gap-4" aria-label="제품군별 핫픽 1~3위">
            {picks.map(({ group, items }, i) => items.length ? <HotPickRow key={group.slug} group={group} items={items} i={i} /> : null)}
        </ol>
    );
}

/** 제품군 한 줄 — 큰 사진 · 이름 · 가격 + 다른 순위 작은 사진(누르면 크게) */
function HotPickRow({ group, items, i }: { group: (typeof HOT_PICK_GROUPS)[number]; items: CatalogProduct[]; i: number }) {
    const { locale, productName, formatPrice } = useI18n();
    const [shown, setShown] = useState(0); // 크게 보이는 순위(0 = 1위)
    const p = useLiveInventoryProduct(items[shown] ?? items[0]); // 판매 상태는 실시간 재고 반영(앱 상품 카드와 같은 훅)
    const media = useShopMedia(); // 사진 주소(네이티브 앱은 운영 사이트 파일) — 준비 전엔 빈 사진 자리
    const name = productName(p);
    const purchase = productPurchaseState(p);
    const rankLabel = (rank: number) => (locale === "en" ? `No.${rank + 1}` : `${rank + 1}위`);
    const big = media ? media(productCardImage(p)) : undefined;

    // 작은 사진 누르기 — 그 순위를 크게(가벼운 진동)
    const promote = (rank: number) => {
        haptic("light");
        setShown(rank);
    };

    return (
        <li className="hp-row relative flex items-center gap-3 bg-white py-3 pl-3 pr-2.5" style={{ rotate: `${TILTS[i % TILTS.length]}deg` }}>
            <Tape className="-top-2 left-7 z-[2] h-3.5 w-11" color={TAPES[i % TAPES.length]} style={{ rotate: `${i % 2 ? 5 : -5}deg` }} />

            {/* 큰 폴라로이드 — 누르면 상품 상세 */}
            <Link href={productHref(p)} onClick={() => haptic("light")} aria-label={`${rankLabel(shown)} ${name}`}
                className="hp-pol relative block w-[5.6rem] shrink-0 bg-white p-1 pb-2">
                <span key={p.id} className="hp-pop relative block aspect-square overflow-hidden rounded-[2px] bg-[#f6efe4]">
                    {big ? <ProductColorImage src={big} alt="" sizes="90px" className="object-contain p-1" /> : null}
                </span>
                {/* 순위 스티커 — 흰 테 동그라미 */}
                <span className="hp-rank ah-display absolute -left-2 -top-2 z-[1] grid h-8 w-8 place-items-center rounded-full text-[11.5px]"
                    style={{ background: RANK_TONE[shown].bg, color: RANK_TONE[shown].fg }}>{rankLabel(shown)}</span>
            </Link>

            {/* 가운데 — 제품군(누르면 제품군 전체) · 이름 · 가격표 */}
            <div className="min-w-0 flex-1">
                <Link href={`/category/${group.slug}`} onClick={() => haptic("light")} className="hp-group inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2">
                    <Image src={group.icon} alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0 object-contain" />
                    <span className="ah-display truncate text-[12.5px]">{locale === "en" ? group.en : group.ko}</span>
                    <i aria-hidden="true" className="fa-solid fa-chevron-right text-[8px] opacity-50" />
                </Link>
                <Link href={productHref(p)} key={p.id} onClick={() => haptic("light")} className="hp-fade mt-1.5 block min-w-0">
                    <span className="ah-light line-clamp-2 block text-[12px] leading-[1.35] text-[#5a4038]">{name}</span>
                    {purchase.purchasable ? (
                        // 가격표 — 앱 상품 카드처럼 위 작은 글씨(가격 이름) · 아래 가격, 둘 다 한 줄
                        <span className="hp-price ah-display relative mt-1.5 inline-flex flex-col items-start whitespace-nowrap py-0.5 pl-3.5 pr-2 leading-tight">
                            <span className="ah-light text-[9.5px]">{catalogPriceBadgeLabel(p.priceBadgeKind, locale)}</span>
                            <span className="text-[14px]">{formatPrice(p.price)}</span>
                        </span>
                    ) : (
                        <span className="ah-display mt-1.5 block text-[11.5px] text-[#c23d6c]">{purchaseStateLabel(purchase, locale)}</span>
                    )}
                </Link>
            </div>

            {/* 다른 순위 작은 폴라로이드 둘 — 누르면 크게 */}
            <div className="flex shrink-0 flex-col gap-2">
                {items.map((item, rank) => rank === shown ? null : (
                    <button key={item.id} type="button" onClick={() => promote(rank)} aria-label={`${rankLabel(rank)} ${productName(item)} 크게 보기`}
                        className="hp-mini relative block w-[2.9rem] bg-white p-[3px] pb-[6px]" style={{ rotate: `${rank % 2 ? 3 : -3}deg` }}>
                        <span className="relative block aspect-square overflow-hidden rounded-[2px] bg-[#f6efe4]">
                            {media && productCardImage(item) ? <ProductColorImage src={media(productCardImage(item))!} alt="" sizes="48px" className="object-contain" /> : null}
                        </span>
                        <span className="hp-mini-no ah-display absolute -bottom-1.5 -left-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px]"
                            style={{ background: RANK_TONE[rank].bg, color: RANK_TONE[rank].fg }}>{rank + 1}</span>
                    </button>
                ))}
            </div>
        </li>
    );
}

export const SHOP_HOTPICK_CSS = `
/* 핫픽 한 줄 — 메모 종이(흰 종이 · 아래 그림자), 누르면 살짝 꾹 */
.hp-row { border-radius: 4px 4px 14px 4px; box-shadow: 0 12px 18px -14px rgba(90,60,50,.55), 0 1px 2px rgba(90,60,50,.12); }
/* 큰 · 작은 폴라로이드 — 흰 테 · 그림자, 누르면 꾹(통 튀는 복귀) */
.hp-pol, .hp-mini { box-shadow: 0 7px 12px -7px rgba(90,60,50,.55), 0 1px 2px rgba(90,60,50,.14); -webkit-tap-highlight-color: transparent; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.hp-pol:active { transform: scale(.95); }
.hp-mini:active { transform: scale(.88) rotate(-4deg); }
/* 순위 스티커 — 흰 테 · 살짝 기울기 */
.hp-rank { box-shadow: 0 0 0 2.5px #fff, 0 5px 8px -4px rgba(90,60,50,.45); rotate: -8deg; }
.hp-mini-no { box-shadow: 0 0 0 2px #fff; }
/* 제품군 이름표 — 연한 크림 알약, 누르면 꾹 */
.hp-group { background: #fff6e6; color: #5a4038; box-shadow: inset 0 0 0 1.5px #f3e2c8; -webkit-tap-highlight-color: transparent; transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.hp-group:active { transform: scale(.95); }
/* 가격표 — 앱 상품 카드와 같은 노란 꼬리표 */
.hp-price { background: #fff3a6; color: #6b4708; border-radius: 3px 6px 6px 3px; clip-path: polygon(9px 0, 100% 0, 100% 100%, 9px 100%, 0 50%); }
.hp-price::before { content: ""; position: absolute; left: 6px; top: 50%; width: 4px; height: 4px; margin-top: -2px; border-radius: 999px; background: #fff; box-shadow: inset 0 0 0 1px rgba(170,120,40,.35); }
/* 순위 바꿀 때 — 큰 사진은 통 튀어 오르고 이름 · 가격은 살짝 떠오름 */
.hp-pop { animation: hp-pop .42s cubic-bezier(.3,1.5,.5,1); }
.hp-fade { animation: hp-fade .3s ease-out; }
@keyframes hp-pop { from { transform: scale(.82) rotate(-3deg); opacity: .4; } to { transform: none; opacity: 1; } }
@keyframes hp-fade { from { transform: translateY(4px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .hp-pop, .hp-fade { animation: none; } }
`;
