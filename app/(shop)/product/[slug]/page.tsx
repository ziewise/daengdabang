import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOG, formatKRW } from "@/lib/catalog";
import { findProduct } from "@/lib/shop";
import ProductDetailClient from "./ProductDetailClient";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return CATALOG.map((product) => ({ slug: product.folder || product.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const product = findProduct(slug);

    if (!product) return { title: "상품 | 댕다방" };

    return {
        title: `${product.name} | 댕다방`,
        description: `${product.brandKo} ${product.name} ${formatKRW(product.price)}원`,
    };
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const product = findProduct(slug);

    if (!product) notFound();

    return <ProductDetailClient product={product} />;
}
