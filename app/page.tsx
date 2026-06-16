/**
 * app/page.tsx — 메인 홈 페이지 (restore/mainpage)
 * ---------------------------------------------------------------------
 * 구성 원칙: "협업자 엔진 + 우리 UI 구성"
 *
 * [협업자 유지]
 *   - IntroSplash  : 인트로 스플래시
 *   - HeroSection  : 날씨/시간대/계절/회원상태 반응 동적 히어로
 *                    (lib/hero-assets, lib/hero-weather, Open-Meteo API)
 *                    featuredProducts = getBestProducts(4)
 *
 * [우리 구성 — 메인 섹션]
 *   - RecommendSection  : 로그인 회원 + 등록 펫 기반 맞춤 추천 (비로그인 시 미노출)
 *   - BestSection       : 베스트 (4탭 × 4상품)
 *   - BrandSlider       : 대표 브랜드 자동 페이드
 *   - PromoSection      : 기획전 (1 featured + 4 small)
 *   - NewArrivalsSection: 신상품 무한 캐러셀
 *   - ReviewSection     : 리뷰 (포토 + 간단)
 *   - InstaSection      : 인스타그램 그리드
 *
 * 데이터는 모두 협업자 lib/catalog (외부 리뷰·CDN 영상 통합) 에서 가져옴.
 * 각 섹션의 의존성(ProductCard, hooks, lib/recommendations 등)은 호환 확인 완료.
 */
import { getBestProducts } from "@/lib/catalog";
import IntroSplash from "@/components/home/IntroSplash";
import HeroSection from "@/components/home/HeroSection";
import RecommendSection from "@/components/main/RecommendSection";
import BestSection from "@/components/main/BestSection";
import BrandSlider from "@/components/main/BrandSlider";
import PromoSection from "@/components/main/PromoSection";
import NewArrivalsSection from "@/components/main/NewArrivalsSection";
import ReviewSection from "@/components/main/ReviewSection";
import InstaSection from "@/components/main/InstaSection";

export default function HomePage() {
    // 협업자 동적 히어로에 넘길 추천 상품 4개 (popularity 기준 베스트)
    const heroProducts = getBestProducts(4);

    return (
        <>
            {/* 협업자 — 인트로 + 동적 히어로 (날씨/시간/계절 반응) */}
            <IntroSplash />
            <HeroSection featuredProducts={heroProducts} />

            {/* 우리 구성 — 메인 섹션 (로그인 시 추천 섹션 자동 노출) */}
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
