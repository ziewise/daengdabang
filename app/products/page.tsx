import { Suspense } from "react";
import type { Metadata } from "next";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
    title: "전체상품 | 댕다방",
    description: "댕다방 전체 상품을 검색하고 카테고리별로 고를 수 있습니다.",
};

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1280px] px-4 py-10 text-sm font-black">상품을 불러오는 중입니다.</div>}>
            <ProductsClient />
        </Suspense>
    );
}
