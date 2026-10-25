/**
 * SeasonPromoClient — 웹 "시즌 기획전"(/promo/season) 본문 · 2026-10-25
 * ---------------------------------------------------------------------
 * 손님 기기의 오늘 날짜로 계절(봄 3~5 · 여름 6~8 · 가을 9~11 · 겨울 12~2)을 정해 그 계절 상품 · 제목 · 소개 · 사진을 보여 줌.
 * 미리 만든 페이지에는 만든 날의 계절(builtSeason)로 그려 두고, 화면에 붙은 뒤 오늘 날짜로 다시 맞춤 → 배포 없이 계절이 바뀜.
 * 상품 고르기 규칙 · 계절 문구 · 그림: lib/promo-season.ts. 목록 · 머리 판은 다른 기획전과 같은 부품(PaginatedProductGrid · CollectionWebHero).
 */
"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CATALOG } from "@/lib/catalog";
import { SEASONS, seasonOf, seasonProducts, type SeasonKey } from "@/lib/promo-season";
import PaginatedProductGrid from "@/components/products/PaginatedProductGrid";
import CollectionWebHero from "@/components/products/CollectionWebHero";

const noopSubscribe = () => () => {};

type Props = {
    builtSeason: SeasonKey;
    /** 다른 기획전 알약(서버에서 만든 목록 그대로) */
    others: { title: string; items: Array<{ href: string; label: string; count?: number }>; allHref: string; allLabel: string };
};

export default function SeasonPromoClient({ builtSeason, others }: Props) {
    const season = useSyncExternalStore(noopSubscribe, () => seasonOf(), () => builtSeason);
    const look = SEASONS[season];
    const products = useMemo(() => seasonProducts(CATALOG, season), [season]);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6" data-collection-web="promo" data-season={season}>
            <p className="text-sm font-black text-indigo-700">PROMO</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">{look.title}</h1>
            <div className="mt-6">
                <PaginatedProductGrid key={season} products={products} />
            </div>
            <CollectionWebHero
                kicker={look.eyebrow}
                title={`시즌 기획전 · ${look.title}`}
                lead={look.lead}
                tone="pink"
                products={products}
                photo={look.image.mobile}
                others={others}
            />
        </main>
    );
}
