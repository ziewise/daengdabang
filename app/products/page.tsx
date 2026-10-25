/**
 * app/products/page.tsx — 전체상품(/products) · 목록 · 필터 · 정렬은 ProductsClient 그대로
 * 2026-10-26 대기 화면(Suspense fallback)에 웹 전용 쿠션 뼈대 — 꾸밈 app/shop-list-web.css(웹에서만), 앱은 기존 한 줄 글
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import ProductsClient from "./ProductsClient";
// 대기 화면 뼈대 꾸밈(웹 전용) — data-list-fallback
import "../shop-list-web.css";

export const metadata: Metadata = {
    title: "전체상품 | 댕다방",
    description: "댕다방 전체 상품을 검색하고 카테고리별로 고를 수 있습니다.",
};

export default function ProductsPage() {
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
            <ProductsClient />
        </Suspense>
    );
}
