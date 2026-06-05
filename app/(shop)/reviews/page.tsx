/**
 * /reviews — 전체 리뷰 페이지
 * ---------------------------------------------------------------------
 * 메인 페이지 ReviewSection 의 "전체 리뷰 보기" 와 푸터 "리뷰" 링크의 도착지.
 *
 * 콘텐츠: 통계 + 포토 리뷰 그리드 + 간단 리뷰 그리드
 * 백엔드 연동 전 mock 데이터 사용.
 */
import type { Metadata } from "next";
import ReviewsClient from "./ReviewsClient";

export const metadata: Metadata = {
    title: "리뷰",
    description: "댕다방 구매 고객의 솔직한 리뷰 모음 — 포토 리뷰 + 한줄 리뷰",
};

export default function ReviewsPage() {
    return <ReviewsClient />;
}
