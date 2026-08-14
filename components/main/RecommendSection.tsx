"use client";

import Link from "next/link";
import RecommendationPetSelector from "@/components/recommendation/RecommendationPetSelector";
import RecommendationProductCard from "@/components/recommendation/RecommendationProductCard";
import { useRecommendationAnalytics } from "@/hooks/useRecommendationAnalytics";
import { useRecommendationPreferences } from "@/hooks/useRecommendationPreferences";
import {
    editorialRecommendationItems,
    RECOMMENDATION_FEATURE_FLAGS,
    recommendationPersonalizationEnabled,
    resolveSelectedRecommendationPet,
    runMemberRecommendation,
} from "@/lib/recommendation";
import { useAuth } from "@/lib/store";

export default function RecommendSection() {
    const { user, hydrated } = useAuth();
    const personalizationEnabled = recommendationPersonalizationEnabled(
        RECOMMENDATION_FEATURE_FLAGS,
        "home",
    );
    const preferenceState = useRecommendationPreferences({ enabled: personalizationEnabled });

    const preferences = preferenceState.preferences;
    const selectedPet = personalizationEnabled
        ? resolveSelectedRecommendationPet(
            user?.pets ?? [],
            preferences?.selectedPetProfileId ?? null,
        )
        : null;
    const personalizedResult = selectedPet && preferences?.enabled
        ? runMemberRecommendation({
            profile: selectedPet,
            preferences,
            surface: "home",
            limit: 6,
        })
        : null;
    const showsEditorial = !personalizationEnabled || !selectedPet || !preferences || !preferences.enabled;
    const baseItems = showsEditorial
        ? editorialRecommendationItems(6)
        : personalizedResult?.items ?? [];
    const mode = !personalizationEnabled
        ? "editorial_fallback"
        : !selectedPet
        ? "no_profile"
        : !preferences
            ? preferenceState.status === "error" ? "settings_error" : "settings_loading"
            : preferences.enabled
                ? personalizedResult?.mode ?? "editorial_fallback"
                : "disabled";
    const petName = selectedPet?.name?.trim() || "우리 아이";
    const analyticsMode = preferences?.enabled
        ? personalizedResult?.mode ?? "editorial_fallback"
        : preferences ? "disabled" : "editorial_fallback";
    const recommendationAnalytics = useRecommendationAnalytics({
        enabled: RECOMMENDATION_FEATURE_FLAGS.analytics && hydrated && Boolean(user),
        surface: "home",
        mode: analyticsMode,
        items: baseItems,
        ready: hydrated && Boolean(user) && (!personalizationEnabled || !preferenceState.isLoading),
    });
    const items = recommendationAnalytics.visibleItems;

    if (!hydrated || !user) return null;

    const selectPet = async (profileId: number) => {
        try {
            await preferenceState.save({ selectedPetProfileId: profileId });
        } catch {
            // The shared hook keeps the previous selection and exposes a safe
            // user-facing error without leaking request details.
        }
    };

    return (
        <section
            id="recommend"
            className="py-10 md:py-12"
            data-member-recommendations
            data-recommendation-mode={mode}
            data-recommendation-engine-enabled={RECOMMENDATION_FEATURE_FLAGS.engine}
        >
            <div className="mx-auto max-w-[1400px] px-6">
                <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-3xl">
                        <p className="ddb-crayon-kicker mb-1.5 text-[11px] md:text-xs">
                            <i className="fa-solid fa-wand-magic-sparkles mr-1" />
                            {showsEditorial ? "댕다방 추천 셀렉트" : "우리 아이 맞춤 추천"}
                        </p>
                        <h2 className="ddb-crayon-title mb-1.5 text-3xl md:text-4xl">
                            <span className="ddb-crayon-underline">
                                {personalizationEnabled && selectedPet && preferences?.enabled
                                    ? `${petName}를 위한 추천`
                                    : "상품 용도와 브랜드를 살펴 골랐어요"}
                            </span>
                        </h2>
                        {!personalizationEnabled ? (
                            <p className="text-sm font-bold leading-6 text-neutral-500">
                                현재는 회원 정보를 사용하지 않는 댕다방 편집 추천을 보여드려요.
                            </p>
                        ) : !selectedPet ? (
                            <p className="text-sm font-bold leading-6 text-neutral-500">
                                반려견 프로필을 등록하면 체형·활동량·관심 케어를 반영할 수 있어요.
                            </p>
                        ) : !preferences ? (
                            <p className="text-sm font-bold leading-6 text-neutral-500">
                                {preferenceState.errorMessage || "추천 데이터 설정을 안전하게 확인하고 있어요."}
                            </p>
                        ) : !preferences.enabled ? (
                            <p className="text-sm font-bold leading-6 text-neutral-500">
                                맞춤 추천이 꺼져 있어 회원 정보가 아닌 편집 추천만 보여드려요.
                            </p>
                        ) : (
                            <p className="text-sm font-bold leading-6 text-neutral-500">
                                {personalizedResult?.mode === "personalized"
                                    ? "등록한 프로필과 사용에 동의한 펫렌즈 케어 신호를 함께 반영했어요."
                                    : "등록한 체형·활동량·관심 케어 프로필만 반영했어요."}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                        {personalizationEnabled && preferences && selectedPet ? (
                            <RecommendationPetSelector
                                pets={user.pets}
                                selectedPetProfileId={selectedPet.apiProfileId ?? null}
                                disabled={!preferenceState.isReady || preferenceState.isSaving}
                                onSelect={(profileId) => void selectPet(profileId)}
                            />
                        ) : null}
                        <Link
                            href={personalizationEnabled && !selectedPet ? "/mypage/#pet-profiles" : "/recommendations/"}
                            className="ddb-crayon-link inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs md:text-sm"
                        >
                            {personalizationEnabled && !selectedPet ? "프로필 등록하기" : "추천 전체 보기"}
                            <i className="fa-solid fa-arrow-right text-[10px]" />
                        </Link>
                        {personalizationEnabled && preferences && !preferences.enabled ? (
                            <Link href="/mypage/recommendations/" className="text-xs font-black text-indigo-700 hover:underline">
                                맞춤 추천 켜기
                            </Link>
                        ) : null}
                    </div>
                </div>

                {personalizationEnabled && preferenceState.errorMessage && selectedPet ? (
                    <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-900" role="status">
                        {preferenceState.errorMessage}
                    </p>
                ) : null}
                {personalizationEnabled && personalizedResult?.notices.map((notice) => (
                    <p key={notice} className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-black leading-5 text-sky-900">
                        {notice}
                    </p>
                ))}

                {items.length > 0 ? (
                    <div
                        data-recommendation-run={recommendationAnalytics.runId}
                        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6"
                    >
                        {items.map((item) => (
                            <RecommendationProductCard
                                key={item.product.id}
                                item={item}
                                compact
                                onProductClick={recommendationAnalytics.trackProductClick}
                                onReasonOpened={recommendationAnalytics.trackReasonOpened}
                                onHide={recommendationAnalytics.hideProduct}
                            />
                        ))}
                    </div>
                ) : baseItems.length > 0 ? (
                    <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
                        <p className="font-black text-neutral-950">이 추천 묶음의 상품을 모두 숨겼어요.</p>
                        <button
                            type="button"
                            className="mt-3 text-sm font-black text-indigo-700 hover:underline"
                            onClick={recommendationAnalytics.resetHidden}
                        >
                            숨긴 상품 다시 보기
                        </button>
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
                        <p className="font-black text-neutral-950">현재 안전 기준을 통과한 맞춤 상품이 없어요.</p>
                        <Link href="/products/" className="mt-3 inline-flex text-sm font-black text-indigo-700 hover:underline">
                            전체 상품 직접 보기
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}
