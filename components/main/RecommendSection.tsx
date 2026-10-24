"use client";

import Image from "next/image";
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
                        {/* 제목 — 다른 메인 구역(핫픽 · 대표 브랜드 · 신상품)과 같은 모양: 짧은 이름 + 아래 회색 한 줄(2026-10-23 사용자) */}
                        <h2 className="mb-1.5 text-2xl font-black tracking-tight md:text-3xl">
                            {personalizationEnabled && selectedPet && preferences?.enabled
                                ? `${petName}를 위한 추천`
                                : "댕다방 추천 셀렉트"}
                        </h2>
                        {!personalizationEnabled ? (
                            <p className="text-sm text-neutral-500">
                                현재는 회원 정보를 사용하지 않는 댕다방 편집 추천을 보여드려요.
                            </p>
                        ) : !selectedPet ? (
                            <p className="text-sm text-neutral-500">
                                반려견 프로필을 등록하면 체형·활동량·관심 케어를 반영할 수 있어요.
                            </p>
                        ) : !preferences ? (
                            <p className="text-sm text-neutral-500">
                                {preferenceState.errorMessage || "추천 데이터 설정을 안전하게 확인하고 있어요."}
                            </p>
                        ) : !preferences.enabled ? (
                            <p className="text-sm text-neutral-500">
                                맞춤 추천이 꺼져 있어 회원 정보가 아닌 편집 추천만 보여드려요.
                            </p>
                        ) : (
                            <p className="text-sm text-neutral-500">
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
                            // 점선 공용 링크(ddb-crayon-link) 대신 크레파스 테 알약 — 이 단추만(2026-10-23 사용자)
                            // ddb-more-pill — 웹에서는 흰 입체 쿠션 "더 보기" 알약(2026-10-24, app/globals.css)
                            className="ddb-more-pill inline-flex items-center gap-1.5 rounded-full bg-[#fffaf1] px-5 py-2.5 text-xs text-[#d9577f] shadow-[0_0_0_2.5px_#f3d9b8] transition [font-family:var(--font-jua),var(--font-wanted-sans),sans-serif] hover:shadow-[0_0_0_2.5px_#f7a8bf] md:text-sm"
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

                {/* 설정 저장 오류 띠 — 설정을 아예 못 불러온 경우는 제목 아래 같은 문구가 이미 있어 한 번만(2026-10-23 사용자) */}
                {personalizationEnabled && preferenceState.errorMessage && selectedPet && preferences ? (
                    <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-900" role="status">
                        {preferenceState.errorMessage}
                    </p>
                ) : null}
                {personalizationEnabled && personalizedResult?.notices.map((notice) => (
                    // data-rec-notice — 웹은 아래 빈 상태 카드와 내용이 겹쳐 숨김(2026-10-24 사용자, app/globals.css)
                    <p key={notice} className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-black leading-5 text-sky-900" data-rec-notice>
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
                    <RecommendEmptyCard
                        art="/images/ui/hotpick-life-128.webp"
                        title="이 추천 묶음의 상품을 모두 숨겼어요."
                        body="숨긴 상품을 다시 보거나 전체 상품에서 직접 골라 보세요."
                    >
                        <button type="button" className={EMPTY_ACTION_CLASS} onClick={recommendationAnalytics.resetHidden}>
                            숨긴 상품 다시 보기 <i className="fa-solid fa-rotate-left text-[11px]" aria-hidden="true" />
                        </button>
                    </RecommendEmptyCard>
                ) : (
                    <RecommendEmptyCard
                        art="/images/ui/web-no-match-192.webp"
                        title="현재 안전 기준을 통과한 맞춤 상품이 없어요."
                        body="추천할 상품을 꼼꼼히 살펴보는 중이에요. 그동안 전체 상품에서 직접 둘러봐 주세요."
                    >
                        <Link href="/products/" className={EMPTY_ACTION_CLASS}>
                            전체 상품 직접 보기 <i className="fa-solid fa-arrow-right text-[11px]" aria-hidden="true" />
                        </Link>
                    </RecommendEmptyCard>
                )}
            </div>
        </section>
    );
}

// 추천이 비었을 때 안내 카드(2026-10-23 사용자 "전혀 어울리지 않아") — 점선 회색 상자 대신
// 연보라 쿠션 판(2026-10-24 — 크림은 바로 아래 상품 사진 액자 색과 같아 구분이 안 됨) + 흰 3D 그림 동그라미 + 주아 제목 + 짧은 설명 + 분홍 알약 단추. 문구 뜻 · 연결은 그대로
const EMPTY_ACTION_CLASS = "inline-flex items-center gap-2 rounded-full bg-[#e9789a] px-5 py-2.5 text-sm font-black text-white shadow-[inset_0_3px_0_rgba(255,255,255,0.3),0_12px_20px_-12px_rgba(200,80,120,0.65)] transition hover:-translate-y-0.5 hover:bg-[#e2557a]";

function RecommendEmptyCard({ art, title, body, children }: { art: string; title: string; body: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-5 rounded-[36px] bg-[#f3f0fe] px-6 py-8 text-center shadow-[inset_0_3px_0_rgba(255,255,255,0.9),inset_0_-10px_18px_rgba(0,0,0,0.03),0_20px_34px_-24px_rgba(107,81,201,0.4)] sm:flex-row sm:px-10 sm:text-left">
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-white shadow-[inset_0_-4px_0_rgba(107,81,201,0.06),0_10px_18px_-12px_rgba(107,81,201,0.45)]" aria-hidden="true">
                <Image src={art} alt="" width={64} height={64} className="h-16 w-16 object-contain" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-xl text-neutral-900 [font-family:var(--font-jua),var(--font-wanted-sans),sans-serif] md:text-2xl">{title}</p>
                <p className="mt-1.5 text-sm font-bold leading-6 text-neutral-500">{body}</p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}
