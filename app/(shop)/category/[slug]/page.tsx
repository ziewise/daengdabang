/**
 * /category/[slug] — 카테고리별 상품 페이지
 * ---------------------------------------------------------------------
 * slug: outdoor | food | life | toy | care
 *
 * Next.js 16 — params 는 Promise. server 컴포넌트에서 await 으로 풀고
 * Client (CategoryClient) 에 slug 만 전달.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
    CATEGORY_LABEL,
    type CategorySlug,
} from "@/lib/catalog";
import CategoryClient from "./CategoryClient";

const VALID: CategorySlug[] = ["outdoor", "food", "life", "toy", "care"];

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * 정적 export 모드 — 빌드 시점에 5개 카테고리 HTML 미리 생성.
 * out/category/{slug}/index.html 형태로 산출됨.
 */
export function generateStaticParams() {
    return VALID.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (!VALID.includes(slug as CategorySlug)) {
        return { title: "카테고리" };
    }
    const label = CATEGORY_LABEL[slug as CategorySlug];
    return {
        title: label,
        description: `${label} 카테고리 상품 모음`,
    };
}

export default async function CategoryPage({ params }: PageProps) {
    const { slug } = await params;
    if (!VALID.includes(slug as CategorySlug)) {
        notFound();
    }
    return (
        <Suspense>
            <CategoryClient slug={slug as CategorySlug} />
        </Suspense>
    );
}
