/**
 * /main — 메인 쇼핑 페이지
 * ---------------------------------------------------------------------
 * 7개 섹션 (순차 이식 중):
 *   ✅ 1. 히어로 (영상 풀블리드 + 좌상단 텍스트)
 *   ✅ 2. 베스트 (4탭 × 4상품)
 *   ✅ 3. 브랜드 슬라이더 (Ruffwear / Rex Specs)
 *   ✅ 4. 기획전 (1 featured + 4 small)
 *   ⬜ 5. 신상품 (자동 캐러셀)
 *   ⬜ 6. 리뷰 (포토 + 간단)
 *   ⬜ 7. 인스타그램 (8장 그리드)
 */
import type { Metadata } from "next";
import HeroSection from "@/components/main/HeroSection";
import BestSection from "@/components/main/BestSection";
import BrandSlider from "@/components/main/BrandSlider";
import PromoSection from "@/components/main/PromoSection";

export const metadata: Metadata = {
    title: "메인",
};

export default function MainPage() {
    return (
        <>
            <HeroSection />
            <BestSection />
            <BrandSlider />
            <PromoSection />

            {/* 남은 섹션 placeholder */}
            <section className="py-20 text-center text-neutral-400 text-sm">
                <p>신상품 · 리뷰 · 인스타 섹션은 다음 단계에서 추가됩니다.</p>
            </section>
        </>
    );
}
