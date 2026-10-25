/**
 * BrandsWebHub — 웹 브랜드 목록(/brands) 본문 2차 · 2026-10-25
 * ---------------------------------------------------------------------
 * 사용자: "나열만 한 느낌" → 1차(상품 사진 카드) → "제품까지 보여줄 필요 없어, 브랜드 카드만으로 구조를 색다르게".
 *  - 머리 판: 꼬리표 · "댕다방이 고른 브랜드 N곳"(세 색 밑줄) · 소개 · 브랜드/상품 수 알약 · 고르는 기준 보기 · 3D 그림
 *  - 대표 브랜드 3곳(상품 많은 순): 브랜드 색을 크게 칠한 판 + 큰 영문 이름 · 한글 이름 · 한 줄 소개 · 상품 수
 *  - 분류별 선반: 산책/아웃도어 · 먹거리 · 생활용품 · 장난감 · 케어 — 파스텔 선반 하나에 그 분류가 주력인 브랜드 카드
 *    (브랜드는 상품이 가장 많은 분류 선반 한 곳에만, 대표 3곳은 위에서 보여서 선반에서는 뺌)
 *  - 브랜드 카드: 브랜드 색 로고 판 · 한글 이름 · 상품 수 — 상품 사진 없음
 * 자료는 서버(app/brands/page.tsx)가 상품 목록에서 만들어 넘김. 링크는 기존 브랜드 상세(/brand/[slug]) 그대로.
 * 웹에서만 보임(기본 hidden, app/brands-web.css 가 웹에서 켬) — 앱은 기존 목록 그대로. 상태 없음(서버에서 그림).
 */

import Image from "next/image";
import Link from "next/link";
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
};

type Props = {
    brands: BrandHubItem[];
    productTotal: number;
    categoryTabs: Array<{ slug: string; label: string }>;
};

/** 선반마다 3D 그림 · 파스텔 색 · 한 줄 */
const SHELF: Record<string, { art: string; tone: string; line: string }> = {
    outdoor: { art: "hotpick-outdoor-128.webp", tone: "mint", line: "산책 · 여행 · 아웃도어를 함께하는 브랜드" },
    food: { art: "hotpick-food-128.webp", tone: "yellow", line: "사료 · 간식 · 영양을 고민한 브랜드" },
    life: { art: "hotpick-life-128.webp", tone: "sky", line: "집에서의 하루를 편하게 만드는 브랜드" },
    toy: { art: "hotpick-toy-128.webp", tone: "lav", line: "놀이 시간을 즐겁게 만드는 브랜드" },
    care: { art: "hotpick-care-128.webp", tone: "pink", line: "목욕 · 위생 · 관리를 돕는 브랜드" },
};

export default function BrandsWebHub({ brands, productTotal, categoryTabs }: Props) {
    const featured = brands.slice(0, 3);
    const rest = brands.slice(3);
    // 브랜드마다 상품이 가장 많은 분류 선반 한 곳
    const shelves = categoryTabs
        .map((category) => ({ ...category, brands: rest.filter((brand) => brand.categories[0]?.slug === category.slug) }))
        .filter((shelf) => shelf.brands.length > 0);

    return (
        <div className="bwh hidden" data-brands-web>
            {/* 머리 판 */}
            <header className="bwh-hero">
                <div className="bwh-hero-text">
                    <p className="bwh-kicker">OUR BRANDS</p>
                    <h1>
                        댕다방이 고른 브랜드 <em>{brands.length}곳</em>
                    </h1>
                    <p className="bwh-lead">우리 아이의 하루에 꼭 맞는지 살펴보고 고른 브랜드예요. 무엇을 만드는 브랜드인지 선반별로 모아 두었어요.</p>
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

            {/* 대표 브랜드 — 브랜드 색 큰 판 */}
            <section className="bwh-featured" aria-label="대표 브랜드">
                {featured.map((brand, index) => (
                    <Link
                        key={brand.slug}
                        href={`/brand/${brand.slug}`}
                        className="bwh-feature"
                        style={{ ["--b-bg" as string]: brand.visual.bg, ["--b-fg" as string]: brand.visual.fg, ["--b-line" as string]: brand.visual.line }}
                    >
                        <span className="bwh-feature-rank">BEST {index + 1}</span>
                        <span className="bwh-wordmark">{brand.visual.label ?? brand.en}</span>
                        <span className="bwh-feature-body">
                            <b>{brand.ko || brand.en}</b>
                            {brand.tagline ? <span>{brand.tagline}</span> : null}
                        </span>
                        <span className="bwh-feature-foot">
                            <span className="bwh-count">상품 <b>{brand.count}</b></span>
                            <span className="bwh-arrow" aria-hidden="true"><i className="fa-solid fa-arrow-right" /></span>
                        </span>
                    </Link>
                ))}
            </section>

            {/* 분류별 선반 */}
            {shelves.map((shelf) => {
                const look = SHELF[shelf.slug] ?? SHELF.life;
                return (
                    <section key={shelf.slug} className="bwh-shelf" data-tone={look.tone} aria-labelledby={`bwh-shelf-${shelf.slug}`}>
                        <header className="bwh-shelf-head">
                            <Image src={`/images/ui/${look.art}`} alt="" width={64} height={64} />
                            <span>
                                <h2 id={`bwh-shelf-${shelf.slug}`}>{shelf.label}</h2>
                                <small>{look.line}</small>
                            </span>
                            <b className="bwh-shelf-count">{shelf.brands.length}</b>
                        </header>
                        <ul className="bwh-cards">
                            {shelf.brands.map((brand) => (
                                <li key={brand.slug}>
                                    <Link href={`/brand/${brand.slug}`} className="bwh-card" style={{ ["--b-bg" as string]: brand.visual.bg, ["--b-fg" as string]: brand.visual.fg, ["--b-line" as string]: brand.visual.line }}>
                                        <span className="bwh-card-plate">{brand.visual.label ?? brand.en}</span>
                                        <span className="bwh-card-name">{brand.ko || brand.en}</span>
                                        <span className="bwh-card-count">{brand.count}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}
