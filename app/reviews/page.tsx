import type { Metadata } from "next";
import { CATALOG, applySort } from "@/lib/catalog";
import LocalizedText from "@/components/i18n/LocalizedText";
import ProductCard from "@/components/products/ProductCard";

export const metadata: Metadata = {
    title: "리뷰 | 댕다방",
    description: "구매 후기 기반 상품",
};

export default function ReviewsPage() {
    const products = applySort(CATALOG.filter((product) => product.reviewCount > 0), "reviewDesc").slice(0, 40);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">REVIEWS</p>
            <LocalizedText
                as="h1"
                ko="리뷰 많은 상품"
                en="Most Reviewed Products"
                className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl"
            />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </main>
    );
}
