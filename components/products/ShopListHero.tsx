/**
 * ShopListHero — 웹 상품 목록(전체상품 · 제품군 페이지) 머리 판 · 카테고리 칸 · 세부 알약 · 2026-10-25
 * ---------------------------------------------------------------------
 * 검색 결과 페이지(/search)의 머리 판과 같은 "파스텔 쿠션" 결로 상품 목록 위를 꾸밈.
 *  ① 머리 판: 제품군마다 다른 파스텔(전체 분홍 · 산책 민트 · 먹거리 노랑 · 생활 하늘 · 장난감 분홍 · 케어 연보라) ·
 *     영문 손글씨 꼬리표 · 주아 제목 + 세 색 밑줄 · 한 줄 소개 · 상품 수 · 브랜드 수 흰 알약 · 오른쪽 큰 3D 그림
 *  ② 카테고리 칸: 전체 + 제품군 다섯(3D 그림 · 이름 · 개수). 전체상품은 고르면 이 화면에서 바로 거름(기존 setCategory),
 *     제품군 페이지는 각 제품군 페이지로 이동(기존 주소)
 *  ③ 세부 알약: 제품군을 골랐을 때 세부 카테고리(개수) — 기존 setSubcategory
 * 웹 전용(앱은 CSS 로 숨김 — app/shop-list-web.css). 값 · 거르는 함수는 ProductsClient 것을 그대로 받음.
 */
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CATALOG, CATEGORY_LABEL, SUBCAT_TO_CAT, SUBCATEGORY_LABEL, type CategorySlug, type SubcategorySlug } from "@/lib/catalog";
import { CATEGORY_ORDER } from "@/lib/shop";

const UI = "/images/ui/";

/** 제품군별 머리 판 — 꼬리표 · 소개 · 색 · 그림 */
const LOOK: Record<CategorySlug | "all", { kicker: string; lead: string; tone: string; art: string }> = {
    all: { kicker: "DAENGDABANG SHOP", lead: "산책부터 간식 · 장난감 · 케어까지, 우리 아이 하루에 꼭 맞는 상품을 모았어요.", tone: "pink", art: "shop-menu-all-128.webp" },
    outdoor: { kicker: "WALK & OUTDOOR", lead: "매일 걷는 길이 더 즐겁고 안전하게. 하네스 · 리드줄 · 산책 용품이에요.", tone: "mint", art: "hotpick-outdoor-128.webp" },
    food: { kicker: "FOOD & TREATS", lead: "건강하게 먹고 맛있게 씹는 시간. 사료 · 간식 · 영양 보조제를 모았어요.", tone: "yellow", art: "hotpick-food-128.webp" },
    life: { kicker: "HOME & LIFE", lead: "집에서 보내는 시간이 포근하도록. 쿠션 · 식기 · 생활용품이에요.", tone: "sky", art: "hotpick-life-128.webp" },
    toy: { kicker: "PLAY TIME", lead: "물고 당기고 던지며 신나게. 튼튼한 장난감으로 에너지를 풀어 줘요.", tone: "pink", art: "hotpick-toy-128.webp" },
    care: { kicker: "CARE", lead: "빗질부터 목욕까지 매일의 돌봄. 위생 · 미용 · 케어 용품이에요.", tone: "lav", art: "hotpick-care-128.webp" },
};

/** 카테고리 칸 그림(전체 + 제품군) */
const TILE_ART: Record<CategorySlug | "all", string> = {
    all: "shop-menu-all-128.webp",
    outdoor: "hotpick-outdoor-128.webp",
    food: "hotpick-food-128.webp",
    life: "hotpick-life-128.webp",
    toy: "hotpick-toy-128.webp",
    care: "hotpick-care-128.webp",
};

type Props = {
    /** 제품군 페이지면 그 제품군(없으면 전체상품) */
    pageCategory?: CategorySlug;
    /** 지금 고른 제품군(전체상품에서 칸을 누르면 바뀜) */
    category: CategorySlug | "all";
    subcategory: SubcategorySlug | "all";
    title: string;
    /** 지금 보이는 상품 수(검색 · 거름 반영) */
    visibleCount: number;
    categoryLabel: (slug: CategorySlug, fallback: string) => string;
    subcategoryLabel: (slug: SubcategorySlug, fallback: string) => string;
    onCategory: (value: CategorySlug | "all") => void;
    onSubcategory: (value: SubcategorySlug | "all") => void;
};

export default function ShopListHero({ pageCategory, category, subcategory, title, visibleCount, categoryLabel, subcategoryLabel, onCategory, onSubcategory }: Props) {
    const look = LOOK[pageCategory ?? category];
    // 제품군 · 세부별 상품 수, 브랜드 수(카탈로그 기준)
    const counts = useMemo(() => {
        const byCategory: Record<string, number> = { all: CATALOG.length };
        const bySub: Record<string, number> = {};
        for (const product of CATALOG) {
            byCategory[product.category] = (byCategory[product.category] ?? 0) + 1;
            if (product.subcategory) bySub[product.subcategory] = (bySub[product.subcategory] ?? 0) + 1;
        }
        return { byCategory, bySub };
    }, []);
    const scope = pageCategory ?? category;
    const brandCount = useMemo(() => {
        const list = scope === "all" ? CATALOG : CATALOG.filter((product) => product.category === scope);
        return new Set(list.map((product) => product.brandSlug).filter(Boolean)).size;
    }, [scope]);
    // 전체상품에서 제품군 칸을 고르면 제목도 그 제품군 이름으로
    const displayTitle = !pageCategory && category !== "all" ? categoryLabel(category, CATEGORY_LABEL[category]) : title;
    const subs = scope === "all"
        ? []
        : (Object.keys(SUBCATEGORY_LABEL) as SubcategorySlug[]).filter((slug) => SUBCAT_TO_CAT[slug] === scope && (counts.bySub[slug] ?? 0) > 0);

    return (
        <div className="pl-top" data-pl-hero>
            {/* ① 머리 판 */}
            <section className="pl-hero" data-tone={look.tone} aria-labelledby="pl-hero-title">
                <span className="pl-hero-text">
                    <span className="pl-kicker">{look.kicker}</span>
                    <h1 id="pl-hero-title" className="pl-title">{displayTitle}</h1>
                    <p className="pl-lead">{look.lead}</p>
                    <span className="pl-stats">
                        <span><i className="fa-solid fa-box-open" aria-hidden="true" />상품 <b>{visibleCount.toLocaleString("ko-KR")}</b>개</span>
                        {brandCount > 0 && <span><i className="fa-solid fa-tag" aria-hidden="true" />브랜드 <b>{brandCount}</b>곳</span>}
                    </span>
                </span>
                <span className="pl-hero-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}${look.art}`} alt="" />
                </span>
            </section>

            {/* ② 카테고리 칸 — 전체 + 제품군 다섯 */}
            <nav className="pl-cats" aria-label="카테고리">
                {(["all", ...CATEGORY_ORDER] as Array<CategorySlug | "all">).map((slug) => {
                    const on = pageCategory ? slug === pageCategory : slug === category;
                    const label = slug === "all" ? "전체" : categoryLabel(slug, CATEGORY_LABEL[slug]);
                    const inner = (
                        <>
                            <span className="pl-cat-art" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                <img src={`${UI}${TILE_ART[slug]}`} alt="" />
                            </span>
                            <b>{label}</b>
                            <small>{(counts.byCategory[slug] ?? 0).toLocaleString("ko-KR")}개</small>
                        </>
                    );
                    // 제품군 페이지 — 다른 제품군 페이지로(전체는 전체상품)
                    if (pageCategory) {
                        return (
                            <Link key={slug} href={slug === "all" ? "/products" : `/category/${slug}`} className={`pl-cat${on ? " is-on" : ""}`} data-cat={slug} aria-current={on ? "page" : undefined}>
                                {inner}
                            </Link>
                        );
                    }
                    // 전체상품 — 이 화면에서 바로 거름
                    return (
                        <button key={slug} type="button" className={`pl-cat${on ? " is-on" : ""}`} data-cat={slug} aria-pressed={on} onClick={() => onCategory(slug)}>
                            {inner}
                        </button>
                    );
                })}
            </nav>

            {/* ③ 세부 알약 — 제품군을 골랐을 때 */}
            {subs.length > 0 && (
                <div className="pl-subs" role="group" aria-label="세부 카테고리">
                    <button type="button" className={subcategory === "all" ? "is-on" : ""} aria-pressed={subcategory === "all"} onClick={() => onSubcategory("all")}>
                        전체<small>{(counts.byCategory[scope] ?? 0).toLocaleString("ko-KR")}</small>
                    </button>
                    {subs.map((slug) => (
                        <button key={slug} type="button" className={subcategory === slug ? "is-on" : ""} aria-pressed={subcategory === slug} onClick={() => onSubcategory(slug)}>
                            {subcategoryLabel(slug, SUBCATEGORY_LABEL[slug])}<small>{counts.bySub[slug]}</small>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
