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

    // 웹 매일 댕생활 꾸밈(2026-10-22 사용자) — 안내 카드 · 프로필 판 · 파스텔 요약 · 리포트 카드 배치만 바꿈. 문구 · 링크 · 기록 동작 그대로.
    // 꾸밈 CSS 는 app/daily-web.css(웹 data-daily-web 범위). 앱의 /my-pet 은 앱 리포트 화면으로 가므로 이 화면은 웹 전용
    if (!hydrated) {
        return <main className="mx-auto grid min-h-[50vh] w-full max-w-[1280px] place-items-center px-4 py-10 text-sm font-black text-neutral-500" data-daily-web>우리 아이 기록을 불러오는 중입니다.</main>;
    }

    if (!user) {
        return (
            <main className="mx-auto w-full max-w-[860px] px-4 py-14 text-center md:px-6" data-daily-web>
                <div className="dw-gate dw-tint-sky">
                    <span className="dw-gate-art" aria-hidden="true">
                        <Image src="/images/ui/daily-hero-mypet-384.webp" alt="" width={170} height={170} priority />
                    </span>
                    <h1 className="ddb-crayon-title dw-h2">우리 아이 기록은 로그인 후 볼 수 있어요</h1>
                    <p className="dw-sub">선택한 우리 아이의 주간 사진 분석과 변화 기록을 회원 계정에 안전하게 연결합니다.</p>
                    <Link href="/auth/login/?redirect=%2Fmy-pet" className="ddb-crayon-link dw-pill dw-pill-main mt-6">로그인하기</Link>
                </div>
            </main>
        );
    }

    if (!pet) {
        return (
            <main className="mx-auto w-full max-w-[860px] px-4 py-14 text-center md:px-6" data-daily-web>
                <div className="dw-gate dw-tint-yellow">
                    <span className="dw-gate-art" aria-hidden="true">
                        <Image src="/images/ui/daily-care-256.webp" alt="" width={150} height={150} priority />
                    </span>
                    <h1 className="ddb-crayon-title dw-h2">먼저 우리 아이를 등록해 주세요</h1>
                    <p className="dw-sub">프로필이 생기면 주간 사진 분석과 건강 관찰 기록이 이곳에 차곡차곡 쌓입니다.</p>
                    <Link href="/mypage/?profile=required#pet-profiles" className="ddb-crayon-link dw-pill dw-pill-main mt-6">반려견 등록하기</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6 md:py-14" data-my-pet-hub data-daily-web>
            {/* 프로필 판 — 동그란 사진 액자 · 이름 · 견종/체중 칩, 오른쪽 아이 바꾸기 알약 + 수첩 그림 */}
            <header className="dw-profile dw-tint-mint">
                <div className="flex min-w-0 items-center gap-5">
                    <div className="dw-avatar">
                        {pet.photoDataUrl ? (
                            <Image src={pet.photoDataUrl} alt={`${pet.name} 프로필`} fill sizes="112px" className="object-cover" unoptimized />
                        ) : (
                            <span className="grid h-full place-items-center text-4xl text-[#0e8aa0]"><i className="fa-solid fa-dog" /></span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="ddb-crayon-kicker dw-kicker">MY PET WEEKLY HISTORY</p>
                        <h1 className="ddb-crayon-title ddb-crayon-underline dw-h2 truncate">{pet.name}의 기록</h1>
                        <p className="mt-3 flex flex-wrap gap-1.5">
                            <span className="dw-chip dw-chip-plain">{pet.breed || "견종 확인 전"}</span>
                            <span className="dw-chip dw-chip-plain">{pet.weightKg ? `${pet.weightKg}kg` : "체중 기록 전"}</span>
                        </p>
                    </div>
                </div>
                <div className="dw-profile-side">
                    <div className="flex flex-wrap justify-end gap-2">
                        {user.pets.filter((item) => item.apiProfileId).map((item) => (
                            <button key={item.apiProfileId} type="button" onClick={() => setSelectedPetId(item.apiProfileId)} className={`dw-pill dw-pill-sm ${item.apiProfileId === pet.apiProfileId ? "ddb-crayon-link dw-pill-main" : ""}`}>
                                {item.name}
                            </button>
                        ))}
                    </div>
                    <Image src="/images/ui/daily-hero-mypet-384.webp" alt="" width={120} height={120} className="dw-profile-art" aria-hidden="true" />
                </div>
            </header>

            {/* 요약 세 장 — 파스텔 칠 + 흰 동그라미 아이콘 + 큰 값 */}
            <section className="dw-stats" aria-label="우리 아이 주간 요약">
                {[
                    ["최근 주간 사진", formatDate(latestWeekly?.analyzedAt), "fa-camera-retro", "teal", "dw-tint-sky"],
                    ["주간 비교 기록", `${weeklyHistory.length}개`, "fa-chart-line", "coral", "dw-tint-pink"],
                    ["관심 케어", pet.concerns[0] || "아직 선택 전", "fa-heart", "orange", "dw-tint-yellow"],
                ].map(([label, value, icon, tone, tint]) => (
                    <article key={label} className={`dw-stat ${tint}`}>
                        <span className="dw-tile-icon dw-stat-icon" data-crayon-tone={tone}>
                            <i className={`fa-solid ${icon}`} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <p className="dw-eyebrow">{label}</p>
                            <strong className="dw-stat-value">{value}</strong>
                        </div>
                    </article>
                ))}
            </section>

            {/* 주간 사진 변화 리포트 — 가운데 제목 + 촬영 버튼, 아래 두 카드 · 히스토리 */}
            <section id="health-report" className="mt-12 scroll-mt-28" aria-labelledby="health-report-title">
                <div className="dw-section-head mb-6 flex flex-col items-center">
                    <p className="ddb-crayon-kicker dw-kicker">AI 주간 사진 변화 리포트</p>
                    <h2 id="health-report-title" className="ddb-crayon-title ddb-crayon-underline dw-h2">매주 같은 방향으로 비교해요</h2>
                    <p className="dw-sub">새로 촬영한 사진은 선택한 {pet.name}의 주간 기록으로만 저장되며, 최초 등록 사진을 덮어쓰지 않습니다.</p>
                    {pet.apiProfileId && accessToken && (
                        <div className="mt-5">
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
                        </div>
                    )}
                </div>

                {weeklyState.error && weeklyState.profileId === petProfileId && (
                    <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700" role="alert">{weeklyState.error}</p>
                )}

                <div className="grid gap-5 lg:grid-cols-2">
                    <article className="dw-report dw-report-sky">
                        <p className="dw-report-label"><i className="fa-solid fa-camera-retro mr-1.5" aria-hidden="true" />이번 주 사진 분석</p>
                        {weeklyLoading ? (
                            <p className="mt-3 text-sm font-bold text-neutral-500">주간 사진 기록을 불러오는 중입니다.</p>
                        ) : latestWeekly ? (
                            <>
                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black"><span className="rounded-full bg-cyan-50 px-3 py-1.5 text-cyan-800">{latestWeekly.viewCount}방향</span><span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">{latestWeekly.photoQualityLabel}</span></div>
                                <h3 className="dw-card-title mt-3">{latestWeekly.title || "저장된 주간 사진 분석"}</h3>
                                <p className="dw-card-body">{latestWeekly.description}</p>
                                <ul className="mt-4 grid gap-2 text-sm font-bold text-neutral-700">
                                    {(latestWeekly.careActions.length ? latestWeekly.careActions : latestWeekly.observations).slice(0, 4).map((item) => <li key={item} className="flex gap-2"><i className="fa-solid fa-check mt-1 text-[10px] text-emerald-600" /><span>{item}</span></li>)}
                                </ul>
                            </>
                        ) : (
                            <div className="dw-empty"><Image src="/images/ui/daily-checkin-256.webp" alt="" width={88} height={88} aria-hidden="true" className="mx-auto" /><p className="mt-2 text-sm font-black text-neutral-800">실시간 카메라로 이번 주 첫 사진을 남겨 보세요.</p><p className="mt-1 text-xs font-bold leading-5 text-neutral-500">촬영 화면, 방향별 썸네일, 업로드 진행률을 직접 확인할 수 있어요.</p></div>
                        )}
                    </article>

                    <article className="dw-report dw-report-pink">
                        <p className="dw-report-label"><i className="fa-solid fa-chart-line mr-1.5" aria-hidden="true" />이전 주와 비교</p>
                        {latestWeekly ? (
                            <>
                                <h3 className="dw-card-title mt-3">{latestWeekly.comparison.headline}</h3>
                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black">
                                    <div className="rounded-2xl bg-violet-50 p-3"><span className="block text-violet-600">최근</span><strong className="mt-1 block text-neutral-900">{formatDate(latestWeekly.analyzedAt)}</strong></div>
                                    <div className="rounded-2xl bg-neutral-50 p-3"><span className="block text-neutral-500">이전</span><strong className="mt-1 block text-neutral-900">{formatDate(latestWeekly.comparison.previousAnalyzedAt || previousWeekly?.analyzedAt)}</strong></div>
                                </div>
                                {latestWeekly.comparison.status === "ready" ? (
                                    <ul className="mt-4 grid gap-2 text-xs font-bold text-neutral-700">
                                        {latestWeekly.comparison.newObservations.slice(0, 2).map((item) => <li key={item} className="flex gap-2"><i className="fa-solid fa-sparkles mt-0.5 text-orange-500" /><span>새로 확인: {item}</span></li>)}
                                        {latestWeekly.comparison.commonObservations.slice(0, 2).map((item) => <li key={item} className="flex gap-2"><i className="fa-solid fa-equals mt-0.5 text-teal-600" /><span>공통 확인: {item}</span></li>)}
                                    </ul>
                                ) : <p className="mt-4 text-xs font-bold leading-5 text-neutral-500">다음 주 같은 방향 사진이 쌓이면 변화 여부를 단정하지 않고 확인된 항목만 비교합니다.</p>}
                            </>
                        ) : (
                            <div className="dw-empty"><Image src="/images/ui/daily-change-256.webp" alt="" width={88} height={88} aria-hidden="true" className="mx-auto" /><p className="mt-2 text-sm font-bold leading-6 text-neutral-600">첫 주간 분석은 비교 기준이 되고, 다음 기록부터 이전 주와 나란히 표시됩니다.</p></div>
                        )}
                    </article>
                </div>

                {weeklyHistory.length > 0 && (
                    <div className="dw-history" data-weekly-photo-history>
                        <div className="flex items-center justify-between gap-3"><h3 className="dw-card-title">주간 사진 히스토리</h3><span className="dw-chip dw-chip-plain">최근 {weeklyHistory.length}회</span></div>
                        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {weeklyHistory.slice(0, 4).map((item, index) => <li key={item.id} className="dw-history-item"><span className="text-[11px] font-black text-violet-600">{index === 0 ? "최근" : `${index + 1}번째`}</span><strong className="mt-1 block text-xs font-black text-neutral-900">{formatDate(item.analyzedAt)}</strong><p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-neutral-500">{item.title}</p></li>)}
                        </ol>
                    </div>
                )}
                <p className="mt-4 text-center text-xs font-bold leading-5 text-neutral-500">이 리포트는 사진에서 확인된 관찰 항목을 정리하며, 촬영 조건에 따라 달라질 수 있고 수의학적 진단을 대신하지 않습니다.</p>
            </section>

            {/* 별도 기능 띠 — 연보라 크레파스 칠 */}
            <section className="dw-band dw-tint-lavender" aria-labelledby="independent-observation-title">
                <div className="flex items-center gap-4">
                    <span className="dw-tile-icon dw-stat-icon" data-crayon-tone="coral"><i className="fa-solid fa-wave-square" /></span>
                    <div><p className="ddb-crayon-kicker dw-kicker">별도 기능</p><h2 id="independent-observation-title" className="dw-card-title mt-1">행동·소리 분석은 등록한 우리 아이와 별개예요</h2><p className="dw-card-body mt-1 max-w-2xl">궁금한 강아지의 행동·소리 영상을 관찰하는 독립 기능이며, 주간 사진 변화 기록과 섞이지 않습니다.</p></div>
                </div>
                <Link href="/pet-lens/?mode=observation#observation" className="ddb-crayon-link dw-pill dw-pill-main shrink-0">행동·소리 분석 열기</Link>
            </section>
        </main>
    );
}
