"use client";

/**
 * 스티커북 시안 공통 부품 (로컬 시안 전용, 배포 X)
 * ---------------------------------------------------------------------
 * 스티커북 시안(홈 · 매일 댕생활 · 댕다방 · 연구소 · 마이)이 함께 쓰는 것들 (그림체 부품은 kit.tsx).
 *  - SAMPLE: 로그인 후 예시 데이터 (로컬엔 API 주소가 없어 회원 데이터를 못 받음 → 실제 서버 값 이름에 맞춘 예시)
 *  - useDemoSession: 로그인 전/후 시연 전환 (세션 저장 → 시안을 바꿔도 유지)
 *  - useTodayDemo: 출근도장 · 오늘 할 일 상태 (화면 안에서만 바뀜, 서버 요청 없음)
 *  - useLiveWeather: 실제 날씨 (기존 lib/hero-weather 의 공개 날씨 API, 로그인 불필요) + 실패 시 예시 날씨
 *  - SkyLayer: 시간대(아침·낮·저녁·밤) × 날씨(비·눈·구름·안개)를 코드로 그린 하늘 (영상 없음)
 *  - ConceptBar: 로그인 전/후 시연 전환 줄
 *  - flyCoin: 코인이 버튼에서 코인 칩으로 날아가는 모션
 *  - HC_CSS: 폰트 · 공통 애니메이션
 */

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHeroWeatherReport } from "@/lib/hero-weather";
import { getHeroTimeBucket, type HeroTimeBucket, type HeroWeather } from "@/lib/hero-assets";

/* ── 예시 데이터: 이름은 서버 응답(출근 · 할 일 · 지갑 · 주간 기록 · 댕자랑)에 맞춤 ── */
export const SAMPLE = {
    guardian: "지은",
    pet: { name: "몽이", breed: "토이 푸들" },
    currentStreak: 5,
    dailyRewardCoins: 2, // dailyRewardDaengLabCoins (서버 값, 기본 2)
    coins: 12,
    analysisCoinCost: 10,
    level: 3,
    xp: 260,
    nextLevelXp: 300,
    tasks: [
        { taskId: "walk_20", title: "20분 산책", xp: 5 },
        { taskId: "eye_check", title: "눈 상태 확인", xp: 5 },
    ] as const,
    weeklyRecordDone: false, // 이번 주(weekKey) 사진 기록 여부
    lastReport: "지난주보다 눈가가 한결 깨끗해 보여요", // comparison.headline 예시
    lastAnalyzedAt: "2026-10-14T09:20:00+09:00", // 반려견 프로필 lastAnalyzedAt 예시(오늘 분석 여부 · 최근 날짜)
    concerns: ["피부/발바닥 케어"], // 반려견 관심 케어(AI 추천 문구)
    newBones: 3, // 내 댕자랑에 새로 받은 응원 (receivedBoneCount 증가분)
    topic: { title: "우리 아이 최애 장난감", dday: 3 },
    goods: { dday: 12, joined: 412, goal: 500 },
    signupBonus: 20,
};

export type TaskId = (typeof SAMPLE.tasks)[number]["taskId"];
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

/* ── 로그인 전/후 시연 전환: 세션에 저장해 시안을 오가도 유지 ── */
const SESSION_KEY = "ddb.homeConcept.session.v1";
export function useDemoSession(): [Session, (s: Session) => void] {
    const [session, setSession] = useState<Session>("member");
    useEffect(() => {
        // 저장값은 화면이 뜬 뒤 읽는다 (서버 렌더와 첫 화면을 맞추기 위해 한 박자 늦춤)
        const id = window.setTimeout(() => {
            try {
                const saved = window.sessionStorage.getItem(SESSION_KEY);
                if (saved === "guest" || saved === "member") setSession(saved);
            } catch {
                /* 저장소를 못 쓰는 환경이면 기본값 유지 */
            }
        }, 0);
        return () => window.clearTimeout(id);
    }, []);
    const update = useCallback((next: Session) => {
        setSession(next);
        try {
            window.sessionStorage.setItem(SESSION_KEY, next);
        } catch {
            /* 무시 */
        }
    }, []);
    return [session, update];
}

/* ── 오늘 상태 (출근 · 할 일): 화면 안에서만 바뀌는 시연 상태 ── */
const TODAY_KEY = "ddb.homeConcept.today.v1";
type TodayState = { stamped: boolean; done: Record<TaskId, boolean>; coins: number; xp: number };
const freshToday = (): TodayState => ({ stamped: false, done: { walk_20: false, eye_check: false }, coins: SAMPLE.coins, xp: SAMPLE.xp });

/**
 * 오늘 상태(출근 · 할 일 · 코인 · XP) — 화면 안에서만 바뀌는 시연 상태.
 * 홈 → 매일 댕생활 → 연구소처럼 화면을 오가도 이어지게 세션에 저장(로그인 전/후마다 따로).
 */
export function useTodayDemo(session: Session) {
    const [st, setSt] = useState<TodayState>(freshToday);
    const loaded = useRef<Session | null>(null);

    // 로그인 전/후가 정해지면(바뀌면) 그 상태의 저장값을 불러옴
    useEffect(() => {
        const id = window.setTimeout(() => {
            let next = freshToday();
            try {
                const raw = window.sessionStorage.getItem(`${TODAY_KEY}.${session}`);
                if (raw) next = { ...next, ...(JSON.parse(raw) as Partial<TodayState>) };
            } catch {
                /* 저장값이 없거나 깨졌으면 처음 상태 */
            }
            loaded.current = session;
            setSt(next);
        }, 0);
        return () => window.clearTimeout(id);
    }, [session]);
    // 바뀔 때마다 저장
    useEffect(() => {
        if (loaded.current !== session) return;
        try {
            window.sessionStorage.setItem(`${TODAY_KEY}.${session}`, JSON.stringify(st));
        } catch {
            /* 무시 */
        }
    }, [st, session]);

    const stamp = useCallback(() => {
        setSt((s) => (s.stamped ? s : { ...s, stamped: true, coins: s.coins + SAMPLE.dailyRewardCoins }));
    }, []);
    const complete = useCallback((id: TaskId) => {
        const task = SAMPLE.tasks.find((t) => t.taskId === id);
        setSt((s) => (s.done[id] ? s : { ...s, done: { ...s.done, [id]: true }, xp: s.xp + (task?.xp ?? 0) }));
    }, []);
    // 코인 바꾸기 등 다른 화면에서 코인을 더할 때
    const addCoins = useCallback((n: number) => setSt((s) => ({ ...s, coins: s.coins + n })), []);
    // 처음 상태로 (시안 확인용)
    const reset = useCallback(() => setSt(freshToday()), []);

    const { stamped, done, coins, xp } = st;
    const doneCount = (stamped ? 1 : 0) + (done.walk_20 ? 1 : 0) + (done.eye_check ? 1 : 0);
    const nextTask = SAMPLE.tasks.find((t) => !done[t.taskId]) ?? null;
    return {
        stamped, done, coins, xp, doneCount, nextTask, stamp, complete, addCoins, reset,
        allDone: doneCount === 3,
        streak: SAMPLE.currentStreak + (stamped ? 1 : 0),
    };
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
export function ConceptBar({ session, onSession }: { session: Session; onSession: (s: Session) => void }) {
    return (
        <div className="relative z-20 mx-auto mb-3 flex w-full max-w-md items-center justify-between gap-2 text-[11.5px]">
            <div className="flex rounded-full bg-white/80 p-0.5 shadow-[0_1px_6px_rgba(40,30,60,0.12)] backdrop-blur" role="tablist" aria-label="로그인 상태 시연">
                {(["guest", "member"] as const).map((s) => (
                    <button key={s} type="button" role="tab" aria-selected={session === s} onClick={() => onSession(s)}
                        className={`rounded-full px-2.5 py-1 transition ${session === s ? "bg-[#ea4c7c] text-white" : "text-[#7a6a63]"}`}>
                        {s === "guest" ? "로그인 전" : "로그인 후(예시)"}
                    </button>
                ))}
            </div>
        </div>
    );
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
@font-face { font-family: "Cafe24Ssurround"; src: url("/fonts/Cafe24Ssurround.woff2") format("woff2"); font-display: swap; }
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
