/**
 * ProductDetailClient — 상세 페이지 메인 클라이언트
 * ---------------------------------------------------------------------
 * 상단(2-col): 갤러리 + 상품 정보
 * 가운데: 탭 (상세정보 / 리뷰 / Q&A)
 * 하단: 관련 상품
 */
"use client";

import type { CatalogProduct } from "@/lib/catalog";
import ProductGallery from "@/components/products/detail/ProductGallery";
import ProductInfo from "@/components/products/detail/ProductInfo";
import ProductTabs from "@/components/products/detail/ProductTabs";
import RelatedProducts from "@/components/products/detail/RelatedProducts";

interface Props {
    product: CatalogProduct;
}

export default function ProductDetailClient({ product }: Props) {
    return (
        <main className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 md:py-10">
            {/* 상단 — 2단 레이아웃 (lg+) */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 lg:gap-14">
                {/* 좌 — 갤러리 */}
                <div className="lg:sticky lg:top-[calc(var(--header-height)+24px)] lg:self-start">
                    <ProductGallery product={product} />
                </div>
                {/* 우 — 정보 */}
                <div>
                    <ProductInfo product={product} />
                </div>
            </section>

            {/* 가운데 — 탭 */}
            <ProductTabs product={product} />

            {/* 하단 — 관련 상품 */}
            <RelatedProducts product={product} />
        </main>
    );
}
