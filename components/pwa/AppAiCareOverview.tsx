"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    loadPetObservationEngineStatus,
    loadPetObservationHistory,
    type PetObservationHistoryItem,
    type PetObservationUrgencyLevel,
} from "@/lib/petlens-observation";
import { petLensProfileHref } from "@/lib/petlens-routing";
import { useAuth, type PetProfile } from "@/lib/store";
import {
    loadWeeklyPhotoAnalyses,
    type WeeklyPhotoAnalysisRecord,
} from "@/lib/weekly-photo-analysis";

type CareState = {
    profileId?: number;
    loading: boolean;
    weekly: WeeklyPhotoAnalysisRecord[];
    observations: PetObservationHistoryItem[];
    engine: "checking" | "ready" | "delayed";
    failedSections: number;
};

const INITIAL_STATE: CareState = {
    loading: false,
    weekly: [],
    observations: [],
    engine: "checking",
    failedSections: 0,
};

function formatCareDate(value?: string) {
    if (!value) return "아직 기록 없음";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "기록 날짜 확인 필요";
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function photoStatus(pet: PetProfile) {
    if (!pet.lastAnalyzedAt) return "첫 사진 분석을 시작해 보세요";
    const raw = pet.rawAnalysis;
    const details = raw?.details;
    if (details && typeof details === "object" && !Array.isArray(details)) {
        const status = (details as Record<string, unknown>).statusLabel;
        if (typeof status === "string" && status.trim()) return status.trim().slice(0, 40);
    }
    return "최근 사진 분석이 저장되어 있어요";
}

function urgencyCopy(level: PetObservationUrgencyLevel) {
    if (level === "emergency") return "즉시 확인 권고 기록";
    if (level === "same_day") return "당일 확인 권고 기록";
    if (level === "observe") return "지켜보기 기록";
    return "추가 관찰이 필요한 기록";
}

function availablePets(pets: PetProfile[]) {
    return pets.filter((pet): pet is PetProfile & { apiProfileId: number } => (
        Number.isInteger(pet.apiProfileId) && Number(pet.apiProfileId) > 0
    ));
}

export default function AppAiCareOverview() {
    const { hydrated, user } = useAuth();
    const pets = useMemo(() => availablePets(user?.pets || []), [user?.pets]);
    const [selectedPetId, setSelectedPetId] = useState<number | undefined>();
    const [reloadVersion, setReloadVersion] = useState(0);
    const [state, setState] = useState<CareState>(INITIAL_STATE);
    const activePet = pets.find((pet) => pet.apiProfileId === selectedPetId) || pets[0];
    const activePetId = activePet?.apiProfileId;
    const accessToken = user?.apiAccessToken;

    const refresh = useCallback(() => setReloadVersion((current) => current + 1), []);

    useEffect(() => {
        if (!activePetId || !accessToken) return;
        let active = true;
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            if (!active) return;
            setState((current) => ({
                ...current,
                profileId: activePetId,
                loading: true,
                engine: "checking",
                failedSections: 0,
            }));

            void Promise.allSettled([
                loadWeeklyPhotoAnalyses({ petProfileId: activePetId, accessToken, limit: 8 }),
                loadPetObservationHistory({
                    petProfileId: activePetId,
                    accessToken,
                    limit: 8,
                    signal: controller.signal,
                }),
                loadPetObservationEngineStatus(controller.signal),
            ]).then(([weeklyResult, observationResult, engineResult]) => {
                if (!active) return;
                const failedSections = [weeklyResult, observationResult, engineResult]
                    .filter((result) => result.status === "rejected").length;
                setState({
                    profileId: activePetId,
                    loading: false,
                    weekly: weeklyResult.status === "fulfilled" ? weeklyResult.value : [],
                    observations: observationResult.status === "fulfilled" ? observationResult.value : [],
                    engine: engineResult.status === "fulfilled" && engineResult.value.ready ? "ready" : "delayed",
                    failedSections,
                });
            });
        }, 0);

        return () => {
            active = false;
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [accessToken, activePetId, reloadVersion]);

    if (!hydrated || !user) return null;

    if (!activePet) {
        return (
            <section className="mt-6 rounded-[1.75rem] border border-dashed border-cyan-200 bg-white/85 p-6 text-center shadow-sm" data-app-ai-care-overview>
                <span className="ddb-crayon-icon mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white" data-crayon-tone="teal">
                    <i className="fa-solid fa-dog" aria-hidden="true" />
                </span>
                <h2 className="ddb-crayon-title mt-3 text-2xl text-slate-950">우리 아이부터 연결해 주세요</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-600">프로필을 등록하면 사진·주간 변화·행동과 소리 분석 기록을 앱 홈에서 함께 볼 수 있어요.</p>
                <Link href="/mypage/?petProfile=required#pet-profiles" className="ddb-crayon-link mt-4 inline-flex min-h-11 items-center rounded-xl px-5 text-sm">
                    반려견 등록하기
                </Link>
            </section>
        );
    }

    const currentState = state.profileId === activePetId ? state : { ...INITIAL_STATE, loading: true };
    const latestWeekly = currentState.weekly[0];
    const latestObservation = currentState.observations[0];
    const photoHref = petLensProfileHref(activePetId);
    const observationHref = `/pet-lens/?profile=${activePetId}&mode=observation#observation`;
    const weeklyHref = `/my-pet/?profile=${activePetId}#health-report`;

    return (
        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 shadow-sm sm:p-7" data-app-ai-care-overview aria-labelledby="app-ai-care-title">
            <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-violet-200/35 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="ddb-crayon-kicker text-xs">DDB AI CARE</p>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${
                            currentState.engine === "ready"
                                ? "bg-emerald-100 text-emerald-800"
                                : currentState.engine === "checking"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-amber-100 text-amber-800"
                        }`} data-ai-engine-status={currentState.engine}>
                            <span className={`h-1.5 w-1.5 rounded-full ${currentState.engine === "ready" ? "bg-emerald-500 motion-safe:animate-pulse" : currentState.engine === "checking" ? "bg-slate-400" : "bg-amber-500"}`} />
                            {currentState.engine === "ready" ? "행동·소리 분석 연결됨" : currentState.engine === "checking" ? "분석 연결 확인 중" : "행동·소리 분석 지연"}
                        </span>
                    </div>
                    <h2 id="app-ai-care-title" className="ddb-crayon-title mt-2 text-2xl text-slate-950 sm:text-3xl">{activePet.name}의 AI 케어 한눈에</h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-600">사진과 생활 기록에서 확인된 관찰만 모아 보여드려요. 의료 진단을 대신하지 않습니다.</p>
                </div>

                {pets.length > 1 && (
                    <label className="shrink-0 text-xs font-black text-indigo-900">
                        <span className="mb-1.5 block">우리 아이 선택</span>
                        <select
                            value={activePetId}
                            onChange={(event) => setSelectedPetId(Number(event.target.value))}
                            className="input min-h-11 min-w-36 bg-white"
                            aria-label="AI 케어를 확인할 반려견"
                        >
                            {pets.map((pet) => <option key={pet.apiProfileId} value={pet.apiProfileId}>{pet.name}</option>)}
                        </select>
                    </label>
                )}
            </div>

            {currentState.failedSections > 0 && !currentState.loading && (
                <div className="relative mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="status">
                    <p className="text-xs font-bold leading-5 text-amber-900">일부 기록이 늦어지고 있어요. 불러온 기록은 그대로 확인할 수 있습니다.</p>
                    <button type="button" onClick={refresh} className="min-h-9 shrink-0 rounded-xl border border-amber-300 bg-white px-3 text-xs font-black text-amber-900">
                        <i className="fa-solid fa-rotate-right mr-1.5" aria-hidden="true" />다시 불러오기
                    </button>
                </div>
            )}

            <div className="relative mt-5 grid gap-3 md:grid-cols-3" aria-busy={currentState.loading}>
                <CareCard
                    href={photoHref}
                    icon="fa-camera-retro"
                    tone="teal"
                    label="최근 사진 분석"
                    value={photoStatus(activePet)}
                    detail={formatCareDate(activePet.lastAnalyzedAt)}
                    action={activePet.lastAnalyzedAt ? "다시 분석" : "사진 분석 시작"}
                    loading={currentState.loading}
                />
                <CareCard
                    href={weeklyHref}
                    icon="fa-chart-line"
                    tone="orange"
                    label="주간 변화 기록"
                    value={latestWeekly ? latestWeekly.comparison.headline : "같은 방향 사진을 쌓아 비교해요"}
                    detail={currentState.loading ? "최근 기록 확인 중" : currentState.weekly.length ? `최근 ${currentState.weekly.length}회 · ${formatCareDate(latestWeekly?.analyzedAt)}` : "첫 주간 기록을 기다리고 있어요"}
                    action="주간 비교 보기"
                    loading={currentState.loading}
                />
                <CareCard
                    href={observationHref}
                    icon="fa-wave-square"
                    tone="coral"
                    label="행동·소리 관찰"
                    value={latestObservation ? urgencyCopy(latestObservation.result.urgency.level) : "행동과 소리의 맥락을 기록해요"}
                    detail={currentState.loading ? "최근 기록 확인 중" : currentState.observations.length ? `최근 ${currentState.observations.length}회 · ${formatCareDate(latestObservation?.createdAt)}` : "아직 분석 기록이 없어요"}
                    action="새 관찰 시작"
                    loading={currentState.loading}
                />
            </div>

            <div className="relative mt-4 flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold leading-5 text-slate-600"><strong className="text-slate-900">무엇을 먼저 해야 할지 고민되나요?</strong> 저장된 우리 아이 정보를 바탕으로 CareTalk에 물어보세요.</p>
                <Link href="/chat/" className="ddb-crayon-link inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs">
                    <i className="fa-solid fa-comment-dots" aria-hidden="true" />CareTalk 열기
                </Link>
            </div>
        </section>
    );
}

function CareCard({
    href,
    icon,
    tone,
    label,
    value,
    detail,
    action,
    loading,
}: {
    href: string;
    icon: string;
    tone: "teal" | "orange" | "coral";
    label: string;
    value: string;
    detail: string;
    action: string;
    loading: boolean;
}) {
    return (
        <Link href={href} className="ddb-motion-lift group flex min-h-52 flex-col rounded-[1.5rem] border border-white/90 bg-white/90 p-4 shadow-sm" data-ai-care-card={label}>
            <div className="flex items-start justify-between gap-3">
                <span className="ddb-crayon-icon grid h-10 w-10 place-items-center rounded-xl text-white" data-crayon-tone={tone}>
                    <i className={`fa-solid ${icon}`} aria-hidden="true" />
                </span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-[11px] font-black text-slate-500">{label}</p>
            {loading ? (
                <div className="mt-2 space-y-2" aria-label={`${label} 불러오는 중`}>
                    <span className="block h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                    <span className="block h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                </div>
            ) : (
                <>
                    <strong className="mt-1 line-clamp-2 text-sm font-black leading-5 text-slate-900">{value}</strong>
                    <span className="mt-2 text-[11px] font-bold leading-4 text-slate-500">{detail}</span>
                </>
            )}
            <span className="mt-auto pt-4 text-xs font-black text-[#07849e]">{action} <i className="fa-solid fa-arrow-right ml-1 text-[9px] transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
        </Link>
    );
}
