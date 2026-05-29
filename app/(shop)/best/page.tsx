/**
 * /best — 베스트 30 상품 페이지
 * ---------------------------------------------------------------------
 * 큐레이션된 BEST_RANKS (1~30위) 를 큰 랭킹 번호 배지와 함께 노출.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import BestClient from "./BestClient";

export const metadata: Metadata = {
    title: "베스트",
    description: "댕다방 베스트 상품 — 가장 많이 팔린 인기 상품 모음",
};

export default function BestPage() {
    return (
        <Suspense>
            <BestClient />
        </Suspense>
    );
}
