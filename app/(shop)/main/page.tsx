/**
 * /main — 메인 쇼핑 페이지 (Phase 3-2 완료)
 * ---------------------------------------------------------------------
 * 7개 섹션 모두 이식 완료:
 *   1. 히어로 (영상 풀블리드 + 좌측 가운데 텍스트)
 *   2. 베스트 (4탭 × 4상품)
 *   3. 브랜드 슬라이더 (Ruffwear / Rex Specs 자동 fade)
 *   4. 기획전 (1 featured + 4 small)
 *   5. 신상품 (12종 무한 캐러셀)
 *   6. 리뷰 (포토 + 간단, 더보기 토글)
 *   7. 인스타그램 (8장 그리드 + hover 오버레이)
 */
import type { Metadata } from "next";
import HeroSection from "@/components/main/HeroSection";
import RecommendSection from "@/components/main/RecommendSection";
import BestSection from "@/components/main/BestSection";
import BrandSlider from "@/components/main/BrandSlider";
import PromoSection from "@/components/main/PromoSection";
import NewArrivalsSection from "@/components/main/NewArrivalsSection";
import ReviewSection from "@/components/main/ReviewSection";
import InstaSection from "@/components/main/InstaSection";

export const metadata: Metadata = {
    title: "메인",
};

export default function MainPage() {
    return (
        <>
            <HeroSection />
            <RecommendSection />
            <BestSection />
            <BrandSlider />
            <PromoSection />
            <NewArrivalsSection />
            <ReviewSection />
            <InstaSection />
        </>
    );
}
