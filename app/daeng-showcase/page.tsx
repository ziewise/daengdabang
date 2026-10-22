import type { Metadata } from "next";
import DaengShowcaseClient from "@/components/daeng-showcase/DaengShowcaseClient";
// 웹 기록 결 꾸밈(2026-10-22) — data-daily-web 범위
import "../daily-web.css";

export const metadata: Metadata = {
    title: "오늘의 댕자랑 | 반려견 일상 커뮤니티 | 댕다방",
    description: "누구나 반려견 일상 피드를 보고, 회원은 사진과 이야기를 올리고 친구를 팔로우하며 뼈다귀 응원을 나눌 수 있는 댕다방 커뮤니티입니다.",
    alternates: { canonical: "/daeng-showcase/" },
    openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: "댕다방",
        title: "오늘의 댕자랑 | 우리 아이의 오늘을 함께 응원해요",
        description: "공개 피드를 둘러보고 회원가입 후 사진 한 장과 오늘의 이야기를 바로 나눠 보세요.",
        url: "/daeng-showcase/",
        images: [
            {
                url: "/images/og-ai-platform-20260804-1200x630.png",
                width: 1200,
                height: 630,
                alt: "댕다방 오늘의 댕자랑 커뮤니티",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "오늘의 댕자랑 | 댕다방",
        description: "오늘의 댕주제에 참여하고 우리 아이의 일상을 함께 응원해요.",
        images: ["/images/og-ai-platform-20260804-1200x630.png"],
    },
};

export default function DaengShowcasePage() {
    return <DaengShowcaseClient />;
}
