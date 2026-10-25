"use client";

/**
 * BrandsWebHub — 웹 브랜드 목록(/brands) 본문 · 2026-10-25
 * ---------------------------------------------------------------------
 * 사용자: "그냥 나열만 쭈욱 해놓은 느낌" → 웹 크레파스 결로 다시.
 *  - 머리 판: 꼬리표 · "댕다방이 고른 브랜드 N곳"(세 색 밑줄) · 소개 · 브랜드/상품 수 알약 · 3D 그림
 *  - 대표 브랜드 3곳(상품 많은 순): 큰 쿠션 카드 — 로고 판 · 한 줄 소개 · 분류 알약 · 대표 상품 사진 4장 · 브랜드관 가기
 *  - 분류 고르기 알약(전체 · 산책/아웃도어 · 먹거리 …): 그 분류 상품이 있는 브랜드만
 *  - 브랜드 카드: 로고 판 · 이름 · 주로 파는 분류 · 대표 상품 사진 3장 · 상품 수
 * 자료는 서버(app/brands/page.tsx)가 상품 목록에서 만들어 넘김. 링크는 기존 브랜드 상세(/brand/[slug]) 그대로.
 * 웹에서만 보임(기본 hidden, app/brands-web.css 가 웹에서 켬) — 앱은 기존 목록 그대로.
 */

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { BrandVisual } from "@/lib/brand-visual";
import "@/app/brands-web.css";

export type BrandHubItem = {
    slug: string;
    ko: string;
    en: string;
    count: number;
    visual: BrandVisual;
    tagline?: string;
    categories: Array<{ slug: string; label: string; count: number }>;
    thumbs: string[];
};

type Props = {
    brands: BrandHubItem[];
    productTotal: number;
    categoryTabs: Array<{ slug: string; label: string }>;
};

/** 로고 판 — 브랜드 색 바탕 · 영문 글자 */
function LogoPlate({ brand, big = false }: { brand: BrandHubItem; big?: boolean }) {
    return (
        <span className="bwh-logo" data-big={big ? "" : undefined} style={{ background: brand.visual.bg, color: brand.visual.fg, boxShadow: `inset 0 -4px 0 ${brand.visual.line}` }}>
            {brand.visual.label ?? brand.en}
        </span>
    );
}

/** 대표 상품 사진 줄 */
function Thumbs({ brand, max }: { brand: BrandHubItem; max: number }) {
    return (
        <span className="bwh-thumbs" aria-hidden="true">
            {brand.thumbs.slice(0, max).map((src) => (
                <span key={src} className="bwh-thumb">
                    <Image src={src} alt="" fill sizes="96px" className="object-contain" />
                </span>
            ))}
        </span>
    );
}

export default function BrandsWebHub({ brands, productTotal, categoryTabs }: Props) {
    const [tab, setTab] = useState("all");
    const featured = brands.slice(0, 3);
    const list = useMemo(
        () => (tab === "all" ? brands.slice(3) : brands.filter((brand) => brand.categories.some((category) => category.slug === tab))),
        [brands, tab],
    );
    const tabCount = (slug: string) => (slug === "all" ? brands.length : brands.filter((brand) => brand.categories.some((category) => category.slug === slug)).length);

    return (
        <div className="bwh hidden" data-brands-web>
            {/* 머리 판 */}
            <header className="bwh-hero">
                <div className="bwh-hero-text">
                    <p className="bwh-kicker">OUR BRANDS</p>
                    <h1>
                        댕다방이 고른 브랜드 <em>{brands.length}곳</em>
                    </h1>
                    <p className="bwh-lead">우리 아이의 하루에 꼭 맞는지 살펴보고 고른 브랜드예요. 브랜드마다 대표 상품을 바로 둘러보세요.</p>
                    <ul className="bwh-stats">
                        <li><i className="fa-solid fa-tags" aria-hidden="true" /> 브랜드 <b>{brands.length}</b></li>
                        <li><i className="fa-solid fa-box-open" aria-hidden="true" /> 상품 <b>{productTotal}</b></li>
                        <li>
                            <Link href="/brand-story/"><i className="fa-solid fa-heart" aria-hidden="true" /> 고르는 기준 보기</Link>
                        </li>
                    </ul>
                </div>
                <span className="bwh-hero-art" aria-hidden="true">
                    <Image src="/images/ui/shop-menu-brand-128.webp" alt="" width={128} height={128} />
                </span>
            </header>

            {/* 대표 브랜드 */}
            <section className="bwh-featured" aria-label="대표 브랜드">
                {featured.map((brand, index) => (
                    <Link key={brand.slug} href={`/brand/${brand.slug}`} className="bwh-feature" data-pos={index}>
                        <span className="bwh-feature-top">
                            <LogoPlate brand={brand} big />
                            <span className="bwh-feature-rank">BEST {index + 1}</span>
                        </span>
                        <span className="bwh-feature-name">
                            <b>{brand.ko || brand.en}</b>
                            <small>{brand.en}</small>
                        </span>
                        {brand.tagline ? <span className="bwh-feature-line">{brand.tagline}</span> : null}
                        <span className="bwh-cats">
                            {brand.categories.slice(0, 3).map((category) => (
                                <span key={category.slug}>{category.label} <b>{category.count}</b></span>
                            ))}
                        </span>
                        <Thumbs brand={brand} max={4} />
                        <span className="bwh-go">
                            상품 {brand.count}개 보러 가기 <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </span>
                    </Link>
                ))}
            </section>

            {/* 분류 고르기 */}
            <div className="bwh-tabs" role="tablist" aria-label="분류별 브랜드">
                {[{ slug: "all", label: "모든 브랜드" }, ...categoryTabs].map((item) => (
                    <button key={item.slug} type="button" role="tab" aria-selected={tab === item.slug} onClick={() => setTab(item.slug)}>
                        {item.label} <b>{tabCount(item.slug)}</b>
                    </button>
                ))}
            </div>

            {/* 브랜드 카드 */}
            <ul className="bwh-grid" key={tab}>
                {list.map((brand) => (
                    <li key={brand.slug}>
                        <Link href={`/brand/${brand.slug}`} className="bwh-card">
                            <LogoPlate brand={brand} />
                            <span className="bwh-card-name">
                                <b>{brand.ko || brand.en}</b>
                                <small>{brand.en}</small>
                            </span>
                            <span className="bwh-cats is-small">
                                {brand.categories.slice(0, 2).map((category) => (
                                    <span key={category.slug}>{category.label}</span>
                                ))}
                            </span>
                            <Thumbs brand={brand} max={3} />
                            <span className="bwh-card-foot">
                                상품 <b>{brand.count}</b>개 <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
