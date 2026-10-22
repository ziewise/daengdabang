"use client";

/**
 * MemberAiDashboard — 보물광산 "오늘의 보물" 로그인 후 화면
 * ---------------------------------------------------------------------
 * 2026-10-22 사용자 선택 "하루 원판"(웹 기록 결): 기능 · 계산은 그대로 두고 보이는 모양만 바꿈.
 *  - 민트 쿠션 판(비회원 화면 .dw-tguest 와 같은 판): 왼쪽 하루 원판(TreasureDial) · 오른쪽 분홍 판(.dw-tlogin, "지금 할 일")
 *    원판 조각 = 출근 도장 + 서버가 주는 오늘 할 일 + 사진 건강 분석. 조각을 고르면 분홍 판이 그 할 일로 바뀌고,
 *    분홍 판 버튼이 기존 함수(claimDaengLabAttendance · completeDaengLabCareTask · PetLens 이동)를 그대로 부른다.
 *  - 아래 쿠션 둘(.dw-tpair): 노랑 = 이번 주 출석(.dw-dsteps 동그라미 — 도장 찍은 날은 앱과 같은 요일 스티커가 쾅 붙음,
 *    오늘 빈칸을 눌러도 도장) · 보라 = 레벨 · 최근 변화 · AI 추천
 *  - 가운데: 회원이 올린 반려견 사진(없으면 견종 그림)
 * 꾸밈 CSS 는 app/daily-web.css 의 "하루 원판" 묶음.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import TreasureDial, { type DialSlice } from "@/components/growth/TreasureDial";
import {
    claimDaengLabAttendance,
    completeDaengLabCareTask,
    loadDaengLabAttendance,
    loadDaengLabEngagement,
    type DaengLabAttendance,
    type DaengLabCareTaskId,
    type DaengLabEngagement,
} from "@/lib/customer-api";
import { useAuth, type PetProfile } from "@/lib/store";
import { petLensProfileHref } from "@/lib/petlens-routing";
import { getPetBreedVisual, resolvePetBreedId } from "@/lib/pet-companion-breeds";

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

function dashboardPetKey(pet: PetProfile, index: number) {
    return pet.apiProfileId ? `profile:${pet.apiProfileId}` : `local:${index}:${pet.name}`;
}

// 요일 한 글자(한국 시간) — AttendanceStampCard 와 같은 규칙
function weekday(value: string) {
    const date = new Date(`${value}T12:00:00+09:00`);
    if (Number.isNaN(date.getTime())) return "·";
    return new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" }).format(date);
}

// 원판 조각 색(연한 바탕 · 끝냈을 때 진한 색 · 고른 테) — 순서대로 돌려 씀
const SLICE_TONES = [
    { pale: "#fff0f4", strong: "#f8c2d3", ring: "#e9789a" },
    { pale: "#ecf9f3", strong: "#bde9d4", ring: "#2fb58a" },
    { pale: "#eff7fc", strong: "#c7e3f5", ring: "#3f9fd3" },
    { pale: "#f5f2fe", strong: "#dcd2fa", ring: "#8a6fe0" },
    { pale: "#fff7e6", strong: "#fbe0a6", ring: "#e0a020" },
];
// 할 일 그림(서버 할 일 id 별, 모르는 id 는 돌봄 그림)
const TASK_ART: Partial<Record<DaengLabCareTaskId, string>> = {
    walk_20: "/images/ui/daily-care-256.webp",
    eye_check: "/images/ui/mypet-view-front-160.webp",
};
const ART_STAMP = "/images/ui/daily-checkin-256.webp";
// 요일별 출근 스티커(앱 매일 댕생활과 같은 그림) — 도장 찍은 날 칸에 붙음
const DAY_STICKER: Record<string, string> = {
    월: "/images/ui/stickers/sticker-mon.webp",
    화: "/images/ui/stickers/sticker-tue.webp",
    수: "/images/ui/stickers/sticker-wed.webp",
    목: "/images/ui/stickers/sticker-thu.webp",
    금: "/images/ui/stickers/sticker-fri.webp",
    토: "/images/ui/stickers/sticker-sat.webp",
    일: "/images/ui/stickers/sticker-sun.webp",
};
const ART_ANALYSIS = "/images/ui/mypet-shutter-384.webp";
const ART_CARE = "/images/ui/daily-care-256.webp";
// 견종 그림(반려견 친구 기능과 같은 그림 · 같은 판번호)
const BREED_ART_ROOT = "/images/pet-companion/cute-v4-breeds";
const BREED_ART_VERSION = "20260730-1";

// 원판 조각 하나가 가리키는 할 일
type Slot =
    | { kind: "attendance" }
    | { kind: "task"; taskId: DaengLabCareTaskId; title: string; description: string; xp: number; completed: boolean }
    | { kind: "analysis" };

export default function MemberAiDashboard({ variant = "home" }: Props) {
    const { hydrated, user } = useAuth();
    const [attendance, setAttendance] = useState<DaengLabAttendance | null>(null);
    const [engagement, setEngagement] = useState<DaengLabEngagement | null>(null);
    const [loading, setLoading] = useState(false);
    const [savingTask, setSavingTask] = useState<DaengLabCareTaskId | null>(null);
    const [error, setError] = useState("");
    const [selectedPetKey, setSelectedPetKey] = useState("");
    // 원판에서 고른 조각(null = 아직 안 끝낸 첫 조각을 자동으로)
    const [pickedSlot, setPickedSlot] = useState<number | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [notice, setNotice] = useState("");
    const [burst, setBurst] = useState<{ key: number; text: string } | null>(null);
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

    // 코인 표시는 1.3초 뒤 사라짐
    useEffect(() => {
        if (!burst) return;
        const timer = window.setTimeout(() => setBurst(null), 1_300);
        return () => window.clearTimeout(timer);
    }, [burst]);

    const pets = user?.pets || [];
    const selectedPetIndex = pets.findIndex((candidate, index) => dashboardPetKey(candidate, index) === selectedPetKey);
    const pet = pets[selectedPetIndex >= 0 ? selectedPetIndex : 0];
    const today = attendance?.businessDate || engagement?.businessDate || "";
    const analyzedToday = Boolean(pet?.lastAnalyzedAt && seoulDate(pet.lastAnalyzedAt) === today);
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

    // 원판 조각 = 출근 도장 + 오늘 할 일 + 사진 분석
    const slots: Slot[] = [
        { kind: "attendance" },
        ...(engagement?.todayTasks || []).map((task) => ({ kind: "task" as const, ...task })),
        { kind: "analysis" },
    ];
    const slotDone = (slot: Slot) => slot.kind === "attendance" ? Boolean(attendance?.claimedToday) : slot.kind === "task" ? slot.completed : analyzedToday;
    const firstOpen = Math.max(0, slots.findIndex((slot) => !slotDone(slot)));
    const selected = Math.min(pickedSlot ?? firstOpen, slots.length - 1);
    const slot = slots[selected];
    const slices: DialSlice[] = slots.map((item, index) => ({
        id: item.kind === "task" ? item.taskId : item.kind,
        label: item.kind === "attendance" ? "출근 도장" : item.kind === "task" ? item.title : "사진 건강 분석",
        art: item.kind === "attendance" ? ART_STAMP : item.kind === "task" ? TASK_ART[item.taskId] || ART_CARE : ART_ANALYSIS,
        done: slotDone(item),
        ...SLICE_TONES[index % SLICE_TONES.length],
    }));
    // 끝낸 뒤 다음 안 끝낸 조각으로(원판이 돌아감)
    const goNextOpen = (from: number, doneNow: boolean[]) => {
        for (let step = 1; step <= slots.length; step += 1) {
            const next = (from + step) % slots.length;
            if (!doneNow[next]) { window.setTimeout(() => setPickedSlot(next), 1_100); return; }
        }
    };

    if (!hydrated) return variant === "home" ? null : <DashboardLoading />;
    if (!user) {
        if (variant === "home") return null;
        return (
            <div className="mx-auto w-full max-w-[900px] px-4 py-16 text-center md:px-6">
                <div className="ddb-crayon-paper rounded-[32px] border p-8 md:p-12">
                    <span className="ddb-crayon-icon mx-auto grid h-16 w-16 place-items-center rounded-3xl text-2xl" data-crayon-tone="coral"><i className="fa-solid fa-paw" /></span>
                    <h1 className="ddb-crayon-title mt-5 text-4xl">로그인하고 오늘의 챌린지를 시작하세요</h1>
                    <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">출근도장과 XP, 코인 보상은 회원 계정에 안전하게 저장됩니다.</p>
                    <Link href="/auth/login/?redirect=%2Ftreasure-mine%2F" className="btn btn-primary ddb-attention-cta mt-6">로그인하기</Link>
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
        if (!user.apiAccessToken || savingTask) return false;
        setSavingTask(taskId);
        setError("");
        try {
            const next = await completeDaengLabCareTask(taskId, user.apiAccessToken);
            setEngagement(next);
            return true;
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "돌봄 기록을 저장하지 못했습니다.");
            return false;
        } finally {
            setSavingTask(null);
        }
    };

    // 분홍 판 버튼 — 출근 도장(코인 표시 · 안내 문구) / 할 일 완료, 끝나면 원판이 다음 조각으로
    const doneList = slots.map(slotDone);
    const onStamp = async () => {
        if (!attendance || attendance.claimedToday || claiming || loading) return;
        setClaiming(true);
        setNotice("");
        try {
            const credited = await claimAttendance();
            if (credited) {
                setBurst({ key: Date.now(), text: `+${attendance.dailyRewardDaengLabCoins} 코인` });
                setNotice(`출근 완료! 댕다방 연구소 코인 ${attendance.dailyRewardDaengLabCoins}개가 지급됐어요.`);
                goNextOpen(selected, doneList.map((done, index) => done || index === selected));
            } else {
                setNotice("오늘 출근도장은 이미 찍혀 있어요. 내일 다시 만나요!");
            }
        } finally {
            setClaiming(false);
        }
    };
    const onTask = async (taskId: DaengLabCareTaskId) => {
        if (await completeTask(taskId)) goNextOpen(selected, doneList.map((done, index) => done || index === selected));
    };

    const breedId = resolvePetBreedId(pet?.breed || "");
    const breedArt = `${BREED_ART_ROOT}/${getPetBreedVisual(breedId).assetId}-core.webp?v=${BREED_ART_VERSION}`;
    const ready = Boolean(attendance && engagement);
    const slotArt = slices[selected]?.art || ART_STAMP;

    return (
        <section id="ai-dashboard" className={variant === "home" ? "py-10 md:py-14" : "py-8"} aria-labelledby="ai-dashboard-title" data-member-ai-dashboard data-growth-motion-scope>
            <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
                {/* 화면 읽기용 제목(보이는 제목은 위 "오늘 바로 할 수 있는 돌봄부터") */}
                <h2 id="ai-dashboard-title" className="sr-only">PERSONAL AI DASHBOARD · {pet ? `${pet.name}와 오늘 뭐 하지?` : `${user.name}님, 오늘 뭐 하지?`}</h2>

                {/* 아이가 둘 이상이면 고르기 */}
                {pets.length > 1 ? (
                    <div className="dw-dial-pets" role="tablist" aria-label="보물광산에서 볼 강아지 선택" data-treasure-pet-selector>
                        {pets.map((candidate, index) => {
                            const key = dashboardPetKey(candidate, index);
                            const active = candidate === pet;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setSelectedPetKey(key)}
                                    className={`ddb-motion-lift dw-pill dw-pill-sm ${active ? "ddb-crayon-link dw-pill-main" : ""}`}
                                >
                                    {candidate.photoDataUrl ? (
                                        <span className="relative mr-1.5 h-6 w-6 overflow-hidden rounded-full bg-neutral-100">
                                            <Image src={candidate.photoDataUrl} alt="" fill sizes="24px" className="object-cover" unoptimized />
                                        </span>
                                    ) : (
                                        <i className="fa-solid fa-dog mr-1.5 text-[11px]" aria-hidden="true" />
                                    )}
                                    {candidate.name}
                                </button>
                            );
                        })}
                    </div>
                ) : null}

                {/* 민트 쿠션 판 — 왼쪽 하루 원판 · 오른쪽 분홍 "지금 할 일" */}
                <div className="dw-csheet is-mint dw-tguest dw-tmember">
                    <div className="dw-dial-wrap">
                        <TreasureDial
                            slices={slices}
                            selected={selected}
                            onSelect={setPickedSlot}
                            score={careScore}
                            burst={burst}
                            center={(
                                <>
                                    {pet?.photoDataUrl ? (
                                        <span className="dw-dial-photo" aria-hidden="true"><Image src={pet.photoDataUrl} alt="" fill sizes="80px" className="object-cover" unoptimized /></span>
                                    ) : (
                                        <span className="dw-dial-pet" style={{ backgroundImage: `url("${breedArt}")` } as CSSProperties} aria-hidden="true" />
                                    )}
                                    <small>오늘 루틴</small>
                                    <b>{careScore === null ? "—" : careScore}</b>
                                    <small>{completedRoutineCount}/{slots.length} 완료</small>
                                </>
                            )}
                        />
                        <p className="dw-dial-hint">조각을 눌러 보세요</p>
                    </div>

                    <div className="dw-csheet is-pink dw-tlogin dw-dial-card" aria-live="polite">
                        {!ready ? (
                            <div className="dw-dial-card-in">
                                <i className={`fa-solid ${loading ? "fa-circle-notch fa-spin" : "fa-paw"} text-3xl text-pink-300`} aria-hidden="true" />
                                <p className="dw-tlogin-body">{loading ? "오늘의 보물을 준비하는 중" : "출근도장을 불러오지 못했어요"}</p>
                                {!loading && <button type="button" onClick={() => void refresh()} className="ddb-motion-lift dw-pill dw-pill-sm mt-3">다시 불러오기</button>}
                            </div>
                        ) : (
                            <div key={selected} className="dw-dial-card-in">
                                <p className="ddb-crayon-kicker dw-kicker">지금 할 일 · {selected + 1}/{slots.length}</p>
                                <span className="dw-rring dw-tlogin-ring" aria-hidden="true"><span><Image src={slotArt} alt="" width={96} height={96} /></span></span>
                                {slot.kind === "attendance" ? (
                                    <>
                                        <h3 className="dw-tlogin-title">출근 도장 찍기</h3>
                                        <p className="dw-tlogin-body">하루 한 번 도장을 찍으면 코인 {attendance!.dailyRewardDaengLabCoins}개가 지갑에 바로 들어와요.</p>
                                    </>
                                ) : slot.kind === "task" ? (
                                    <>
                                        <h3 className="dw-tlogin-title">{slot.title}</h3>
                                        <p className="dw-tlogin-body">{slot.description}</p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="dw-tlogin-title">사진 건강 분석</h3>
                                        <p className="dw-tlogin-body">{analyzedToday ? "오늘 사진 분석을 마쳤어요. 결과는 우리 아이 기록에서 볼 수 있어요." : "정면 · 옆 · 뒤 사진으로 지난 기록과 달라진 점을 살펴봐요."}</p>
                                    </>
                                )}
                                <div className="mt-auto grid w-full gap-2 pt-4">
                                    {slot.kind === "attendance" ? (
                                        attendance!.claimedToday
                                            ? <span className="dw-pill dw-pill-sm dw-dial-done"><i className="fa-solid fa-check mr-1.5" aria-hidden="true" />오늘 출근 완료</span>
                                            : <button type="button" onClick={() => void onStamp()} disabled={claiming || loading} className="ddb-crayon-link ddb-attention-cta dw-pill dw-pill-main dw-pill-sm">{claiming ? "꾹…" : `도장 꾹! 코인 ${attendance!.dailyRewardDaengLabCoins}개 받기`}</button>
                                    ) : slot.kind === "task" ? (
                                        slot.completed
                                            ? <span className="dw-pill dw-pill-sm dw-dial-done"><i className="fa-solid fa-check mr-1.5" aria-hidden="true" />완료 · +{slot.xp}XP</span>
                                            : <button type="button" onClick={() => void onTask(slot.taskId)} disabled={savingTask !== null} className="ddb-crayon-link ddb-attention-cta dw-pill dw-pill-main dw-pill-sm">{savingTask === slot.taskId ? "저장 중…" : `했어요 · +${slot.xp}XP`}</button>
                                    ) : (
                                        <Link href={petLensProfileHref(pet?.apiProfileId)} className="ddb-crayon-link ddb-attention-cta dw-pill dw-pill-main dw-pill-sm">
                                            <i className={`fa-solid ${analyzedToday ? "fa-check" : "fa-camera"} mr-1.5`} aria-hidden="true" />{analyzedToday ? "사진 분석 다시 보기" : "사진 찍으러 가기"}
                                        </Link>
                                    )}
                                </div>
                                {notice && slot.kind === "attendance" ? <p className="dw-dial-notice" role="status">{notice}</p> : null}
                            </div>
                        )}
                    </div>
                </div>

                {/* 아래 쿠션 둘 — 노랑: 이번 주 출석 · 보라: 레벨 · 최근 변화 · AI 추천 */}
                <div className="dw-pair dw-tpair dw-dial-pair">
                    <div className="dw-csheet is-yellow dw-dial-week">
                        <p className="ddb-crayon-kicker dw-kicker">THIS WEEK</p>
                        <h3 className="dw-tlogin-title">이번 주 출석 {engagement?.weeklyAttendanceProgress || 0}/{engagement?.weeklyAttendanceTarget || 7}</h3>
                        <ol className="dw-dsteps" aria-label="최근 7일 출근도장">
                            {(attendance?.recentDays || []).map((day, index) => {
                                const isToday = day.businessDate === today;
                                const dayName = weekday(day.businessDate);
                                const sticker = DAY_STICKER[dayName];
                                // 붙은 스티커 기울기(칸마다 조금씩 다르게, -6~6도) · 방금 찍은 오늘은 쾅 붙는 움직임
                                const tilt = `${((index * 37) % 13) - 6}deg`;
                                return (
                                    <li key={day.businessDate} className={`${day.claimed ? "is-claimed" : ""} ${isToday ? "is-today" : ""}`}>
                                        {day.claimed && sticker ? (
                                            <span className="dw-dstep-art dw-dial-stuck">
                                                <Image src={sticker} alt="" width={88} height={88} className={isToday && burst ? "dw-dial-slam" : ""} style={{ "--dw-tilt": tilt } as CSSProperties} />
                                            </span>
                                        ) : isToday && attendance && !attendance.claimedToday ? (
                                            <button type="button" onClick={() => void onStamp()} disabled={claiming || loading} className="dw-dstep-art dw-dial-slot" aria-label={`오늘 출근 도장 찍고 코인 ${attendance.dailyRewardDaengLabCoins}개 받기`}>
                                                <span>{claiming ? "꾹…" : "붙이기"}</span>
                                            </button>
                                        ) : (
                                            <span className="dw-dstep-art dw-dial-empty" aria-hidden="true" />
                                        )}
                                        <span className="dw-dstep-title">{isToday ? "오늘" : dayName}</span>
                                        <span className="sr-only">{day.claimed ? "도장 찍음" : "도장 없음"}</span>
                                    </li>
                                );
                            })}
                        </ol>
                        <div className="dw-dial-chips">
                            <span className="dw-chip">{attendance?.currentStreak || 0}일 연속 출근</span>
                            <span className="dw-chip">{attendance ? `${attendance.wallet.daengLabCoins.toLocaleString("ko-KR")}C 보유` : "지갑 확인 중"}</span>
                            <span className="dw-chip">하루 도장 코인 {attendance?.dailyRewardDaengLabCoins ?? 2}개</span>
                        </div>
                        <p className="dw-dial-rule"><i className="fa-solid fa-shield-heart" aria-hidden="true" /> 도장 날짜와 보상은 한국 시간 기준으로 서버가 확인하며, 같은 날 여러 번 눌러도 한 번만 지급됩니다. 원판 테두리의 루틴 점수는 의료 점수가 아닌 오늘 돌봄 완료율이에요.</p>
                    </div>

                    <div className="dw-csheet is-lav dw-dial-level">
                        <div className="dw-dial-level-head">
                            <span className="dw-rring" aria-hidden="true"><span><Image src="/images/ui/daily-hero-treasure-384.webp" alt="" width={72} height={72} /></span></span>
                            <div>
                                <p className="ddb-crayon-kicker dw-kicker">LEVEL {engagement?.level || 1}</p>
                                <h3 className="dw-tlogin-title">{(engagement?.level || 1) < 3 ? "건강 새싹" : "우리 아이 지킴이"}</h3>
                            </div>
                        </div>
                        <div className="dw-dial-meter"><span style={{ width: `${levelProgress}%` }} /></div>
                        <div className="dw-dial-xp"><span>{engagement?.xp || 0} XP</span><span>다음 레벨 {engagement?.nextLevelXp || 100} XP</span></div>
                        <dl className="dw-dial-facts">
                            <div><dt>최근 건강 변화</dt><dd>{analysisStatus(pet?.rawAnalysis)}</dd></div>
                            <div><dt>이번 달 AI 체크</dt><dd>{engagement?.monthlyAnalysisProgress || 0}/{engagement?.monthlyAnalysisTarget || 5}</dd></div>
                            <div>
                                <dt>AI 추천</dt>
                                <dd><Link href={pet ? (variant === "home" ? "#recommend" : "/#recommend") : "/mypage/?profile=required#pet-profiles"} className="ddb-motion-lift dw-dial-link">{pet ? recommendationCopy(pet.concerns || []) : "프로필 등록 후 맞춤 추천 받기"} <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" /></Link></dd>
                            </div>
                        </dl>
                        <Link href="/my-pet/" className="ddb-motion-lift dw-pill dw-pill-sm mt-4">우리 아이 기록 보기</Link>
                    </div>
                </div>

                {error && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">
                        <span role="alert">{error}</span>
                        <button type="button" onClick={() => void refresh()} className="font-black underline">다시 시도</button>
                    </div>
                )}
            </div>
        </section>
    );
}

function DashboardLoading() {
    return <div className="mx-auto grid min-h-[50vh] w-full max-w-[1280px] place-items-center px-4 py-12 text-sm font-black text-neutral-500"><i className="fa-solid fa-circle-notch fa-spin mr-2" />AI 챌린지를 불러오는 중입니다.</div>;
}
