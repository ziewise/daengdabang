"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import WeeklyPhotoComparison from "@/components/my-pet/WeeklyPhotoComparison";
import { useAuth } from "@/lib/store";
import {
    loadWeeklyPhotoAnalyses,
    type WeeklyPhotoAnalysisRecord,
} from "@/lib/weekly-photo-analysis";

function formatDate(value?: string) {
    if (!value) return "아직 기록 없음";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "기록 날짜 확인 필요";
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export default function MyPetHub() {
    const { hydrated, user } = useAuth();
    const [selectedPetId, setSelectedPetId] = useState<number | undefined>();
    const [weeklyState, setWeeklyState] = useState<{
        profileId?: number;
        items: WeeklyPhotoAnalysisRecord[];
        loading: boolean;
        error?: string;
    }>({ items: [], loading: false });
    const pet = user?.pets.find((candidate) => candidate.apiProfileId === selectedPetId) || user?.pets[0];
    const petProfileId = pet?.apiProfileId;
    const accessToken = user?.apiAccessToken;
    const weeklyHistory = weeklyState.profileId === petProfileId ? weeklyState.items : [];
    const weeklyLoading = Boolean(petProfileId && accessToken)
        && (weeklyState.profileId !== petProfileId || weeklyState.loading);
    const latestWeekly = weeklyHistory[0];
    const previousWeekly = weeklyHistory[1];

    useEffect(() => {
        const profileId = Number(new URLSearchParams(window.location.search).get("profile"));
        const timer = window.setTimeout(() => {
            if (Number.isInteger(profileId) && profileId > 0 && user?.pets.some((item) => item.apiProfileId === profileId)) {
                setSelectedPetId(profileId);
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [user?.pets]);

    useEffect(() => {
        if (!petProfileId || !accessToken) return;
        let active = true;
        const timer = window.setTimeout(() => {
            if (!active) return;
            setWeeklyState({ profileId: petProfileId, items: [], loading: true });
            void loadWeeklyPhotoAnalyses({
                petProfileId,
                accessToken,
                limit: 8,
            }).then((items) => {
                if (active) setWeeklyState({ profileId: petProfileId, items, loading: false });
            }).catch(() => {
                if (active) setWeeklyState({
                    profileId: petProfileId,
                    items: [],
                    loading: false,
                    error: "주간 사진 기록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
                });
            });
        }, 0);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [accessToken, petProfileId]);

    if (!hydrated) {
        return <main className="mx-auto grid min-h-[50vh] w-full max-w-[1280px] place-items-center px-4 py-10 text-sm font-black text-neutral-500">우리 아이 기록을 불러오는 중입니다.</main>;
    }

    if (!user) {
        return (
            <main className="mx-auto w-full max-w-[900px] px-4 py-16 text-center md:px-6">
                <div className="ddb-crayon-paper rounded-[32px] border p-8 shadow-card md:p-12">
                    <span className="ddb-crayon-icon mx-auto grid h-16 w-16 place-items-center rounded-3xl text-2xl text-white" data-crayon-tone="teal"><i className="fa-solid fa-dog" /></span>
                    <h1 className="ddb-crayon-title mt-5 text-3xl text-neutral-950">우리 아이 기록은 로그인 후 볼 수 있어요</h1>
                    <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">선택한 우리 아이의 주간 사진 분석과 변화 기록을 회원 계정에 안전하게 연결합니다.</p>
                    <Link href="/auth/login/?redirect=%2Fmy-pet" className="ddb-crayon-link mt-6 inline-flex min-h-11 items-center rounded-full px-6 text-sm font-black">로그인하기</Link>
                </div>
            </main>
        );
    }

    if (!pet) {
        return (
            <main className="mx-auto w-full max-w-[900px] px-4 py-16 text-center md:px-6">
                <div className="ddb-crayon-paper rounded-[32px] border p-8 shadow-card md:p-12">
                    <h1 className="ddb-crayon-title text-3xl text-neutral-950">먼저 우리 아이를 등록해 주세요</h1>
                    <p className="mt-3 text-sm font-bold text-neutral-600">프로필이 생기면 주간 사진 분석과 건강 관찰 기록이 이곳에 차곡차곡 쌓입니다.</p>
                    <Link href="/mypage/?profile=required#pet-profiles" className="ddb-crayon-link mt-6 inline-flex min-h-11 items-center rounded-full px-6 text-sm font-black">반려견 등록하기</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6 md:py-14" data-my-pet-hub>
            <header className="ddb-crayon-paper flex flex-col gap-5 rounded-[30px] border p-5 shadow-card md:flex-row md:items-center md:justify-between md:p-8">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[26px] border-4 border-white bg-white shadow-lg md:h-24 md:w-24">
                        {pet.photoDataUrl ? (
                            <Image src={pet.photoDataUrl} alt={`${pet.name} 프로필`} fill sizes="96px" className="object-cover" unoptimized />
                        ) : (
                            <span className="ddb-crayon-icon grid h-full place-items-center text-3xl text-white" data-crayon-tone="teal"><i className="fa-solid fa-dog" /></span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="ddb-crayon-kicker text-xs">MY PET WEEKLY HISTORY</p>
                        <h1 className="ddb-crayon-title ddb-crayon-underline mt-2 truncate text-3xl text-neutral-950 md:text-4xl">{pet.name}의 기록</h1>
                        <p className="mt-1 text-sm font-bold text-neutral-600">{pet.breed || "견종 확인 전"} · {pet.weightKg ? `${pet.weightKg}kg` : "체중 기록 전"}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {user.pets.filter((item) => item.apiProfileId).map((item) => (
                        <button key={item.apiProfileId} type="button" onClick={() => setSelectedPetId(item.apiProfileId)} className={`rounded-full px-4 py-2 text-xs font-black ${item.apiProfileId === pet.apiProfileId ? "ddb-crayon-link" : "border border-neutral-200 bg-white text-neutral-700"}`}>
                            {item.name}
                        </button>
                    ))}
                </div>
            </header>

            <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="우리 아이 주간 요약">
                {[
                    ["최근 주간 사진", formatDate(latestWeekly?.analyzedAt), "fa-camera-retro", "teal"],
                    ["주간 비교 기록", `${weeklyHistory.length}개`, "fa-chart-line", "coral"],
                    ["관심 케어", pet.concerns[0] || "아직 선택 전", "fa-heart", "orange"],
                ].map(([label, value, icon, tone]) => (
                    <article key={label} className="ddb-crayon-paper rounded-3xl border p-5 text-neutral-800">
                        <span className="ddb-crayon-icon grid h-10 w-10 place-items-center rounded-xl text-white" data-crayon-tone={tone}>
                            <i className={`fa-solid ${icon} text-sm`} aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-xs font-black opacity-70">{label}</p>
                        <strong className="mt-1 block text-lg font-black">{value}</strong>
                    </article>
                ))}
            </section>

            <section id="health-report" className="mt-8 scroll-mt-28" aria-labelledby="health-report-title">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="ddb-crayon-kicker text-xs">AI 주간 사진 변화 리포트</p>
                        <h2 id="health-report-title" className="ddb-crayon-title ddb-crayon-underline mt-2 text-2xl text-neutral-950">매주 같은 방향으로 비교해요</h2>
                        <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-neutral-600">새로 촬영한 사진은 선택한 {pet.name}의 주간 기록으로만 저장되며, 최초 등록 사진을 덮어쓰지 않습니다.</p>
                    </div>
                    {pet.apiProfileId && accessToken && (
                        <WeeklyPhotoComparison
                            key={pet.apiProfileId}
                            pet={pet}
                            history={weeklyHistory}
                            onCompleted={(record) => setWeeklyState((current) => ({
                                profileId: pet.apiProfileId,
                                loading: false,
                                items: [record, ...current.items.filter((item) => item.id !== record.id)].slice(0, 8),
                            }))}
                        />
                    )}
                </div>

                {weeklyState.error && weeklyState.profileId === petProfileId && (
                    <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700" role="alert">{weeklyState.error}</p>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <article className="ddb-crayon-paper rounded-[26px] border p-5 shadow-card">
                        <p className="ddb-crayon-kicker text-xs">이번 주 사진 분석</p>
                        {weeklyLoading ? (
                            <p className="mt-3 text-sm font-bold text-neutral-500">주간 사진 기록을 불러오는 중입니다.</p>
                        ) : latestWeekly ? (
                            <>
                                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black"><span className="rounded-full bg-cyan-50 px-3 py-1.5 text-cyan-800">{latestWeekly.viewCount}방향</span><span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">{latestWeekly.photoQualityLabel}</span></div>
                                <h3 className="mt-3 text-lg font-black text-neutral-950">{latestWeekly.title || "저장된 주간 사진 분석"}</h3>
                                <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{latestWeekly.description}</p>
                                <ul className="mt-4 grid gap-2 text-sm font-bold text-neutral-700">
                                    {(latestWeekly.careActions.length ? latestWeekly.careActions : latestWeekly.observations).slice(0, 4).map((item) => <li key={item} className="flex gap-2"><i className="fa-solid fa-check mt-1 text-[10px] text-emerald-600" /><span>{item}</span></li>)}
                                </ul>
                            </>
                        ) : (
                            <div className="mt-3 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 p-5 text-center"><i className="fa-solid fa-camera text-2xl text-cyan-600" /><p className="mt-2 text-sm font-black text-neutral-800">실시간 카메라로 이번 주 첫 사진을 남겨 보세요.</p><p className="mt-1 text-xs font-bold leading-5 text-neutral-500">촬영 화면, 방향별 썸네일, 업로드 진행률을 직접 확인할 수 있어요.</p></div>
                        )}
                    </article>

                    <article className="ddb-crayon-paper rounded-[26px] border p-5 shadow-card">
                        <p className="ddb-crayon-kicker text-xs">이전 주와 비교</p>
                        {latestWeekly ? (
                            <>
                                <h3 className="mt-3 text-lg font-black text-neutral-950">{latestWeekly.comparison.headline}</h3>
                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black">
                                    <div className="rounded-xl bg-violet-50 p-3"><span className="block text-violet-600">최근</span><strong className="mt-1 block text-neutral-900">{formatDate(latestWeekly.analyzedAt)}</strong></div>
                                    <div className="rounded-xl bg-neutral-50 p-3"><span className="block text-neutral-500">이전</span><strong className="mt-1 block text-neutral-900">{formatDate(latestWeekly.comparison.previousAnalyzedAt || previousWeekly?.analyzedAt)}</strong></div>
                                </div>
                                {latestWeekly.comparison.status === "ready" ? (
                                    <ul className="mt-4 grid gap-2 text-xs font-bold text-neutral-700">
                                        {latestWeekly.comparison.newObservations.slice(0, 2).map((item) => <li key={item} className="flex gap-2"><i className="fa-solid fa-sparkles mt-0.5 text-orange-500" /><span>새로 확인: {item}</span></li>)}
                                        {latestWeekly.comparison.commonObservations.slice(0, 2).map((item) => <li key={item} className="flex gap-2"><i className="fa-solid fa-equals mt-0.5 text-teal-600" /><span>공통 확인: {item}</span></li>)}
                                    </ul>
                                ) : <p className="mt-4 text-xs font-bold leading-5 text-neutral-500">다음 주 같은 방향 사진이 쌓이면 변화 여부를 단정하지 않고 확인된 항목만 비교합니다.</p>}
                            </>
                        ) : (
                            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">첫 주간 분석은 비교 기준이 되고, 다음 기록부터 이전 주와 나란히 표시됩니다.</p>
                        )}
                    </article>
                </div>

                {weeklyHistory.length > 0 && (
                    <div className="mt-4 rounded-[26px] border bg-white/80 p-4 sm:p-5" data-weekly-photo-history>
                        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black text-neutral-900">주간 사진 히스토리</h3><span className="text-[10px] font-black text-neutral-500">최근 {weeklyHistory.length}회</span></div>
                        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {weeklyHistory.slice(0, 4).map((item, index) => <li key={item.id} className="rounded-2xl border bg-white p-3"><span className="text-[10px] font-black text-violet-600">{index === 0 ? "최근" : `${index + 1}번째`}</span><strong className="mt-1 block text-xs font-black text-neutral-900">{formatDate(item.analyzedAt)}</strong><p className="mt-1 line-clamp-2 text-[10px] font-bold leading-4 text-neutral-500">{item.title}</p></li>)}
                        </ol>
                    </div>
                )}

                <p className="mt-3 text-xs font-bold leading-5 text-neutral-500">이 리포트는 사진에서 확인된 관찰 항목을 정리하며, 촬영 조건에 따라 달라질 수 있고 수의학적 진단을 대신하지 않습니다.</p>
            </section>

            <section className="ddb-crayon-paper mt-8 flex flex-col gap-4 rounded-[28px] border p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-labelledby="independent-observation-title">
                <div className="flex items-start gap-4">
                    <span className="ddb-crayon-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white" data-crayon-tone="coral"><i className="fa-solid fa-wave-square" /></span>
                    <div><p className="ddb-crayon-kicker text-xs">별도 기능</p><h2 id="independent-observation-title" className="mt-1 text-lg font-black text-neutral-950">행동·소리 분석은 등록한 우리 아이와 별개예요</h2><p className="mt-1 max-w-2xl text-sm font-bold leading-6 text-neutral-600">궁금한 강아지의 행동·소리 영상을 관찰하는 독립 기능이며, 주간 사진 변화 기록과 섞이지 않습니다.</p></div>
                </div>
                <Link href="/pet-lens/?mode=observation#observation" className="ddb-crayon-link inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-5 text-sm font-black">행동·소리 분석 열기</Link>
            </section>
        </main>
    );
}
