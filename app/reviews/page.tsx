import type { Metadata } from "next";
import { CATALOG, applySort } from "@/lib/catalog";
import LocalizedText from "@/components/i18n/LocalizedText";
import ProductCard from "@/components/products/ProductCard";

export const metadata: Metadata = {
    title: "외부 판매점 후기 | 댕다방",
    description: "출처가 표시된 외부 네이버 판매점 상품 후기",
};

export default function ReviewsPage() {
    const products = applySort(CATALOG.filter((product) => (product.externalReviewCount ?? 0) > 0), "reviewDesc").slice(0, 40);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">REVIEWS</p>
            <LocalizedText
                as="h1"
                ko="외부 판매점 후기 많은 상품"
                en="Products reviewed at external stores"
                className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl"
            />
            <LocalizedText as="p" ko="출처: (주)내츄럴랩스의 네이버 daengdabang 스토어. 자사몰 및 운영 네이버 daengdabangmall의 구매 후기가 아닙니다. 수집 당시 수치이며 상품별 원문을 확인할 수 있습니다." en="Source: Natural Labs' Naver daengdabang store. These are separate from purchases at this site or daengdabangmall. Counts reflect the collected source data." className="mt-3 text-sm leading-6 text-neutral-600" />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </main>
    );
}
