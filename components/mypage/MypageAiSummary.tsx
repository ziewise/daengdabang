/**
 * MypageAiSummary — 마이페이지 "우리 아이 AI" 요약 화면 3개(2026-10-24)
 * ---------------------------------------------------------------------
 * 건강 기록 · AI 분석 · 매일댕생활 기능 화면에 쌓인 결과를 마이페이지 안에서 한눈에 정리해 보여 준다.
 *  - HealthSummary : 주간 사진 건강 체크(최근 결과 · 지난주 비교 · 돌봄 할 일 · 주간 기록)
 *  - AiSummary     : 행동·소리 분석(최근 결과 · 주의 단계 · 후보 · 지난 분석) + 남은 분석 횟수
 *  - DailySummary  : 출근도장(연속 일수 · 이번 주 도장) · 레벨 · 오늘 할 일 · 코인
 * 모두 읽기 전용 — 이미 있는 불러오기 함수(GET)만 쓰고, 저장 · 분석 · 도장 찍기는 각 기능 화면 버튼으로 이동해서 한다.
 * 꾸밈: 카드 띠(data-mp-card · data-mp-band · data-mp-art · data-mp-kicker)는 app/mypage-web.css K5 결 그대로,
 *       요약 전용 모양은 mp-sum-* 이름(같은 파일 "우리 아이 AI 요약" 묶음).
 */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth, type PetProfile } from "@/lib/store";
import { loadWeeklyPhotoAnalyses, type WeeklyPhotoAnalysisRecord } from "@/lib/weekly-photo-analysis";
import { loadPetObservationHistory, type PetObservationHistoryItem } from "@/lib/petlens-observation";
import {
    loadDaengLabAttendance,
    loadDaengLabEngagement,
    loadDaengLabWallet,
    type DaengLabAttendance,
    type DaengLabEngagement,
    type DaengLabWallet,
} from "@/lib/customer-api";

/* ───────── 공통 ───────── */

// 불러오기 상태 — 고른 반려견(key)이 바뀌면 그 key 의 결과가 올 때까지 "불러오는 중"
type Loaded<T> = { key: string; data?: T; error?: string };

function dateLabel(value?: string, withTime = false) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(date);
}

// 서버에 등록된(번호가 있는) 반려견만 기록을 불러올 수 있음
function serverPets(pets: PetProfile[]) {
    return pets.filter((pet) => typeof pet.apiProfileId === "number" && pet.apiProfileId > 0);
}

// 반려견 고르기 — 두 마리 이상일 때만 보이는 알약 줄
function PetPicker({ pets, value, onChange }: { pets: PetProfile[]; value?: number; onChange: (id: number) => void }) {
    if (pets.length < 2) return null;
    return (
        <div className="mp-sum-pets mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="반려견 고르기">
            {pets.map((pet) => (
                <button
                    key={pet.apiProfileId}
                    type="button"
                    role="radio"
                    aria-checked={pet.apiProfileId === value}
                    onClick={() => onChange(pet.apiProfileId as number)}
                    className={`rounded-full border px-4 py-2 text-sm font-black ${pet.apiProfileId === value ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-neutral-200 bg-white text-neutral-600"}`}
                >
                    {pet.photoDataUrl ? <img src={pet.photoDataUrl} alt="" className="mr-2 inline-block h-6 w-6 rounded-full object-cover align-middle" /> : null}
                    {pet.name}
                </button>
            ))}
        </div>
    );
}

// 아직 볼 수 없을 때(반려견 없음 · 기록 없음 · 오류) — 그림 + 제목 + 안내 + 버튼
function SumEmpty({ art, title, text, action }: { art: string; title: string; text: string; action?: { href: string; label: string } | { onClick: () => void; label: string } }) {
    return (
        <div className="mp-sum-empty surface p-8 text-center" data-mp-sum-art={art}>
            <p className="text-lg font-black text-neutral-950">{title}</p>
            <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{text}</p>
            {action && ("href" in action ? (
                <Link href={action.href} className="btn btn-primary mt-5">{action.label}</Link>
            ) : (
                <button type="button" onClick={action.onClick} className="btn btn-secondary mt-5">{action.label}</button>
            ))}
        </div>
    );
}

// 불러오는 중 — 카드 자리 두 개(높이 고정이라 화면이 덜컹거리지 않음)
function SumLoading() {
    return (
        <div className="mp-sum-loading grid gap-4 md:grid-cols-2" aria-busy="true" aria-live="polite">
            <div className="surface h-56 animate-pulse" />
            <div className="surface h-56 animate-pulse" />
            <span className="sr-only">기록을 불러오는 중입니다.</span>
        </div>
    );
}

// 아래쪽 이동 버튼 줄 — 기능 화면으로(주 버튼) · 다른 요약으로(보조)
function SumActions({ primary, secondary }: { primary: { href: string; label: string }; secondary?: { href: string; label: string } }) {
    return (
        <div className="mp-sum-actions mt-6 flex flex-wrap gap-3">
            <Link href={primary.href} className="btn btn-primary">{primary.label}</Link>
            {secondary && <Link href={secondary.href} className="btn btn-secondary">{secondary.label}</Link>}
        </div>
    );
}

// 고른 반려견 번호 — 처음엔 첫 번째 등록 반려견
function usePetChoice() {
    const { user } = useAuth();
    const pets = useMemo(() => serverPets(user?.pets ?? []), [user?.pets]);
    const [chosen, setChosen] = useState<number | undefined>(undefined);
    const petId = pets.some((pet) => pet.apiProfileId === chosen) ? chosen : pets[0]?.apiProfileId;
    return { user, pets, petId, setPetId: setChosen };
}

/* ───────── 건강 기록 요약 ───────── */

export function HealthSummary() {
    const { user, pets, petId, setPetId } = usePetChoice();
    const token = user?.apiAccessToken ?? "";
    const [retry, setRetry] = useState(0);
    const key = `${petId ?? "none"}:${retry}`;
    const [loaded, setLoaded] = useState<Loaded<WeeklyPhotoAnalysisRecord[]>>({ key: "" });

    useEffect(() => {
        if (!petId || !token) return;
        let active = true;
        loadWeeklyPhotoAnalyses({ petProfileId: petId, accessToken: token, limit: 8 })
            .then((data) => { if (active) setLoaded({ key, data }); })
            .catch((reason: unknown) => { if (active) setLoaded({ key, error: reason instanceof Error ? reason.message : "건강 기록을 불러오지 못했습니다." }); });
        return () => { active = false; };
    }, [key, petId, token]);

    if (!user) return null;
    if (user.pets.length === 0) {
        return <SumEmpty art="dog" title="먼저 우리 아이를 등록해 주세요" text="반려견 프로필을 만들면 주간 사진 건강 체크 결과가 여기에 정리돼요." action={{ href: "/mypage/#pet-profiles", label: "반려견 등록하기" }} />;
    }
    if (pets.length === 0) {
        return <SumEmpty art="dog" title="서버 등록을 마친 프로필이 없어요" text="대시보드의 ‘정보 수정’에서 서버 등록을 마치면 건강 기록을 불러올 수 있어요." action={{ href: "/mypage/#pet-profiles", label: "반려견 프로필 보기" }} />;
    }

    const pet = pets.find((item) => item.apiProfileId === petId);
    const ready = loaded.key === key;
    const records = ready ? loaded.data ?? [] : [];
    const latest = records[0];

    return (
        <>
            <PetPicker pets={pets} value={petId} onChange={setPetId} />
            {!ready ? <SumLoading /> : loaded.error ? (
                <SumEmpty art="info" title="건강 기록을 불러오지 못했어요" text={loaded.error} action={{ onClick: () => setRetry((n) => n + 1), label: "다시 불러오기" }} />
            ) : !latest ? (
                <SumEmpty art="health" title={`${pet?.name ?? "우리 아이"}의 건강 기록이 아직 없어요`} text="정면 · 옆 · 뒤 사진을 올리면 털 · 눈가 · 체형을 살펴 주간 기록으로 쌓아 드려요." action={{ href: "/my-pet", label: "첫 사진 올리러 가기" }} />
            ) : (
                <div className="mp-sum grid gap-5">
                    <div className="mp-sum-row grid gap-5 md:grid-cols-2">
                        {/* 이번 주 건강 체크 */}
                        <section className="surface p-5" data-mp-card>
                            <div data-mp-band="mint" data-mp-art="health">
                                <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="THIS WEEK">이번 주 건강 체크</h2>
                                <p className="mt-1 text-xs font-bold text-neutral-500">{dateLabel(latest.analyzedAt, true)} · 사진 {latest.viewCount}장</p>
                            </div>
                            <div className="mp-sum-chips flex flex-wrap gap-2">
                                {latest.statusLabel && <span className="mp-sum-chip rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700" data-tone="mint">{latest.statusLabel}</span>}
                                {latest.photoQualityLabel && <span className="mp-sum-chip rounded-full bg-neutral-100 px-3 py-1 text-xs font-black text-neutral-600">{latest.photoQualityLabel}</span>}
                            </div>
                            <p className="mp-sum-title mt-3 text-xl font-black text-neutral-950">{latest.title}</p>
                            {latest.description && <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{latest.description}</p>}
                            {(latest.observations.length > 0 || latest.summary.length > 0) && (
                                <ul className="mp-sum-list mt-4 grid gap-2 text-sm font-bold text-neutral-700">
                                    {(latest.observations.length > 0 ? latest.observations : latest.summary).slice(0, 4).map((line) => <li key={line}>{line}</li>)}
                                </ul>
                            )}
                        </section>

                        {/* 지난주와 비교 */}
                        <section className="surface p-5" data-mp-card>
                            <div data-mp-band="sky" data-mp-art="info">
                                <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="WEEKLY CHANGE">지난주와 비교</h2>
                                {latest.comparison.previousAnalyzedAt && <p className="mt-1 text-xs font-bold text-neutral-500">{dateLabel(latest.comparison.previousAnalyzedAt)} 기록과 비교</p>}
                            </div>
                            {latest.comparison.status === "ready" ? (
                                <>
                                    <p className="mp-sum-title text-lg font-black text-neutral-950">{latest.comparison.headline}</p>
                                    <dl className="mp-sum-compare mt-4 grid gap-3 text-sm">
                                        {[
                                            { tone: "pink", label: "새로 보인 것", lines: latest.comparison.newObservations },
                                            { tone: "mint", label: "계속 보이는 것", lines: latest.comparison.commonObservations },
                                            { tone: "gray", label: "이번엔 안 보인 것", lines: latest.comparison.notObservedNow },
                                        ].filter((group) => group.lines.length > 0).map((group) => (
                                            <div key={group.label} className="rounded-xl bg-neutral-50 p-3" data-tone={group.tone}>
                                                <dt className="text-xs font-black text-neutral-500">{group.label}</dt>
                                                {group.lines.slice(0, 3).map((line) => <dd key={line} className="mt-1 font-bold text-neutral-800">{line}</dd>)}
                                            </div>
                                        ))}
                                    </dl>
                                </>
                            ) : (
                                <div className="mp-sum-note rounded-xl bg-neutral-50 p-4 text-sm font-bold leading-6 text-neutral-600">
                                    비교할 지난주 기록이 아직 없어요. 다음 주에도 같은 각도로 찍으면 달라진 점을 정리해 드려요.
                                </div>
                            )}
                        </section>
                    </div>

                    {/* 돌봄 할 일 */}
                    {latest.careActions.length > 0 && (
                        <section className="surface p-5" data-mp-card>
                            <div data-mp-band="yellow" data-mp-art="memo">
                                <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="CARE TODO">이번 주 돌봄 할 일</h2>
                            </div>
                            <ol className="mp-sum-steps grid gap-3 md:grid-cols-3">
                                {latest.careActions.slice(0, 3).map((action, index) => (
                                    <li key={action} className="rounded-xl bg-neutral-50 p-4 text-sm font-bold leading-6 text-neutral-700">
                                        <b className="mr-2 text-indigo-700">{index + 1}</b>{action}
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    {/* 주간 기록 */}
                    <section className="surface p-5" data-mp-card>
                        <div data-mp-band="lav" data-mp-art="star">
                            <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="HISTORY">주간 기록 {records.length}회</h2>
                        </div>
                        <ol className="mp-sum-timeline grid gap-2">
                            {records.map((record, index) => (
                                <li key={record.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-neutral-50 px-4 py-3 text-sm" data-latest={index === 0 || undefined}>
                                    <span className="w-28 shrink-0 font-black text-neutral-500">{dateLabel(record.analyzedAt)}</span>
                                    <span className="min-w-0 flex-1 font-bold text-neutral-800">{record.title}</span>
                                    {record.statusLabel && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-neutral-600">{record.statusLabel}</span>}
                                </li>
                            ))}
                        </ol>
                    </section>
                </div>
            )}
            <SumActions primary={{ href: "/my-pet", label: "건강 기록 전체 보기" }} secondary={{ href: "/mypage/ai/", label: "AI 분석 요약 보기" }} />
        </>
    );
}

/* ───────── AI 분석 요약 ───────── */

const URGENCY = {
    emergency: { label: "즉시 병원 연락", tone: "red" },
    same_day: { label: "오늘 병원 문의", tone: "amber" },
    observe: { label: "평소와 비교 관찰", tone: "mint" },
    unclear: { label: "판단 어려움", tone: "gray" },
} as const;

const CONFIDENCE = { high: "높음", medium: "보통", low: "낮음" } as const;

export function AiSummary() {
    const { user, pets, petId, setPetId } = usePetChoice();
    const token = user?.apiAccessToken ?? "";
    const [retry, setRetry] = useState(0);
    const key = `${petId ?? "none"}:${retry}`;
    const [loaded, setLoaded] = useState<Loaded<PetObservationHistoryItem[]>>({ key: "" });
    const [wallet, setWallet] = useState<DaengLabWallet | null>(null);

    useEffect(() => {
        if (!petId || !token) return;
        let active = true;
        loadPetObservationHistory({ petProfileId: petId, accessToken: token, limit: 8 })
            .then((data) => { if (active) setLoaded({ key, data }); })
            .catch((reason: unknown) => { if (active) setLoaded({ key, error: reason instanceof Error ? reason.message : "분석 기록을 불러오지 못했습니다." }); });
        return () => { active = false; };
    }, [key, petId, token]);

    // 남은 분석 횟수 · 코인(지갑, 읽기만)
    useEffect(() => {
        if (!token) return;
        let active = true;
        loadDaengLabWallet(token).then((next) => { if (active) setWallet(next); }).catch(() => undefined);
        return () => { active = false; };
    }, [token]);

    if (!user) return null;
    if (user.pets.length === 0) {
        return <SumEmpty art="dog" title="먼저 우리 아이를 등록해 주세요" text="반려견 프로필을 만들면 행동 · 소리 분석 결과가 여기에 정리돼요." action={{ href: "/mypage/#pet-profiles", label: "반려견 등록하기" }} />;
    }
    if (pets.length === 0) {
        return <SumEmpty art="dog" title="서버 등록을 마친 프로필이 없어요" text="대시보드의 ‘정보 수정’에서 서버 등록을 마치면 AI 분석 기록을 불러올 수 있어요." action={{ href: "/mypage/#pet-profiles", label: "반려견 프로필 보기" }} />;
    }

    const pet = pets.find((item) => item.apiProfileId === petId);
    const ready = loaded.key === key;
    const items = ready ? loaded.data ?? [] : [];
    const latest = items[0];
    const urgency = latest ? URGENCY[latest.result.urgency.level] : undefined;
    const candidates = latest
        ? [...latest.result.behaviorCandidates, ...latest.result.barkContextCandidates, ...latest.result.healthCandidates].slice(0, 6)
        : [];

    return (
        <>
            <PetPicker pets={pets} value={petId} onChange={setPetId} />
            {!ready ? <SumLoading /> : loaded.error ? (
                <SumEmpty art="info" title="분석 기록을 불러오지 못했어요" text={loaded.error} action={{ onClick: () => setRetry((n) => n + 1), label: "다시 불러오기" }} />
            ) : !latest ? (
                <SumEmpty art="lens" title={`${pet?.name ?? "우리 아이"}의 AI 분석이 아직 없어요`} text="짧은 영상으로 행동과 소리를 분석하면 결과와 주의 단계를 여기에 모아 드려요." action={{ href: "/pet-lens", label: "첫 분석 하러 가기" }} />
            ) : (
                <div className="mp-sum grid gap-5">
                    <div className="mp-sum-row mp-sum-row--wide grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        {/* 최근 분석 결과 */}
                        <section className="surface p-5" data-mp-card>
                            <div data-mp-band="lav" data-mp-art="lens">
                                <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="LATEST">최근 행동 · 소리 분석</h2>
                                <p className="mt-1 text-xs font-bold text-neutral-500">{dateLabel(latest.completedAt ?? latest.createdAt, true)}</p>
                            </div>
                            <p className="mp-sum-title text-xl font-black leading-8 text-neutral-950">{latest.result.summary}</p>
                            {urgency && (
                                <div className="mp-sum-urgency mt-4 rounded-xl bg-neutral-50 p-4" data-tone={urgency.tone}>
                                    <p className="text-xs font-black">{urgency.label}</p>
                                    <p className="mt-1 text-sm font-black text-neutral-900">{latest.result.urgency.headline}</p>
                                    {latest.result.urgency.actions.slice(0, 2).map((action) => <p key={action} className="mt-1 text-sm font-bold text-neutral-600">{action}</p>)}
                                </div>
                            )}
                            {candidates.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs font-black text-neutral-500">보인 행동 · 소리</p>
                                    <ul className="mp-sum-chips mt-2 flex flex-wrap gap-2">
                                        {candidates.map((candidate) => (
                                            <li key={`${candidate.label}-${candidate.otherPossibility}`} className="mp-sum-chip rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                                                {candidate.label} <small className="font-bold opacity-70">· {CONFIDENCE[candidate.confidence]}</small>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </section>

                        {/* 분석 지갑 */}
                        <section className="surface p-5" data-mp-card>
                            <div data-mp-band="yellow" data-mp-art="coin">
                                <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="WALLET">남은 분석</h2>
                            </div>
                            <div className="mp-sum-wallet grid gap-3 text-center">
                                <div className="rounded-xl bg-emerald-50 p-4" data-tone="mint">
                                    <p className="text-xs font-black text-emerald-700">분석 가능</p>
                                    <p className="mp-sum-big text-3xl font-black text-emerald-800">{wallet ? `${wallet.analysesAvailable}회` : "–"}</p>
                                </div>
                                <div className="rounded-xl bg-indigo-50 p-4" data-tone="lav">
                                    <p className="text-xs font-black text-indigo-700">연구소 코인</p>
                                    <p className="mp-sum-big text-3xl font-black text-indigo-800">{wallet ? `${wallet.daengLabCoins}C` : "–"}</p>
                                </div>
                                <p className="text-xs font-bold text-neutral-500">분석 1회 {wallet?.analysisCoinCost ?? 10}C · 최근 {items.length}회 기록</p>
                                <Link href="/mypage/#daenglab-wallet" className="btn btn-secondary">코인 · 적립금 보기</Link>
                            </div>
                        </section>
                    </div>

                    {/* 지난 분석 */}
                    <section className="surface p-5" data-mp-card>
                        <div data-mp-band="sky" data-mp-art="memo">
                            <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="HISTORY">지난 분석 {items.length}회</h2>
                        </div>
                        <ol className="mp-sum-timeline grid gap-2">
                            {items.map((item, index) => {
                                const level = URGENCY[item.result.urgency.level];
                                return (
                                    <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-neutral-50 px-4 py-3 text-sm" data-latest={index === 0 || undefined}>
                                        <span className="w-44 shrink-0 whitespace-nowrap font-black text-neutral-500">{dateLabel(item.completedAt ?? item.createdAt, true)}</span>
                                        <span className="min-w-0 flex-1 font-bold text-neutral-800">{item.result.summary}</span>
                                        <span className="mp-sum-level rounded-full bg-white px-2.5 py-0.5 text-xs font-black" data-tone={level.tone}>{level.label}</span>
                                    </li>
                                );
                            })}
                        </ol>
                    </section>
                </div>
            )}
            <SumActions primary={{ href: "/pet-lens", label: "AI 분석 열기" }} secondary={{ href: "/mypage/health/", label: "건강 기록 요약 보기" }} />
        </>
    );
}

/* ───────── 매일댕생활 요약 ───────── */

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function dayParts(businessDate: string) {
    const [y, m, d] = businessDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    return { weekday: WEEKDAY[date.getUTCDay()], day: d || 0 };
}

function Meter({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
    const percent = Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
    return (
        <div className="mp-sum-meter" data-tone={tone}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-black text-neutral-700">{label}</span>
                <span className="font-black text-neutral-950">{value}<small className="text-neutral-400"> / {max}</small></span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
                <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

export function DailySummary() {
    const { user } = useAuth();
    const token = user?.apiAccessToken ?? "";
    const [retry, setRetry] = useState(0);
    const key = `${token ? "on" : "off"}:${retry}`;
    const [loaded, setLoaded] = useState<Loaded<{ attendance: DaengLabAttendance; engagement: DaengLabEngagement | null }>>({ key: "" });

    useEffect(() => {
        if (!token) return;
        let active = true;
        Promise.all([loadDaengLabAttendance(token), loadDaengLabEngagement(token).catch(() => null)])
            .then(([attendance, engagement]) => { if (active) setLoaded({ key, data: { attendance, engagement } }); })
            .catch((reason: unknown) => { if (active) setLoaded({ key, error: reason instanceof Error ? reason.message : "매일댕생활 기록을 불러오지 못했습니다." }); });
        return () => { active = false; };
    }, [key, token]);

    if (!user) return null;
    const ready = loaded.key === key;
    if (!ready) return <><SumLoading /><SumActions primary={{ href: "/treasure-mine/", label: "매일댕생활 열기" }} /></>;
    if (loaded.error || !loaded.data) {
        return (
            <>
                <SumEmpty art="info" title="매일댕생활 기록을 불러오지 못했어요" text={loaded.error ?? "잠시 후 다시 시도해 주세요."} action={{ onClick: () => setRetry((n) => n + 1), label: "다시 불러오기" }} />
                <SumActions primary={{ href: "/treasure-mine/", label: "매일댕생활 열기" }} />
            </>
        );
    }

    const { attendance, engagement } = loaded.data;
    const days = attendance.recentDays.slice(-7);
    const weekClaimed = days.filter((day) => day.claimed).length;

    return (
        <>
            <div className="mp-sum grid gap-5">
                {/* 연속 출근 + 이번 주 도장 */}
                <section className="surface p-5" data-mp-card>
                    <div data-mp-band="yellow" data-mp-art="treasure">
                        <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="STREAK">출근도장</h2>
                        <p className="mt-1 text-xs font-bold text-neutral-500">하루 한 번 도장 · {attendance.dailyRewardDaengLabCoins}C 적립</p>
                    </div>
                    <div className="mp-sum-streak grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-center">
                        <div className="mp-sum-streak-hero text-center">
                            <p className="text-sm font-black text-neutral-500">연속 출근</p>
                            <p className="mp-sum-big text-5xl font-black text-amber-600">{attendance.currentStreak}<small className="text-xl">일</small></p>
                            <p className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${attendance.claimedToday ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} data-tone={attendance.claimedToday ? "mint" : "pink"}>
                                {attendance.claimedToday ? "오늘 도장 완료" : "오늘 도장이 아직이에요"}
                            </p>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-black text-neutral-500">최근 7일 · {weekClaimed}번 출근</p>
                            <ol className="mp-sum-stamps grid grid-cols-7 gap-2">
                                {days.map((day) => {
                                    const { weekday, day: dayNo } = dayParts(day.businessDate);
                                    const today = day.businessDate === attendance.businessDate;
                                    return (
                                        <li key={day.businessDate} className="grid place-items-center gap-1 rounded-xl bg-neutral-50 py-3 text-center" data-claimed={day.claimed || undefined} data-today={today || undefined}>
                                            <span className="text-[11px] font-black text-neutral-400">{weekday}</span>
                                            <span className="mp-sum-stamp grid h-9 w-9 place-items-center rounded-full text-sm font-black" aria-label={day.claimed ? "출근" : "미출근"}>{day.claimed ? "✓" : dayNo}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    </div>
                </section>

                <div className="mp-sum-row grid gap-5 md:grid-cols-2">
                    {/* 레벨 · 진행 */}
                    <section className="surface p-5" data-mp-card>
                        <div data-mp-band="lav" data-mp-art="star">
                            <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="LEVEL">{engagement ? `레벨 ${engagement.level}` : "레벨"}</h2>
                        </div>
                        {engagement ? (
                            <div className="mp-sum-meters grid gap-4">
                                <Meter label="다음 레벨까지 경험치" value={engagement.xp} max={engagement.nextLevelXp} tone="lav" />
                                <Meter label="이번 주 출근" value={engagement.weeklyAttendanceProgress} max={engagement.weeklyAttendanceTarget} tone="yellow" />
                                <Meter label="이번 달 AI 분석" value={engagement.monthlyAnalysisProgress} max={engagement.monthlyAnalysisTarget} tone="mint" />
                            </div>
                        ) : (
                            <p className="mp-sum-note rounded-xl bg-neutral-50 p-4 text-sm font-bold text-neutral-600">레벨 정보를 아직 불러오지 못했어요.</p>
                        )}
                    </section>

                    {/* 오늘 할 일 + 코인 */}
                    <section className="surface p-5" data-mp-card>
                        <div data-mp-band="mint" data-mp-art="dog">
                            <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="TODAY">오늘 돌봄 할 일</h2>
                        </div>
                        {engagement && engagement.todayTasks.length > 0 ? (
                            <ul className="mp-sum-tasks grid gap-2">
                                {engagement.todayTasks.map((task) => (
                                    <li key={task.taskId} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3" data-done={task.completed || undefined}>
                                        <span className="mp-sum-check grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-sm font-black" aria-label={task.completed ? "완료" : "아직"}>{task.completed ? "✓" : ""}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-black text-neutral-900">{task.title}</span>
                                            <span className="block text-xs font-bold text-neutral-500">{task.description}</span>
                                        </span>
                                        <span className="text-xs font-black text-indigo-700">+{task.xp}XP</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mp-sum-note rounded-xl bg-neutral-50 p-4 text-sm font-bold text-neutral-600">오늘 할 일이 아직 없어요.</p>
                        )}
                        <div className="mp-sum-coins mt-4 grid grid-cols-2 gap-2 text-center">
                            <div className="rounded-xl bg-amber-50 p-3" data-tone="yellow">
                                <p className="text-xs font-black text-amber-700">적립금</p>
                                <p className="mp-sum-big text-xl font-black text-neutral-950">{attendance.wallet.rewardPoints.toLocaleString("ko-KR")}P</p>
                            </div>
                            <div className="rounded-xl bg-indigo-50 p-3" data-tone="lav">
                                <p className="text-xs font-black text-indigo-700">연구소 코인</p>
                                <p className="mp-sum-big text-xl font-black text-indigo-800">{attendance.wallet.daengLabCoins}C</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            <SumActions primary={{ href: "/treasure-mine/", label: attendance.claimedToday ? "매일댕생활 열기" : "출근도장 찍으러 가기" }} secondary={{ href: "/mypage/health/", label: "건강 기록 요약 보기" }} />
        </>
    );
}
