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
import MemberAiDashboard from "@/components/home/MemberAiDashboard";
import AiQuickActions from "@/components/home/AiQuickActions";
import HomeAudienceSlot from "@/components/home/HomeAudienceSlot";

export default function HomePage() {
    // 협업자 동적 히어로에 넘길 추천 상품 4개 (popularity 기준 베스트)
    const heroProducts = getBestProducts(4);

    return (
        <>
            {/* 협업자 — 인트로 + 동적 히어로 (날씨/시간/계절 반응) */}
            <IntroSplash />
            <HeroSection featuredProducts={heroProducts} />

            {/* 플로팅 FAB(FloatingDock) 등장 기준점 — 히어로를 지나면 펫렌즈/챗봇 버튼 노출 */}
            <div id="fab-reveal-sentinel" aria-hidden="true" />

            {/* 로그인 회원의 오늘 돌봄 이유를 가장 먼저 보여주는 개인 AI 대시보드 */}
            <MemberAiDashboard />

            {/* 회원은 개인 대시보드에서 곧바로 AI 기능으로 이어진다. */}
            <HomeAudienceSlot audience="member">
                <AiQuickActions />
            </HomeAudienceSlot>

            {/* AI 분석과 회원 프로필을 실제 상품으로 연결 */}
            <RecommendSection />
            <BestSection />
            <BrandSlider />
            <PromoSection />
            <NewArrivalsSection />

            {/* 비회원은 쇼핑 콘텐츠를 둘러본 뒤 리뷰 직전에 AI 체험으로 진입한다. */}
            <HomeAudienceSlot audience="guest">
                <AiQuickActions />
            </HomeAudienceSlot>
            <ReviewSection />
            <InstaSection />
        </>
    );
}
