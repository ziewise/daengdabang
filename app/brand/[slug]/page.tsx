import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { byBrand, listBrands } from "@/lib/catalog";
import PaginatedProductGrid from "@/components/products/PaginatedProductGrid";
// 웹 머리 판(2026-10-25) — 맨 끝에 두고 웹에서만 CSS 로 위에 보임(앱 첫 문단 구조 그대로)
import CollectionWebHero from "@/components/products/CollectionWebHero";
import { brandStyle } from "@/lib/brand-visual";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return listBrands().map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const brand = listBrands().find((item) => item.slug === slug);
    return {
        title: `${brand?.ko || brand?.en || "브랜드"} | 댕다방`,
    };
}

export default async function BrandPage({ params }: PageProps) {
    const { slug } = await params;
    const brand = listBrands().find((item) => item.slug === slug);
    const products = byBrand(slug);

    if (!brand || products.length === 0) notFound();

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6" data-collection-web="brand">
            <p className="text-sm font-black uppercase text-indigo-700">{brand.en}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">{brand.ko || brand.en}</h1>
            <div className="mt-6">
                {/* 브랜드 상품 30개씩 페이지네이션 (30 넘으면 자동) */}
                <PaginatedProductGrid products={products} />
            </div>
            <CollectionWebHero
                kicker={brand.en.toUpperCase()}
                title={brand.ko || brand.en}
                lead={`${brand.ko || brand.en}의 상품 ${products.length}개를 한곳에 모았어요. 마음에 드는 상품을 눌러 자세히 살펴보세요.`}
                tone="sky"
                products={products}
                brand={{ visual: brandStyle(brand.slug, brand.en), en: brand.en }}
                others={{
                    title: "다른 브랜드",
                    items: listBrands().filter((item) => item.slug !== brand.slug).slice(0, 8).map((item) => ({ href: `/brand/${item.slug}`, label: item.ko || item.en, count: item.count })),
                    allHref: "/brands",
                    allLabel: "전체 브랜드",
                }}
            />
        </main>
    );
}
