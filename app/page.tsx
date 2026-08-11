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
 *   - BestSection       : 댕다방 추천 셀렉트
 *   - BrandSlider       : 대표 브랜드 자동 페이드
 *   - PromoSection      : 기획전 (1 featured + 4 small)
 *   - NewArrivalsSection: 신상품 무한 캐러셀
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
import InstaSection from "@/components/main/InstaSection";
import DailyMineTeaser from "@/components/home/DailyMineTeaser";
import MobileAppInstallStrip from "@/components/pwa/MobileAppInstallStrip";

export default function HomePage() {
    // 동적 히어로에 넘길 운영자 검수 추천 상품 4개
    const heroProducts = getBestProducts(4);

    return (
        <>
            {/* 협업자 — 인트로 + 동적 히어로 (날씨/시간/계절 반응) */}
            <IntroSplash />
            <HeroSection featuredProducts={heroProducts} />

            {/* 플로팅 FAB(FloatingDock) 등장 기준점 — 히어로를 지나면 펫렌즈/챗봇 버튼 노출 */}
            <div id="fab-reveal-sentinel" aria-hidden="true" />

            {/* 모바일 방문자는 스토어 심사 없이 홈 화면 앱으로 바로 추가할 수 있다. */}
            <MobileAppInstallStrip />

            {/* 회원의 반려견 데이터를 반영한 추천 상품은 히어로 바로 아래에 노출한다. */}
            <RecommendSection />
            <BestSection />
            <BrandSlider />
            <PromoSection />

            {/* 쇼핑 흐름을 먼저 충분히 보여준 뒤 매일 방문 기능은 짧은 띠로 연결한다. */}
            <DailyMineTeaser />

            <NewArrivalsSection />

            <InstaSection />
        </>
    );
}
