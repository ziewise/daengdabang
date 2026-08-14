import type { Metadata } from "next";
import RecommendationsClient from "./RecommendationsClient";

export const metadata: Metadata = {
    title: "맞춤 추천 | 댕다방",
    description: "회원이 선택한 반려견과 동의한 데이터만 반영하는 댕다방 맞춤 추천",
};

export default function RecommendationsPage() {
    return <RecommendationsClient />;
}
