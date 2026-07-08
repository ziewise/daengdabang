import type { Metadata } from "next";
import { getBestProducts } from "@/lib/catalog";
import LocalizedText from "@/components/i18n/LocalizedText";
import PaginatedProductGrid from "@/components/products/PaginatedProductGrid";

export const metadata: Metadata = {
    title: "베스트 | 댕다방",
    description: "댕다방 인기 상품",
};

export default function BestPage() {
    const products = getBestProducts(30);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">BEST</p>
            <LocalizedText
                as="h1"
                ko="베스트 상품"
                en="Best Sellers"
                className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl"
            />
            <div className="mt-6">
                {/* 30개씩 페이지네이션 + 순위 표시(showRank) */}
                <PaginatedProductGrid products={products} showRank />
            </div>
        </main>
    );
}
