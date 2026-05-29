/**
 * /new — 신상품 페이지
 * ---------------------------------------------------------------------
 * 카탈로그에서 "(2026)" 표기 상품 자동 필터.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import NewClient from "./NewClient";

export const metadata: Metadata = {
    title: "신상품",
    description: "댕다방 2026 신상품 컬렉션",
};

export default function NewPage() {
    return (
        <Suspense>
            <NewClient />
        </Suspense>
    );
}
