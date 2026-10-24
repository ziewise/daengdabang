/**
 * CollectionWebHero — 웹 브랜드 상세(/brand/[slug]) · 기획전(/promo/[slug]) 머리 판 · 2026-10-25
 * ---------------------------------------------------------------------
 * 페이지 맨 끝에 두고 웹에서만 CSS 로 맨 위에 보이게 함(앱 겉모양이 쓰는 "첫 문단 숨김" 구조를 건드리지 않으려고).
 *  - 파스텔 쿠션 머리 판: 손글씨 꼬리표 · 주아 제목 + 세 색 밑줄 · 소개 · 상품/카테고리 수 알약
 *    오른쪽: 브랜드는 브랜드 색 로고 판(브랜드 목록과 같은 값), 기획전은 기획전 사진(있으면) 또는 3D 그림
 *  - 구성 알약: 이 묶음의 제품군별 개수(제품군 페이지로)
 *  - 다른 묶음: 브랜드는 다른 브랜드 · 전체 브랜드, 기획전은 다른 기획전 · 세트 기획전
 *  - 아래 목록 머리(상품 · 개수)
 * 서버에서 그림(상태 없음). 상품 목록 · 페이지 넘김은 각 페이지 그대로.
 */
import Link from "next/link";
import type { CatalogProduct, CategorySlug } from "@/lib/catalog";
import { CATEGORY_LABEL } from "@/lib/catalog";
import { CATEGORY_ORDER } from "@/lib/shop";
import type { BrandVisual } from "@/lib/brand-visual";
import "@/app/collection-web.css";

const UI = "/images/ui/";

const CAT_ART: Record<CategorySlug, string> = {
    outdoor: "hotpick-outdoor-128.webp",
    food: "hotpick-food-128.webp",
    life: "hotpick-life-128.webp",
    toy: "hotpick-toy-128.webp",
    care: "hotpick-care-128.webp",
};

type Props = {
    kicker: string;
    title: string;
    lead: string;
    tone: "pink" | "sky" | "lav" | "mint" | "yellow";
    products: CatalogProduct[];
    /** 브랜드 로고 판(브랜드 상세) */
    brand?: { visual: BrandVisual; en: string };
    /** 기획전 사진(public 경로) */
    photo?: string;
    /** 사진 · 로고가 없을 때 3D 그림 */
    art?: string;
    /** 다른 묶음 알약 */
    others: { title: string; items: Array<{ href: string; label: string; count?: number }>; allHref: string; allLabel: string };
};

export default function CollectionWebHero({ kicker, title, lead, tone, products, brand, photo, art, others }: Props) {
    // 제품군별 개수
    const byCategory = CATEGORY_ORDER
        .map((slug) => ({ slug, count: products.filter((product) => product.category === slug).length }))
        .filter((item) => item.count > 0);

    return (
        <div className="cw-top" data-collection-hero>
            <header className="cw-hero" data-tone={tone}>
                <span className="cw-hero-text">
                    <span className="cw-kicker">{kicker}</span>
                    <h1 className="cw-title">{title}</h1>
                    <p className="cw-lead">{lead}</p>
                    <span className="cw-stats">
                        <span><i className="fa-solid fa-box-open" aria-hidden="true" />상품 <b>{products.length}</b>개</span>
                        {byCategory.length > 1 && <span><i className="fa-solid fa-layer-group" aria-hidden="true" />제품군 <b>{byCategory.length}</b>가지</span>}
                    </span>
                </span>
                {brand ? (
                    <span className="cw-plate" style={{ background: brand.visual.bg, color: brand.visual.fg, boxShadow: `inset 0 0 0 2px ${brand.visual.line}66, 0 22px 34px -24px rgb(15 23 42 / 45%)` }} aria-hidden="true">
                        <b>{brand.visual.label ?? brand.en}</b>
                        <i style={{ background: brand.visual.line }} />
                    </span>
                ) : photo ? (
                    <span className="cw-photo" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 기획전 사진 */}
                        <img src={photo} alt="" />
                    </span>
                ) : (
                    <span className="cw-art" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}${art ?? "shop-menu-hotpick-128.webp"}`} alt="" />
                    </span>
                )}
            </header>

            {byCategory.length > 0 && (
                <nav className="cw-cats" aria-label="구성">
                    {byCategory.map(({ slug, count }) => (
                        <Link key={slug} href={`/category/${slug}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}${CAT_ART[slug]}`} alt="" aria-hidden="true" />
                            {CATEGORY_LABEL[slug]}<small>{count}</small>
                        </Link>
                    ))}
                </nav>
            )}

            {others.items.length > 0 && (
                <nav className="cw-others" aria-label={others.title}>
                    <span className="cw-others-t">{others.title}</span>
                    {others.items.map((item) => (
                        <Link key={item.href} href={item.href}>{item.label}{typeof item.count === "number" && <small>{item.count}</small>}</Link>
                    ))}
                    <Link href={others.allHref} className="is-all">{others.allLabel}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                </nav>
            )}

            <div className="cw-list-h">
                <span aria-hidden="true"><i className="fa-solid fa-paw" /></span>
                <h2>상품</h2>
                <em>{products.length}개</em>
            </div>
        </div>
    );
}
