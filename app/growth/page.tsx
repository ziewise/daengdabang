import type { Metadata } from "next";
import GrowthHub from "@/components/growth/GrowthHub";
// 웹 매일 댕생활 꾸밈(보물광산 /treasure-mine 과 같은 화면 · 2026-10-25) — 빠져 있어 웹에서 큰 검은 발자국 그림이 그대로 보이던 것 고침. 웹에서만 적용(data-daily-web 범위)
import "../daily-web.css";

export const metadata: Metadata = {
    title: "매일댕생활 | 댕다방",
    description: "매일 돌봄 기록과 500명 굿즈 공모전을 한곳에서 확인하세요.",
    alternates: { canonical: "/treasure-mine/" },
    robots: { index: false, follow: true },
};

/** `/growth/` 이전·공유 링크에서도 정적 배포 환경의 매일댕생활 허브를 연다. */
export default function GrowthPage() {
    return <GrowthHub />;
}
