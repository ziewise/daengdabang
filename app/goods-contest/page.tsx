import type { Metadata } from "next";
import GoodsContestLanding from "@/components/growth/GoodsContestLanding";

export const metadata: Metadata = {
    title: "댕다방 굿즈 500명 공모전 | 함께 고르는 다음 굿즈",
    description: "회원과 비회원 누구나 마음에 드는 댕다방 굿즈를 선택하고, 상품별 500명 달성 현황과 90일 공모 기간을 확인할 수 있습니다.",
    alternates: { canonical: "/goods-contest/" },
    openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: "댕다방",
        title: "댕다방 굿즈 500명 공모전",
        description: "500명의 선택으로 다음 댕다방 굿즈를 함께 정해요.",
        url: "/goods-contest/",
        images: [{
            url: "/images/goods/goods-hero-lineup.webp",
            width: 1120,
            height: 630,
            alt: "댕다방 굿즈 공모전 전체 구성",
        }],
    },
    twitter: {
        card: "summary_large_image",
        title: "댕다방 굿즈 500명 공모전",
        description: "500명의 선택으로 다음 댕다방 굿즈를 함께 정해요.",
        images: ["/images/goods/goods-hero-lineup.webp"],
    },
};

export default function GoodsContestPage() {
    return <GoodsContestLanding />;
}
