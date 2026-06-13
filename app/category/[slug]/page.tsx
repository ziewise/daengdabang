import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORY_LABEL, type CategorySlug } from "@/lib/catalog";
import { CATEGORY_ORDER } from "@/lib/shop";
import ProductsClient from "@/app/products/ProductsClient";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return CATEGORY_ORDER.map((slug) => ({ slug }));
}

function isCategory(slug: string): slug is CategorySlug {
    return CATEGORY_ORDER.includes(slug as CategorySlug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (!isCategory(slug)) return { title: "카테고리 | 댕다방" };
    return {
        title: `${CATEGORY_LABEL[slug]} | 댕다방`,
        description: `${CATEGORY_LABEL[slug]} 카테고리 상품`,
    };
}

export default async function CategoryPage({ params }: PageProps) {
    const { slug } = await params;
    if (!isCategory(slug)) notFound();

    return (
        <Suspense fallback={<div className="mx-auto max-w-[1280px] px-4 py-10 text-sm font-black">상품을 불러오는 중입니다.</div>}>
            <ProductsClient initialCategory={slug} title={CATEGORY_LABEL[slug]} />
        </Suspense>
    );
}
