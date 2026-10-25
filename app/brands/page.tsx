import Link from "next/link";
import type { Metadata } from "next";
import { CATALOG, CATEGORY_LABEL, listBrands } from "@/lib/catalog";
import { productCardImage } from "@/lib/catalog/card-image";
import { CATEGORY_ORDER } from "@/lib/shop";
// 웹 브랜드 목록(2026-10-25 사용자 "나열만 한 느낌") — 맨 끝에 두고 웹에서만 보임(앱은 아래 기존 목록 그대로)
import BrandsWebHub, { type BrandHubItem } from "@/components/brands/BrandsWebHub";
// 웹 쇼핑 화면 크레파스 머리 · 타일 꾸밈(2026-10-24, data-shop-web 이름표만 · 앱은 닿지 않음)
import "../shop-pages-web.css";
// 브랜드 로고 판 색 — 브랜드 상세 웹 머리 판과 같이 쓰려고 lib 로 옮김(값 그대로, 2026-10-25)
import { brandStyle } from "@/lib/brand-visual";

export const metadata: Metadata = {
    title: "브랜드 | 댕다방",
    description: "댕다방 입점 브랜드",
};

/** 대표 브랜드 한 줄 소개(상품 많은 세 곳) — 나머지는 주로 파는 분류로 소개 */
const BRAND_TAGLINE: Record<string, string> = {
    ruffwear: "활동견을 위한 프리미엄 아웃도어 기어",
    "rex-specs": "강아지 눈 · 귀를 지키는 보호 아이웨어",
    yora: "곤충 단백질로 만든 사료 · 간식",
};

/** 웹 브랜드 목록 자료 — 브랜드마다 분류별 상품 수 · 대표 상품 사진(카드 사진) */
function buildHub(brands: ReturnType<typeof listBrands>): BrandHubItem[] {
    return brands.map((brand) => {
        const products = CATALOG.filter((product) => product.brandSlug === brand.slug);
        const categories = CATEGORY_ORDER
            .map((slug) => ({ slug, label: CATEGORY_LABEL[slug], count: products.filter((product) => product.category === slug).length }))
            .filter((item) => item.count > 0)
            .sort((a, b) => b.count - a.count);
        const thumbs = [...new Set(products.map((product) => productCardImage(product) ?? product.image).filter((src): src is string => Boolean(src)))].slice(0, 4);
        return { slug: brand.slug, ko: brand.ko, en: brand.en, count: brand.count, visual: brandStyle(brand.slug, brand.en), tagline: BRAND_TAGLINE[brand.slug], categories, thumbs };
    });
}

export default function BrandsPage() {
    const brands = listBrands();
    const hub = buildHub(brands);
    const categoryTabs = CATEGORY_ORDER.filter((slug) => hub.some((brand) => brand.categories.some((category) => category.slug === slug))).map((slug) => ({ slug, label: CATEGORY_LABEL[slug] }));

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6" data-shop-web="brands">
            <p className="text-sm font-black text-indigo-700">BRANDS</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">브랜드</h1>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {brands.map((brand) => {
                    const visual = brandStyle(brand.slug, brand.en);
                    return (
                        <Link
                            key={brand.slug}
                            href={`/brand/${brand.slug}`}
                            className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border text-center shadow-inner"
                                    style={{ background: visual.bg, borderColor: `${visual.line}55`, color: visual.fg }}
                                >
                                    <span className="max-w-[5.5rem] text-[11px] font-black uppercase leading-tight tracking-[0.12em]">
                                        {visual.label ?? brand.en}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-lg font-black text-neutral-950">{brand.ko || brand.en}</h2>
                                    <p className="mt-1 truncate text-xs font-black uppercase text-neutral-500">{brand.en}</p>
                                </div>
                                <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 px-2 text-sm font-black text-neutral-700 transition group-hover:bg-neutral-950 group-hover:text-white">
                                    {brand.count}
                                </span>
                            </div>
                            <span
                                className="absolute inset-x-4 bottom-0 h-0.5 origin-left scale-x-0 rounded-full transition group-hover:scale-x-100"
                                style={{ background: visual.line }}
                            />
                        </Link>
                    );
                })}
            </div>
            <BrandsWebHub brands={hub} productTotal={CATALOG.length} categoryTabs={categoryTabs} />
        </main>
    );
}
