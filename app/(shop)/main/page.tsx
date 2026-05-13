/**
 * /main — 메인 쇼핑 페이지 (Phase 3 placeholder)
 * ---------------------------------------------------------------------
 * 현재는 헤더/푸터/펫렌즈 FAB 동작 검증용 placeholder.
 * Phase 3 다음 단계에서 _legacy/main.html 의 7개 섹션 이식:
 *   히어로(영상) · 베스트 · 브랜드 · 기획전 · 신상품 · 리뷰 · 인스타
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "메인",
};

export default function MainPage() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
            <div className="glass-card max-w-2xl w-full rounded-2xl p-10 text-center">
                <p className="text-xs font-bold tracking-[0.3em] text-aurora-indigo mb-3">
                    PHASE 3 · NEXT
                </p>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                    🐾 메인 페이지 이식 예정
                </h1>
                <p className="text-base text-neutral-600 leading-relaxed mb-8">
                    히어로 영상 · 베스트 · 브랜드 슬라이더
                    <br />
                    기획전 · 신상품 캐러셀 · 리뷰 · 인스타
                </p>
                <p className="text-sm text-neutral-500">
                    이 페이지에서 헤더/푸터/펫렌즈 FAB 모두 작동해야 합니다.
                </p>
            </div>
        </div>
    );
}
