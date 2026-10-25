/**
 * PromoListClient — 기획전(산책용 · 눈·청력 보호 · 프리미엄 푸드) 본문을 화면 부품이 그림 · 2026-10-26
 * ---------------------------------------------------------------------
 * 배포 묶음 한도(965MB) 때문에: 서버 페이지가 상품 목록 전체를 페이지 파일(RSC)에 담아 기획전 한 장이 2~4MB였음.
 * 시즌 기획전(SeasonPromoClient)처럼 상품은 화면 부품 안에서 CATALOG 로 고르고, 서버는 기획전 이름(slug)만 넘김 → 장당 0.3MB 안팎.
 * 보이는 모양 · 링크 · 상품 고르는 규칙은 그대로(app/promo/[slug]/page.tsx 의 예전 마크업과 같음).
 */
"use client";

import { useMemo } from "react";
import { CATALOG, PROMO_LABEL, byPromo, type PromoSlug } from "@/lib/catalog";
import { walkProducts } from "@/lib/promo-season";
import PaginatedProductGrid from "@/components/products/PaginatedProductGrid";
import CollectionWebHero from "@/components/products/CollectionWebHero";

type Props = {
    slug: PromoSlug;
    /** 웹 머리 판 — 꼬리표 · 제목 · 소개 · 색 · 사진/그림(서버 표에서 고른 값 그대로) */
    look: { kicker: string; title: string; lead: string; tone: "pink" | "sky" | "lav" | "mint" | "yellow"; photo?: string; art?: string };
    /** 다른 기획전 알약(서버에서 만든 목록 그대로) */
    others: { title: string; items: Array<{ href: string; label: string; count?: number }>; allHref: string; allLabel: string };
};

export default function PromoListClient({ slug, look, others }: Props) {
    // 상품 고르기 — 산책용은 lib/promo-season.ts, 나머지는 상품마다 붙은 promos 그대로(서버 때와 같은 규칙)
    const products = useMemo(() => (slug === "walk" ? walkProducts(CATALOG) : byPromo(slug)), [slug]);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6" data-collection-web="promo">
            <p className="text-sm font-black text-indigo-700">PROMO</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">{PROMO_LABEL[slug]}</h1>
            <div className="mt-6">
                {/* 기획전 상품 30개씩 페이지네이션 (30 넘으면 자동) */}
                <PaginatedProductGrid products={products} />
            </div>
            <CollectionWebHero
                kicker={look.kicker}
                title={look.title}
                lead={look.lead}
                tone={look.tone}
                products={products}
                photo={look.photo}
                art={look.art}
                others={others}
            />
        </main>
    );
}
