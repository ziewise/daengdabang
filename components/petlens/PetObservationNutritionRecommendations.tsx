"use client";

import Image from "next/image";
import Link from "next/link";
import type {
    PetObservationNutritionRecommendation,
    PetObservationResult,
} from "@/lib/petlens-observation";
import {
    petObservationNutritionProductHref,
    petObservationNutritionProducts,
    type PetObservationNutritionProduct,
} from "@/lib/petlens-observation-nutrition";

const PROFILE_BASIS_LABEL: Record<
    PetObservationNutritionRecommendation["profileBasis"][number],
    string
> = {
    age: "연령",
    breed: "견종",
    situation: "촬영 상황",
};

type RecommendationWithProduct = {
    recommendation: PetObservationNutritionRecommendation;
    product?: PetObservationNutritionProduct;
};

function recommendationProducts(
    recommendations: PetObservationNutritionRecommendation[],
): RecommendationWithProduct[] {
    const used = new Set<string>();
    return recommendations.map((recommendation) => {
        const product = petObservationNutritionProducts(
            recommendation.focus,
            recommendation.lifeStage,
        )
            .find((candidate) => !used.has(candidate.folder));
        if (product) used.add(product.folder);
        return { recommendation, product };
    });
}

export default function PetObservationNutritionRecommendations({
    result,
}: {
    result: PetObservationResult;
}) {
    if (
        result.status !== "ready"
        || result.quality.level !== "good"
        || result.urgency.level !== "observe"
        || result.nutritionRecommendations.length === 0
    ) return null;

    const items = recommendationProducts(result.nutritionRecommendations);

    return (
        <section
            className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-4 shadow-[0_18px_50px_-38px_rgba(5,150,105,0.7)] sm:p-5"
            data-daenglab-nutrition-recommendations
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black tracking-[0.12em] text-emerald-700">
                        프로필 기반 영양 관리
                    </p>
                    <h3 className="mt-1 text-lg font-black text-neutral-950">
                        우리 아이 영양식 비교 제안
                    </h3>
                </div>
                <span className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[10px] font-black text-emerald-800">
                    자사몰 상품 연결
                </span>
            </div>
            <p className="mt-2 max-w-3xl text-[11px] font-bold leading-5 text-neutral-600">
                등록 프로필과 보호자가 선택한 활동 맥락을 바탕으로, 생활 단계가 맞는 자사몰 주식 상품만 비교하기 쉽게 보여드려요.
            </p>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {items.map(({ recommendation, product }) => (
                    <article
                        key={recommendation.focus}
                        className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-3.5 shadow-sm"
                    >
                        <div>
                            <div className="flex flex-wrap gap-1.5">
                                {recommendation.profileBasis.map((basis) => (
                                    <span
                                        key={basis}
                                        className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-800"
                                    >
                                        {PROFILE_BASIS_LABEL[basis]} 기준
                                    </span>
                                ))}
                            </div>
                            <h4 className="mt-2 text-sm font-black leading-6 text-neutral-950">
                                {recommendation.headline}
                            </h4>
                            <p className="mt-1 text-[11px] font-bold leading-5 text-neutral-600">
                                {recommendation.reason}
                            </p>
                        </div>

                        {product ? (
                            <div className="flex gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white">
                                    <Image
                                        src={product.image}
                                        alt={product.name}
                                        fill
                                        sizes="96px"
                                        className="object-contain p-1.5"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-black text-emerald-700">
                                        {product.comparisonLabel}
                                    </span>
                                    <p className="mt-1 line-clamp-2 text-xs font-black leading-5 text-neutral-900">
                                        {product.name}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-sm font-black text-neutral-950">
                                            {product.price.toLocaleString("ko-KR")}원
                                        </span>
                                        <Link
                                            href={petObservationNutritionProductHref(product)}
                                            className="inline-flex min-h-9 items-center rounded-xl bg-emerald-700 px-3 text-[11px] font-black text-white hover:bg-emerald-800"
                                        >
                                            상품 비교하기
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link
                                href="/category/food"
                                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-800 hover:bg-emerald-100"
                            >
                                영양식 전체 보기
                            </Link>
                        )}
                    </article>
                ))}
            </div>

            <p className="mt-3 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2.5 text-[10px] font-bold leading-5 text-emerald-900">
                기존 식단과 알레르기, 상품 원재료를 먼저 확인하고 천천히 비교해 주세요.
            </p>
        </section>
    );
}
