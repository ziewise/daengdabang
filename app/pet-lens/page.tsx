import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
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
        <Suspense fallback={(
            // 불러오는 중 — 앱은 원래 글씨(wl-app), 웹은 3D 그림 쿠션(wl-card, daily-web.css data-web-loading) · 2026-10-26
            <main className="p-8 text-center" role="status" data-web-loading>
                <span className="wl-app">연구소를 불러오고 있어요.</span>
                <span className="hidden wl-card">
                    <Image src="/images/ui/pet-lens-128.webp" alt="" width={64} height={64} aria-hidden="true" />
                    <span>연구소를 불러오고 있어요</span>
                </span>
            </main>
        )}>
            <PetLensClient />
        </Suspense>
    );
}
