/**
 * /brands — 기타 브랜드 페이지
 * ---------------------------------------------------------------------
 * 댕다방의 12개 기타 브랜드 카드 목록.
 * 대표 브랜드(Ruffwear, Rex Specs)는 별도 — 헤더 드롭다운의 Featured.
 *
 * 클릭 시 /brand/[slug] 로 이동.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import BrandsClient from "./BrandsClient";

export const metadata: Metadata = {
    title: "기타 브랜드",
    description: "댕다방이 엄선한 12개 프리미엄 브랜드",
};

export default function BrandsPage() {
    return (
        <Suspense>
            <BrandsClient />
        </Suspense>
    );
}
