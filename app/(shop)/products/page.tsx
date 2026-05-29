/**
 * /products — 전체 상품 보기 (333개)
 * ---------------------------------------------------------------------
 * 진입: 카테고리 메가메뉴 우하단의 "전체 상품 보기" 링크
 * 기능: 20/30/40 페이지당 노출 선택 + 페이지 번호 + 정렬 (추후)
 *
 * server 컴포넌트는 metadata 만, 인터랙션은 Client 에 위임.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
    title: "전체 상품",
    description: "댕다방 전체 상품 — 카테고리·브랜드·기획전 단일 출처",
};

export default function ProductsPage() {
    return (
        <Suspense>
            <ProductsClient />
        </Suspense>
    );
}
