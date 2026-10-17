"use client";

/**
 * 스티커북 시안 — 매일 댕생활(/app/sticker/daily) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * "한 기능은 한 자리" 배치에서 매일 댕생활 = 나의 이번 주 기록 · 혜택 · 안내.
 *  - 동네 돌봄 찾기는 전용 화면(/app/sticker/care) · 굿즈 공모전은 댕다방. 오늘 할 일은 홈과 여기 모두에서 할 수 있음(같은 상태).
 * 다이어리 속지 + 색인 탭 3개(이번 주 · 혜택 · 안내), 옆으로 밀면 쪽이 넘어간다. 주소 ?tab=N 으로 바로 열림.
 *  - 이번 주: 이번 주 출근 스티커(오늘 칸을 톡 = 바로 붙이기) · 레벨 도장 · XP · 주간 출석 · 월간 AI 체크 ·
 *            오늘 돌봄 한눈에(루틴 점수 · AI 분석 · 출석 챌린지 · 산책 — 운영 회원 대시보드와 같은 계산 · 문구) ·
 *            최근 건강 변화 · AI 추천 · 안전 공유(AI 기록 · 친구 초대 — lib/growth-programs 공유 문구) ·
 *            오늘 해야 할 일 포스트잇 4장(출근도장 · 20분 산책 · 눈 상태 확인 · 사진 건강 분석) — 톡 하면 바로 완료(완료 도장 · XP · 코인). 홈과 같은 상태를 씀
 *  - 혜택: 준비 중 혜택 카드(이름 · 상태) → 톡 하면 그 자리에서 메모 팝업이 펼쳐짐(소개 · 세부 · (필수) 이메일 소식 동의 · 소식 받기).
 *          비회원은 팝업 안에서 로그인으로. 문구는 협업자 lib/growth-programs 의 실제 문구. 굿즈 공모전은 댕다방에서(링크)
 *  - 안내: 확장 계획 = 산책길 지도(정류장 스티커 · 발자국 · 상태는 마스킹테이프 이름표) ·
 *          운영 기준 = 테이프로 붙인 약속 편지(도장 그림 · 톡 하면 펼침 · 댕다방 드림)
 * 로그인 전 이번 주: 체험 없이 로그인 초대 + 이용 순서. 문구는 협업자 화면의 실제 문구.
 * 웹과 같은 동작(2026-10-17 맞춤): 오류 메모 + "다시 시도" · 출근 두 번 톡 방지 · 실패 시 +XP 없음 · 실제 반려견 사진 분석 주소 ·
 *   최근 건강 변화/AI 추천 규칙 · AI 기록 있을 때만 공유(실패하면 복사) · 관심등록 오류 문구 · 개인정보처리방침 링크 ·
 *   관리자 공개 설정(혜택 · 동네 돌봄 · 운영 기준 숨김) · 웹과 같은 이용 기록(trackStorefrontEvent).
 */

import { appLoginHref } from "@/components/app-shell/appTabs";
import { hasShareableAiRecord } from "@/components/growth/GrowthHub";
import { copyText } from "@/components/growth/GrowthShareCard";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { GROWTH_PROGRAM_CARDS, growthSharePayload, type GrowthProgramCard, type GrowthShareKind } from "@/lib/growth-programs";
import { petLensProfileHref } from "@/lib/petlens-routing";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import { growthInterestLabel } from "@/lib/growth-programs";
import { Peek, haptic } from "../gestures";
import { CoinChip, KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { EXPANSION_CARDS, GUEST_STEPS, POLICIES, pageHref } from "../page-data";
import { ConceptBar, HC_CSS, WEEK, flyCoin, todayIndex, untilTomorrow, useDemoSession, useGrowthVisibility, useInitialTab, useMember, useNow, useTodayDemo, type TaskId } from "../shared";
import { cancelGrowthInterest, DdbApiError, loadGoodsContestSummary, loadGrowthInterests, submitGrowthInterest, type GrowthProgramId } from "@/lib/customer-api";
import { useAuth } from "@/lib/store";
import { DiaryBody, DiaryTabs, InkStamp, NoteToast, PARTS_CSS, SectionLabel } from "../sticker-parts";
import { LoginInvite, STICKER_CSS, Tape, Patch } from "../sticker-kit";
import { Sparkle } from "../kit";

const TABS = [
    { label: "이번 주", color: "#ffe1ea" },
    { label: "혜택", color: "#fff1b8" },
    { label: "안내", color: "#e3ecff" },
];
const REDIRECT = "/app/sticker/daily/";

/* 웹 MemberAiDashboard.analysisStatus 와 같은 규칙(복사) — 최근 건강 변화 문구(협업자 파일은 고치지 않음) */
function analysisStatus(rawAnalysis: unknown) {
    if (!rawAnalysis || typeof rawAnalysis !== "object") return "첫 분석을 기다리고 있어요";
    const row = rawAnalysis as Record<string, unknown>;
    const details = row.details && typeof row.details === "object" ? row.details as Record<string, unknown> : null;
    const status = typeof details?.statusLabel === "string" ? details.statusLabel : "사진 분석 저장 완료";
    return status.slice(0, 34);
}

/* 웹 MemberAiDashboard.recommendationCopy 와 같은 규칙(복사) — AI 추천 문구 5가지 */
function recommendationCopy(concerns: string[]) {
    const text = concerns.join(" ");
    if (/눈|고글|자외선/.test(text)) return "눈 보호 관심을 반영한 산책 안전용품";
    if (/피부|발바닥|털|케어/.test(text)) return "피부·발바닥 케어 관심을 반영한 관리용품";
    if (/체중|식단|알러지|사료/.test(text)) return "식단·체중 관심을 반영한 먹거리";
    if (/놀이|분리불안/.test(text)) return "활동량과 놀이 성향을 반영한 장난감";
    return "프로필과 최근 분석을 반영한 맞춤 상품";
}

/* 웹 GrowthPrograms.interestErrorMessage 와 같은 규칙(복사) — 관심등록 오류 문구(401 · 422 · 429 · 서버 주소 없음) */
function interestErrorMessage(error: unknown): string {
    if (error instanceof DdbApiError) {
        if (error.status === 401) return "로그인 시간이 끝났어요. 다시 로그인한 뒤 관심등록을 이어가 주세요.";
        if (error.status === 422) return "동의 항목을 다시 확인해 주세요.";
        if (error.status === 429) return "요청이 많아 잠시 보호 중이에요. 잠시 후 다시 시도해 주세요.";
        if (error.code === "missing_api_base") return "지금은 관심등록 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.";
    }
    return "관심등록 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

export default function StickerDaily() {
    const [session, setSession] = useDemoSession();
    const initialTab = useInitialTab(TABS.length);
    const member = session === "member";
    const today = useTodayDemo(session);
    const now = useNow();
    const wd = todayIndex(now ?? undefined);
    const coinRef = useRef<HTMLSpanElement>(null);

    // 처음 쪽: 주소 ?tab= 그대로(처음 그릴 때부터)
    const [tab, setTab] = useState(() => initialTab);
    const [dir, setDir] = useState(1);
    const go = (i: number) => { setDir(i > tab ? 1 : -1); setTab(i); };
    const swipe = (step: 1 | -1) => {
        const n = tab + step;
        if (n < 0 || n >= TABS.length) return;
        haptic("light");
        go(n);
    };

    const [toast, setToast] = useState<string | null>(null);
    const clearToast = useCallback(() => setToast(null), []);

    /* 오늘 할 일 — 홈과 같은 상태(어디서 하든 이어짐) */
    const [gain, setGain] = useState<{ key: string; text: string; n: number } | null>(null); // 포스트잇 위로 떠오르는 +XP · +코인
    // from: 코인이 날아갈 출발점(누른 칸) · t: 누른 시각(떠오르는 숫자를 매번 새로)
    // 출근 — 협업자 claimDaengLabAttendance(useTodayDemo.stamp). 새로 찍혔을 때만 +코인 · 코인 비행
    const stamp = (from: HTMLElement | null, t: number) => {
        // 웹 AttendanceStampCard 처럼 불러오기 전 · 찍는 중에는 무시(두 번 톡 방지)
        if (today.stamped || !today.ready || today.claiming) return;
        void today.stamp().then((newly) => {
            if (!newly) return;
            haptic("medium");
            setGain({ key: "stamp", text: `+${today.dailyRewardCoins}코인`, n: t });
            window.setTimeout(() => flyCoin(from, coinRef.current, 2), 200);
        });
    };
    // 오늘 할 일 — 협업자 completeDaengLabCareTask(useTodayDemo.complete)
    const doTask = (id: TaskId, t: number) => {
        if (today.done[id] || today.savingTask) return;
        const task = today.tasks.find((x) => x.taskId === id);
        void today.complete(id).then((ok) => {
            if (!ok) return; // 저장 실패면 +XP · 진동 없음(오류 메모가 대신 보임)
            haptic("medium");
            setGain({ key: id, text: `+${task?.xp ?? 0}XP`, n: t });
        });
    };
    const onTodo = (key: string, el: HTMLElement, t: number) => (key === "stamp" ? stamp(el, t) : doTask(key as TaskId, t));

    /* 준비 중 혜택 관심등록 — 협업자 GrowthPrograms 와 같은 함수(불러오기 loadGrowthInterests · 등록 submitGrowthInterest · 취소 cancelGrowthInterest) */
    const { user, hydrated: authHydrated } = useAuth();
    const accessToken = user?.apiAccessToken || "";
    // 화면 진입 기록 — 웹 GrowthHub 의 growth_hub_viewed 와 같음(로그인 정보 확인 뒤 한 번)
    const viewTracked = useRef(false);
    useEffect(() => {
        if (!authHydrated || viewTracked.current) return;
        viewTracked.current = true;
        trackStorefrontEvent("growth_hub_viewed", { surface: "treasure_mine", audience: user ? "member" : "guest" });
    }, [authHydrated, user]);
    const [interest, setInterest] = useState<Record<string, boolean>>({});
    const [interestBusy, setInterestBusy] = useState(false);
    // 불러오기 끝난 로그인(토큰) — 웹 GrowthPrograms registrationsReady 와 같음(끝나기 전엔 "등록 상태 확인 중")
    const [interestLoadedFor, setInterestLoadedFor] = useState("");
    const interestReady = !accessToken || interestLoadedFor === accessToken;
    // 불러오기 실패 안내 — 웹 GrowthPrograms programNotice 와 같은 문구
    const [interestLoadFailed, setInterestLoadFailed] = useState(false);
    // 관심등록 · 취소 오류(팝업 안) — 웹 GrowthPrograms error 처럼 "로그인" 오류면 다시 로그인 링크
    const [interestErr, setInterestErr] = useState("");
    useEffect(() => {
        if (!accessToken) return;
        let active = true;
        loadGrowthInterests(accessToken)
            .then((list) => {
                if (!active) return;
                setInterest(Object.fromEntries(list.map((r) => [r.programId, true])));
                setInterestLoadFailed(false);
                setInterestLoadedFor(accessToken);
            })
            .catch(() => {
                if (!active) return;
                // 웹과 같이: 빈 상태로 두고 안내 문구 + 실패 기록(새 등록은 서버가 중복 없이 처리)
                setInterest({});
                setInterestLoadedFor(accessToken);
                setInterestLoadFailed(true);
                trackStorefrontEvent("growth_program_interest_failed", {
                    surface: "treasure_mine",
                    stage: "load",
                });
            });
        return () => { active = false; };
    }, [accessToken]);
    const [openCard, setOpenCard] = useState<{ card: GrowthProgramCard; rect: DOMRect; i: number } | null>(null);
    const [consent, setConsent] = useState(false);
    const [consentMore, setConsentMore] = useState(false);
    const [consentErr, setConsentErr] = useState(false);
    const openProgram = (card: GrowthProgramCard, i: number, el: HTMLElement) => {
        haptic("light");
        setConsent(false);
        setConsentMore(false);
        setConsentErr(false);
        setInterestErr("");
        setOpenCard({ card, rect: el.getBoundingClientRect(), i });
    };
    const toggleInterest = (id: string) => {
        // 새로 등록할 때만 동의가 필요(취소는 언제든)
        if (!interest[id] && !consent) {
            setConsentErr(true);
            haptic("light");
            return;
        }
        if (interestBusy || !interestReady) return;
        const programId = id as GrowthProgramId;
        const on = !interest[id];
        setInterestBusy(true);
        setInterestErr("");
        if (on) {
            // 앱은 고르기와 저장이 한 번의 톡 — 웹 selectProgram(관심등록 열기) 기록을 저장 직전에 같은 값으로
            trackStorefrontEvent("growth_program_interest_opened", {
                surface: "treasure_mine",
                programId,
            });
            void submitGrowthInterest({ programId, consentToContact: consent }, accessToken)
                .then((next) => {
                    setInterest((s) => ({ ...s, [next.programId]: true }));
                    haptic("medium");
                    // 이미 등록돼 있으면 웹 GrowthPrograms 와 같은 문구
                    setToast(next.alreadyRegistered ? "이미 관심을 남겨두셨어요 · 중복 신청을 만들지 않고 기존 등록을 확인했습니다." : `관심등록을 저장했어요 · ${growthInterestLabel(next.programId)} 준비 소식이 확정되면 안내할게요.`); // 웹 GrowthPrograms 접수 문구와 같음
                    // 웹 GrowthPrograms submit 성공 기록과 같음
                    trackStorefrontEvent("growth_program_interest_submitted", {
                        surface: "treasure_mine",
                        programId: next.programId,
                        alreadyRegistered: next.alreadyRegistered,
                        outcome: "completed",
                    });
                })
                .catch((caught) => {
                    // 웹 interestErrorMessage 와 같은 문구 · 같은 실패 기록
                    setInterestErr(interestErrorMessage(caught));
                    trackStorefrontEvent("growth_program_interest_failed", {
                        surface: "treasure_mine",
                        programId,
                        stage: "submit",
                    });
                })
                .finally(() => setInterestBusy(false));
            return;
        }
        void cancelGrowthInterest(programId, accessToken)
            .then(() => {
                setInterest((s) => ({ ...s, [id]: false }));
                haptic("light");
                setToast("관심등록을 취소했어요");
            })
            .catch(() => {
                // 웹 GrowthPrograms cancelRegistration 실패와 같은 문구 · 같은 실패 기록
                setInterestErr("관심등록을 취소하지 못했어요. 잠시 후 다시 시도해 주세요.");
                trackStorefrontEvent("growth_program_interest_failed", {
                    surface: "treasure_mine",
                    programId,
                    stage: "cancel",
                });
            })
            .finally(() => setInterestBusy(false));
    };

    /* 굿즈 공모 남은 날 — 협업자 loadGoodsContestSummary.daysRemaining */
    const [goodsDday, setGoodsDday] = useState<number | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        loadGoodsContestSummary(controller.signal).then((g) => setGoodsDday(g.selectionOpen ? g.daysRemaining : null)).catch(() => {});
        return () => controller.abort();
    }, []);

    /* 운영 기준 펼침 */
    const [openPolicy, setOpenPolicy] = useState<number | null>(null);
    const togglePolicy = (i: number) => {
        const on = openPolicy === i;
        // 접혀 있던 운영 기준을 펼칠 때 — 웹 GrowthPolicySummary(details 열림)와 같은 기록
        if (!on && openPolicy === null) trackStorefrontEvent("growth_policy_opened", { surface: "treasure_mine" });
        setOpenPolicy(on ? null : i);
        haptic("light");
    };

    /* 관리자 공개 설정 — 웹 GrowthHub 처럼 혜택(programs) · 동네 돌봄(localCare) · 운영 기준(policy)을 숨김 */
    const visibility = useGrowthVisibility();

    /* 운영 회원 대시보드(MemberAiDashboard)와 같은 계산 */
    // 이번 주 출근 — 서버 값(weeklyAttendanceProgress / Target)
    const attendNow = today.weeklyAttendanceProgress;
    // 이번 주 칸마다 출근 여부 — 서버 출근 기록(recentDays)을 날짜로 맞춤
    const claimedByDate = new Map(today.recentDays.map((d) => [d.businessDate, d.claimed]));
    const weekDate = (i: number) => {
        if (!today.businessDate) return "";
        const base = new Date(`${today.businessDate}T00:00:00Z`);
        base.setUTCDate(base.getUTCDate() - (wd - i));
        return base.toISOString().slice(0, 10);
    };
    // 실제 반려견(최근 분석 · 관심 케어)
    const { pet } = useMember();
    const todayKey = now ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now) : "";
    const analyzedToday = Boolean(todayKey) && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(pet?.lastAnalyzedAt || 0)) === todayKey && Boolean(pet?.lastAnalyzedAt);
    const doneCount = (today.stamped ? 1 : 0) + (today.done.walk_20 ? 1 : 0) + (today.done.eye_check ? 1 : 0) + (analyzedToday ? 1 : 0);
    const careScore = Math.min(100, 52 + doneCount * 12); // 의료 점수가 아닌 오늘 돌봄 완료율
    const prevLevelXp = (today.level - 1) * 100;
    const xpPct = Math.max(0, Math.min(100, Math.round(((today.xp - prevLevelXp) / Math.max(1, today.nextLevelXp - prevLevelXp)) * 100)));
    const levelName = today.level < 3 ? "건강 새싹" : "우리 아이 지킴이";
    const ratio = (v: number, t: number) => Math.max(0, Math.min(100, Math.round((v / Math.max(1, t)) * 100)));
    // AI 추천 — 웹 MemberAiDashboard 와 같음: 반려견이 있으면 맞춤 추천(5가지 문구), 없으면 프로필 등록으로
    // 앱에선 "/" 가 앱 쇼핑 화면으로 넘어가며 #recommend 가 사라지므로 앱 쇼핑 화면의 추천 칸(id="recommend")으로 바로
    const recommend = pet ? recommendationCopy(pet.concerns || []) : "프로필 등록 후 맞춤 추천 받기";
    const recommendHref = pet ? "/app/sticker/shop/#recommend" : "/mypage/?profile=required#pet-profiles";

    /* 안전 공유 — 웹 GrowthShareCard 와 같은 흐름(공유 창 → 실패하면 복사 → 막히면 직접 복사 링크) · 같은 기록 */
    // AI 기록 공유는 공유할 AI 기록이 있을 때만 — 웹 GrowthHub 와 같은 값(user.pets.some(hasShareableAiRecord))
    const canShareAiRecord = Boolean(user?.pets.some(hasShareableAiRecord));
    const [shareNote, setShareNote] = useState<string | null>(null);
    const [shareFallback, setShareFallback] = useState(""); // 자동 복사가 막혔을 때 직접 복사할 링크(웹 fallbackUrl)
    const [shareBusy, setShareBusy] = useState<GrowthShareKind | null>(null); // 두 번 톡 방지 — 웹 busy 와 같음
    const share = async (kind: GrowthShareKind) => {
        if (shareBusy) return;
        setShareBusy(kind);
        setShareNote(null);
        setShareFallback("");
        // 웹은 window.location.origin 을 쓰지만, 앱은 네이티브 출처(앱 껍데기)에서 돌아 그 주소가 사이트 주소가 아님 → 정식 주소 고정
        const payload = growthSharePayload(kind, "https://www.daengdabang.com");
        const eventName = kind === "care_result" ? "growth_result_shared" : "growth_invite_shared";
        haptic("light");
        try {
            if (typeof navigator.share === "function") {
                try {
                    await navigator.share(payload);
                    setShareNote("공유 창으로 안전한 문구를 보냈어요.");
                    trackStorefrontEvent(eventName, { surface: "treasure_mine", shareKind: kind, method: "web_share", outcome: "completed" });
                    return;
                } catch (error) {
                    if (error instanceof DOMException && error.name === "AbortError") {
                        setShareNote("공유를 취소했어요.");
                        trackStorefrontEvent(eventName, { surface: "treasure_mine", shareKind: kind, method: "web_share", outcome: "cancelled" });
                        return;
                    }
                    // 공유 창이 막힌 경우(앱 안 화면 등) — 웹과 같이 아래 복사로 넘어감
                }
            }
            const copied = await copyText(`${payload.text}\n${payload.url}`);
            if (copied) {
                setShareNote("개인정보 없는 문구와 초대 링크를 복사했어요.");
                trackStorefrontEvent(eventName, { surface: "treasure_mine", shareKind: kind, method: "clipboard", outcome: "completed" });
            } else {
                setShareNote("자동 복사가 막혀 있어요. 아래 링크를 길게 눌러 복사해 주세요.");
                setShareFallback(payload.url);
                trackStorefrontEvent(eventName, { surface: "treasure_mine", shareKind: kind, method: "manual_copy", outcome: "fallback_shown" });
            }
        } finally {
            setShareBusy(null);
        }
    };

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + DAILY_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <ConceptBar session={session} onSession={setSession} />

                <DiaryTabs tabs={TABS} active={tab} onPick={go} />
                <DiaryBody pageKey={`${tab}-${session}`} dir={dir} onSwipe={swipe}>
                    {/* ───────── 이번 주 ───────── */}
                    {tab === 0 ? (
                        member ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="ah-display st-marker text-[15px]">이번 주 출근 스티커</span>
                                    <CoinChip ref={coinRef} coins={today.coins} />
                                </div>
                                <ol className="mt-3 grid grid-cols-7 gap-1">
                                    {WEEK.map((d, i) => {
                                        const isToday = i === wd;
                                        const on = isToday ? today.stamped : Boolean(claimedByDate.get(weekDate(i)));
                                        return (
                                            <li key={d.ko} className="flex flex-col items-center gap-1">
                                                {isToday && !on ? (
                                                    // 웹 AttendanceStampCard 처럼 불러오기 전 · 붙이는 중에는 잠김
                                                    <button type="button" onClick={(e) => stamp(e.currentTarget, e.timeStamp)} disabled={!today.ready || today.claiming} aria-label="오늘 출근 스티커 붙이기" className="st-slot is-today grid aspect-square w-full place-items-center rounded-full disabled:opacity-60">
                                                        <span className="ah-display text-[10px] text-[#e0557f]">붙이기</span>
                                                    </button>
                                                ) : (
                                                    <span className={`relative grid aspect-square w-full place-items-center rounded-full ${on ? "" : "st-slot"}`}>
                                                        {on ? <Image src={d.img} alt="" width={44} height={44} className={`st-stuck h-full w-full object-contain ${isToday ? "hc-slam" : ""}`} style={{ ["--rot" as string]: `${((i * 37) % 13) - 6}deg`, rotate: isToday ? undefined : `${((i * 37) % 13) - 6}deg` }} /> : null}
                                                    </span>
                                                )}
                                                <span className={`ah-display text-[12px] ${isToday ? "text-[#ea4c7c]" : "text-[#b7a9a1]"}`}>{d.ko}</span>
                                            </li>
                                        );
                                    })}
                                </ol>
                                <p className="ah-light mt-2 text-center text-[12px]" style={{ color: TEXT_SOFT }}>
                                    {today.stamped ? `출근 완료! ${today.streak}일 연속 · 이번 주 ${attendNow}일` : `오늘 칸을 톡 눌러 붙여요 · +${today.dailyRewardCoins}코인`}
                                </p>
                                {/* 불러오기 · 저장 오류 — 웹 MemberAiDashboard 처럼 오류 문구 + "다시 시도"(같은 불러오기 함수) */}
                                {today.error ? (
                                    <div role="alert" className="st-postit mt-3 px-3 py-2.5" style={{ background: "#ffd6e2", rotate: "-0.6deg" }}>
                                        <p className="ah-light text-[12px] leading-snug">{today.error}</p>
                                        <Patch tone="cream" small onClick={today.reload} disabled={today.loading} className="mt-2">다시 시도</Patch>
                                    </div>
                                ) : null}

                                {/* 오늘 돌봄 한눈에 — 운영 대시보드 네 칸(같은 계산 · 문구), 작은 메모 스티커 2×2 */}
                                <div className="mt-5 grid grid-cols-2 gap-2">
                                    {[
                                        { label: "오늘 건강 루틴 점수", value: `${careScore}점`, helper: "의료 점수가 아닌 오늘 돌봄 완료율", icon: "fa-heart-pulse", tone: "#ffe1ea", ink: "#d2457a" },
                                        { label: "오늘 AI 분석", value: analyzedToday ? "완료" : "아직", helper: pet?.lastAnalyzedAt ? `최근 ${new Date(pet.lastAnalyzedAt).toLocaleDateString("ko-KR")}` : "첫 사진 분석을 시작해 보세요", icon: "fa-camera-retro", tone: "#dcf3e6", ink: "#1f9e75" },
                                        { label: "이번 주 출석 챌린지", value: `${attendNow} / ${today.weeklyAttendanceTarget}`, helper: `${ratio(attendNow, today.weeklyAttendanceTarget)}% 진행`, icon: "fa-calendar-check", tone: "#fff1c4", ink: "#c98a12" },
                                        { label: "오늘 산책", value: today.done.walk_20 ? "20분 완료" : "기록 전", helper: today.done.walk_20 ? "오늘의 산책 XP가 반영됐어요" : "무리하지 않는 범위에서 시작하세요", icon: "fa-person-walking", tone: "#e3efff", ink: "#3d74c9" },
                                    ].map((m, i) => (
                                        <div key={m.label} className="dl-metric rounded-[12px] px-3 pb-2.5 pt-2.5" style={{ background: m.tone, rotate: `${[-0.6, 0.5, 0.5, -0.6][i]}deg` }}>
                                            <span className="ah-light flex items-center gap-1.5 text-[11px]" style={{ color: m.ink }}><i aria-hidden="true" className={`fa-solid ${m.icon} text-[10px]`} />{m.label}</span>
                                            <span className="ah-display mt-0.5 block text-[18px] leading-tight">{m.value}</span>
                                            <span className="ah-light block text-[10.5px] leading-snug" style={{ color: TEXT_SOFT }}>{m.helper}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* 레벨 도장 + 형광펜 XP */}
                                <div className="mt-5 flex items-center gap-4">
                                    <InkStamp rot={-10} className="h-[4.6rem] w-[4.6rem] text-[12px]">LEVEL<br />{today.level}</InkStamp>
                                    <div className="min-w-0 flex-1">
                                        <p className="ah-display text-[16px]">{levelName}</p>
                                        <p className="ah-light text-[12px]" style={{ color: TEXT_SOFT }}>다음 레벨까지 {Math.max(0, today.nextLevelXp - today.xp)}XP</p>
                                        <span className="mt-2 block h-3 overflow-hidden rounded-full bg-[#f5ece6]">
                                            <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, rgba(255,214,228,.95), rgba(255,236,150,.95))" }} />
                                        </span>
                                        <p className="ah-light mt-1 flex justify-between text-[11px]" style={{ color: TEXT_SOFT }}><span>{today.xp} XP · 연속 {today.streak}일</span><span>다음 레벨 {today.nextLevelXp} XP</span></p>
                                    </div>
                                </div>
                                {/* 최근 건강 변화 · AI 추천 — 운영 대시보드와 같은 문구 */}
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="dl-note rounded-[10px] px-3 py-2.5">
                                        <span className="ah-light block text-[10.5px]" style={{ color: TEXT_SOFT }}>최근 건강 변화</span>
                                        {/* 웹 MemberAiDashboard 와 같음: 반려견 분석 결과의 상태 문구(없으면 "첫 분석을 기다리고 있어요") */}
                                        <span className="ah-display mt-0.5 block text-[12.5px] leading-snug">{analysisStatus(pet?.rawAnalysis)}</span>
                                    </div>
                                    <Link href={recommendHref} className="dl-note dl-press rounded-[10px] px-3 py-2.5">
                                        <span className="ah-light block text-[10.5px]" style={{ color: TEXT_SOFT }}>AI 추천</span>
                                        <span className="ah-display mt-0.5 block text-[12.5px] leading-snug text-[#c4567a]">{recommend}</span>
                                    </Link>
                                </div>

                                {/* 오늘 해야 할 일 — 포스트잇 네 장(사진 건강 분석은 연구소로) · 톡 하면 바로 완료(완료 도장 · 떠오르는 +XP/+코인) */}
                                <SectionLabel className="mt-6" icon="fa-pen">오늘 해야 할 일 <span className="ah-light text-[12px]" style={{ color: TEXT_SOFT }}>{doneCount}/4</span></SectionLabel>
                                <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-3">
                                    {[
                                        { key: "stamp", icon: "fa-calendar-check", title: "출근도장", body: `하루 한 번 · ${today.dailyRewardCoins}코인`, done: today.stamped },
                                        // 오늘 할 일 — 서버가 주는 할 일 목록 그대로(이름 · XP)
                                        ...today.tasks.map((t) => ({ key: t.taskId, icon: t.taskId === "walk_20" ? "fa-person-walking" : "fa-eye", title: t.title, body: `오늘 할 일 · +${t.xp}XP`, done: t.completed })),
                                    ].map((x, i) => (
                                        // 출근도장 포스트잇은 불러오기 전 · 찍는 중 잠김(웹 AttendanceStampCard 와 같음)
                                        <button key={x.key} type="button" onClick={(e) => onTodo(x.key, e.currentTarget, e.timeStamp)} disabled={x.done || (x.key === "stamp" && (!today.ready || today.claiming))} aria-label={`${x.title} ${x.done ? "완료" : "완료하기"}`}
                                            className={`st-postit dl-todo relative block px-2 pb-2.5 pt-2 text-center ${x.done ? "is-done" : ""}`}
                                            style={{ background: ["#fff3a6", "#ffd6e2", "#d9ecff"][i], rotate: `${[-1, 0.8, 0.8][i]}deg` }}>
                                            <i aria-hidden="true" className={`fa-solid ${x.icon} text-[15px] text-[#e0557f]`} />
                                            <span className={`ah-display mt-1 block text-[12.5px] ${x.done ? "st-strike" : ""}`}>{x.title}</span>
                                            <span className="ah-light block text-[10.5px] leading-tight">{x.done ? "완료했어요" : x.body}</span>
                                            {!x.done ? <span className="ah-display mt-1.5 inline-block rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] text-[#e0557f]">톡 해서 완료</span> : null}
                                            {x.done ? <InkStamp rot={-14} className="hc-slam absolute -right-1 -top-2 bg-white/70 text-[10.5px]">완료</InkStamp> : null}
                                            {gain?.key === x.key ? <span key={gain.n} aria-hidden="true" className="dl-gain ah-display">{gain.text}</span> : null}
                                        </button>
                                    ))}
                                    {/* 넷째: 사진 건강 분석 — 연구소 사진 분석으로 이어짐(오늘 분석하면 완료) */}
                                    {/* 실제 첫 반려견 프로필로 — 웹 MemberAiDashboard 와 같은 petLensProfileHref(없으면 /pet-lens) */}
                                    <Link href={petLensProfileHref(pet?.apiProfileId)} aria-label={`사진 건강 분석 ${analyzedToday ? "완료" : "하러 가기"}`}
                                        className={`st-postit dl-todo relative block px-2 pb-2.5 pt-2 text-center ${analyzedToday ? "is-done" : ""}`} style={{ background: "#dcf3e6", rotate: "-0.8deg" }}>
                                        <i aria-hidden="true" className="fa-solid fa-camera text-[15px] text-[#1f9e75]" />
                                        <span className={`ah-display mt-1 block text-[12.5px] ${analyzedToday ? "st-strike" : ""}`}>사진 건강 분석</span>
                                        <span className="ah-light block text-[10.5px] leading-tight">{analyzedToday ? "완료했어요" : "연구소에서 네 방향 사진"}</span>
                                        {!analyzedToday ? <span className="ah-display mt-1.5 inline-block rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] text-[#1f9e75]">톡 해서 하러 가기</span> : null}
                                        {analyzedToday ? <InkStamp rot={-14} color="#1f9e75" className="hc-slam absolute -right-1 -top-2 bg-white/70 text-[10.5px]">완료</InkStamp> : null}
                                    </Link>
                                </div>
                                {doneCount >= 4 ? <p className="ah-display hc-pop mt-3 text-center text-[13px] text-[#ea4c7c]">오늘 할 일 끝! 내일 새 스티커까지 {untilTomorrow(now)}</p> : null}

                                {/* 안전 공유 — 건강 상세는 빼고 돌봄 습관만(운영 문구) */}
                                <div className="dl-share relative mt-6 rounded-[1.1rem] px-4 pb-4 pt-5">
                                    <Tape className="-top-2 left-1/2 h-4 w-16 -translate-x-1/2" color="rgba(170,230,200,.9)" style={{ rotate: "2deg" }} />
                                    <span className="ah-display inline-block rounded-full bg-[#dcf3e6] px-2 py-0.5 text-[10.5px] text-[#1f7a59]"><i aria-hidden="true" className="fa-solid fa-lock mr-1 text-[9px]" />개인정보 없는 공유</span>
                                    <span className="ah-display mt-1.5 block text-[15px]">건강 상세는 빼고, 돌봄 습관만 나눠요</span>
                                    <p className="ah-light mt-1 text-[11.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>공유 문구에는 반려견 이름·사진·증상·AI 건강 결과가 들어가지 않습니다. 링크에는 유입 경로를 확인하는 캠페인 값만 붙어요.</p>
                                    <div className="mt-3 grid gap-2.5">
                                        {/* 공유할 AI 기록이 있을 때만 공유, 없으면 기록 만들러 — 웹 GrowthShareCard 와 같음 */}
                                        {canShareAiRecord ? (
                                            <Patch tone="mint" small disabled={shareBusy !== null} onClick={() => void share("care_result")}>AI 기록 안전 공유<i aria-hidden="true" className="fa-solid fa-wand-magic-sparkles text-[11px]" /></Patch>
                                        ) : (
                                            <Patch tone="mint" small href="/pet-lens/">AI 기록 만들고 공유<i aria-hidden="true" className="fa-solid fa-camera-retro text-[11px]" /></Patch>
                                        )}
                                        <Patch tone="butter" small disabled={shareBusy !== null} onClick={() => void share("friend_invite")}>친구에게 보물광산 초대<i aria-hidden="true" className="fa-solid fa-paper-plane text-[11px]" /></Patch>
                                    </div>
                                    {shareNote ? <p role="status" className="ah-light mt-2 text-center text-[11.5px] text-[#1f7a59]">{shareNote}</p> : null}
                                    {/* 자동 복사가 막혔을 때 직접 복사할 링크 — 웹 GrowthShareCard fallbackUrl 과 같음 */}
                                    {shareFallback ? (
                                        <input aria-label="직접 복사할 보물광산 링크" readOnly value={shareFallback} onFocus={(e) => e.currentTarget.select()}
                                            className="ah-light mt-2 h-9 w-full rounded-[10px] bg-white px-3 text-[11.5px] shadow-[inset_0_0_0_1.5px_#dcefe4] outline-none" />
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <>
                                <LoginInvite redirect={REDIRECT} />
                                <SectionLabel className="mt-7" icon="fa-paw">매일 댕생활은 이렇게 이어져요</SectionLabel>
                                <ol className="mt-3 space-y-2.5">
                                    {GUEST_STEPS.map((s, i) => (
                                        <li key={s.label} className="st-place flex items-start gap-3" style={{ ["--d" as string]: `${200 + i * 120}ms`, ["--r" as string]: "0deg" }}>
                                            <InkStamp rot={[-8, 6, -4][i]} color={["#e0557f", "#1f9e75", "#5a7fe0"][i]} className="h-11 w-11 shrink-0 text-[13px]">{s.label}</InkStamp>
                                            <span>
                                                <span className="ah-display block text-[15px]">{s.title}</span>
                                                <span className="ah-light block text-[12.5px]" style={{ color: TEXT_SOFT }}>{s.body}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </>
                        )
                    ) : null}

                    {/* ───────── 혜택 ───────── */}
                    {tab === 1 ? (
                        <>
                            {/* 준비 중인 혜택 — 관리자가 숨기면(웹 GrowthHub visibility.programs) 그리지 않음. 굿즈 공모전 안내는 웹처럼 그대로 */}
                            {visibility.programs ? (
                                <>
                                    <span className="ah-display st-marker text-[15px]">준비 중인 혜택</span>
                                    <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>관심을 남기면 열릴 때 가장 먼저 알려 드려요 · 결제 없음</p>
                                    <div className="mt-4 grid grid-cols-2 gap-x-2.5 gap-y-4">
                                        {GROWTH_PROGRAM_CARDS.map((c, i) => {
                                            const on = c.interestOptions.some((o) => interest[o.programId]);
                                            return (
                                                <button key={c.id} type="button" onClick={(e) => openProgram(c, i, e.currentTarget)} aria-haspopup="dialog" aria-label={`${c.title} 자세히 보기`}
                                                    className="st-postit dl-card relative px-3 pb-3 pt-3 text-left" style={{ background: CARD_COLORS[i], rotate: `${[-2, 2, 1.5, -1.5][i]}deg` }}>
                                                    <Tape className="-top-2 left-1/2 h-3.5 w-10 -translate-x-1/2" color="rgba(255,255,255,.7)" />
                                                    {/* 혜택 그림 스티커 — 누르면 카드와 함께 살짝 통통 */}
                                                    <Image src={CARD_IMAGES[c.id]} alt="" width={80} height={80} className="dl-art -ml-0.5 h-[2.5rem] w-[2.5rem]" style={{ rotate: `${[-6, 5, -4, 6][i]}deg` }} />
                                                    <span className="ah-display mt-2.5 block text-[13px] leading-snug">{c.title}</span>
                                                    <span className="ah-light block text-[11px]">{c.status}</span>
                                                    <span className="ah-display mt-2 inline-flex items-center gap-1 text-[11px] text-[#e0557f]">톡 해서 자세히 <i aria-hidden="true" className="fa-solid fa-chevron-right text-[8px]" /></span>
                                                    {on ? <InkStamp rot={-14} className="hc-slam absolute -right-1 top-1 text-[11px]">신청<br />완료</InkStamp> : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* 등록 상태 불러오기 실패 — 웹 GrowthPrograms 와 같은 안내 문구(분홍 메모) */}
                                    {member && interestLoadFailed ? (
                                        <p role="alert" className="st-postit ah-light mt-4 px-3 py-2.5 text-[12px] leading-snug" style={{ background: "#ffd6e2", rotate: "0.6deg" }}>관심등록 상태를 불러오지 못했어요. 새 등록은 중복 없이 안전하게 처리됩니다.</p>
                                    ) : null}
                                </>
                            ) : null}
                            {/* 굿즈 공모전은 댕다방 한 곳에서 */}
                            <Link href={`${pageHref("sticker", "show")}?tab=1`} className="mt-6 flex items-center gap-3 rounded-[10px] bg-white px-3.5 py-3 shadow-[0_8px_14px_-10px_rgba(90,60,50,.45)]" style={{ rotate: "-0.8deg" }}>
                                {/* 굿즈 그림 스티커(텀블러 · 키링 · 강아지 인형) */}
                                <Image src="/images/ui/stickers/goods-contest.webp" alt="" width={96} height={96} className="dl-art -my-1.5 h-12 w-12 shrink-0" style={{ rotate: "-6deg" }} />
                                <span className="min-w-0 flex-1">
                                    <span className="ah-display block text-[14px]">굿즈 500명 공모전</span>
                                    <span className="ah-light block text-[11.5px]" style={{ color: TEXT_SOFT }}>댕다방에서 참여해요{goodsDday !== null ? ` · D-${goodsDday}` : ""}</span>
                                </span>
                                <i aria-hidden="true" className="fa-solid fa-chevron-right text-[10px] text-[#c9b4a8]" />
                            </Link>
                        </>
                    ) : null}

                    {/* ───────── 안내 ───────── */}
                    {tab === 2 ? (
                        <>
                            {/* 확장 계획 — 산책길 지도: 왼쪽 정류장 스티커(운영 중 = 민트 발바닥 · 준비 = 점선 빈 칸) 사이를 발자국이 이어 주고,
                                오른쪽 종이 카드에 상태를 마스킹테이프 이름표로 붙임 */}
                            <span className="ah-display st-marker text-[15px]">댕다방이 넓혀 가는 길</span>
                            <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>한 걸음씩 산책하듯 넓혀 가요</p>
                            <ol className="mt-5">
                                {EXPANSION_CARDS.map((c, i) => {
                                    // 댕자랑 → 댕다방 화면 · 멤버십(#growth-programs) → 혜택 쪽 · 그 밖은 원래 주소
                                    const href = c.href === "/daeng-showcase/" ? pageHref("sticker", "show") : c.href.startsWith("#") ? `${REDIRECT}?tab=1` : c.href;
                                    const live = i === 0;
                                    const last = i === EXPANSION_CARDS.length - 1;
                                    return (
                                        <li key={c.step} className="grid grid-cols-[46px_1fr] gap-x-3">
                                            {/* 정류장 + 다음 정류장까지 발자국 */}
                                            <div className="flex flex-col items-center">
                                                <span className={`gd-stop ah-display grid h-11 w-11 shrink-0 place-items-center rounded-full text-[13px] ${live ? "is-live" : ""}`}>
                                                    {live ? <i aria-hidden="true" className="fa-solid fa-paw text-[16px]" /> : c.step}
                                                </span>
                                                {!last ? (
                                                    <span aria-hidden="true" className="flex flex-1 flex-col items-center justify-evenly py-1.5 text-[10px] text-[#f2b3c6]">
                                                        <i className="fa-solid fa-paw -translate-x-1.5 rotate-[160deg]" />
                                                        <i className="fa-solid fa-paw translate-x-1.5 rotate-[200deg]" />
                                                    </span>
                                                ) : null}
                                            </div>
                                            {/* 종이 카드 */}
                                            <div className={`gd-card relative mb-5 rounded-[14px] bg-white px-3.5 pb-3 pt-4 ${live ? "is-live" : ""}`} style={{ rotate: `${[-0.6, 0.5, -0.4, 0.6][i]}deg` }}>
                                                <span className={`st-tape ah-display absolute -top-2.5 left-3 px-2.5 py-0.5 text-[10.5px] ${live ? "text-[#1f7a59]" : "text-[#8a6a58]"}`}
                                                    style={{ background: live ? "rgba(170,230,200,.9)" : "rgba(255,226,170,.85)", rotate: `${[-3, 2, -2, 3][i]}deg` }}>
                                                    {c.status}
                                                </span>
                                                <p className="ah-display text-[15px] leading-snug">{c.title}</p>
                                                <p className="ah-light mt-1 line-clamp-2 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>{c.description}</p>
                                                <Link href={href} className="gd-go ah-display mt-2 inline-flex items-center gap-1 rounded-full bg-[#fff0f4] px-3 py-1 text-[11.5px] text-[#e0557f]">
                                                    {c.cta} <i aria-hidden="true" className="fa-solid fa-chevron-right text-[8px]" />
                                                </Link>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>

                            {/* 운영 기준 — 테이프로 붙인 약속 편지: 도장 그림 + 제목, 톡 하면 그 줄이 펼쳐짐 · 끝에 서명
                                관리자가 숨기면(웹 GrowthHub visibility.policy) 그리지 않음 */}
                            {visibility.policy ? (
                                <div className="gd-letter relative mt-4 rounded-[1.2rem] px-4 pb-4 pt-6">
                                    <Tape className="-top-2 left-1/2 h-5 w-20 -translate-x-1/2" color="repeating-linear-gradient(90deg, rgba(255,200,215,.85) 0 8px, rgba(255,226,234,.85) 8px 16px)" style={{ rotate: "-2deg" }} />
                                    <span className="ah-display st-marker text-[15px]">안심하고 이용하세요</span>
                                    <ul className="mt-3 space-y-2">
                                        {POLICIES.map((p, i) => {
                                            const on = openPolicy === i;
                                            const seal = ["#f5b445", "#f2789d", "#7fb4f0"][i];
                                            return (
                                                <li key={p.title}>
                                                    <button type="button" onClick={() => togglePolicy(i)} aria-expanded={on}
                                                        className={`gd-row w-full rounded-[14px] px-2.5 py-2 text-left ${on ? "is-open" : ""}`} style={{ ["--seal" as string]: seal }}>
                                                        <span className="flex items-center gap-3">
                                                            <Image src={POLICY_IMAGES[i]} alt="" width={88} height={88} className="gd-seal h-10 w-10 shrink-0" />
                                                            <span className="ah-display flex-1 text-[14px] leading-snug">{p.title}</span>
                                                            <i aria-hidden="true" className={`fa-solid fa-chevron-down text-[11px] text-[#c9a99c] transition-transform ${on ? "rotate-180" : ""}`} />
                                                        </span>
                                                        <span className="dt-fold ah-light block pl-12 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }} data-open={on}>{p.body}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <p className="ah-display mt-3 flex items-center justify-end gap-1.5 text-[12.5px] text-[#c4567a]">
                                        {/* 개인정보처리방침 — 웹 GrowthPolicySummary 끝의 링크와 같은 자리 */}
                                        <Link href="/privacy/" className="ah-display mr-auto text-[11px] text-[#9c8f88] underline underline-offset-2">개인정보처리방침</Link>
                                        댕다방 드림 <i aria-hidden="true" className="fa-solid fa-paw text-[11px]" />
                                    </p>
                                </div>
                            ) : null}
                        </>
                    ) : null}
                </DiaryBody>
                <p className="ah-light mt-3 text-center text-[11.5px]" style={{ color: TEXT_SOFT }}>속지를 옆으로 밀면 다음 쪽으로 넘어가요</p>
            </div>
            {/* 혜택 메모 팝업 — 누른 카드 자리에서 펼쳐짐, 바깥을 누르면 카드로 접힘 */}
            {openCard ? (
                <Peek from={openCard.rect} bg="#fffdf8" onClose={() => setOpenCard(null)}>
                    {(() => {
                        const c = openCard.card;
                        const tone = CARD_COLORS[openCard.i];
                        const ink = CARD_INKS[openCard.i];
                        return (
                            <div className="bn-note relative" style={{ color: TEXT }}>
                                {/* 머리: 카드 색 리본(아래가 물결로 오려짐) + 테이프 두 조각 + 다이컷 아이콘 스티커 + 상태 잉크 도장 */}
                                <div className="bn-head relative px-5 pb-7 pt-6" style={{ background: `linear-gradient(170deg, ${tone} 0%, #fff 140%)` }}>
                                    <Tape className="left-6 top-2 h-4 w-14" color="rgba(255,255,255,.75)" style={{ rotate: "-8deg" }} />
                                    <Tape className="right-8 top-2 h-4 w-10" color="rgba(255,255,255,.75)" style={{ rotate: "6deg" }} />
                                    <Sparkle className="ah-twinkle h-3 w-3 bg-white" style={{ right: "34%", top: "22%" }} />
                                    <i aria-hidden="true" className="fa-solid fa-paw absolute text-[12px]" style={{ color: ink, opacity: 0.35, right: "22%", bottom: "30%", rotate: "18deg" }} />
                                    <div className="flex items-start gap-3">
                                        {/* 혜택 그림 스티커 — 붙으면서 나타나 둥실둥실 */}
                                        <span className="bn-in -my-2 -ml-1 shrink-0" style={{ rotate: "-8deg", ["--d" as string]: "80ms" }}>
                                            <Image src={CARD_IMAGES[c.id]} alt="" width={176} height={176} priority className="bn-art h-[4.6rem] w-[4.6rem]" />
                                        </span>
                                        {/* 영문 꼬리표(c.eyebrow · MEMBERSHIP BETA 등)는 앱에서 쓰지 않음 — 다른 화면의 영문 꼬리표 숨김과 같게(2026-10-17 화면 점검) */}
                                        <div className="min-w-0 pt-1.5">
                                            <p className="bn-in ah-display text-[21px] leading-snug" style={{ ["--d" as string]: "200ms" }}><span className="st-marker">{c.title}</span></p>
                                        </div>
                                    </div>
                                </div>

                                {/* 본문: 크림 종이(줄 없음) */}
                                <div className="bn-paper relative px-5 pb-2 pt-4">
                                    {/* 상태 도장 — 머리와 종이 경계에 걸쳐 찍힘(물결 가장자리에 잘리지 않게 종이 쪽에) */}
                                    <div className="relative z-[1] -mt-9 mb-1 flex justify-end pr-1">
                                        <InkStamp rot={8} color={ink} className="bn-stamp bg-white/80 text-[10.5px] leading-tight">{c.status}</InkStamp>
                                    </div>
                                    <p className="bn-in ah-light text-[14px] leading-[1.75]" style={{ ["--d" as string]: "260ms" }}>{c.description}</p>
                                    <ul className="mt-2">
                                        {c.details.map((d, k) => (
                                            <li key={d} className="bn-in flex items-start gap-2 py-1.5" style={{ ["--d" as string]: `${320 + k * 90}ms` }}>
                                                <svg viewBox="0 0 28 28" className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true">
                                                    <path d="M7 14 L12 19 L23 6" fill="none" stroke="#ea4c7c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="st-check" style={{ animationDelay: `${520 + k * 160}ms` }} />
                                                </svg>
                                                <span className="ah-light text-[13px] leading-snug">{d}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* 동네 돌봄 바로 가기 — 웹은 #local-care-finder 로 가는데, 관리자가 동네 돌봄을 숨기면(visibility.localCare) 갈 곳이 없으므로 숨김 */}
                                    {c.existingFeature && visibility.localCare ? (
                                        <Link href="/app/sticker/care/" className="bn-in st-postit mt-3 flex items-center gap-2 px-3 py-2.5 text-[13px] text-[#1f7a59]" style={{ background: "#d9f2e4", rotate: "-1deg", ["--d" as string]: "620ms" }}>
                                            <i aria-hidden="true" className="fa-solid fa-location-dot" />
                                            <span className="ah-display flex-1">지금 바로 {c.existingFeature.label}</span>
                                            <i aria-hidden="true" className="fa-solid fa-chevron-right text-[10px]" />
                                        </Link>
                                    ) : null}

                                    {member ? (
                                        <>
                                            {/* (필수) 이메일 소식 동의 — 손그림 체크 칸 (원래 화면과 같은 문구) */}
                                            <button type="button" role="checkbox" aria-checked={consent} onClick={() => { setConsent((v) => !v); setConsentErr(false); haptic("light"); }}
                                                className={`bn-in bn-consent mt-4 flex w-full items-start gap-2.5 rounded-[14px] px-3 py-2.5 text-left ${consentErr ? "is-err" : ""}`} style={{ ["--d" as string]: "640ms" }}>
                                                <svg viewBox="0 0 28 28" className="h-6 w-6 shrink-0" aria-hidden="true">
                                                    <path d="M5 6 Q4 4 7 4 L22 5 Q24 5 24 8 L23 22 Q23 24 20 24 L6 23 Q4 23 4 20 Z" fill={consent ? "#ffe1ea" : "#fff"} stroke={consent ? "#ea4c7c" : "#c9b4a8"} strokeWidth="1.8" strokeLinejoin="round" />
                                                    {consent ? <path d="M7 14 L12 19 L23 6" fill="none" stroke="#ea4c7c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="st-check" /> : null}
                                                </svg>
                                                <span className="ah-light text-[12px] leading-snug"><b className="ah-display text-[#e0557f]">(필수)</b> 선택한 프로그램의 준비·모집 소식을 회원 계정에 등록된 이메일로 받는 데 동의합니다.</span>
                                            </button>
                                            <button type="button" onClick={() => setConsentMore((v) => !v)} className="ah-light mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-[#9c8f88]">
                                                <i aria-hidden="true" className={`fa-solid fa-chevron-down text-[9px] transition-transform ${consentMore ? "rotate-180" : ""}`} />수집 · 이용 안내 {consentMore ? "접기" : "보기"}
                                            </button>
                                            <dl className="dt-fold ah-light rounded-[10px] bg-[#faf5f1] px-3 text-[11px] leading-relaxed text-[#7a6a63]" data-open={consentMore}>
                                                <div className="pt-2"><dt className="ah-display inline">수집·연계 항목</dt><dd className="inline"> · 회원 식별번호, 선택 프로그램, 동의 버전·상태·시각. 실제 안내 시 회원 계정 이메일을 연결해 사용하며 관심등록 파일에는 이메일을 복사 저장하지 않습니다.</dd></div>
                                                <div><dt className="ah-display inline">이용 목적</dt><dd className="inline"> · 프로그램 수요 확인 및 준비·모집 소식 이메일 안내</dd></div>
                                                <div><dt className="ah-display inline">보유 기간</dt><dd className="inline"> · 관심등록 취소 시 즉시 삭제 또는 회원 탈퇴 시까지</dd></div>
                                                <div className="pb-2"><dt className="ah-display inline">거부 안내</dt><dd className="inline"> · 동의를 거부할 수 있으며 관심등록만 제한됩니다. 쇼핑과 기본 돌봄 기능에는 영향이 없습니다.</dd></div>
                                            </dl>
                                            {/* 개인정보처리방침 — 웹 GrowthPrograms 동의 칸 아래와 같은 문구(웹처럼 접지 않고 늘 보임) */}
                                            <p className="ah-light mt-1.5 text-[11px] text-[#7a6a63]">자세한 내용은 <Link href="/privacy/" className="ah-display text-[#c4456f] underline underline-offset-2">개인정보처리방침</Link>에서 확인할 수 있습니다.</p>
                                            {consentErr ? <p className="ah-display hc-pop mt-1.5 text-[12px] text-[#e0557f]">소식을 받으려면 위 동의 칸에 체크해 주세요</p> : null}

                                            <div className="mt-3 space-y-2.5">
                                                {c.interestOptions.map((o) => {
                                                    // 등록 상태를 불러오기 전 — 웹 GrowthPrograms 처럼 "등록 상태 확인 중"(버튼 대신)
                                                    if (!interestReady) {
                                                        return <span key={o.programId} className="ah-display grid h-11 place-items-center rounded-full bg-[#faf5f1] text-[11px] text-[#9c8f88]">등록 상태 확인 중</span>;
                                                    }
                                                    const on = Boolean(interest[o.programId]);
                                                    return on ? (
                                                        <div key={o.programId} className="bn-done flex items-center gap-2.5 rounded-[14px] px-3 py-2.5">
                                                            <InkStamp rot={-10} className="hc-slam shrink-0 bg-white/70 text-[11px]">신청<br />완료</InkStamp>
                                                            <span className="ah-light flex-1 text-[12px] leading-snug" style={{ color: TEXT_SOFT }}><b className="ah-display" style={{ color: TEXT }}>{o.label}</b><br />소식이 나오면 이메일로 알려 드려요</span>
                                                            {/* 처리 중엔 잠금 — 웹 GrowthPrograms(취소 중 · 저장 중 disabled)와 같음 */}
                                                            <button type="button" onClick={() => toggleInterest(o.programId)} disabled={interestBusy} className="ah-display rounded-full bg-white px-2.5 py-1 text-[11.5px] text-[#9c8f88] disabled:opacity-60">취소</button>
                                                        </div>
                                                    ) : (
                                                        <Patch key={o.programId} onClick={() => toggleInterest(o.programId)} disabled={interestBusy} small><span className="relative">{o.label}</span><i aria-hidden="true" className="fa-solid fa-envelope relative text-[12px]" /></Patch>
                                                    );
                                                })}
                                            </div>
                                            {/* 관심등록 · 취소 오류 — 웹 GrowthPrograms 와 같은 문구, "로그인" 오류(401)면 앱 로그인으로(돌아오면 혜택 쪽) */}
                                            {interestErr ? (
                                                <p role="alert" className="st-postit ah-light mt-3 px-3 py-2.5 text-[12px] leading-snug" style={{ background: "#ffd6e2", rotate: "-0.6deg" }}>
                                                    {interestErr}
                                                    {interestErr.includes("로그인") ? <Link href={appLoginHref("/app/sticker/daily/?tab=1")} className="ah-display ml-1.5 text-[#c4456f] underline underline-offset-2">다시 로그인</Link> : null}
                                                </p>
                                            ) : null}
                                        </>
                                    ) : (
                                        <Patch href={appLoginHref(`${REDIRECT}?tab=1`)} className="mt-4"><span className="relative">로그인하고 소식 받기</span><i aria-hidden="true" className="fa-solid fa-paw relative text-[14px] text-white/90" /></Patch>
                                    )}
                                    <p className="ah-light mt-3 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: TEXT_SOFT }}>
                                        <i aria-hidden="true" className="fa-solid fa-paw text-[9px] text-[#f4a9bd]" />관심등록은 소식 알림용 · 신청비나 결제는 없어요<i aria-hidden="true" className="fa-solid fa-paw text-[9px] text-[#f4a9bd]" />
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </Peek>
            ) : null}
            {toast ? <NoteToast text={toast} onDone={clearToast} /> : null}
        </div>
    );
}

/* 혜택 카드 색 — 버터 · 분홍 · 라벤더 · 민트 */
const CARD_COLORS = ["#fff3a6", "#ffd6e2", "#e8ddff", "#d9f2e4"];
const CARD_INKS = ["#c98a12", "#d2457a", "#7457d8", "#1f9e75"]; // 카드별 도장 · 스티커 색
/* 혜택 카드 그림(투명 배경 webp) — 협업자 GROWTH_PROGRAM_CARDS 의 id 기준 */
/* 운영 기준(약속 편지) 도장 그림 — 협업자 POLICIES 순서(광고 없이 · 보상 · AI 정보) */
const POLICY_IMAGES = ["/images/ui/stickers/policy-noad.webp", "/images/ui/stickers/policy-reward.webp", "/images/ui/stickers/policy-info.webp"];
const CARD_IMAGES: Record<GrowthProgramCard["id"], string> = {
    membership: "/images/ui/stickers/benefit-membership.webp",
    brand: "/images/ui/stickers/benefit-brand.webp",
    goods: "/images/ui/stickers/benefit-goods.webp",
    local: "/images/ui/stickers/benefit-care.webp",
};

/* 매일 댕생활(스티커북) CSS — 운영 기준 펼침(높이 자동 늘림 · 지원 브라우저) */
const DAILY_CSS = `
/* 오늘 할 일 포스트잇: 누르면 쏙 · 완료되면 살짝 바래고 도장 */
.dl-todo { transition: transform .4s cubic-bezier(.3,1.6,.5,1), filter .3s; -webkit-tap-highlight-color: transparent; }
.dl-todo:not(.is-done):active { transform: translateY(2px) scale(.96); transition-duration: .1s; }
.dl-todo.is-done { filter: saturate(.75); }
/* 혜택 편지(팝업): 물결로 오려진 리본 머리 · 줄 없는 크림 종이 · 차례로 놓이는 요소 */
.bn-head { -webkit-mask: linear-gradient(#000 0 0) top / 100% calc(100% - 9px) no-repeat, radial-gradient(circle 9px at 50% 0, #000 97%, #0000) bottom / 18px 9px repeat-x;
          mask: linear-gradient(#000 0 0) top / 100% calc(100% - 9px) no-repeat, radial-gradient(circle 9px at 50% 0, #000 97%, #0000) bottom / 18px 9px repeat-x; }
/* 본문 종이: 줄 없이 크림 + 아주 옅은 종이 결 */
.bn-paper { background: radial-gradient(120% 60% at 100% 0%, rgba(255,236,242,.6), transparent 60%), #fffdf8; }
.bn-in { animation: st-place .55s cubic-bezier(.25,1.35,.45,1) both; animation-delay: var(--d, 0ms); }
.bn-stamp { animation: hc-slam .55s cubic-bezier(.2,1.4,.4,1) .55s both; }
.bn-consent { background: rgba(255,255,255,.9); box-shadow: inset 0 0 0 1.5px #f3e3da, 0 6px 12px -10px rgba(90,60,50,.4); transition: box-shadow .2s, transform .15s; }
.bn-consent:active { transform: scale(.98); }
.bn-consent.is-err { box-shadow: inset 0 0 0 2px #f48fac, 0 0 0 4px rgba(244,143,172,.18); animation: bn-shake .35s; }
@keyframes bn-shake { 25% { transform: translateX(-4px); } 50% { transform: translateX(4px); } 75% { transform: translateX(-2px); } }
.bn-done { background: linear-gradient(160deg, #fff, #fff4f7); box-shadow: inset 0 0 0 1.5px #ffd3df; }
/* 안내 · 산책길 지도: 정류장 스티커(흰 칼선) — 운영 중은 민트 발바닥(가끔 콩닥), 준비 중은 점선 빈 칸 */
.gd-stop { background: #fff7ec; color: #b59a8c; box-shadow: 0 0 0 3px #fff, 0 6px 10px -6px rgba(120,80,60,.45); outline: 1.5px dashed #e8c9b6; outline-offset: -6px; }
.gd-stop.is-live { background: #7fcfa9; color: #fff; outline-color: rgba(255,255,255,.75); animation: gd-beat 2.4s ease-in-out infinite; }
@keyframes gd-beat { 0%, 100% { transform: scale(1); } 12% { transform: scale(1.1); } 24% { transform: scale(1); } }
/* 종이 카드 — 운영 중은 민트 빛 테두리 */
.gd-card { box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 10px 16px -12px rgba(120,80,60,.5); }
.gd-card.is-live { box-shadow: inset 0 0 0 2px #bfe8d3, 0 10px 16px -12px rgba(60,140,100,.5); }
.gd-go { transition: transform .35s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.gd-go:active { transform: scale(.94); }
/* 안내 · 약속 편지: 크림 편지지(줄 없음) + 도장 그림(누르면 통) + 펼친 줄은 도장 색으로 연하게 */
.gd-letter { background: radial-gradient(120% 70% at 100% 0%, rgba(255,236,242,.7), transparent 60%), #fffefb; box-shadow: 0 14px 24px -16px rgba(150,90,70,.5), inset 0 0 0 1.5px #f3e3da; rotate: .6deg; }
.gd-seal { filter: drop-shadow(0 4px 4px rgba(90,60,50,.22)); rotate: -8deg; transition: transform .35s cubic-bezier(.3,1.8,.5,1); }
.gd-row:active .gd-seal { transform: scale(1.1); }
.gd-row { transition: background .25s, transform .35s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.gd-row:active { transform: scale(.98); }
.gd-row.is-open { background: color-mix(in srgb, var(--seal) 12%, white); }
@media (prefers-reduced-motion: reduce) { .gd-stop.is-live { animation: none; } }
/* 오늘 돌봄 한눈에 · 최근 변화 · AI 추천 · 안전 공유 */
.dl-metric { box-shadow: 0 7px 11px -9px rgba(110,70,55,.45), inset 0 0 0 1px rgba(255,255,255,.6); }
.dl-note { background: #fff; box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 7px 11px -9px rgba(110,70,55,.4); }
.dl-press { transition: transform .35s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.dl-press:active { transform: scale(.97); }
.dl-share { background: radial-gradient(120% 70% at 100% 0%, rgba(220,243,230,.8), transparent 60%), #fbfffc; box-shadow: inset 0 0 0 1.5px #dcefe4, 0 12px 20px -14px rgba(50,120,90,.4); rotate: -.4deg; }
/* 혜택 카드: 누르면 들렸다 붙음 */
.dl-card { transition: transform .45s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.dl-card:active { transform: translateY(-4px) scale(1.03); transition-duration: .12s; }
/* 혜택 그림: 그림자로 종이 위에 붙은 느낌 · 누르면 그림만 한 번 더 통통 */
.dl-art { filter: drop-shadow(0 4px 5px rgba(120,70,60,.22)); transition: transform .45s cubic-bezier(.3,1.8,.5,1); }
.dl-card:active .dl-art { transform: scale(1.12) translateY(-2px); transition-duration: .12s; }
/* 팝업 머리 그림: 천천히 둥실 */
.bn-art { filter: drop-shadow(0 8px 8px rgba(120,70,60,.25)); animation: bn-bob 3.2s ease-in-out .7s infinite; }
@keyframes bn-bob { 50% { transform: translateY(-4px) rotate(3deg); } }
@media (prefers-reduced-motion: reduce) { .bn-art { animation: none; } }
/* 포스트잇 위로 떠오르는 +XP / +코인 */
.dl-gain { position: absolute; left: 50%; top: 0; translate: -50% 0; color: #e0557f; font-size: 15px; pointer-events: none; text-shadow: 0 2px 0 #fff; animation: dl-gain 1s cubic-bezier(.2,.9,.2,1) forwards; }
@keyframes dl-gain { 0% { opacity: 0; transform: translateY(6px) scale(.7); } 25% { opacity: 1; transform: translateY(-10px) scale(1.15); } 100% { opacity: 0; transform: translateY(-34px) scale(1); } }
.dt-fold { interpolate-size: allow-keywords; height: 0; overflow: hidden; opacity: 0; transition: height .4s cubic-bezier(.2,.9,.2,1), opacity .3s, margin .3s; }
.dt-fold[data-open="true"] { height: auto; opacity: 1; margin-top: 8px; }
`;
