import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOG, formatKRW } from "@/lib/catalog";
import { findProduct, productHref } from "@/lib/shop";
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

    const title = `${product.name} | 댕다방`;
    const description = `${product.brandKo || product.brandEn} ${product.name} ${formatKRW(product.price)}원`;
    const image = product.image ? [{ url: product.image, alt: product.name }] : undefined;
    const url = productHref(product);

    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            type: "website",
            title,
            description,
            url,
            images: image,
        },
        twitter: {
            card: product.image ? "summary_large_image" : "summary",
            title,
            description,
            images: product.image ? [product.image] : undefined,
        },
    };
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const product = findProduct(slug);

    if (!product) notFound();

    return <ProductDetailClient product={product} />;
}
