"use client";

import Link from "next/link";
import ProductCard from "@/components/products/ProductCard";
import { recommendForPet } from "@/lib/daengdabang-llm";
import { useAuth, type PetProfile } from "@/lib/store";

function hasPetLensAnalysis(pet: PetProfile) {
    const raw = pet.rawAnalysis;
    if (!raw) return false;
    return Boolean(
        raw.petLens
        || raw.analysis_ready
        || raw.analysisReady
        || raw.recommendation_signals
        || raw.recommendationSignals
        || raw.visible_features
        || raw.visibleFeatures,
    );
}

function analysisTime(pet: PetProfile) {
    const value = pet.lastAnalyzedAt ? Date.parse(pet.lastAnalyzedAt) : 0;
    return Number.isFinite(value) ? value : 0;
}

export default function RecommendSection() {
    const { user, hydrated } = useAuth();

    if (!hydrated || !user || user.pets.length === 0) return null;

    const latestAnalyzedPet = user.pets
        .filter(hasPetLensAnalysis)
        .sort((left, right) => analysisTime(right) - analysisTime(left))[0];
    const current = latestAnalyzedPet || user.pets[0];
    const hasAnalysis = Boolean(latestAnalyzedPet);
    const petName = current.name?.trim() || "우리 아이";
    const recs = recommendForPet(current, hasAnalysis ? current.rawAnalysis : undefined).slice(0, 6);

    return (
        <section id="recommend" className="py-10 md:py-12" data-member-recommendations>
            <div className="mx-auto max-w-[1400px] px-6">
                <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="mb-1.5 text-[11px] font-extrabold tracking-[0.2em] text-aurora-indigo md:text-xs">
                            <i className="fa-solid fa-wand-magic-sparkles mr-1" />
                            우리 아이 맞춤 추천
                        </p>
                        <h2 className="mb-1.5 text-2xl font-black tracking-tight md:text-3xl">
                            <span className="text-aurora-indigo">{petName}</span>를 위한 추천
                        </h2>
                        <p className="text-sm font-bold leading-6 text-neutral-500">
                            {hasAnalysis
                                ? `최근 펫렌즈 분석 결과와 ${current.breed || "등록"} 프로필을 함께 반영했어요.`
                                : `${current.breed || "등록된 반려견"}의 체형·활동량·관심 케어 프로필을 기준으로 골랐어요.`}
                        </p>
                        {!hasAnalysis && (
                            <p className="mt-1 text-xs font-bold text-neutral-400">
                                사진 분석을 완료하면 관찰된 케어 신호까지 다음 추천에 반영됩니다.
                            </p>
                        )}
                    </div>
                    <Link
                        href={hasAnalysis ? "/recommendations" : "/pet-lens"}
                        className="inline-flex self-start items-center gap-1.5 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo px-5 py-2.5 text-xs font-extrabold text-white transition hover:opacity-90 md:self-auto md:text-sm"
                    >
                        {hasAnalysis ? "맞춤 추천 전체 보기" : "사진 분석하고 더 정확히 보기"}
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6">
                    {recs.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    );
}
