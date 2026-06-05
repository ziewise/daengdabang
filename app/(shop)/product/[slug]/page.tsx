/**
 * /product/[slug] — 상품 상세 페이지
 * ---------------------------------------------------------------------
 * slug: folder_name (예: rw_notarock) 또는 fallback id (p_57)
 *
 * 정적 export — 빌드 시점에 333개 상세 페이지 미리 생성.
 * 각 상품 = 카탈로그 데이터 + (있으면) details[]/gallery/sizeImage/video
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOG, formatKRW } from "@/lib/catalog";
import ProductDetailClient from "./ProductDetailClient";

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * 빌드 시점에 333개 슬러그 미리 생성.
 * - folder 있는 모든 상품: /product/{folder}
 * - folder 없는 fallback: /product/p_{no}  (현재 0건, 미래 대비)
 */
export function generateStaticParams() {
    const params: { slug: string }[] = [];
    for (const p of CATALOG) {
        if (p.folder) params.push({ slug: p.folder });
        else params.push({ slug: p.id });
    }
    return params;
}

/** slug 로 카탈로그 항목 찾기 — folder 또는 id 매칭 */
function findProductBySlug(slug: string) {
    return CATALOG.find((p) => p.folder === slug || p.id === slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const product = findProductBySlug(slug);
    if (!product) return { title: "상품" };
    const priceText = product.price > 0 ? ` · ${formatKRW(product.price)}원` : "";
    return {
        title: `${product.name}${priceText}`,
        description: `${product.brandKo}의 ${product.name} — 댕다방에서 만나보세요.`,
    };
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const product = findProductBySlug(slug);
    if (!product) notFound();
    return <ProductDetailClient product={product} />;
}
