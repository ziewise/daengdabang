/**
 * app/category/[slug]/page.tsx — 제품군 페이지(/category/<제품군>) · 목록 · 필터 · 정렬은 ProductsClient 그대로
 * 2026-10-26 대기 화면(Suspense fallback)에 웹 전용 쿠션 뼈대 — 꾸밈 app/shop-list-web.css(웹에서만), 앱은 기존 한 줄 글
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORY_LABEL, type CategorySlug } from "@/lib/catalog";
import { CATEGORY_ORDER } from "@/lib/shop";
import ProductsClient from "@/app/products/ProductsClient";
// 대기 화면 뼈대 꾸밈(웹 전용) — ProductsClient 도 같은 파일을 부르지만 대기 화면에서 먼저 쓰이도록 여기서도 부름
import "../../shop-list-web.css";

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
        <Suspense fallback={(
            // data-list-fallback — 웹은 글 대신 쿠션 뼈대(app/shop-list-web.css), 앱은 기존 한 줄 글 그대로
            <div className="mx-auto max-w-[1280px] px-4 py-10 text-sm font-black" data-list-fallback>
                <p className="list-fallback-text">상품을 불러오는 중입니다.</p>
                <div className="hidden list-fallback-sk" aria-hidden="true">
                    <span className="is-hero" />
                    {Array.from({ length: 10 }, (_, index) => <span key={index} />)}
                </div>
            </div>
        )}>
            <ProductsClient initialCategory={slug} title={CATEGORY_LABEL[slug]} />
        </Suspense>
    );
}
