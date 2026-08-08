import type { Metadata } from "next";
import GrowthHub from "@/components/growth/GrowthHub";

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
