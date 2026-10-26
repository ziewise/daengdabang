import type { Metadata } from "next";
import { CATALOG, applySort } from "@/lib/catalog";
import LocalizedText from "@/components/i18n/LocalizedText";
import ProductCard from "@/components/products/ProductCard";
// 웹 머리 판 · 후기 한마디(2026-10-25) — 맨 끝에 두고 웹에서만 CSS 로 위에 보임(앱 첫 문단 구조 그대로)
import ReviewsWebHero from "@/components/reviews/ReviewsWebHero";

const SOURCE_NOTE_KO = "출처: 네이버 댕다방 스토어(판매자 (주)내츄럴랩스). 이 사이트에서 직접 구매한 후기와는 따로 보여 드립니다. 수집 당시 수치이며 상품별 원문을 확인할 수 있습니다.";

export const metadata: Metadata = {
    title: "네이버 댕다방 스토어 후기 | 댕다방",
    description: "출처가 표시된 네이버 댕다방 스토어 상품 후기",
};

export default function ReviewsPage() {
    const products = applySort(CATALOG.filter((product) => (product.externalReviewCount ?? 0) > 0), "reviewDesc").slice(0, 40);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6" data-reviews-web>
            <p className="text-sm font-black text-indigo-700">REVIEWS</p>
            <LocalizedText
                as="h1"
                ko="네이버 댕다방 스토어 후기 많은 상품"
                en="Products reviewed at external stores"
                className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl"
            />
            <LocalizedText as="p" ko={SOURCE_NOTE_KO} en="Source: Naver Daengdabang store (seller: Natural Labs). Shown separately from purchases made on this site. Counts reflect the collected source data." className="mt-3 text-sm leading-6 text-neutral-600" />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
            <ReviewsWebHero products={products} sourceNote={SOURCE_NOTE_KO} />
        </main>
    );
}
