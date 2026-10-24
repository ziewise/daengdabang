import type { Metadata } from "next";
import GrowthHub from "@/components/growth/GrowthHub";
// 웹 매일 댕생활 꾸밈(보물광산 /treasure-mine 과 같은 화면 · 2026-10-25) — 빠져 있어 웹에서 큰 검은 발자국 그림이 그대로 보이던 것 고침. 웹에서만 적용(data-daily-web 범위)
import "../daily-web.css";

export const metadata: Metadata = {
    title: "매일댕생활 | 댕다방",
    description: "출근도장, 돌봄 미션, AI 기록과 준비 중인 성장 프로그램을 한곳에서 확인하세요.",
    alternates: { canonical: "/treasure-mine/" },
    openGraph: {
        title: "매일댕생활 | 댕다방",
        description: "출근도장, 돌봄 미션, AI 기록과 준비 중인 성장 프로그램을 한곳에서 확인하세요.",
        url: "/treasure-mine/",
    },
    robots: { index: false, follow: true },
};

/**
 * 이전 챌린지 링크를 새 일상 허브로 유지한다.
 * 정적 배포에서도 동작하도록 서버 리다이렉트 대신 같은 화면을 렌더링한다.
 */
export default function ChallengePage() {
    return <GrowthHub />;
}
