import type { Metadata } from "next";
import { getNewProducts } from "@/lib/catalog";
import LocalizedText from "@/components/i18n/LocalizedText";
import PaginatedProductGrid from "@/components/products/PaginatedProductGrid";
// 웹 쇼핑 화면 크레파스 머리 · 타일 꾸밈(2026-10-24, data-shop-web 이름표만 · 앱은 닿지 않음)
import "../shop-pages-web.css";

export const metadata: Metadata = {
    title: "신상품 | 댕다방",
    description: "댕다방 신상품",
};

export default function NewPage() {
    const products = getNewProducts(36);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6" data-shop-web="new">
            <p className="text-sm font-black text-indigo-700">NEW</p>
            <LocalizedText
                as="h1"
                ko="신상품"
                en="New Arrivals"
                className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl"
            />
            <div className="mt-6">
                {/* 30개씩 페이지네이션 (36개 → 2페이지) */}
                <PaginatedProductGrid products={products} />
            </div>
        </main>
    );
}
