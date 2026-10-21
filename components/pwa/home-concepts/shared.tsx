"use client";

/**
 * 스티커북 시안 공통 부품 (로컬 시안 전용, 배포 X)
 * ---------------------------------------------------------------------
 * 스티커북 시안(홈 · 매일 댕생활 · 댕다방 · 연구소 · 마이)이 함께 쓰는 것들 (그림체 부품은 kit.tsx).
 *  - SIGNUP_BONUS_COINS: 가입 축하 코인 표시값(웹 문구와 같은 20C) — 예시 데이터(SAMPLE)는 버튼 대조 정리 때 삭제(2026-10-17)
 *  - useDemoSession: 실제 로그인 상태(useAuth) — 시연 전환은 없앰(배포 전 연결 2026-10-16)
 *  - useMember: 실제 회원 이름 · 첫 반려견
 *  - useTodayDemo: 실제 출근도장 · 오늘 할 일 · 코인 · XP · 레벨(협업자 MemberAiDashboard 와 같은 함수) · 오류 다시 불러오기(reload)
 *  - useGrowthVisibility: 관리자 공개 설정(협업자 GrowthHub 의 loadPublishedGrowthContent → visibility) — 혜택 · 동네 돌봄 · 운영 기준 숨김
 *  - useLiveWeather: 실제 날씨 (기존 lib/hero-weather 의 공개 날씨 API, 로그인 불필요) + 실패 시 예시 날씨
 *  - SkyLayer: 시간대(아침·낮·저녁·밤) × 날씨(비·눈·구름·안개)를 코드로 그린 하늘 (영상 없음)
 *  - ConceptBar: (없앰 — 아무것도 그리지 않음)
 *  - flyCoin: 코인이 버튼에서 코인 칩으로 날아가는 모션
 *  - HC_CSS: 폰트 · 공통 애니메이션
 */

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHeroWeatherReport } from "@/lib/hero-weather";
import { DEFAULT_GROWTH_HUB_CONTENT, loadPublishedGrowthContent } from "@/lib/growth-content";
import { useAuth } from "@/lib/store";
import { loadShowcaseTopic, type ShowcaseTopic } from "@/lib/daeng-showcase";
import { loadWeeklyPhotoAnalyses, type WeeklyPhotoAnalysisRecord } from "@/lib/weekly-photo-analysis";
import {
    claimDaengLabAttendance,
    completeDaengLabCareTask,
    loadDaengLabAttendance,
    loadDaengLabEngagement,
    type DaengLabAttendance,
    type DaengLabCareTaskId,
    type DaengLabEngagement,
} from "@/lib/customer-api";
import { getHeroTimeBucket, type HeroTimeBucket, type HeroWeather } from "@/lib/hero-assets";

/** 가입 축하 코인 — 웹 가입 화면 문구(app/auth/signup)와 개인정보처리방침의 20C 와 같은 값(표시용) */
export const SIGNUP_BONUS_COINS = 20;

export type TaskId = DaengLabCareTaskId; // 오늘 할 일 — 서버 타입(walk_20 · eye_check) 그대로
export type Session = "guest" | "member";

/* 요일 (월요일 시작) — 출근 스티커 그림은 요일마다 다름 */
export const WEEK = [
    { ko: "월", img: "/images/ui/stickers/sticker-mon.webp" },
    { ko: "화", img: "/images/ui/stickers/sticker-tue.webp" },
    { ko: "수", img: "/images/ui/stickers/sticker-wed.webp" },
    { ko: "목", img: "/images/ui/stickers/sticker-thu.webp" },
    { ko: "금", img: "/images/ui/stickers/sticker-fri.webp" },
    { ko: "토", img: "/images/ui/stickers/sticker-sat.webp" },
    { ko: "일", img: "/images/ui/stickers/sticker-sun.webp" },
];
export const STEP_IMG = {
    checkin: "/images/ui/stickers/step-checkin.webp",
    care: "/images/ui/stickers/step-care.webp",
    record: "/images/ui/stickers/step-record.webp",
};

/** 오늘이 월~일 중 몇 번째인지 (0 = 월) */
export const todayIndex = (d = new Date()) => (d.getDay() + 6) % 7;

/* ── 로그인 상태: 협업자 useAuth 그대로(시안 "로그인 전/후(예시)" 토글 대신 실제 상태 — 배포 전 연결 2026-10-16).
   이름은 기존 화면들이 그대로 쓰도록 유지. 두 번째 값(바꾸기)은 더 이상 쓰지 않음 ── */
export function useDemoSession(): [Session, (s: Session) => void] {
    const { user, hydrated } = useAuth();
    return [hydrated && user ? "member" : "guest", () => {}];
}

/** 실제 회원 정보(이름 · 첫 반려견) — 홈 · 매일 댕생활 · 연구소 인사말 등에서 */
export function useMember() {
    const { user } = useAuth();
    const pet = user?.pets?.[0];
    return {
        user,
        guardian: user?.name ?? "",
        pet,
        petName: pet?.name ?? "우리 아이",
        lastAnalyzedAt: pet?.lastAnalyzedAt,
        concerns: pet?.concerns ?? [],
    };
}

/* ── 오늘 상태(출근 · 할 일 · 코인 · XP · 레벨 · 연속 출근) — 실제 서버 값.
   협업자 MemberAiDashboard(/treasure-mine)와 같은 함수 · 같은 순서:
   불러오기 = loadDaengLabAttendance + loadDaengLabEngagement, 출근 = claimDaengLabAttendance 뒤 engagement 다시 불러오기 + 지갑 알림,
   할 일 = completeDaengLabCareTask. 코인은 출근 응답 · 지갑 알림(ddb:daenglab-wallet)으로 갱신 ── */
type Today = {
    ready: boolean;
    loading: boolean; // 불러오는 중 — 웹 MemberAiDashboard loading 과 같음
    claiming: boolean; // 출근도장 찍는 중 — 웹 AttendanceStampCard claiming 과 같음
    error: string;
    stamped: boolean;
    streak: number;
    recentDays: { businessDate: string; claimed: boolean }[];
    businessDate: string;
    dailyRewardCoins: number;
    coins: number;
    analysisCoinCost: number;
    xp: number;
    level: number;
    nextLevelXp: number;
    weeklyAttendanceProgress: number;
    weeklyAttendanceTarget: number;
    monthlyAnalysisProgress: number;
    monthlyAnalysisTarget: number;
    tasks: { taskId: TaskId; title: string; description: string; xp: number; completed: boolean }[];
    done: Record<TaskId, boolean>;
    doneCount: number;
    allDone: boolean;
    nextTask: { taskId: TaskId; title: string; xp: number } | null;
    savingTask: TaskId | null;
    stamp: () => Promise<boolean>;
    complete: (id: TaskId) => Promise<boolean>; // 서버 저장이 성공했을 때만 true(+XP · 진동은 성공일 때만)
    reload: () => void; // 다시 불러오기 — 웹 MemberAiDashboard refresh("다시 시도")와 같은 함수
};

export function useTodayDemo(session: Session): Today {
    const { user, hydrated } = useAuth();
    const token = user?.apiAccessToken || "";
    const member = session === "member" && Boolean(token);
    const [attendance, setAttendance] = useState<DaengLabAttendance | null>(null);
    const [engagement, setEngagement] = useState<DaengLabEngagement | null>(null);
    const [coins, setCoins] = useState<number | null>(null);
    const [analysisCoinCost, setAnalysisCoinCost] = useState(10);
    const [error, setError] = useState("");
    const [savingTask, setSavingTask] = useState<TaskId | null>(null);
    const [loading, setLoading] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const claimingRef = useRef(false); // 빠른 두 번 톡도 막도록(상태 반영 전) — 찍는 중 표시는 claiming
    const loadSeq = useRef(0); // 늦게 도착한 옛 응답(로그아웃 · 다른 계정)은 버림

    // 불러오기 — 협업자 대시보드 refresh 와 같음(같은 두 함수 · 같은 순서). "다시 시도"도 이 함수
    const reload = useCallback(async () => {
        if (!token) return;
        const seq = ++loadSeq.current;
        setLoading(true);
        setError("");
        try {
            const [nextAttendance, nextEngagement] = await Promise.all([loadDaengLabAttendance(token), loadDaengLabEngagement(token)]);
            if (seq !== loadSeq.current) return;
            setAttendance(nextAttendance);
            setEngagement(nextEngagement);
            setCoins(nextAttendance.wallet.daengLabCoins);
            setAnalysisCoinCost(nextAttendance.wallet.analysisCoinCost);
        } catch (reason) {
            if (seq === loadSeq.current) setError(reason instanceof Error ? reason.message : "오늘의 기록을 불러오지 못했습니다.");
        } finally {
            if (seq === loadSeq.current) setLoading(false);
        }
    }, [token]);

    // 처음 · 로그인 바뀔 때 불러오기 — 웹과 같이 다음 틱에
    useEffect(() => {
        if (!hydrated || !member) return;
        const timer = window.setTimeout(() => void reload(), 0);
        return () => {
            window.clearTimeout(timer);
            loadSeq.current += 1; // 이 화면을 떠나면 진행 중 응답은 무시
        };
    }, [hydrated, member, reload]);

    // 다른 곳(마이 · 출근 · 분석)에서 지갑이 바뀌면 코인도 같이
    useEffect(() => {
        const onWallet = (event: Event) => {
            const detail = (event as CustomEvent<{ daengLabCoins?: number; analysisCoinCost?: number }>).detail;
            if (typeof detail?.daengLabCoins === "number") setCoins(detail.daengLabCoins);
            if (typeof detail?.analysisCoinCost === "number") setAnalysisCoinCost(detail.analysisCoinCost);
        };
        window.addEventListener("ddb:daenglab-wallet", onWallet);
        return () => window.removeEventListener("ddb:daenglab-wallet", onWallet);
    }, []);

    const ready = Boolean(attendance && engagement);
    // 출근 — 협업자 대시보드 claimAttendance 와 같음(성공하면 새로 찍혔는지 돌려줌)
    // 웹 AttendanceStampCard 처럼 찍는 중 · 불러오기 전(준비 전 · 불러오는 중)에는 무시(두 번 톡 방지)
    const stamp = useCallback(async () => {
        if (!token || claimingRef.current || !ready || loading) return false;
        claimingRef.current = true;
        setClaiming(true);
        try {
            setError("");
            const next = await claimDaengLabAttendance(token);
            setAttendance(next);
            setCoins(next.wallet.daengLabCoins);
            window.dispatchEvent(new CustomEvent("ddb:daenglab-wallet", { detail: next.wallet }));
            const nextEngagement = await loadDaengLabEngagement(token);
            setEngagement(nextEngagement);
            return next.newlyClaimed;
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "출근도장을 찍지 못했습니다.");
            return false;
        } finally {
            claimingRef.current = false;
            setClaiming(false);
        }
    }, [token, ready, loading]);

    // 오늘 할 일 완료 — 협업자 대시보드 completeTask 와 같음. 성공했는지 돌려줌(실패면 +XP 표시 안 함)
    const complete = useCallback(async (taskId: TaskId) => {
        if (!token || savingTask) return false;
        setSavingTask(taskId);
        setError("");
        try {
            const next = await completeDaengLabCareTask(taskId, token);
            setEngagement(next);
            return true;
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "오늘의 돌봄 기록을 저장하지 못했습니다.");
            return false;
        } finally {
            setSavingTask(null);
        }
    }, [token, savingTask]);

    const tasks = (engagement?.todayTasks ?? []) as Today["tasks"];
    const done = { walk_20: false, eye_check: false } as Record<TaskId, boolean>;
    for (const t of tasks) done[t.taskId] = t.completed;
    const stamped = Boolean(attendance?.claimedToday);
    const doneCount = (stamped ? 1 : 0) + tasks.filter((t) => t.completed).length;
    const next = tasks.find((t) => !t.completed);
    return {
        ready,
        loading,
        claiming,
        error,
        stamped,
        streak: attendance?.currentStreak ?? 0,
        recentDays: attendance?.recentDays ?? [],
        businessDate: attendance?.businessDate ?? engagement?.businessDate ?? "",
        dailyRewardCoins: attendance?.dailyRewardDaengLabCoins ?? 2,
        coins: coins ?? 0,
        analysisCoinCost,
        xp: engagement?.xp ?? 0,
        level: engagement?.level ?? 1,
        nextLevelXp: engagement?.nextLevelXp ?? 100,
        weeklyAttendanceProgress: engagement?.weeklyAttendanceProgress ?? 0,
        weeklyAttendanceTarget: engagement?.weeklyAttendanceTarget ?? 7,
        monthlyAnalysisProgress: engagement?.monthlyAnalysisProgress ?? 0,
        monthlyAnalysisTarget: engagement?.monthlyAnalysisTarget ?? 5,
        tasks,
        done,
        doneCount,
        allDone: ready && stamped && tasks.length > 0 && tasks.every((t) => t.completed),
        nextTask: next ? { taskId: next.taskId, title: next.title, xp: next.xp } : null,
        savingTask,
        stamp,
        complete,
        reload: () => void reload(),
    };
}

/**
 * 관리자 공개 설정 — 협업자 GrowthHub 와 같은 함수(loadPublishedGrowthContent) · 같은 기본값(DEFAULT_GROWTH_HUB_CONTENT).
 * visibility.programs(준비 중 혜택) · localCare(동네 돌봄 찾기) · policy(운영 기준)가 false 면 그 칸을 숨긴다.
 * 불러오기 실패(null)면 웹처럼 기본값(모두 보임) 그대로.
 */
export function useGrowthVisibility() {
    const [visibility, setVisibility] = useState(DEFAULT_GROWTH_HUB_CONTENT.visibility);
    useEffect(() => {
        const controller = new AbortController();
        loadPublishedGrowthContent(controller.signal).then((published) => {
            if (controller.signal.aborted) return;
            if (published) setVisibility(published.content.visibility);
        });
        return () => controller.abort();
    }, []);
    return visibility;
}

/** 진행 중인 댕주제 — 협업자 loadShowcaseTopic 그대로(로그인 없이도 읽기). 없으면 null, 마감까지 남은 날 */
export function useShowcaseTopic() {
    const [state, setState] = useState<{ topic: ShowcaseTopic | null | undefined; dday: number | null }>({ topic: undefined, dday: null });
    useEffect(() => {
        const controller = new AbortController();
        loadShowcaseTopic({ signal: controller.signal })
            .then((t) => {
                const topic = t && t.isActive ? t : null;
                // 마감까지 남은 날 — 받아온 순간 한 번 계산
                const dday = topic?.endsAt ? Math.max(0, Math.ceil((new Date(topic.endsAt).getTime() - Date.now()) / 86_400_000)) : null;
                setState({ topic, dday });
            })
            .catch(() => { if (!controller.signal.aborted) setState({ topic: null, dday: null }); });
        return () => controller.abort();
    }, []);
    return { topic: state.topic, dday: state.dday, loading: state.topic === undefined };
}

/** 첫 반려견의 주간 사진 기록 — 협업자 loadWeeklyPhotoAnalyses 그대로(최근 기록 먼저) */
export function useWeeklyRecords(limit = 6) {
    const { user } = useAuth();
    const petProfileId = user?.pets?.[0]?.apiProfileId;
    const token = user?.apiAccessToken || "";
    const [records, setRecords] = useState<WeeklyPhotoAnalysisRecord[] | null>(null);
    const [error, setError] = useState("");
    useEffect(() => {
        if (!petProfileId || !token) return;
        let active = true;
        loadWeeklyPhotoAnalyses({ petProfileId, accessToken: token, limit })
            .then((list) => { if (active) setRecords(list); })
            .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "주간 기록을 불러오지 못했습니다."); });
        return () => { active = false; };
    }, [petProfileId, token, limit]);
    return { records, error, hasPetProfile: Boolean(petProfileId) };
}

/**
 * 화면 안 탭의 처음 쪽 — 주소 ?tab=N 을 처음 그릴 때부터 반영(깜빡임 없음).
 * useSearchParams 를 쓰므로 화면(page.tsx)은 Suspense 로 감싼다.
 */
export function useInitialTab(count: number) {
    const sp = useSearchParams();
    const n = Number(sp.get("tab"));
    return Number.isInteger(n) && n >= 0 && n < count ? n : 0;
}

/* ── 지금 시각 (30초마다 갱신) ── */
export function useNow(intervalMs = 30_000) {
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        const tick = () => setNow(new Date());
        const first = window.setTimeout(tick, 0);
        const id = window.setInterval(tick, intervalMs);
        return () => {
            window.clearTimeout(first);
            window.clearInterval(id);
        };
    }, [intervalMs]);
    return now;
}

/** 다음 출근 가능 시각까지 남은 시간 (서버 nextClaimAt 대신, 한국 시간 자정 기준 예시) */
export function untilTomorrow(now: Date | null) {
    if (!now) return "";
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
    return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}

/* ── 실제 날씨: 기존 날씨 함수 그대로 (로그인 불필요). 실패하면 예시 날씨 ── */
export const WEATHER_KO: Record<HeroWeather, string> = {
    clear: "맑음", cloudy: "구름 많음", drizzle: "이슬비", rain: "비",
    snow: "눈", wind: "바람", storm: "폭풍우", fog: "안개",
};
export type LiveWeather = { weather: HeroWeather; temp: number | null; place: string; bucket: HeroTimeBucket };

export function useLiveWeather(): LiveWeather {
    const [state, setState] = useState<LiveWeather>({ weather: "clear", temp: 18, place: "서울", bucket: "day" });
    useEffect(() => {
        let alive = true;
        // 시간대는 바로, 날씨는 받아오는 대로 바꾼다
        const id = window.setTimeout(() => setState((s) => ({ ...s, bucket: getHeroTimeBucket(new Date()) })), 0);
        fetchHeroWeatherReport()
            .then((report) => {
                if (!alive || !report) return;
                setState({
                    weather: report.weather,
                    temp: report.temperatureC === null ? null : Math.round(report.temperatureC),
                    place: report.locationName,
                    bucket: getHeroTimeBucket(new Date()),
                });
            })
            .catch(() => undefined);
        return () => {
            alive = false;
            window.clearTimeout(id);
        };
    }, []);
    return state;
}

/** 날씨에 맞춘 산책 한마디 */
export function walkAdvice(w: LiveWeather) {
    if (w.weather === "storm" || w.weather === "rain") return "오늘은 실내 놀이가 좋아요";
    if (w.weather === "drizzle") return "짧은 산책만 다녀와요";
    if (w.weather === "snow") return "산책 뒤 발바닥을 꼭 닦아 줘요";
    if (w.weather === "fog") return "밝은 옷 입고 천천히 걸어요";
    if (w.temp !== null && w.temp >= 28) return "더우니 해 진 뒤 산책해요";
    if (w.temp !== null && w.temp <= 0) return "짧고 따뜻하게 다녀와요";
    if (w.bucket === "night") return "밤 산책은 밝은 길로 다녀와요";
    return "산책하기 딱 좋아요";
}

/** 시간대 인사 */
export function greeting(bucket: HeroTimeBucket) {
    return { morning: "좋은 아침이에요", day: "좋은 오후예요", evening: "편안한 저녁이에요", night: "고요한 밤이에요" }[bucket];
}

/* 시간대별 하늘 색 — 아침 복숭아 · 낮 하늘 · 저녁 노을 · 밤 남색 */
export const SKY: Record<HeroTimeBucket, { from: string; via: string; to: string; ink: string; dark: boolean }> = {
    morning: { from: "#ffd9c7", via: "#ffe9d6", to: "#fff6ec", ink: "#6b3f2c", dark: false },
    day: { from: "#bfe2ff", via: "#dcefff", to: "#f4faff", ink: "#1e4a73", dark: false },
    evening: { from: "#c9b3f2", via: "#f7b9c4", to: "#ffd8b8", ink: "#5a2f4f", dark: false },
    night: { from: "#1f2752", via: "#353d78", to: "#4f4f8f", ink: "#eef0ff", dark: true },
};

/**
 * SkyLayer — 부모를 꽉 채우는 하늘 (영상 대신 코드로)
 *  - 바탕: 시간대 그라데이션 / 밤: 별 / 구름·안개: 흐릿한 덩어리 / 비: 비스듬한 줄기 / 눈: 흩날리는 점
 */
export function SkyLayer({ w, className = "" }: { w: LiveWeather; className?: string }) {
    const sky = SKY[w.bucket];
    const rainy = w.weather === "rain" || w.weather === "drizzle" || w.weather === "storm";
    const cloudy = w.weather === "cloudy" || w.weather === "fog" || rainy || w.weather === "snow";
    return (
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
            style={{ background: `linear-gradient(170deg, ${sky.from} 0%, ${sky.via} 55%, ${sky.to} 100%)` }}>
            {/* 해 · 달: 시간대에 따라 위치와 색이 다름 */}
            <span className="hc-orb absolute rounded-full" style={{
                // 크기는 하늘 너비에 비례 (작은 원판에서도 글자를 가리지 않게 오른쪽 위 구석에)
                width: "42%", aspectRatio: "1", right: w.bucket === "evening" ? "-6%" : "-4%", top: w.bucket === "evening" ? "38%" : "-8%",
                background: sky.dark ? "radial-gradient(circle, #fffbe8 0%, #fff3c4 30%, transparent 68%)" : "radial-gradient(circle, #fff7d6 0%, #ffe6a3 30%, transparent 68%)",
                opacity: cloudy ? 0.45 : 0.9,
            }} />
            {sky.dark ? <span className="hc-stars absolute inset-0" /> : null}
            {cloudy ? <span className="hc-clouds absolute inset-0" style={{ opacity: w.weather === "fog" ? 0.9 : 0.6 }} /> : null}
            {rainy ? <span className="hc-rain absolute inset-0" style={{ opacity: w.weather === "drizzle" ? 0.35 : 0.6 }} /> : null}
            {w.weather === "snow" ? <span className="hc-snow absolute inset-0" /> : null}
        </div>
    );
}

/* ── 시연 전환 줄: 로그인 전/후 ── */
/** (예전 "로그인 전/후(예시)" 시연 전환 줄) — 실제 로그인 상태를 쓰므로 아무것도 그리지 않음. 화면 코드 호환용 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ConceptBar(_props: { session: Session; onSession: (s: Session) => void }) {
    return null;
}

/* ── 코인 비행: from 요소에서 to 요소까지 포물선으로 날아간 뒤 사라짐 ── */
export function flyCoin(from: Element | null, to: Element | null, count = 1) {
    if (!from || !to || typeof document === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    for (let i = 0; i < count; i += 1) {
        const coin = document.createElement("span");
        coin.className = "hc-coin";
        coin.textContent = "C";
        const sx = a.left + a.width / 2 - 11 + (i - (count - 1) / 2) * 14;
        const sy = a.top + a.height / 2 - 11;
        const dx = b.left + b.width / 2 - 11 - sx;
        const dy = b.top + b.height / 2 - 11 - sy;
        coin.style.left = `${sx}px`;
        coin.style.top = `${sy}px`;
        document.body.appendChild(coin);
        // 위로 솟았다가 칩으로 빨려 들어가는 포물선
        const anim = coin.animate(
            [
                { transform: "translate(0,0) scale(.6)", opacity: 0 },
                { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 90}px) scale(1.15)`, opacity: 1, offset: 0.45 },
                { transform: `translate(${dx}px, ${dy}px) scale(.55)`, opacity: 0.9 },
            ],
            { duration: 820, delay: i * 90, easing: "cubic-bezier(.3,.7,.3,1)", fill: "forwards" },
        );
        anim.onfinish = () => {
            coin.remove();
            // 마지막 코인이 도착하면 칩이 한 번 통통
            if (i === count - 1) to.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 360, easing: "cubic-bezier(.3,1.6,.5,1)" });
        };
    }
}

/* ── 공통 CSS: 폰트 · 하늘 효과 · 쾅 · 등장 · 코인 ── */
export const HC_CSS = `
/* 글꼴 선언은 app/globals.css 한 곳(2026-10-21 속도) */
.hc-display { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; letter-spacing: -0.025em; }
.hc-air { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; letter-spacing: -0.01em; } /* 본문 글씨 — 나눔스퀘어라운드(굵게) */

/* 하늘: 해·달은 천천히 숨쉬고, 별은 반짝이고, 구름은 흐르고, 비·눈은 내린다 */
.hc-orb { filter: blur(2px); animation: hc-breathe 6s ease-in-out infinite; }
@keyframes hc-breathe { 50% { transform: scale(1.08); } }
.hc-stars { background-image: radial-gradient(1.4px 1.4px at 12% 18%, #fff 50%, transparent 51%), radial-gradient(1.2px 1.2px at 32% 8%, #fff 50%, transparent 51%), radial-gradient(1.6px 1.6px at 58% 22%, #fff 50%, transparent 51%), radial-gradient(1.1px 1.1px at 76% 12%, #fff 50%, transparent 51%), radial-gradient(1.3px 1.3px at 88% 30%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 22% 36%, #fff 50%, transparent 51%), radial-gradient(1.2px 1.2px at 46% 40%, #fff 50%, transparent 51%); animation: hc-twinkle 4s ease-in-out infinite; }
@keyframes hc-twinkle { 50% { opacity: .55; } }
.hc-clouds { background: radial-gradient(60% 22% at 20% 26%, rgba(255,255,255,.85), transparent 70%), radial-gradient(50% 18% at 78% 16%, rgba(255,255,255,.75), transparent 70%), radial-gradient(70% 24% at 60% 48%, rgba(255,255,255,.55), transparent 72%); background-size: 200% 100%; animation: hc-drift 40s linear infinite; }
@keyframes hc-drift { to { background-position: -200% 0; } }
.hc-rain { background-image: repeating-linear-gradient(105deg, transparent 0 14px, rgba(255,255,255,.65) 14px 15px, transparent 15px 30px); background-size: 60px 60px; animation: hc-fall 0.7s linear infinite; }
@keyframes hc-fall { to { background-position: -16px 60px; } }
.hc-snow { background-image: radial-gradient(2.5px 2.5px at 20% 20%, #fff 50%, transparent 51%), radial-gradient(2px 2px at 60% 40%, #fff 50%, transparent 51%), radial-gradient(3px 3px at 80% 10%, #fff 50%, transparent 51%), radial-gradient(2px 2px at 40% 70%, #fff 50%, transparent 51%); background-size: 120px 120px; animation: hc-snowfall 6s linear infinite; }
@keyframes hc-snowfall { to { background-position: 30px 120px; } }

/* 흐림 → 선명 등장 (순서대로 --d 만큼 늦게) */
.hc-in { animation: hc-in .7s cubic-bezier(.2,.8,.2,1) both; animation-delay: var(--d, 0ms); }
@keyframes hc-in { from { opacity: 0; transform: translateY(10px); filter: blur(8px); } to { opacity: 1; transform: none; filter: none; } }

/* 스티커가 위에서 쾅 */
.hc-slam { animation: hc-slam .55s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes hc-slam { 0% { opacity: 0; transform: scale(2.2) rotate(-14deg); } 60% { opacity: 1; transform: scale(.92) rotate(4deg); } 100% { transform: scale(1) rotate(var(--rot, 0deg)); } }
/* 쾅 맞은 판이 살짝 눌림 */
.hc-thud { animation: hc-thud .4s ease-out .3s both; }
@keyframes hc-thud { 40% { transform: translateY(2px) scale(.99); } }
/* 톡 튀어나옴 */
.hc-pop { animation: hc-pop .5s cubic-bezier(.3,1.6,.5,1) both; }
@keyframes hc-pop { from { transform: scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }

/* 날아가는 코인 */
.hc-coin { position: fixed; z-index: 3000; width: 22px; height: 22px; border-radius: 999px; display: grid; place-items: center; font: 700 11px/1 var(--font-wanted-sans), sans-serif; color: #7a4b00; background: radial-gradient(circle at 35% 30%, #fff3b0, #ffc93d 55%, #e9a514); box-shadow: 0 2px 6px rgba(160,100,0,.35), inset 0 -2px 0 rgba(150,90,0,.25); pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
  .hc-orb, .hc-stars, .hc-clouds, .hc-rain, .hc-snow { animation: none; }
  .hc-in, .hc-slam, .hc-thud, .hc-pop { animation-duration: .01ms; }
}
`;
