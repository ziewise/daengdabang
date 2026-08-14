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
    type RecommendationItem,
    type RecommendationMode,
    type RecommendationReasonCode,
} from "@/lib/recommendation";
import { useAuth } from "@/lib/store";

const GROUP_TITLE: Record<RecommendationReasonCode, string> = {
    matches_size: "체형과 잘 맞는 상품",
    matches_life_stage: "생애단계를 고려한 상품",
    matches_activity: "활동량을 반영한 상품",
    matches_coat_care: "모질·피모 관리 관심 상품",
    matches_member_interest: "직접 등록한 관심사를 반영한 상품",
    matches_petlens_fit_note: "착용 전 실측 확인이 필요한 상품",
    matches_petlens_visibility: "산책 시인성 관심 상품",
    matches_petlens_coat_care: "동의한 펫렌즈 피모 신호를 반영한 상품",
    editorial_fallback: "댕다방 편집 추천",
};

const MODE_LABEL: Record<RecommendationMode, string> = {
    personalized: "프로필 + 펫렌즈",
    profile_only: "프로필만 사용",
    editorial_fallback: "편집 추천 포함",
    disabled: "맞춤 추천 꺼짐",
};

function groupItems(items: RecommendationItem[]) {
    const groups = new Map<RecommendationReasonCode, RecommendationItem[]>();
    for (const item of items) {
        const reason = item.reasonCodes[0] ?? "editorial_fallback";
        groups.set(reason, [...(groups.get(reason) ?? []), item]);
    }
    return [...groups.entries()];
}

export default function RecommendationsClient() {
    const { hydrated, user } = useAuth();
    const personalizationEnabled = recommendationPersonalizationEnabled(
        RECOMMENDATION_FEATURE_FLAGS,
        "full_page",
    );
    const preferenceState = useRecommendationPreferences({ enabled: personalizationEnabled });
    const preferences = preferenceState.preferences;
    const selectedPet = personalizationEnabled
        ? resolveSelectedRecommendationPet(
            user?.pets ?? [],
            preferences?.selectedPetProfileId ?? null,
        )
        : null;
    const result = selectedPet && preferences?.enabled
        ? runMemberRecommendation({
            profile: selectedPet,
            preferences,
            surface: "recommendations",
            limit: 12,
        })
        : null;
    const personalizedAvailable = Boolean(personalizationEnabled && user && selectedPet && preferences?.enabled && result);
    const baseItems = personalizedAvailable ? result?.items ?? [] : editorialRecommendationItems(12);
    const mode = personalizedAvailable ? result?.mode ?? "editorial_fallback" : preferences?.enabled === false ? "disabled" : "editorial_fallback";
    const recommendationAnalytics = useRecommendationAnalytics({
        enabled: RECOMMENDATION_FEATURE_FLAGS.analytics && hydrated,
        surface: "recommendations",
        mode,
        items: baseItems,
        ready: hydrated && (!personalizationEnabled || !user || !preferenceState.isLoading),
    });
    const items = recommendationAnalytics.visibleItems;

    const selectPet = async (profileId: number) => {
        try {
            await preferenceState.save({ selectedPetProfileId: profileId });
        } catch {
            // The current selection remains visible only after the server has
            // accepted it; the shared hook exposes a customer-safe message.
        }
    };

    if (!hydrated) {
        return (
            <main className="mx-auto max-w-[1280px] px-4 py-12 md:px-6" aria-busy="true">
                <p className="rounded-2xl bg-neutral-50 px-5 py-8 text-center text-sm font-black text-neutral-500">
                    추천 화면을 준비하고 있어요.
                </p>
            </main>
        );
    }

    return (
        <main
            className="mx-auto max-w-[1280px] px-4 py-8 md:px-6"
            data-recommendations-page
            data-recommendation-mode={mode}
            data-recommendation-full-page-enabled={personalizationEnabled}
        >
            <header className="rounded-[32px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-amber-50 p-6 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-sm font-black text-indigo-700">RECOMMENDATIONS</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">
                            {personalizedAvailable ? `${selectedPet?.name || "우리 아이"} 맞춤 추천` : "댕다방 추천 셀렉트"}
                        </h1>
                        <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                            {!personalizationEnabled
                                ? "현재는 회원 정보를 사용하지 않는 댕다방 편집 추천을 보여드려요."
                                : !user
                                ? "로그인하면 등록한 반려견과 직접 선택한 데이터 사용 설정을 기준으로 추천해 드려요."
                                : !selectedPet
                                    ? "반려견 프로필을 등록하면 체형·활동량·관심사를 반영할 수 있어요."
                                    : !preferences
                                        ? preferenceState.errorMessage || "추천 데이터 설정을 안전하게 확인하고 있어요."
                                        : !preferences.enabled
                                            ? "맞춤 추천이 꺼져 있어 회원 정보를 사용하지 않는 편집 추천만 보여드려요."
                                            : result?.mode === "personalized"
                                                ? "프로필과 사용에 동의한 펫렌즈 케어 신호를 함께 반영했어요."
                                                : "등록한 프로필만 사용하고 펫렌즈 분석 원문은 반영하지 않았어요."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-black text-indigo-800">
                                {MODE_LABEL[mode]}
                            </span>
                            <span className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-black text-emerald-800">
                                질환·치료 효능을 추천 이유로 사용하지 않음
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                        {personalizationEnabled && user && preferences && selectedPet ? (
                            <RecommendationPetSelector
                                pets={user.pets}
                                selectedPetProfileId={selectedPet.apiProfileId ?? null}
                                disabled={!preferenceState.isReady || preferenceState.isSaving}
                                onSelect={(profileId) => void selectPet(profileId)}
                            />
                        ) : null}
                        {RECOMMENDATION_FEATURE_FLAGS.preferences ? (
                            <Link href="/mypage/recommendations/" className="text-sm font-black text-indigo-700 hover:underline">
                                추천 데이터 관리
                            </Link>
                        ) : null}
                    </div>
                </div>
            </header>

            {!personalizationEnabled ? null : !user ? (
                <ActionNotice
                    title="로그인 후 맞춤 추천을 켤 수 있어요"
                    description="비회원에게는 회원·반려견 정보를 사용하지 않는 편집 추천만 표시합니다."
                    href="/auth/login/?redirect=%2Frecommendations%2F"
                    label="로그인"
                />
            ) : !selectedPet ? (
                <ActionNotice
                    title="반려견 프로필을 먼저 등록해 주세요"
                    description="프로필이 없어도 아래 편집 추천과 일반 쇼핑은 계속 이용할 수 있어요."
                    href="/mypage/#pet-profiles"
                    label="프로필 등록"
                />
            ) : !preferences ? (
                <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status">
                    <p className="font-black text-amber-950">{preferenceState.errorMessage || "추천 설정 확인 중"}</p>
                    <p className="mt-1 text-sm font-bold leading-6 text-amber-900">
                        확인 전에는 회원 정보를 사용하지 않고 편집 추천만 표시합니다.
                    </p>
                    {preferenceState.status === "error" ? (
                        <button type="button" onClick={() => void preferenceState.refresh()} className="btn btn-secondary mt-3">
                            다시 확인
                        </button>
                    ) : null}
                </section>
            ) : !preferences.enabled ? (
                <ActionNotice
                    title="맞춤 추천이 꺼져 있어요"
                    description="설정을 켜기 전에는 회원 정보를 사용하지 않는 편집 추천만 표시합니다."
                    href="/mypage/recommendations/"
                    label="설정 확인"
                />
            ) : null}

            {preferenceState.errorMessage && preferences ? (
                <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-900" role="status">
                    {preferenceState.errorMessage}
                </p>
            ) : null}
            {result?.notices.map((notice) => (
                <p key={notice} className="mt-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-black leading-5 text-sky-900">
                    {notice}
                </p>
            ))}

            {items.length > 0 ? (
                <div data-recommendation-run={recommendationAnalytics.runId} className="mt-8 grid gap-10">
                    {groupItems(items).map(([reason, groupedItems]) => (
                        <section key={reason} aria-labelledby={`recommendation-group-${reason}`}>
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h2 id={`recommendation-group-${reason}`} className="text-xl font-black text-neutral-950">
                                    {GROUP_TITLE[reason]}
                                </h2>
                                <span className="text-xs font-black text-neutral-400">{groupedItems.length}개</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-6">
                                {groupedItems.map((item) => (
                                    <RecommendationProductCard
                                        key={item.product.id}
                                        item={item}
                                        onProductClick={recommendationAnalytics.trackProductClick}
                                        onReasonOpened={recommendationAnalytics.trackReasonOpened}
                                        onHide={recommendationAnalytics.hideProduct}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            ) : baseItems.length > 0 ? (
                <section className="mt-8 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
                    <h2 className="text-xl font-black text-neutral-950">이 추천 묶음의 상품을 모두 숨겼어요.</h2>
                    <button type="button" className="mt-4 btn btn-secondary" onClick={recommendationAnalytics.resetHidden}>
                        숨긴 상품 다시 보기
                    </button>
                </section>
            ) : (
                <section className="mt-8 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
                    <h2 className="text-xl font-black text-neutral-950">현재 안전 기준을 통과한 추천 상품이 없어요.</h2>
                    <p className="mt-2 text-sm font-bold text-neutral-600">프로필을 수정하거나 전체 상품을 직접 둘러볼 수 있어요.</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Link href="/mypage/#pet-profiles" className="btn btn-secondary">프로필 수정</Link>
                        <Link href="/products/" className="btn btn-primary">전체 상품 보기</Link>
                    </div>
                </section>
            )}
        </main>
    );
}

function ActionNotice({
    title,
    description,
    href,
    label,
}: {
    title: string;
    description: string;
    href: string;
    label: string;
}) {
    return (
        <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="font-black text-neutral-950">{title}</h2>
                <p className="mt-1 text-sm font-bold leading-6 text-neutral-600">{description}</p>
            </div>
            <Link href={href} className="btn btn-primary shrink-0 self-start sm:self-auto">{label}</Link>
        </section>
    );
}
