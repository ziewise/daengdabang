"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import { useRecommendationPreferences } from "@/hooks/useRecommendationPreferences";
import type { RecommendationPreferences } from "@/lib/customer-api";
import { RECOMMENDATION_FEATURE_FLAGS } from "@/lib/recommendation";
import { createRecommendationRunId, trackStorefrontEvent } from "@/lib/storefront-analytics";
import { useAuth, type PetProfile } from "@/lib/store";

export default function MypageRecommendationPreferencesPage() {
    const { hydrated, user } = useAuth();
    const preferenceState = useRecommendationPreferences();
    const [feedback, setFeedback] = useState("");
    const preferences = preferenceState.preferences;

    if (!hydrated) {
        return (
            <main className="mx-auto max-w-[680px] px-4 py-16 text-center" aria-busy="true">
                <p className="text-sm font-black text-neutral-500">회원 추천 설정을 확인하고 있어요.</p>
            </main>
        );
    }
    if (!user) return <MypageLoginGate redirect="/mypage/recommendations/" />;
    if (!RECOMMENDATION_FEATURE_FLAGS.preferences) {
        return (
            <MypageSectionLayout
                eyebrow="MY 정보"
                title="추천 데이터 관리"
                description="맞춤 추천 데이터 설정은 현재 단계적으로 준비하고 있습니다. 일반 쇼핑과 회원 정보 관리는 그대로 이용할 수 있습니다."
            >
                <section
                    className="surface p-5 md:p-6"
                    data-recommendation-preferences-page
                    data-recommendation-preferences-enabled="false"
                >
                    <h2 className="text-lg font-black text-neutral-950">추천 설정은 현재 비활성화되어 있어요</h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                        설정 API를 호출하거나 회원 정보를 추천에 사용하지 않습니다. 준비가 끝나면 이 화면에서 직접 켜고 끌 수 있어요.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link href="/products/" className="btn btn-primary">전체 상품 보기</Link>
                        <Link href="/privacy/" className="btn btn-secondary">개인정보 처리 안내</Link>
                    </div>
                </section>
            </MypageSectionLayout>
        );
    }

    const saveSetting = async (
        patch: Partial<Omit<RecommendationPreferences, "consentVersion">>,
        successMessage: string,
    ) => {
        setFeedback("");
        try {
            const saved = await preferenceState.save(patch);
            if (RECOMMENDATION_FEATURE_FLAGS.analytics) {
                trackStorefrontEvent("recommendation_preferences_updated", {
                    engineVersion: "recommendation-v1",
                    surface: "preferences",
                    mode: !saved.enabled
                        ? "disabled"
                        : saved.petLensSignalsEnabled ? "personalized" : saved.profileSignalsEnabled ? "profile_only" : "editorial_fallback",
                    runId: createRecommendationRunId(),
                    sourceSet: !saved.enabled || (!saved.profileSignalsEnabled && !saved.petLensSignalsEnabled)
                        ? "editorial"
                        : saved.petLensSignalsEnabled ? "profile+petlens" : "profile",
                    outcome: saved.enabled ? "enabled" : "disabled",
                });
            }
            setFeedback(successMessage);
        } catch {
            setFeedback("");
        }
    };
    const disabled = !preferenceState.isReady || preferenceState.isSaving;
    const selectablePets = user.pets.filter(
        (pet): pet is PetProfile & { apiProfileId: number } => (
            Number.isInteger(pet.apiProfileId) && Number(pet.apiProfileId) > 0
        ),
    );

    return (
        <MypageSectionLayout
            eyebrow="MY 정보"
            title="추천 데이터 관리"
            description="맞춤 추천에 사용할 정보와 기본 반려견을 직접 선택합니다. 설정을 꺼도 일반 쇼핑과 댕다방 편집 추천은 계속 이용할 수 있습니다."
        >
            <div
                className="grid gap-5"
                data-recommendation-preferences-page
                data-recommendation-preferences-enabled="true"
            >
                {!preferences ? (
                    <section className="surface p-5" role="status">
                        <h2 className="font-black text-neutral-950">
                            {preferenceState.status === "error" ? "추천 설정을 불러오지 못했어요" : "추천 설정 확인 중"}
                        </h2>
                        <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                            {preferenceState.errorMessage || "확인이 끝날 때까지 회원 정보를 추천에 사용하지 않습니다."}
                        </p>
                        {preferenceState.status === "error" ? (
                            <button type="button" onClick={() => void preferenceState.refresh()} className="btn btn-secondary mt-4">
                                다시 확인
                            </button>
                        ) : null}
                    </section>
                ) : (
                    <>
                        <section className="surface p-5 md:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black text-indigo-700">PERSONALIZATION</p>
                                    <h2 className="mt-1 text-xl font-black text-neutral-950">맞춤 추천 전체</h2>
                                    <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                                        끄면 아래 개별 선택과 관계없이 회원 정보를 추천에 사용하지 않습니다.
                                    </p>
                                </div>
                                <ToggleControl
                                    checked={preferences.enabled}
                                    disabled={disabled}
                                    label="맞춤 추천 전체"
                                    onChange={(checked) => void saveSetting(
                                        { enabled: checked },
                                        checked ? "맞춤 추천을 켰습니다." : "맞춤 추천을 껐습니다.",
                                    )}
                                />
                            </div>
                        </section>

                        <section className="surface divide-y divide-neutral-200 overflow-hidden">
                            <PreferenceRow
                                icon="fa-dog"
                                title="반려견 프로필"
                                description="등록한 체형, 생애단계, 활동량, 모질과 직접 선택한 관심사만 사용합니다."
                            >
                                <ToggleControl
                                    checked={preferences.profileSignalsEnabled}
                                    disabled={disabled}
                                    label="반려견 프로필 활용"
                                    onChange={(checked) => void saveSetting(
                                        { profileSignalsEnabled: checked },
                                        checked ? "프로필 활용을 켰습니다." : "프로필 활용을 껐습니다.",
                                    )}
                                />
                            </PreferenceRow>
                            <PreferenceRow
                                icon="fa-camera-retro"
                                title="펫렌즈 케어 신호"
                                description="켜면 사용 가능한 분석 결과에서 허용된 착용 실측·시인성·피모 관리 코드만 보조 신호로 사용합니다. 사진과 분석 원문은 추천 이유에 표시하지 않습니다."
                            >
                                <ToggleControl
                                    checked={preferences.petLensSignalsEnabled}
                                    disabled={disabled}
                                    label="펫렌즈 케어 신호 활용"
                                    onChange={(checked) => void saveSetting(
                                        { petLensSignalsEnabled: checked },
                                        checked ? "현재 동의 버전으로 펫렌즈 케어 신호 활용을 켰습니다." : "펫렌즈 케어 신호 활용을 껐습니다.",
                                    )}
                                />
                            </PreferenceRow>
                            <PreferenceRow
                                icon="fa-chart-line"
                                title="행동 데이터"
                                description="클릭·구매 행동 기반 개인화는 아직 사용하지 않습니다."
                            >
                                <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-500">
                                    준비 중 · 꺼짐
                                </span>
                            </PreferenceRow>
                        </section>

                        <section className="surface p-5 md:p-6">
                            <h2 className="text-lg font-black text-neutral-950">기본 추천 반려견</h2>
                            <p className="mt-1 text-sm font-bold leading-6 text-neutral-600">
                                홈과 전체 추천에서 먼저 보여줄 반려견을 선택합니다. 최근 분석 시각으로 자동 변경하지 않습니다.
                            </p>
                            {selectablePets.length > 0 ? (
                                <label className="mt-4 block max-w-md text-xs font-black text-neutral-600">
                                    반려견 선택
                                    <select
                                        value={preferences.selectedPetProfileId ?? selectablePets[0].apiProfileId}
                                        disabled={disabled}
                                        onChange={(event) => void saveSetting(
                                            { selectedPetProfileId: Number(event.target.value) },
                                            "기본 추천 반려견을 변경했습니다.",
                                        )}
                                        className="mt-1 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-black text-neutral-950 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {selectablePets.map((pet) => (
                                            <option key={pet.apiProfileId} value={pet.apiProfileId}>
                                                {pet.name || "우리 아이"}{pet.breed ? ` · ${pet.breed}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : (
                                <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm font-bold text-neutral-600">
                                    서버에 저장된 반려견 프로필이 없습니다. <Link href="/mypage/#pet-profiles" className="font-black text-indigo-700 hover:underline">프로필 등록하기</Link>
                                </div>
                            )}
                        </section>

                        <section className="surface p-5 md:p-6">
                            <h2 className="text-lg font-black text-neutral-950">현재 사용 상태</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {!preferences.enabled ? (
                                    <StatusChip label="편집 추천만 사용" tone="neutral" />
                                ) : (
                                    <>
                                        <StatusChip label={preferences.profileSignalsEnabled ? "프로필 사용" : "프로필 사용 안 함"} tone={preferences.profileSignalsEnabled ? "active" : "neutral"} />
                                        <StatusChip label={preferences.petLensSignalsEnabled ? "펫렌즈 허용 코드 사용" : "펫렌즈 사용 안 함"} tone={preferences.petLensSignalsEnabled ? "active" : "neutral"} />
                                        <StatusChip label="행동 데이터 사용 안 함" tone="neutral" />
                                    </>
                                )}
                            </div>
                            <p className="mt-4 text-xs font-bold leading-5 text-neutral-500">
                                동의 기준: {preferences.consentVersion}
                            </p>
                        </section>
                    </>
                )}

                {(feedback || preferenceState.errorMessage) ? (
                    <p
                        className={`rounded-xl border px-4 py-3 text-sm font-black ${preferenceState.errorMessage ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
                        role="status"
                    >
                        {preferenceState.errorMessage || feedback}
                    </p>
                ) : null}

                <section className="surface p-5 md:p-6">
                    <h2 className="text-lg font-black text-neutral-950">원본 데이터 확인·수정</h2>
                    <p className="mt-1 text-sm font-bold leading-6 text-neutral-600">
                        추천 화면에서는 원문을 보여주지 않습니다. 아래 각 관리 화면에서 직접 확인하거나 수정할 수 있습니다.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link href="/mypage/#pet-profiles" className="btn btn-secondary">반려견 프로필 수정</Link>
                        <Link href="/my-pet/#health-report" className="btn btn-secondary">분석 기록 확인</Link>
                        <Link href="/inquiry/?category=other#inquiry-form" className="btn btn-secondary">분석 결과 삭제 요청</Link>
                        <Link href="/privacy/" className="btn btn-secondary">개인정보 처리 안내</Link>
                    </div>
                </section>
            </div>
        </MypageSectionLayout>
    );
}

function PreferenceRow({
    icon,
    title,
    description,
    children,
}: {
    icon: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
            <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700" aria-hidden="true">
                    <i className={`fa-solid ${icon}`} />
                </span>
                <div>
                    <h3 className="font-black text-neutral-950">{title}</h3>
                    <p className="mt-1 max-w-2xl text-sm font-bold leading-6 text-neutral-600">{description}</p>
                </div>
            </div>
            <div className="shrink-0 self-start sm:self-auto">{children}</div>
        </div>
    );
}

function ToggleControl({
    checked,
    disabled,
    label,
    onChange,
}: {
    checked: boolean;
    disabled: boolean;
    label: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-black text-neutral-600">
            <span>{checked ? "켜짐" : "꺼짐"}</span>
            <input
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                aria-label={label}
            />
            <span className="relative h-7 w-12 rounded-full bg-neutral-300 transition peer-checked:bg-indigo-600 peer-disabled:cursor-wait peer-disabled:opacity-60 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" aria-hidden="true" />
        </label>
    );
}

function StatusChip({ label, tone }: { label: string; tone: "active" | "neutral" }) {
    return (
        <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${tone === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-neutral-50 text-neutral-600"}`}>
            {label}
        </span>
    );
}
