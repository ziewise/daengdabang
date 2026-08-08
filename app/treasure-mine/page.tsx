import type { Metadata } from "next";
import GrowthHub from "@/components/growth/GrowthHub";

export const metadata: Metadata = {
    title: "댕다방 보물광산 | 매일 돌봄과 성장 프로그램",
    description: "출근도장, 돌봄 미션, AI 기록을 한곳에서 이어가고 준비 중인 멤버십·브랜드·굿즈·로컬케어 프로그램을 확인하세요.",
    alternates: { canonical: "/treasure-mine/" },
    openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: "댕다방",
        title: "댕다방 보물광산 | 매일 하나씩 돌봄 기록",
        description: "출근도장·작은 돌봄·AI 기록을 한곳에서 이어가고 친구와 안전하게 나눠보세요.",
        url: "/treasure-mine/",
        images: [{
            url: "/images/og-ai-platform-20260804-1200x630.png",
            width: 1200,
            height: 630,
            alt: "댕다방 보물광산의 매일 돌봄 기록",
        }],
    },
    twitter: {
        card: "summary_large_image",
        title: "댕다방 보물광산 | 매일 하나씩 돌봄 기록",
        description: "출근도장·작은 돌봄·AI 기록을 한곳에서 이어가세요.",
        images: ["/images/og-ai-platform-20260804-1200x630.png"],
    },
};

export default function TreasureMinePage() {
    return <GrowthHub />;
}
