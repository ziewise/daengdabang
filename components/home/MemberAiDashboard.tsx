"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AttendanceStampCard from "@/components/engagement/AttendanceStampCard";
import {
    claimDaengLabAttendance,
    completeDaengLabCareTask,
    loadDaengLabAttendance,
    loadDaengLabEngagement,
    type DaengLabAttendance,
    type DaengLabCareTaskId,
    type DaengLabEngagement,
} from "@/lib/customer-api";
import { useAuth } from "@/lib/store";

type Props = {
    variant?: "home" | "full";
};

function seoulDate(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function analysisStatus(rawAnalysis: unknown) {
    if (!rawAnalysis || typeof rawAnalysis !== "object") return "첫 분석을 기다리고 있어요";
    const row = rawAnalysis as Record<string, unknown>;
    const details = row.details && typeof row.details === "object" ? row.details as Record<string, unknown> : null;
    const status = typeof details?.statusLabel === "string" ? details.statusLabel : "사진 분석 저장 완료";
    return status.slice(0, 34);
}

function recommendationCopy(concerns: string[]) {
    const text = concerns.join(" ");
    if (/눈|고글|자외선/.test(text)) return "눈 보호 관심을 반영한 산책 안전용품";
    if (/피부|발바닥|털|케어/.test(text)) return "피부·발바닥 케어 관심을 반영한 관리용품";
    if (/체중|식단|알러지|사료/.test(text)) return "식단·체중 관심을 반영한 먹거리";
    if (/놀이|분리불안/.test(text)) return "활동량과 놀이 성향을 반영한 장난감";
    return "프로필과 최근 분석을 반영한 맞춤 상품";
}

function ratio(value: number, target: number) {
    return Math.max(0, Math.min(100, Math.round(value / Math.max(1, target) * 100)));
}

export default function MemberAiDashboard({ variant = "home" }: Props) {
    const { hydrated, user } = useAuth();
    const [attendance, setAttendance] = useState<DaengLabAttendance | null>(null);
    const [engagement, setEngagement] = useState<DaengLabEngagement | null>(null);
    const [loading, setLoading] = useState(false);
    const [savingTask, setSavingTask] = useState<DaengLabCareTaskId | null>(null);
    const [error, setError] = useState("");
    const accessToken = user?.apiAccessToken;

    const refresh = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        setError("");
        try {
            const [nextAttendance, nextEngagement] = await Promise.all([
                loadDaengLabAttendance(accessToken),
                loadDaengLabEngagement(accessToken),
            ]);
            setAttendance(nextAttendance);
            setEngagement(nextEngagement);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "오늘의 AI 대시보드를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        if (!hydrated || !accessToken) return;
        const timer = window.setTimeout(() => void refresh(), 0);
        return () => window.clearTimeout(timer);
    }, [accessToken, hydrated, refresh]);

    const pet = user?.pets[0];
    const today = attendance?.businessDate || engagement?.businessDate || "";
    const analyzedToday = Boolean(pet?.lastAnalyzedAt && seoulDate(pet.lastAnalyzedAt) === today);
    const walkTask = engagement?.todayTasks.find((task) => task.taskId === "walk_20");
    const completedRoutineCount = (engagement?.todayTasks.filter((task) => task.completed).length || 0)
        + (attendance?.claimedToday ? 1 : 0)
        + (analyzedToday ? 1 : 0);
    const careScore = attendance && engagement
        ? Math.min(100, 52 + completedRoutineCount * 12)
        : null;
    const previousLevelXp = engagement ? (engagement.level - 1) * 100 : 0;
    const levelProgress = engagement
        ? ratio(Math.max(0, engagement.xp - previousLevelXp), Math.max(1, engagement.nextLevelXp - previousLevelXp))
        : 0;

    const metrics = [
        {
            label: "오늘 건강 루틴 점수",
            value: careScore === null ? "—" : `${careScore}점`,
            helper: "의료 점수가 아닌 오늘 돌봄 완료율",
            icon: "fa-heart-pulse",
            tone: "coral",
        },
        {
            label: "오늘 AI 분석",
            value: analyzedToday ? "완료" : "아직",
            helper: pet?.lastAnalyzedAt ? `최근 ${new Date(pet.lastAnalyzedAt).toLocaleDateString("ko-KR")}` : "첫 사진 분석을 시작해 보세요",
            icon: "fa-camera-retro",
            tone: "teal",
        },
        {
            label: "이번 주 출석 챌린지",
            value: engagement ? `${engagement.weeklyAttendanceProgress} / ${engagement.weeklyAttendanceTarget}` : "- / -",
            helper: `${engagement ? ratio(engagement.weeklyAttendanceProgress, engagement.weeklyAttendanceTarget) : 0}% 진행`,
            icon: "fa-calendar-check",
            tone: "orange",
        },
        {
            label: "오늘 산책",
            value: walkTask?.completed ? "20분 완료" : "기록 전",
            helper: walkTask?.completed ? "오늘의 산책 XP가 반영됐어요" : "무리하지 않는 범위에서 시작하세요",
            icon: "fa-person-walking",
            tone: "teal",
        },
    ];

    if (!hydrated) return variant === "home" ? null : <DashboardLoading />;
    if (!user) {
        if (variant === "home") return null;
        return (
            <div className="mx-auto w-full max-w-[900px] px-4 py-16 text-center md:px-6">
                <div className="ddb-crayon-paper rounded-[32px] border p-8 md:p-12">
                    <span className="ddb-crayon-icon mx-auto grid h-16 w-16 place-items-center rounded-3xl text-2xl" data-crayon-tone="coral"><i className="fa-solid fa-paw" /></span>
                    <h1 className="ddb-crayon-title mt-5 text-4xl">로그인하고 오늘의 챌린지를 시작하세요</h1>
                    <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">출근도장과 XP, 코인 보상은 회원 계정에 안전하게 저장됩니다.</p>
                    <Link href="/auth/login/?redirect=%2Ftreasure-mine%2F" className="btn btn-primary mt-6">로그인하기</Link>
                </div>
            </div>
        );
    }

    const claimAttendance = async () => {
        if (!user.apiAccessToken) return false;
        try {
            setError("");
            const next = await claimDaengLabAttendance(user.apiAccessToken);
            setAttendance(next);
            window.dispatchEvent(new CustomEvent("ddb:daenglab-wallet", { detail: next.wallet }));
            const nextEngagement = await loadDaengLabEngagement(user.apiAccessToken);
            setEngagement(nextEngagement);
            return next.newlyClaimed;
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "출근도장을 찍지 못했습니다.");
            return false;
        }
    };

    const completeTask = async (taskId: DaengLabCareTaskId) => {
        if (!user.apiAccessToken || savingTask) return;
        setSavingTask(taskId);
        setError("");
        try {
            const next = await completeDaengLabCareTask(taskId, user.apiAccessToken);
            setEngagement(next);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "돌봄 기록을 저장하지 못했습니다.");
        } finally {
            setSavingTask(null);
        }
    };

    return (
        <section id="ai-dashboard" className={variant === "home" ? "py-10 md:py-14" : "py-8"} aria-labelledby="ai-dashboard-title" data-member-ai-dashboard>
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                <div className="ddb-crayon-paper overflow-hidden rounded-[34px] border">
                    <header className="ddb-crayon-banner relative overflow-hidden px-5 py-6 md:px-8 md:py-8">
                        <div className="absolute -right-10 top-5 h-2 w-44 rotate-[-7deg] rounded-full bg-cyan-500/20 shadow-[0_8px_0_rgba(239,71,111,0.14),0_16px_0_rgba(245,158,11,0.16)]" aria-hidden="true" />
                        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-3xl border-4 border-dashed border-cyan-700/30 bg-white shadow-[3px_4px_0_rgba(239,71,111,0.12)]">
                                    {pet?.photoDataUrl ? (
                                        <Image src={pet.photoDataUrl} alt={`${pet.name} 프로필`} fill sizes="64px" className="object-cover" unoptimized />
                                    ) : (
                                        <span className="grid h-full place-items-center text-2xl"><i className="fa-solid fa-dog" aria-hidden="true" /></span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="ddb-crayon-kicker text-xs">PERSONAL AI DASHBOARD</p>
                                    <h2 id="ai-dashboard-title" className="ddb-crayon-title mt-1 truncate text-3xl md:text-4xl">
                                        <span className="ddb-crayon-underline">{pet ? `${pet.name}와 오늘 뭐 하지?` : `${user.name}님, 오늘 뭐 하지?`}</span>
                                    </h2>
                                    <p className="mt-2 text-xs font-bold text-neutral-600">출근도장부터 산책·분석·추천까지 한 번에 이어가세요.</p>
                                </div>
                            </div>
                            <Link href="/my-pet/" className="ddb-crayon-link inline-flex h-11 items-center justify-center rounded-full px-5 text-sm">
                                내 아이 리포트 <i className="fa-solid fa-arrow-right ml-2 text-xs" aria-hidden="true" />
                            </Link>
                        </div>
                    </header>

                    <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)] xl:p-8">
                        <div className="min-w-0">
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                {metrics.map((metric) => (
                                    <article key={metric.label} className="ddb-crayon-paper rounded-3xl border p-4">
                                        <span className="ddb-crayon-icon grid h-9 w-9 place-items-center rounded-xl text-sm" data-crayon-tone={metric.tone}><i className={`fa-solid ${metric.icon}`} aria-hidden="true" /></span>
                                        <p className="mt-3 text-[10px] font-black text-neutral-500">{metric.label}</p>
                                        <strong className="mt-1 block text-lg font-black text-neutral-950">{loading && !engagement ? "…" : metric.value}</strong>
                                        <span className="mt-1 block text-[10px] font-bold leading-4 text-neutral-400">{metric.helper}</span>
                                    </article>
                                ))}
                            </div>

                            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                <article className="ddb-crayon-paper rounded-[26px] border p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="ddb-crayon-kicker text-xs">오늘 해야 할 일</p>
                                            <h3 className="ddb-crayon-title mt-1 text-2xl">작게 하나씩 완료해요</h3>
                                        </div>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-neutral-600">{completedRoutineCount}/4</span>
                                    </div>
                                    <div className="mt-4 grid gap-2">
                                        {(engagement?.todayTasks || []).map((task) => (
                                            <button key={task.taskId} type="button" disabled={task.completed || savingTask !== null} onClick={() => void completeTask(task.taskId)} className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3 text-left text-sm font-black transition ${task.completed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-white text-neutral-700 hover:border-indigo-300"}`}>
                                                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${task.completed ? "bg-emerald-500 text-white" : "border-2 border-neutral-200 text-transparent"}`}><i className="fa-solid fa-check text-[10px]" /></span>
                                                <span className="min-w-0 flex-1">{task.title}</span>
                                                <span className="text-[10px] text-indigo-600">+{task.xp}XP</span>
                                            </button>
                                        ))}
                                        <Link href="/pet-lens/" className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3 text-sm font-black ${analyzedToday ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-white text-neutral-700 hover:border-indigo-300"}`}>
                                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${analyzedToday ? "bg-emerald-500 text-white" : "border-2 border-neutral-200 text-neutral-300"}`}><i className={`fa-solid ${analyzedToday ? "fa-check" : "fa-camera"} text-[10px]`} /></span>
                                            <span className="min-w-0 flex-1">사진 건강 분석</span>
                                            <i className="fa-solid fa-chevron-right text-[10px] text-neutral-300" />
                                        </Link>
                                    </div>
                                </article>

                                <article className="ddb-crayon-paper rounded-[26px] border p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="ddb-crayon-kicker text-xs">LEVEL {engagement?.level || 1}</p>
                                            <h3 className="ddb-crayon-title mt-1 text-2xl">{(engagement?.level || 1) < 3 ? "건강 새싹" : "우리 아이 지킴이"}</h3>
                                        </div>
                                        <span className="ddb-crayon-icon grid h-12 w-12 place-items-center rounded-2xl text-xl" data-crayon-tone="orange"><i className="fa-solid fa-medal" /></span>
                                    </div>
                                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                                        <div className="ddb-crayon-meter h-full rounded-full transition-[width] duration-700" style={{ width: `${levelProgress}%` }} />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-[10px] font-black text-neutral-500">
                                        <span>{engagement?.xp || 0} XP</span>
                                        <span>다음 레벨 {engagement?.nextLevelXp || 100} XP</span>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <div className="rounded-2xl bg-white/80 p-3"><span className="text-[10px] font-black text-neutral-500">최근 건강 변화</span><strong className="mt-1 block text-xs font-black leading-5 text-neutral-900">{analysisStatus(pet?.rawAnalysis)}</strong></div>
                                        <Link href={pet ? (variant === "home" ? "#recommend" : "/#recommend") : "/mypage/?profile=required#pet-profiles"} className="rounded-2xl bg-white/80 p-3 transition hover:bg-white"><span className="text-[10px] font-black text-neutral-500">AI 추천</span><strong className="mt-1 block text-xs font-black leading-5 text-indigo-700">{pet ? recommendationCopy(pet.concerns || []) : "프로필 등록 후 맞춤 추천 받기"}</strong></Link>
                                    </div>
                                </article>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <ProgressCard label="이번 주 출석" value={engagement?.weeklyAttendanceProgress || 0} target={engagement?.weeklyAttendanceTarget || 7} tone="ddb-crayon-meter" />
                                <ProgressCard label="이번 달 AI 체크" value={engagement?.monthlyAnalysisProgress || 0} target={engagement?.monthlyAnalysisTarget || 5} tone="ddb-crayon-meter ddb-crayon-meter--teal" />
                            </div>
                        </div>

                        <div className="min-w-0">
                            {attendance ? (
                                <AttendanceStampCard
                                    claimedToday={attendance.claimedToday}
                                    currentStreak={attendance.currentStreak}
                                    dailyReward={attendance.dailyRewardDaengLabCoins}
                                    coinBalance={attendance.wallet.daengLabCoins}
                                    recentDays={attendance.recentDays.map((day) => ({ date: day.businessDate, claimed: day.claimed }))}
                                    disabled={loading}
                                    onClaim={claimAttendance}
                                />
                            ) : (
                                <div className="ddb-crayon-paper grid min-h-[330px] place-items-center rounded-[28px] border p-6 text-center">
                                    <div>
                                        <i className={`fa-solid ${loading ? "fa-circle-notch fa-spin" : "fa-paw"} text-3xl text-indigo-300`} />
                                        <p className="mt-3 text-sm font-black text-neutral-600">{loading ? "출근도장을 준비하는 중" : "출근도장을 불러오지 못했어요"}</p>
                                        {!loading && <button type="button" onClick={() => void refresh()} className="btn btn-secondary mt-4">다시 불러오기</button>}
                                    </div>
                                </div>
                            )}
                            <div className="ddb-crayon-paper mt-3 rounded-2xl border p-4 text-xs font-bold leading-5 text-neutral-500">
                                <i className="fa-solid fa-shield-heart mr-2 text-indigo-500" aria-hidden="true" />
                                도장 날짜와 보상은 한국 시간 기준으로 서버가 확인하며, 같은 날 여러 번 눌러도 한 번만 지급됩니다.
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mx-4 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 sm:mx-6 xl:mx-8">
                            <span role="alert">{error}</span>
                            <button type="button" onClick={() => void refresh()} className="font-black underline">다시 시도</button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function ProgressCard({ label, value, target, tone }: { label: string; value: number; target: number; tone: string }) {
    const progress = ratio(value, target);
    return (
        <article className="ddb-crayon-paper rounded-2xl border p-3">
            <div className="flex items-center justify-between gap-2 text-[10px] font-black text-neutral-500"><span>{label}</span><span>{value}/{target}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"><div className={`h-full rounded-full ${tone}`} style={{ width: `${progress}%` }} /></div>
        </article>
    );
}

function DashboardLoading() {
    return <div className="mx-auto grid min-h-[50vh] w-full max-w-[1280px] place-items-center px-4 py-12 text-sm font-black text-neutral-500"><i className="fa-solid fa-circle-notch fa-spin mr-2" />AI 챌린지를 불러오는 중입니다.</div>;
}
