import type { Metadata } from "next";
import SocialPageClient from "./SocialPageClient";

export const metadata: Metadata = {
    title: "콘텐츠룸 | 댕다방",
    description: "댕다방 상품과 펫렌즈 콘텐츠를 SNS 게시물로 준비하는 콘텐츠룸",
};

export default function SocialPage() {
    return <SocialPageClient />;
}
