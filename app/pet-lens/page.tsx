import type { Metadata } from "next";
import { Suspense } from "react";
import PetLensClient from "./PetLensClient";
// 웹 연구소 꾸밈(2026-10-23) — 기록 결 공용(daily-web) + 연구소 전용(lab-web), 둘 다 웹 data-lab-web 범위만
import "../daily-web.css";
import "../lab-web.css";

export const metadata: Metadata = {
    title: "펫렌즈 | 댕다방",
    description: "반려견 정보 기반으로 댕다방 상품을 추천합니다.",
};

export default function PetLensPage() {
    return (
        <Suspense fallback={<main className="p-8 text-center" role="status">연구소를 불러오고 있어요.</main>}>
            <PetLensClient />
        </Suspense>
    );
}
