/**
 * /recommendations — 맞춤 추천 상품 전체 보기
 * ---------------------------------------------------------------------
 * 상단 메뉴에서 직접 접근 불가, 메인 페이지의 RecommendSection 에서만 진입.
 * 회원이 분석한 펫의 정보 기반으로 카테고리별 추천 상품 노출.
 */
import type { Metadata } from "next";
import RecommendationsClient from "./RecommendationsClient";

export const metadata: Metadata = {
    title: "맞춤 추천",
    description: "우리 댕댕이를 위한 AI 큐레이션 — 견종·체형·모질·활동량 기반 추천 상품",
};

export default function RecommendationsPage() {
    return <RecommendationsClient />;
}
