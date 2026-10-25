/**
 * app/search/page.tsx — 웹 검색 결과 페이지(/search/?q=검색어) · 2026-10-23 사용자 결정 "검색은 별도 페이지"
 * ---------------------------------------------------------------------
 * 전체상품(/products)은 댕다방 상품만 보는 곳으로 두고, 검색은 여기서: 댕다방 상품 + 다른 판매처 가격 비교.
 * 목록 · 필터 · 정렬 · 가격 비교 · 기록은 ProductsClient 를 그대로 쓰고(variant="search"), 머리 · 배치만 검색용.
 * 꾸밈: app/daily-web.css(쿠션 · 고리 · 발자국) + app/search-web.css(검색 전용), 웹에서만.
 * 대기 화면(Suspense fallback): 웹은 쿠션 뼈대(app/shop-list-web.css data-list-fallback), 앱은 기존 한 줄 글.
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import ProductsClient from "../products/ProductsClient";
import "../daily-web.css";
import "../search-web.css";
// 대기 화면 뼈대 꾸밈(웹 전용, 2026-10-26) — data-list-fallback
import "../shop-list-web.css";

export const metadata: Metadata = {
    title: "검색 결과 | 댕다방",
    description: "댕다방 상품 검색과 다른 판매처 가격 비교",
    // 검색어마다 생기는 페이지라 검색엔진 색인에서는 뺌
    robots: { index: false, follow: true },
};

export default function SearchPage() {
    return (
        <Suspense fallback={(
            // data-list-fallback — 웹은 글 대신 쿠션 뼈대(app/shop-list-web.css), 앱은 기존 한 줄 글 그대로
            <div className="mx-auto max-w-[1280px] px-4 py-10 text-sm font-black" data-list-fallback>
                <p className="list-fallback-text">검색 결과를 불러오는 중입니다.</p>
                <div className="hidden list-fallback-sk" aria-hidden="true">
                    <span className="is-hero" />
                    {Array.from({ length: 10 }, (_, index) => <span key={index} />)}
                </div>
            </div>
        )}>
            <ProductsClient variant="search" />
        </Suspense>
    );
}
