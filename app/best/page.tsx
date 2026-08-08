import type { Metadata } from "next";
import { getBestProducts } from "@/lib/catalog";
import LocalizedText from "@/components/i18n/LocalizedText";
import PaginatedProductGrid from "@/components/products/PaginatedProductGrid";

export const metadata: Metadata = {
    title: "추천 셀렉트 | 댕다방",
    description: "상품 용도와 브랜드 구성을 살펴 고른 댕다방 편집 추천",
    alternates: { canonical: "/best/" },
    openGraph: {
        title: "추천 셀렉트 | 댕다방",
        description: "상품 용도와 브랜드 구성을 살펴 고른 댕다방 편집 추천",
        url: "/best/",
    },
};

export default function BestPage() {
    const products = getBestProducts(30);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">CURATED PICKS</p>
            <LocalizedText
                as="h1"
                ko="댕다방 추천 셀렉트"
                en="DaengDaBang Curated Picks"
                className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl"
            />
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">상품 용도와 브랜드 구성을 기준으로 고른 탐색용 목록이며, 판매량 순위가 아닙니다.</p>
            <div className="mt-6">
                <PaginatedProductGrid products={products} />
            </div>
        </main>
    );
}
