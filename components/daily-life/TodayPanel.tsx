"use client";

/**
 * TodayPanel — 매일 댕생활 탭 ① "오늘" · 출근 스티커 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 디자인 언어: 직접 만든 스티커 그림 7장(public/images/ui/stickers/sticker-mon~sun.webp, 원본 출근스티커.png 에서 잘라냄)
 *  1) 이번 주 출근 스티커 — 월~일 한 줄. 칸마다 요일 글자(카페24), 오늘 칸은 분홍 · 테두리 숨쉬기.
 *     "오늘 스티커 붙이기"(한 번 터치) → 오늘 요일 글자 위로 스티커가 쾅 (눌렸다 튐 · 잉크 물결 · 판이 쿵) · 광택 · 0/7 → 1/7.
 *     로그인 전에는 미리보기(기록되지 않음) 안내.
 *  2) 이렇게 이어져요 — 기존 GUEST_STEPS 3단계, 단계마다 직접 만든 그림(달력 체크 · 산책·눈 확인 · 기록 노트). 스크롤로 닿으면 붙음
 *  3) 로그인 카드 — 파스텔 판 + "우리 아이 기록 보관함" 그림(record-box.webp, 원본 하루1.png) 둥실
 *  - 로그인 후: (다음 단계에서 새 화면으로) 지금은 기존 회원 대시보드(MemberAiDashboard) 그대로
 * 머리말 · 제목 · 설명은 관리자 화면에서 바꾸는 content.today 를 그대로 쓴다.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import MemberAiDashboard from "@/components/home/MemberAiDashboard";
import { GUEST_STEPS } from "@/components/growth/GrowthHub";
import type { GrowthHubPublishedContent } from "@/lib/growth-content";
import { LOGIN_HREF, Reveal, SectionHead, SIGNUP_HREF, TEXT, TONES } from "./ui";

const PINK = "#f0577f";
const VIOLET = "#8b6cf0";

// 요일별 스티커 그림 (월~일) · 붙었을 때 기울기
const WEEK = [
    { day: "월", src: "/images/ui/stickers/sticker-mon.webp", rot: -7 },
    { day: "화", src: "/images/ui/stickers/sticker-tue.webp", rot: 5 },
    { day: "수", src: "/images/ui/stickers/sticker-wed.webp", rot: -4 },
    { day: "목", src: "/images/ui/stickers/sticker-thu.webp", rot: 8 },
    { day: "금", src: "/images/ui/stickers/sticker-fri.webp", rot: -6 },
    { day: "토", src: "/images/ui/stickers/sticker-sat.webp", rot: 4 },
    { day: "일", src: "/images/ui/stickers/sticker-sun.webp", rot: -9 },
];

// 단계별 그림 (public/images/ui/stickers/step-*.webp, 원본 하루.png 에서 잘라냄) + 짧은 표시 색
const STEP_STICKER: Record<string, { src: string; rot: number; tag: string; tagBg: string; tagInk: string }> = {
    orange: { src: "/images/ui/stickers/step-checkin.webp", rot: -5, tag: "하루 한 번", tagBg: "#dcf3e9", tagInk: "#1d8a66" },
    teal: { src: "/images/ui/stickers/step-care.webp", rot: 4, tag: "+XP", tagBg: "#fff0d2", tagInk: "#a8700f" },
    coral: { src: "/images/ui/stickers/step-record.webp", rot: -3, tag: "AI 기록", tagBg: "#ece6ff", tagInk: "#6a4fe0" },
};

export default function TodayPanel({ content, member }: { content: GrowthHubPublishedContent["today"]; member: boolean }) {
    return (
        <div className="space-y-6">
            <Reveal><SectionHead kicker={content.kicker} title={content.title} tone={TONES.blue}>{content.description}</SectionHead></Reveal>
            {member ? <MemberAiDashboard variant="full" /> : (
                <>
                    <Reveal order={1}><StickerBoard /></Reveal>
                    <Steps />
                    <Reveal><LoginCard /></Reveal>
                </>
            )}
        </div>
    );
}

/* ───────────── 스티커 그림 ───────────── */

/** 스티커 한 장 — 그림 + 그림자 · 기울기(rot). ghost 면 아직 안 모은 흐린 실루엣, stick 이면 붙는 움직임 + 광택 */
function StickerImg({ src, size, rot = 0, ghost = false, stick = false, className = "", style }: {
    src: string; size: number; rot?: number; ghost?: boolean; stick?: boolean; className?: string; style?: CSSProperties;
}) {
    return (
        <span
            className={`pv-sticker-img block rounded-full ${/\babsolute\b/.test(className) ? "" : "relative"} ${ghost ? "is-ghost" : ""} ${stick ? "pv-stick" : ""} ${className}`}
            style={{ width: size, height: size, "--rot": `${rot}deg`, ...style } as CSSProperties}
            aria-hidden="true"
        >
            <Image src={src} alt="" fill sizes={`${size * 2}px`} className="rounded-full object-cover" />
        </span>
    );
}

/* ───────────── 1) 이번 주 출근 스티커 ───────────── */

/** 한국 시각 → 짧은 인사 */
function greetOf(hour: number) {
    if (hour >= 5 && hour < 9) return "좋은 아침이에요";
    if (hour >= 9 && hour < 16) return "산책하기 좋은 하루예요";
    if (hour >= 16 && hour < 20) return "노을 산책 어때요?";
    return "오늘도 수고했어요";
}

function seoulNow() {
    const d = new Date();
    const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" }).format(d).replace("요일", "");
    return {
        hour: Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }).format(d)),
        label: new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" }).format(d),
        todayIndex: WEEK.findIndex((w) => w.day === weekday),
    };
}

function StickerBoard() {
    // 날짜 · 시각은 브라우저에서만 (서버 렌더와 어긋나지 않게)
    const [now, setNow] = useState<ReturnType<typeof seoulNow> | null>(null);
    useEffect(() => {
        const t = window.setTimeout(() => setNow(seoulNow()), 0);
        const timer = window.setInterval(() => setNow(seoulNow()), 60_000);
        return () => { window.clearTimeout(t); window.clearInterval(timer); };
    }, []);

    // 한 번 터치로 오늘 스티커 붙이기 (미리보기)
    const [done, setDone] = useState(false);
    const [thud, setThud] = useState(false); // 쾅 찍히는 순간 판이 한 번 쿵
    const stick = () => {
        if (done) return;
        setDone(true);
        // 도장이 닿는 순간(약 0.3초 뒤) — 판 쿵
        window.setTimeout(() => setThud(true), 300);
        window.setTimeout(() => setThud(false), 650);
    };
    const today = now?.todayIndex ?? -1;

    return (
        // 겹친 카드 — 뒤에 연보라 카드 한 장이 살짝 비쳐 스티커북처럼
        <div className="relative isolate pb-2">
        <span className="pv-deck-back" aria-hidden="true" />
        <section className="pv-luxe relative overflow-hidden p-5" aria-labelledby="pv-sticker-title">
            {/* 머리 — 제목 · 날짜 인사 · 스티커 세 장 부채꼴 */}
            <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold tracking-[0.08em]" style={{ color: VIOLET }}>DAILY STICKER</p>
                    <h3 id="pv-sticker-title" className="mt-0.5 font-['Cafe24Ssurround',var(--font-wanted-sans)] text-[19px] tracking-[-0.02em]" style={{ color: TEXT }}>이번 주 출근 스티커</h3>
                    <p className="mt-1 text-[12.5px] text-[#8c7f78]">{now ? `${now.label} · ${greetOf(now.hour)}` : " "}</p>
                </div>
                <span className="relative mr-1 h-[46px] w-[64px] shrink-0" aria-hidden="true">
                    <StickerImg src={WEEK[2].src} size={34} rot={-14} className="absolute left-0 top-2" />
                    <StickerImg src={WEEK[6].src} size={34} rot={12} className="absolute right-0 top-2" />
                    <StickerImg src={WEEK[0].src} size={38} rot={0} className="absolute left-1/2 top-0 -translate-x-1/2" />
                </span>
            </div>

            {/* 도장판 — 월~일 한 줄. 칸마다 요일 글자, 찍으면 그 위에 스티커가 쾅 */}
            <ol className={`pv-tray mt-4 grid grid-cols-7 gap-1.5 ${thud ? "pv-thud" : ""}`} aria-label="이번 주 출근 스티커 (로그인 전 미리보기)">
                {WEEK.map((w, i) => {
                    const isToday = i === today;
                    const stuck = isToday && done;
                    return (
                        <li key={w.day} className="flex flex-col items-center gap-1" aria-label={`${w.day}요일${stuck ? " 출근 스티커" : ""}`}>
                            <span className="relative grid aspect-square w-full place-items-center">
                                {/* 빈 칸 — 요일 글자 (오늘은 분홍 · 테두리 숨쉬기) */}
                                <span className={`pv-slot absolute inset-0 grid place-items-center rounded-full ${isToday ? "is-today" : ""} ${isToday && !done ? "pv-slot-today" : ""}`}>
                                    <span className="font-['Cafe24Ssurround',var(--font-wanted-sans)] text-[16px] leading-none" style={{ color: isToday ? PINK : "#cfc4be" }}>{w.day}</span>
                                </span>
                                {/* 쾅 — 요일 글자 위로 스티커 + 잉크 물결 (칸보다 살짝 크게) */}
                                {stuck && (
                                    <>
                                        <span className="pv-ink absolute inset-0 rounded-full" aria-hidden="true" />
                                        <StickerImg src={w.src} size={48} rot={w.rot} className="pv-slam relative" />
                                    </>
                                )}
                            </span>
                            <span className="h-[13px] text-[10.5px] font-bold" style={{ color: PINK }}>{isToday ? "오늘" : ""}</span>
                        </li>
                    );
                })}
            </ol>

            {/* 붙이기 — 한 번 터치 */}
            <div className="mt-5 flex items-center gap-3">
                <span className="pv-num shrink-0 text-[13px] text-[#b4a8a2]">
                    <span className="text-[20px]" style={{ color: done ? PINK : TEXT }}>{done ? 1 : 0}</span> / 7
                </span>
                <button
                    type="button"
                    onClick={stick}
                    className="pv-press flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition-colors duration-300"
                    style={done ? { background: "rgba(240,87,127,.08)", color: PINK } : { background: `linear-gradient(100deg, #ff7fa2 0%, ${PINK} 45%, ${VIOLET} 120%)`, color: "#fff", boxShadow: "0 12px 22px -12px rgba(220,70,130,.7)" }}
                    aria-label={done ? "오늘 출근 스티커 미리보기 완료" : "오늘 출근 스티커 붙이기 (미리보기)"}
                >
                    {done ? <><i className="fa-solid fa-check text-[13px]" aria-hidden="true" />오늘 출근 완료</> : "오늘 스티커 붙이기"}
                </button>
            </div>

            {/* 완료(미리보기) — 로그인 안내 */}
            <div className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${done ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                    <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-[inset_0_0_0_1px_rgba(240,87,127,.15)]">
                        <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#7a5f66]">미리보기예요. 로그인하면 하루 한 장씩 진짜로 모여요.</p>
                        <Link href={LOGIN_HREF} className="pv-press shrink-0 rounded-full px-4 py-2.5 text-[13px] font-bold text-white" style={{ background: PINK }}>로그인</Link>
                    </div>
                </div>
            </div>
        </section>
        </div>
    );
}

/* ───────────── 2) 단계 ───────────── */

function Steps() {
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
    const [reached, setReached] = useState(-1);
    // 단계가 화면 가운데쯤 오면 그 단계 스티커가 붙음
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const t = window.setTimeout(() => setReached(GUEST_STEPS.length - 1), 0);
            return () => window.clearTimeout(t);
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const index = itemRefs.current.indexOf(entry.target as HTMLLIElement);
                setReached((r) => Math.max(r, index));
            });
        }, { rootMargin: "0px 0px -25% 0px", threshold: 0.6 });
        itemRefs.current.forEach((el) => el && io.observe(el));
        return () => io.disconnect();
    }, []);

    return (
        <section aria-labelledby="pv-steps-title">
            <h3 id="pv-steps-title" className="px-0.5 font-['Cafe24Ssurround',var(--font-wanted-sans)] text-[17px] tracking-[-0.02em]" style={{ color: TEXT }}>
                매일 댕생활은 이렇게 이어져요
            </h3>
            <ol className="pv-card mt-3 overflow-hidden">
                {GUEST_STEPS.map((step, i) => {
                    const st = STEP_STICKER[step.tone] ?? STEP_STICKER.orange;
                    const on = reached >= i;
                    return (
                        <li key={step.label} ref={(el) => { itemRefs.current[i] = el; }} className="pv-sep flex items-center gap-4 px-4 py-4">
                            <span className="grid h-[62px] w-[62px] shrink-0 place-items-center">
                                <StickerImg src={st.src} size={60} rot={on ? st.rot : 0} ghost={!on} stick={on} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-1.5">
                                    <span className="pv-h3">{step.title}</span>
                                    <span className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold" style={{ background: st.tagBg, color: st.tagInk }}>{st.tag}</span>
                                </p>
                                <p className="pv-body mt-1 text-[13px]">{step.body}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

/* ───────────── 3) 로그인 카드 ───────────── */

function LoginCard() {
    return (
        <section className="pv-luxe pv-luxe-pink relative overflow-hidden p-5">
            {/* 우리 아이 기록 보관함 — 둥실 떠 있고 아래 그림자가 함께 숨쉼 */}
            <span className="pointer-events-none absolute right-3 top-3 h-[132px] w-[128px]" aria-hidden="true">
                <span className="pv-box-shadow absolute bottom-1 left-1/2 h-3 w-[86px] rounded-[50%]" />
                <span className="pv-box-float absolute inset-x-0 top-0 block h-[124px]">
                    <Image src="/images/ui/stickers/record-box.webp" alt="" fill sizes="128px" className="object-contain drop-shadow-[0_10px_14px_rgba(140,80,150,0.25)]" />
                </span>
            </span>
            <div className="max-w-[60%]">
                <h3 className="font-['Cafe24Ssurround',var(--font-wanted-sans)] text-[18px] leading-[1.35] tracking-[-0.02em]" style={{ color: TEXT }}>
                    로그인하면<br />오늘 기록이<br />계정에 이어져요
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-snug text-[#8a7076]">비회원도 이벤트 · 동네 · 안내 탭은 먼저 둘러볼 수 있어요.</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href={LOGIN_HREF} className="pv-press inline-flex min-h-[48px] items-center justify-center rounded-2xl text-[14.5px] font-bold text-white" style={{ background: `linear-gradient(100deg, #ff7fa2 0%, ${PINK} 45%, ${VIOLET} 120%)`, boxShadow: "0 12px 22px -12px rgba(220,70,130,.7)" }}>
                    로그인하고 시작
                </Link>
                <Link href={SIGNUP_HREF} className="pv-press inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white text-[14px] font-bold" style={{ color: "#b8335d", boxShadow: "inset 0 0 0 1px rgba(240,87,127,.25)" }}>
                    처음이라면 회원가입
                </Link>
            </div>
        </section>
    );
}
