/**
 * /brand/[slug] — 브랜드별 상품 페이지
 * ---------------------------------------------------------------------
 * slug: ruffwear, rex-specs, 등 catalog 의 brandSlug
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { byBrand, listBrands } from "@/lib/catalog";
import BrandClient from "./BrandClient";

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * 정적 export — 카탈로그의 모든 브랜드 slug 미리 생성 (약 32개).
 * out/brand/{slug}/index.html 형태로 산출됨.
 */
export function generateStaticParams() {
    return listBrands().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const brand = listBrands().find((b) => b.slug === slug);
    if (!brand) return { title: "브랜드" };
    return {
        title: brand.en || brand.ko,
        description: `${brand.ko} (${brand.en}) 의 상품 모음 — ${brand.count}개`,
    };
}

export default async function BrandPage({ params }: PageProps) {
    const { slug } = await params;
    const products = byBrand(slug);
    if (products.length === 0) {
        notFound();
    }
    return (
        <Suspense>
            <BrandClient slug={slug} />
        </Suspense>
    );
}
