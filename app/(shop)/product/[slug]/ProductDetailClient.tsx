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
        <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-6 md:py-10">
            <section className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
                <div className="lg:sticky lg:top-[calc(var(--header-height)+24px)] lg:self-start">
                    <ProductGallery product={product} />
                </div>
                <ProductInfo product={product} />
            </section>

            <ProductTabs product={product} />
            <RelatedProducts product={product} />
        </main>
    );
}
