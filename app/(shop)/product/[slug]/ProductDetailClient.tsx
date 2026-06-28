"use client";

import { useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import ProductGallery from "@/components/products/detail/ProductGallery";
import ProductInfo from "@/components/products/detail/ProductInfo";
import ProductTabs from "@/components/products/detail/ProductTabs";
import PetTryOnPreview from "@/components/products/detail/PetTryOnPreview";
import RelatedProducts from "@/components/products/detail/RelatedProducts";

interface Props {
    product: CatalogProduct;
}

export default function ProductDetailClient({ product }: Props) {
    // 색상 변형 선택 상태 — 갤러리(이미지 교체)와 구매정보(칩·옵션)가 공유하도록 부모에서 관리
    // 색상 미선택(null)으로 시작 → 진입 시 좌측 갤러리는 대표 메인 이미지. 칩 클릭 시 그 색상으로 교체
    const [colorIdx, setColorIdx] = useState<number | null>(null);
    const colorImage = colorIdx != null ? product.colors?.[colorIdx]?.image : undefined;
    return (
        <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-6 md:py-10">
            <section className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
                <div className="lg:sticky lg:top-[calc(var(--header-height)+24px)] lg:self-start">
                    <ProductGallery product={product} colorImage={colorImage} />
                </div>
                <ProductInfo product={product} colorIdx={colorIdx} onColorChange={setColorIdx} />
            </section>

            <PetTryOnPreview product={product} />
            <ProductTabs product={product} />
            <RelatedProducts product={product} />
        </main>
    );
}
