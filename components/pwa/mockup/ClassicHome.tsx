"use client";

/**
 * ClassicHome — 앱 홈 시안 C "a + 카드 그림" 본문 (로컬 시안 전용, 확정 후 정리)
 * ---------------------------------------------------------------------
 * 기준은 직접 만든 카드 그림 3장(매일 댕생활 · 댕자랑 · 댕다방 연구소)의 그림체.
 * 인사 카드와 바로가기도 같은 결로 맞춘다 —
 *   파스텔 그라데이션 바탕 · 흰 구름 말풍선 · 통통한 색 제목(주아) · 반짝이·하트·발바닥 · 부드러운 그림자 · 말랑한 버튼.
 *   (크레파스 테두리·질감은 그림 카드와 결이 달라 쓰지 않는다)
 *   1) 인사 카드 — 분홍 파스텔 + 구름 속 "어서 와요!" + 오른쪽 검정 푸들(가끔 눈 깜빡) + 말랑한 로그인 버튼
 *   2) 댕다방 즐기기 — 카드 그림 3장을 한 줄에
 *   3) 자주 찾는 메뉴 — 같은 모양 파스텔 타일 4개(하늘 · 라벤더 · 버터 · 분홍 — 카드 그림 팔레트)
 * 글씨: 카페24 써라운드(로고처럼 굵고 둥근 네모꼴 · 상업적 사용·웹 임베딩·BI/CI 모두 허용, OFL) —
 *   큰 글씨는 써라운드, 작은 글씨는 같은 계열의 얇은 써라운드 에어. "어서 와요!"는 로고처럼 글자마다 청록·빨강·주황.
 *   시안은 jsDelivr CDN 으로 불러오고, 실서비스 적용 때는 공식 배포처(fonts.cafe24.com) 파일을 public/fonts 에 두고 라이선스 문서를 함께 둔다.
 * 다크모드(사이트 기준: html[data-ddb-android-dark="true"]): 깔끔한 어두운 바탕, 카드·타일은 그대로 밝게.
 * 움직임: 등장 1회(살짝 떠오름) + 푸들 눈 깜빡(3~5초) + 반짝이 가끔 깜빡 + 누름 반응.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

const LOGIN_HREF = "/auth/login?redirect=%2Fapp%2F";
const TEXT = "#3a2f2c";
const TEXT_SOFT = "#7a6a63";
// 로고 "댕다방" 크레파스 색 — 청록 · 빨강 · 주황
const LOGO_INKS = ["#0aa3b8", "#ec1c45", "#ff8a00"] as const;

// 카드 그림 — 글자 없는 그림(public/images/댕생활·댕자랑·연구소.png 를 잘라 만든 webp: 빈 구름 + 빈 아래 판).
// 제목은 구름 속에, 설명은 아래 판에 사이트 글씨(개구체)로 얹는다 → 언어 전환·문구 수정이 그림과 무관.
//   heads: 구름 속 제목(줄마다 색) · cloud: 화면에 보이는 구름 속 글자 자리의 가운데 x·y(%)와 글자 크기(cqw = 카드 폭의 %)
//     — 그림마다 구름 위치가 달라 그림에서 측정한 값(흰 구름 테두리 상자, object-cover 로 잘리는 만큼 보정)
//   paw: 아래 판 발바닥 색 · lines: 두 줄 설명 · desc: 화면 읽기(aria-label)용 한 줄
const COVERS = [
    {
        href: "/treasure-mine/", title: "매일 댕생활", img: "/images/ui/card-daily.webp", desc: "출근도장 찍고 오늘의 돌봄 루틴 채우기",
        heads: [{ t: "매일", c: "#2f8fe2" }, { t: "댕생활", c: "#1766b5" }], cloud: { x: 45, y: 20, size: 17 }, paw: "#5cb2fd", lines: ["출근도장 찍고", "돌봄 루틴 채우기!"],
    },
    {
        href: "/daeng-showcase/", title: "댕자랑", img: "/images/ui/card-showcase.webp", desc: "우리 아이의 귀여운 순간 자랑하기",
        heads: [{ t: "댕자랑", c: "#e0285f" }], cloud: { x: 47, y: 18, size: 19.5 }, paw: "#fe6b8d", lines: ["우리 아이", "귀여운 순간 자랑!"],
    },
    {
        href: "/pet-lens/", title: "댕다방 연구소", img: "/images/ui/card-lab.webp", desc: "더 행복한 반려생활을 함께 연구해요",
        heads: [{ t: "댕다방", c: "#6b4532" }, { t: "연구소", c: "#e2681c" }], cloud: { x: 40.5, y: 17.5, size: 15 }, paw: "#feae3e", lines: ["행복한 반려생활", "함께 연구해요!"],
    },
] as const;

// 자주 찾는 메뉴 — 같은 모양, 색만 카드 그림 팔레트에서. bg: 타일 바탕, ic: 아이콘 그라데이션, ink: 글자
const QUICK = [
    { href: "/my-pet/", label: "우리 아이", icon: "fa-dog", bg: "linear-gradient(165deg, #eaf6ff 0%, #d3ebff 100%)", ic: "linear-gradient(180deg, #5cb6f2, #2f86d6)", ink: "#1f5f99" },
    { href: "/chat/", label: "AI 상담", icon: "fa-comment-dots", bg: "linear-gradient(165deg, #f3eeff 0%, #e3d9ff 100%)", ic: "linear-gradient(180deg, #a68bf2, #7457d8)", ink: "#563fa8" },
    { href: "/mypage/", label: "마이페이지", icon: "fa-user", bg: "linear-gradient(165deg, #fff8e0 0%, #ffecb8 100%)", ic: "linear-gradient(180deg, #f5be4a, #e0951c)", ink: "#8f5e12" },
    { href: "/", label: "쇼핑", icon: "fa-bag-shopping", bg: "linear-gradient(165deg, #fff0f4 0%, #ffd8e3 100%)", ic: "linear-gradient(180deg, #ff86a6, #e8507a)", ink: "#b23a5e" },
] as const;

/** 반짝이(네 갈래 별) — 카드 그림 속 반짝이와 같은 모양 */
function Sparkle({ className = "", style }: { className?: string; style?: CSSProperties }) {
    return <span aria-hidden="true" className={`ah-sparkle absolute block ${className}`} style={style} />;
}

/** 흰 구름 — 카드 그림 속 제목 구름과 같은 모양 */
function Cloud({ className = "" }: { className?: string }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 220 120" className={`absolute ${className}`} preserveAspectRatio="none">
            <path
                d="M38 104 C14 104 6 86 14 72 C2 58 14 36 36 40 C40 18 66 8 86 20 C98 4 128 2 142 20 C162 8 190 18 192 42 C214 46 220 72 202 84 C206 100 190 108 172 104 Z"
                fill="#fff"
            />
        </svg>
    );
}

/**
 * 로그인 후 인사 — 우리 아이 이름으로 반겨 주고, 최근 7일 출근도장 + 오늘 출근도장 버튼.
 *   찍기 전: "오늘 출근도장 찍기 (+코인)" → 누르면 오늘 칸에 도장이 쾅, 버튼은 "출근 완료"로 바뀐다.
 */
function MemberGreeting({ titleFont, claimed, streak, days, onClaim }: { titleFont: string; claimed: boolean; streak: number; days: string[]; onClaim: () => void }) {
    const title = `${SAMPLE.pet.name}야, 안녕!`;
    return (
        <>
            <div className="relative flex min-h-[7.4rem] items-center">
                {/* 구름 속 제목 + 인사 */}
                <div className="relative z-[1] w-[62%]">
                    <div className="relative px-3 pb-3 pt-4">
                        <Cloud className="inset-0 h-full w-full drop-shadow-[0_6px_10px_rgba(220,110,150,0.18)]" />
                        <h1 className={`${titleFont} relative text-center text-[1.85rem] leading-none`} aria-label={title}>
                            {Array.from(title).map((ch, i) => (
                                <span key={i} aria-hidden="true" style={{ color: LOGO_INKS[i % LOGO_INKS.length] }}>{ch === " " ? " " : ch}</span>
                            ))}
                        </h1>
                    </div>
                    <p className="ah-display mt-2.5 pl-1 text-[15px] leading-tight" style={{ color: TEXT }}>
                        {SAMPLE.guardian}님, 오늘도 반가워요
                    </p>
                    <p className="ah-light mt-1 pl-1 text-[12.5px] leading-tight" style={{ color: TEXT_SOFT }}>
                        {claimed ? `${streak}일째 ${SAMPLE.pet.name}와 함께하고 있어요` : `출근도장 찍고 코인 받아요`}
                    </p>
                </div>
                {/* 우리 아이 사진 — 흰 테두리 동그라미 + 이름표 */}
                <span className="absolute right-0 top-1/2 block h-[6.6rem] w-[6.6rem] -translate-y-1/2">
                    <span className="block h-full w-full overflow-hidden rounded-full border-[4px] border-white bg-[#fff3e8] shadow-[0_10px_20px_-10px_rgba(220,80,120,0.6)]">
                        <Image src={SAMPLE.pet.photo} alt={`${SAMPLE.pet.name} 사진`} width={106} height={106} className="h-full w-full scale-[1.12] object-cover" />
                    </span>
                    <span className={`${titleFont} absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-0.5 text-[13px] shadow-[0_3px_8px_-4px_rgba(60,40,30,0.4)]`} style={{ color: "#ea4c7c" }}>
                        {SAMPLE.pet.name}
                    </span>
                </span>
            </div>

            {/* 최근 7일 출근도장 — 오늘이 맨 끝 */}
            <div className="relative mt-4 rounded-[1.2rem] bg-white/75 px-3 py-2.5 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.9)]">
                <div className="flex items-center justify-between">
                    <span className={`${titleFont} text-[13px]`} style={{ color: TEXT }}>이번 주 출근도장</span>
                    <span className={`${titleFont} flex items-center gap-1 text-[12px]`} style={{ color: "#f2701f" }}>
                        <i aria-hidden="true" className="fa-solid fa-fire text-[10px]" />
                        {streak}일 연속
                    </span>
                </div>
                <ol className="mt-2 grid grid-cols-7 gap-1">
                    {days.map((d, i) => {
                        const isToday = i === 6;
                        const done = isToday ? claimed : SAMPLE.recent[i];
                        return (
                            <li key={i} className="flex flex-col items-center gap-1">
                                <span
                                    className={`grid h-8 w-8 place-items-center rounded-full text-[12px] ${done ? "text-white" : ""} ${isToday && claimed ? "ah-stamp" : ""}`}
                                    style={done
                                        ? { background: "linear-gradient(180deg, #ff8eab, #f0577f)", boxShadow: "0 3px 6px -3px rgba(220,60,110,0.7)" }
                                        : { border: "2px dashed #f4a9bd", color: "#f4a9bd" }}
                                >
                                    <i aria-hidden="true" className="fa-solid fa-paw" />
                                </span>
                                <span className="ah-light text-[10.5px]" style={{ color: isToday ? "#ea4c7c" : TEXT_SOFT }}>{isToday ? "오늘" : d}</span>
                            </li>
                        );
                    })}
                </ol>
            </div>

            {/* 오늘 출근도장 — 찍기 전/후 */}
            {claimed ? (
                <Link
                    href="/treasure-mine/"
                    className={`${titleFont} ah-press mt-3.5 flex h-[3.1rem] items-center justify-center gap-2 rounded-full bg-white text-[16px] shadow-[0_8px_16px_-12px_rgba(220,60,110,0.6)]`}
                    style={{ color: "#ea4c7c" }}
                >
                    <i aria-hidden="true" className="fa-solid fa-circle-check" />
                    출근 완료! 오늘의 돌봄 보러 가기
                </Link>
            ) : (
                <button
                    type="button"
                    onClick={onClaim}
                    className={`${titleFont} ah-btn relative mt-3.5 flex h-[3.25rem] w-full items-center justify-center gap-2 overflow-hidden rounded-full text-[18px]`}
                    style={{ color: "#fff" }}
                >
                    <span aria-hidden="true" className="absolute inset-x-6 top-1 h-[34%] rounded-full bg-white/20" />
                    <span aria-hidden="true" className="ah-shine" />
                    <span className="relative">오늘 출근도장 찍기</span>
                    <span className="ah-light relative rounded-full bg-white/25 px-2 py-0.5 text-[12px]">+{SAMPLE.rewardCoins} 코인</span>
                </button>
            )}
        </>
    );
}

/*
 * 로그인 후 예시 데이터 — 실제 적용 시 아래에서 가져온다.
 *   guardian: useAuth().user.name · pet: user.pets[0](name · 사진 photoDataUrl · lastAnalyzedAt)
 *   streak/recent/claimed: loadDaengLabAttendance() 의 currentStreak · recentDays · claimedToday
 *   출근도장 찍기 버튼: claimDaengLabAttendance() (지금 시안은 화면에서만 바뀜)
 */
const SAMPLE = {
    guardian: "지은",
    pet: { name: "몽이", photo: "/images/pet-companion/cute-v4-breeds/toy-poodle-poster.webp" },
    streak: 6, // 어제까지 연속 출근 일수
    recent: [true, true, true, true, true, true], // 오늘 전 6일
    rewardCoins: 2,
    lastAnalyzedDaysAgo: 3,
};
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function ClassicHome({ titleFont }: { titleFont: string }) {
    const [blink, setBlink] = useState(false);
    // 시안 확인용 — 실제로는 로그인 여부(useAuth)로 결정
    const [member, setMember] = useState(false);
    const [claimed, setClaimed] = useState(false);
    // 최근 7일 요일 — 오늘이 맨 끝
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return WEEK[d.getDay()];
    });
    const streak = SAMPLE.streak + (claimed ? 1 : 0);

    // 푸들 눈 깜빡 — 3~5초마다 한 번
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let t: number;
        const loop = () => {
            t = window.setTimeout(() => {
                setBlink(true);
                window.setTimeout(() => setBlink(false), 150);
                loop();
            }, 3000 + Math.random() * 2000);
        };
        loop();
        return () => window.clearTimeout(t);
    }, []);

    return (
        <div>
            <style dangerouslySetInnerHTML={{ __html: CSS }} />
            {/* 화면 전체에 고정 — 앱 탭바 뒤 여백까지 같은 바탕 */}
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />

            {/* 시안 확인용 전환(실제 화면엔 없음) */}
            <div className="mx-auto mb-3 flex w-fit gap-1 rounded-full bg-white/85 p-1 text-[12px] shadow-[0_2px_8px_rgba(60,40,30,0.1)]" role="tablist" aria-label="시안 상태 전환">
                {[{ v: false, t: "로그인 전" }, { v: true, t: "로그인 후 (예시)" }].map((tab) => (
                    <button
                        key={tab.t}
                        type="button"
                        role="tab"
                        aria-selected={member === tab.v}
                        onClick={() => { setMember(tab.v); setClaimed(false); }}
                        className="rounded-full px-3 py-1.5"
                        style={member === tab.v ? { background: "#ea4c7c", color: "#fff" } : { color: TEXT_SOFT }}
                    >
                        {tab.t}
                    </button>
                ))}
            </div>

            {/* ── 1) 인사 카드 — 분홍 파스텔 ── */}
            <section
                className="ddb-rise relative overflow-hidden rounded-[1.9rem] px-5 pb-5 pt-5"
                style={{
                    background: "linear-gradient(165deg, #fff4ec 0%, #ffe6ee 55%, #ffd8e6 100%)",
                    boxShadow: "0 18px 32px -22px rgba(200,80,120,0.55), inset 0 0 0 1.5px rgba(255,255,255,0.8)",
                }}
                aria-label="댕다방 환영 인사"
            >
                {/* 장식 — 반짝이·하트·발바닥·움직임 선 */}
                <Sparkle className="ah-twinkle h-4 w-4 bg-[#ffd25a]" style={{ right: "34%", top: "12%" }} />
                <Sparkle className="ah-twinkle h-2.5 w-2.5 bg-white" style={{ right: "8%", top: "10%", ["--td" as string]: "1.4s" }} />
                <Sparkle className="h-2.5 w-2.5 bg-[#ffd25a]" style={{ left: "52%", top: "58%" }} />
                <i aria-hidden="true" className="fa-solid fa-heart absolute text-[15px] text-[#ff7fa2]" style={{ right: "36%", top: "40%", rotate: "-14deg" }} />
                <i aria-hidden="true" className="fa-solid fa-paw absolute text-[13px] text-[#ffb3c8]" style={{ right: "6%", top: "30%", rotate: "18deg" }} />
                <span aria-hidden="true" className="absolute left-4 top-3 flex gap-1" style={{ rotate: "-28deg" }}>
                    {[0, 1, 2].map((i) => <span key={i} className="block h-3 w-[3px] rounded-full bg-[#ff7fa2]" style={{ rotate: `${(i - 1) * 18}deg` }} />)}
                </span>

                {member ? (
                    <MemberGreeting titleFont={titleFont} claimed={claimed} streak={streak} days={days} onClaim={() => setClaimed(true)} />
                ) : (
                <>
                <div className="relative flex min-h-[7.4rem] items-center">
                    {/* 구름 속 제목 + 인사 */}
                    <div className="relative z-[1] w-[62%]">
                        <div className="relative px-3 pb-3 pt-4">
                            <Cloud className="inset-0 h-full w-full drop-shadow-[0_6px_10px_rgba(220,110,150,0.18)]" />
                            <h1 className={`${titleFont} relative text-center text-[2.05rem] leading-none`} aria-label="어서 와요!">
                                {/* 로고 "댕다방"처럼 글자마다 청록 · 빨강 · 주황 */}
                                {Array.from("어서 와요!").map((ch, i) => (
                                    <span key={i} aria-hidden="true" style={{ color: LOGO_INKS[i % LOGO_INKS.length] }}>{ch === " " ? "\u00a0" : ch}</span>
                                ))}
                            </h1>
                        </div>
                        <p className="ah-display mt-2.5 pl-1 text-[15px] leading-tight" style={{ color: TEXT }}>
                            댕다방에 오신 걸 환영해요
                        </p>
                        <p className="ah-light mt-1 pl-1 text-[12.5px] leading-tight" style={{ color: TEXT_SOFT }}>
                            로그인하고 우리 아이와 함께해요
                        </p>
                    </div>
                    {/* 검정 푸들 — 가끔 눈 깜빡 */}
                    <span className="absolute -right-1 bottom-[-0.4rem] block h-[8.2rem] w-[8.2rem]">
                        <span aria-hidden="true" className="absolute bottom-[21%] left-1/2 h-3.5 w-[66%] -translate-x-1/2 rounded-[50%] bg-[#e98fab]/40 blur-[3px]" />
                        <Image src="/images/logo-black-poodle-v2.png" alt="댕다방 검정 푸들" fill sizes="132px" priority className="object-contain" />
                        <span aria-hidden="true" className={`ah-lid ${blink ? "is-shut" : ""}`} style={{ left: "35.1%", top: "45.6%" }} />
                        <span aria-hidden="true" className={`ah-lid ${blink ? "is-shut" : ""}`} style={{ left: "57.5%", top: "43.6%" }} />
                    </span>
                </div>

                {/* 말랑한 로그인 버튼 — 링크 글자색은 인라인 style(전역 a{color:inherit} 때문) */}
                <Link
                    href={LOGIN_HREF}
                    className={`${titleFont} ah-btn relative mt-4 flex h-[3.25rem] items-center justify-center gap-2 overflow-hidden rounded-full text-[18px]`}
                    style={{ color: "#fff" }}
                >
                    <span aria-hidden="true" className="absolute inset-x-6 top-1 h-[34%] rounded-full bg-white/20" />
                    <span aria-hidden="true" className="ah-shine" />
                    <span className="relative">로그인</span>
                    <i aria-hidden="true" className="fa-solid fa-paw relative text-[14px] text-white/90" />
                </Link>
                </>
                )}
            </section>

            {/* ── 2) 댕다방 즐기기 — 카드 그림 ── */}
            <section className="ddb-rise mt-6" style={{ ["--d" as string]: "120ms" }} aria-label="댕다방 즐기기">
                <h2 className={`${titleFont} ah-heading flex items-center gap-1.5 text-[1.35rem] leading-none`}>
                    댕다방 즐기기
                    <i aria-hidden="true" className="fa-solid fa-paw text-[14px] text-[#ff8fae]" />
                </h2>
                {/* 세 장을 한 줄에 — 옆으로 넘기지 않고 한눈에 */}
                <div className="mt-3.5 grid grid-cols-3 gap-2.5">
                    {COVERS.map((c) => (
                        <Link key={c.title} href={c.href} aria-label={`${c.title} — ${c.desc}`} className="ah-press relative block" style={{ color: TEXT }}>
                            {/* 로그인 후 — 카드 위 작은 소식 배지(연속 출근 · 최근 분석) */}
                            {member && c.href === "/treasure-mine/" && (
                                <span className={`${titleFont} ah-badge absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] text-white`} style={{ background: "linear-gradient(180deg, #ff9a3c, #f2701f)" }}>
                                    <i aria-hidden="true" className="fa-solid fa-fire text-[9px]" />
                                    {streak}일 연속
                                </span>
                            )}
                            {member && c.href === "/pet-lens/" && (
                                <span className={`${titleFont} ah-badge absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] text-white`} style={{ background: "linear-gradient(180deg, #f5be4a, #e0951c)" }}>
                                    <i aria-hidden="true" className="fa-solid fa-clock-rotate-left text-[9px]" />
                                    {SAMPLE.lastAnalyzedDaysAgo}일 전 분석
                                </span>
                            )}
                            {/* 세 장 비율(0.51~0.53)을 0.52 로 맞추고, 모서리는 그림 속 둥글기(가로의 약 9.5%)에 맞춘다 */}
                            {/* container-type: 안쪽 글자 크기를 카드 폭 비율(cqw)로 — 화면 폭이 달라도 그림과 같은 비율 */}
                            <span className="relative block aspect-[51/100] w-full overflow-hidden rounded-[9.5%/4.9%] shadow-[0_14px_24px_-16px_rgba(60,40,30,0.6)] [container-type:inline-size]">
                                <Image src={c.img} alt="" fill sizes="(max-width: 448px) 33vw, 150px" loading="eager" className="object-cover" />
                                {/* 구름 속 제목 — 측정한 구름 가운데에 정확히 */}
                                <span
                                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
                                    style={{ left: `${c.cloud.x}%`, top: `${c.cloud.y}%` }}
                                >
                                    {c.heads.map((h) => (
                                        <span key={h.t} className={`${titleFont} ah-card-title block whitespace-nowrap`} style={{ color: h.c, fontSize: `${c.cloud.size}cqw` }}>
                                            {h.t}
                                        </span>
                                    ))}
                                </span>
                                {/* 아래 판 설명 — 판은 카드 높이 약 78%부터 */}
                                <span className="absolute inset-x-[4%] bottom-0 flex h-[20%] flex-col items-center justify-center text-center">
                                    <i aria-hidden="true" className="fa-solid fa-paw" style={{ color: c.paw, fontSize: "7.5cqw" }} />
                                    <span className="ah-card-desc mt-[2cqw] block whitespace-nowrap">
                                        {c.lines[0]}
                                        <br />
                                        {c.lines[1]}
                                    </span>
                                </span>
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ── 3) 자주 찾는 메뉴 — 같은 모양 파스텔 타일 ── */}
            <section className="ddb-rise mt-6" style={{ ["--d" as string]: "240ms" }} aria-label="자주 찾는 메뉴">
                <h2 className={`${titleFont} ah-heading flex items-center gap-1.5 text-[1.35rem] leading-none`}>
                    자주 찾는 메뉴
                    <span aria-hidden="true" className="ah-sparkle relative inline-block h-3 w-3 bg-[#ffcf4a]" />
                </h2>
                <div className="mt-3.5 grid grid-cols-4 gap-2.5">
                    {QUICK.map((q) => (
                        <Link
                            key={q.label}
                            href={q.href}
                            className="ah-press relative flex flex-col items-center gap-2 overflow-hidden rounded-[1.35rem] pb-3 pt-3.5"
                            style={{ background: q.bg, color: q.ink, boxShadow: "0 12px 20px -16px rgba(60,40,30,0.55), inset 0 0 0 1.5px rgba(255,255,255,0.75)" }}
                        >
                            <Sparkle className="h-2 w-2 bg-white" style={{ right: "14%", top: "12%" }} />
                            {/* 흰 동그라미 + 그라데이션 아이콘 */}
                            <span className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_4px_10px_-4px_rgba(60,40,30,0.25)]">
                                <i aria-hidden="true" className={`fa-solid ${q.icon} ah-grad-icon text-[19px]`} style={{ backgroundImage: q.ic }} />
                            </span>
                            <span className={`${titleFont} text-[12.5px] leading-none`} style={{ color: q.ink }}>{q.label}</span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}

/*
 * 배경: 밝은 = 깔끔한 크림 + 은은한 파스텔 빛(줄노트 없음), 다크(사이트 기준 안드로이드 다크) = 깔끔한 어두운 바탕.
 * 카드 바깥 제목만 다크에서 밝게 — 카드·타일 안은 밝은 파스텔이라 그대로.
 */
const CSS = `
/* 밝은 바탕 — 깔끔한 크림 + 카드 그림 팔레트의 아주 은은한 빛(위 분홍 · 가운데 하늘 · 아래 버터) */
.ah-bg { background:
  radial-gradient(70% 40% at 0% 0%, rgba(255,214,228,0.55) 0%, rgba(255,214,228,0) 70%),
  radial-gradient(60% 35% at 100% 45%, rgba(214,236,255,0.6) 0%, rgba(214,236,255,0) 70%),
  radial-gradient(70% 35% at 10% 100%, rgba(255,240,196,0.55) 0%, rgba(255,240,196,0) 70%),
  #fffaf5; }
.ah-heading { color: ${TEXT}; }
/* 사이트 폰트 — 제목: 개구체(로고·가격과 같은 크레파스 손글씨), 본문: 원티드 산스 */
/* 카페24 써라운드 — 큰 글씨(굵게) · 써라운드 에어 — 작은 글씨(얇게). 시안은 CDN(실서비스는 public/fonts 직접 서빙) */
@font-face { font-family: "Cafe24Ssurround"; src: url("https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/Cafe24Ssurround.woff") format("woff"); font-display: swap; }
@font-face { font-family: "Cafe24SsurroundAir"; src: url("https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/Cafe24SsurroundAir.woff") format("woff"); font-display: swap; }
.ah-display { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; letter-spacing: -0.02em; }
.ah-light { font-family: "Cafe24SsurroundAir", "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; letter-spacing: -0.01em; }
.ah-body { font-family: var(--font-wanted-sans), "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
html[data-ddb-android-dark="true"] .ah-bg { background: linear-gradient(180deg, #17161a 0%, #1c1a1f 100%); }
html[data-ddb-android-dark="true"] .ah-heading { color: #f3ebe4; }

/* 카드 구름 속 제목 — 카드 폭(약 108~145px)에 맞춰 크기, 테두리처럼 흰 그림자로 또렷하게 */
.ah-card-title { line-height: 1.08; letter-spacing: -0.03em; }
/* 카드 아래 판 설명 — 개구체, 카드 폭 비율로 크기·자간을 맞춰 판 안에 여유 있게 */
.ah-card-desc { font-family: "Cafe24SsurroundAir", "Cafe24Ssurround", sans-serif; font-weight: 400; font-size: 9.4cqw; line-height: 1.3; letter-spacing: -0.03em; color: #4f413c; }

/* 로그인 후 — 출근도장 쾅(찍는 순간 크게 눌렸다 제자리) · 카드 소식 배지 */
@keyframes ah-stamp { 0% { transform: scale(1.9) rotate(-18deg); opacity: 0; } 55% { transform: scale(.88) rotate(4deg); opacity: 1; } 100% { transform: none; opacity: 1; } }
.ah-stamp { animation: ah-stamp .45s cubic-bezier(.3,1.3,.5,1) both; }
.ah-badge { box-shadow: 0 4px 10px -4px rgba(200,90,30,.6), inset 0 0 0 1.5px rgba(255,255,255,.6); }

/* 반짝이 — 네 갈래 별 */
.ah-sparkle { clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); }
@keyframes ah-twinkle { 0%, 82%, 100% { transform: scale(1) rotate(0); opacity: 1; } 91% { transform: scale(.55) rotate(30deg); opacity: .6; } }
.ah-twinkle { animation: ah-twinkle 4.5s ease-in-out var(--td, 0s) infinite; }

/* 그라데이션 아이콘 — 글자 모양으로 배경을 잘라 칠한다 */
.ah-grad-icon { -webkit-background-clip: text; background-clip: text; color: transparent; }

/* 말랑한 로그인 버튼 — 분홍 그라데이션 + 아랫면 두께 + 윗쪽 광택, 누르면 쑥 */
.ah-btn { background: linear-gradient(180deg, #ff8eab 0%, #f0577f 100%); box-shadow: 0 5px 0 #d8416b, 0 14px 22px -12px rgba(220,60,110,0.75); transition: transform .12s ease, box-shadow .12s ease; }
.ah-btn:active { transform: translateY(4px); box-shadow: 0 1px 0 #d8416b, 0 6px 12px -8px rgba(220,60,110,0.7); }
@keyframes ah-shine { 0%, 70% { transform: translateX(-140%) skewX(-20deg); } 100% { transform: translateX(460%) skewX(-20deg); } }
.ah-shine { position: absolute; inset: -20% auto -20% 0; width: 22%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent); animation: ah-shine 5s ease-in-out 1.4s infinite; pointer-events: none; }

/* 푸들 눈꺼풀 */
.ah-lid { position: absolute; width: 8.8%; height: 9.4%; border-radius: 50% 50% 46% 46%; background: radial-gradient(ellipse at 50% 30%, #2a2a33 0%, #141419 70%); transform: scaleY(0); transform-origin: 50% 0; transition: transform .07s ease-in; pointer-events: none; }
.ah-lid.is-shut { transform: scaleY(1); }

.ah-press { -webkit-tap-highlight-color: transparent; transition: transform .15s ease; }
.ah-press:active { transform: scale(.97); }
@media (prefers-reduced-motion: reduce) { .ah-twinkle, .ah-shine { animation: none; } .ah-shine { display: none; } }
`;
