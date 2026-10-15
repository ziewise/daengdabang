"use client";

/**
 * 앱 홈 새 시안 1 — "스티커북"(다꾸 속지) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 원래 시안 3의 재료 그대로(구름 제목 · 우리 아이/검정 푸들 · 카드 그림 3장 · 출근 스티커 · 말랑한 버튼 · 파스텔).
 * 달라진 점 — 홈 한 장이 다이어리 속지다(요즘 20~30대의 '다꾸' 감성).
 *  - 점 모눈 종이 · 왼쪽 링 구멍 · 마스킹테이프 날짜 · 폴라로이드로 붙인 우리 아이 · 동그란 날씨 스티커.
 *  - 오늘의 출근 스티커를 손가락으로 떼어(들리며 기울어짐) 오늘 칸에 끌어다 붙인다.
 *    가까이 가면 자석처럼 빨려 들어가 쾅 → 코인이 코인 칩으로. 그냥 톡 눌러도 날아가 붙는다.
 *  - 붙이고 나면 같은 자리에 손글씨 체크리스트(오늘 할 일)가 생기고, 체크 표시가 펜으로 그려진다.
 *  - 카드 그림 3장은 테이프로 붙인 스티커처럼 살짝 비뚤게, 위에는 포스트잇 소식(연속 출근 · 새 응원 · 코인).
 *    누르면 스티커가 들렸다 붙는다.
 *  - 처음 들어오면 테이프 · 사진 · 스티커가 하나씩 손으로 놓이듯 내려앉는다.
 *  - 로그인 전: 출근 칸 · 스티커 떼기 체험은 없고, 그 자리에 편지지 같은 '로그인 초대 카드'(할 수 있는 것 펜 체크 + 로그인하고 출근하기).
 *  - 모바일 손가락 동작(hover 없음): 스티커를 집으면 모서리가 들리고 진동 · 출근 칸을 옆으로 밀면 속지가 넘어가 지난주 기록 ·
 *    카드 스티커는 누르면 테이프째 들리고, 톡 = 화면 가득 커지며 이동, 꾹 = 그 자리에서 미리보기.
 * 데이터: 로그인 후는 예시(SAMPLE), 날씨는 실제. 누르는 동작은 화면 안에서만 바뀐다(서버 요청 없음).
 */

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Peek, haptic, useExpandNav, usePressable } from "./gestures";
import { LoginInvite, PostIt, STICKER_CSS, Tape } from "./sticker-kit";
import { COVERS, CoinChip, CoverArt, CoverWindow, KIT_CSS, TEXT, TEXT_SOFT, TriTitle, recentDays, type Cover } from "./kit";
import SectionNow from "./SectionNow";
import { coverHref } from "./page-data";
import { ConceptBar, HC_CSS, SAMPLE, WEATHER_KO, WEEK, flyCoin, greeting, todayIndex, untilTomorrow, useDemoSession, useLiveWeather, useNow, useTodayDemo, walkAdvice } from "./shared";

const toneBg = (c: Cover) => `linear-gradient(180deg, ${c.tone.from} 0%, ${c.tone.to} 100%)`;
const NOTE_COLORS = ["#fff3a6", "#ffd6e2", "#d9ecff"];
const TAPE_COLORS = ["rgba(190,224,255,.85)", "rgba(255,200,218,.85)", "rgba(255,232,170,.9)"];
// 지난주 출근 예시(회원) — 실제로는 출근 기록(recentDays)에서
const LAST_WEEK = [true, true, false, true, true, true, true];

/** 테이프로 붙인 카드 스티커 — 누르면 테이프째 들림 · 톡 = 이동 · 꾹 = 미리보기 */
function StickerCard({ cover, i, note, onTap, onLongPress }: { cover: Cover; i: number; note: string; onTap: (el: HTMLElement) => void; onLongPress: (el: HTMLElement) => void }) {
    const rot = [-3, 2, -2][i];
    const { pressed, handlers } = usePressable({ onTap, onLongPress });
    return (
        <div role="link" tabIndex={0} aria-label={`${cover.title} — ${note} (꾹 누르면 미리보기)`} {...handlers}
            className={`st-place st-card relative block select-none ${pressed ? "is-pressed" : ""}`} style={{ ["--r" as string]: `${rot}deg`, ["--d" as string]: `${540 + i * 90}ms`, rotate: `${rot}deg` }}>
            <Tape className="st-card-tape -top-2.5 left-1/2 z-10 h-4 w-14 -translate-x-1/2" color={TAPE_COLORS[i]} style={{ rotate: `${-rot * 2}deg` }} />
            <span className="st-diecut-card block rounded-[11%/5.6%] bg-white p-[4px]">
                <CoverArt cover={cover} sizes="33vw" className="rounded-[9.5%/4.9%]" />
            </span>
            <PostIt color={NOTE_COLORS[i]} rot={i === 1 ? 5 : -5} className="-bottom-5 left-1/2 max-w-[94%] -translate-x-1/2 whitespace-nowrap">{note}</PostIt>
        </div>
    );
}

export default function HomeSticker() {
    const [session, setSession] = useDemoSession();
    const member = session === "member";
    const today = useTodayDemo(session);
    const w = useLiveWeather();
    const now = useNow();
    const wd = todayIndex(now ?? undefined);
    const coinRef = useRef<HTMLSpanElement>(null);
    const slotRef = useRef<HTMLSpanElement>(null);
    const stickerRef = useRef<HTMLButtonElement>(null);
    const peekStampRef = useRef<HTMLButtonElement>(null);
    const { go, overlay } = useExpandNav();
    const [peek, setPeek] = useState<{ cover: Cover; rect: DOMRect } | null>(null);
    const days = now ? recentDays() : Array.from({ length: 7 }, () => "");
    const past = member ? [false, true, true, true, true, true] : Array(6).fill(false);

    /* ── 출근 칸 속지 넘기기: 0 = 이번 주, 1 = 지난주 (옆으로 밀기) ── */
    const [weekPage, setWeekPage] = useState<0 | 1>(0);
    const [flip, setFlip] = useState<null | "out" | "in">(null);
    const swipeX = useRef<number | null>(null);
    const turnTo = (page: 0 | 1) => {
        if (page === weekPage || flip) return;
        haptic("light");
        setFlip("out");
        window.setTimeout(() => {
            setWeekPage(page);
            setFlip("in");
            window.setTimeout(() => setFlip(null), 320);
        }, 220);
    };

    /* ── 스티커 떼어 붙이기 ── */
    const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    const [lifted, setLifted] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0, r: 0 });
    // 오늘 칸까지 거리
    const slotDelta = () => {
        const s = slotRef.current?.getBoundingClientRect();
        const k = stickerRef.current?.getBoundingClientRect();
        if (!s || !k) return null;
        return { dx: s.left + s.width / 2 - (k.left + k.width / 2) + offset.x, dy: s.top + s.height / 2 - (k.top + k.height / 2) + offset.y };
    };
    // 오늘 칸으로 빨려 들어가 붙음
    const stickToSlot = () => {
        const d = slotDelta();
        const el = stickerRef.current;
        if (d && el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const anim = el.animate(
                [{ transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.r}deg) scale(1.15)` }, { transform: `translate(${d.dx}px, ${d.dy}px) rotate(0deg) scale(.5)` }],
                { duration: 380, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" },
            );
            anim.onfinish = () => finishStick();
        } else finishStick();
    };
    const finishStick = () => {
        today.stamp();
        haptic("medium");
        setLifted(false);
        setOffset({ x: 0, y: 0, r: 0 });
        if (member) window.setTimeout(() => flyCoin(slotRef.current, coinRef.current, 2), 280);
    };
    const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (today.stamped) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, moved: false };
        setLifted(true);
        haptic("light");
        // 지난주를 보고 있었으면 붙일 자리가 보이게 이번 주로 넘김
        if (weekPage === 1) turnTo(0);
    };
    const onMoveDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
        const d = drag.current;
        if (!d) return;
        const x = e.clientX - d.x;
        const y = e.clientY - d.y;
        if (Math.abs(x) + Math.abs(y) > 6) d.moved = true;
        setOffset({ x, y, r: Math.max(-14, Math.min(14, x / 8)) });
    };
    const onUp = () => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        const near = slotDelta();
        // 톡 누름이거나 오늘 칸 가까이(80px) 놓으면 붙고, 아니면 제자리로
        if (!d.moved || (near && Math.hypot(near.dx - offset.x, near.dy - offset.y) < 80)) stickToSlot();
        else {
            setLifted(false);
            setOffset({ x: 0, y: 0, r: 0 });
        }
    };

    const date = now ? `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEK[wd].ko}요일` : "";
    // 카드 스티커 위 포스트잇
    const notes = member
        ? [`${today.streak}일 연속!`, `새 응원 ${SAMPLE.newBones}개!`, `${today.coins}C · 분석 ${Math.floor(today.coins / SAMPLE.analysisCoinCost)}회`]
        : ["매일 출근 스티커", "누구나 구경 OK", "예시 결과 보기"];

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + HOME_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <ConceptBar session={session} onSession={setSession} />

                {/* ── 다이어리 속지 ── */}
                <article className="st-page ah-sq relative rounded-[1.6rem] pb-5 pl-9 pr-4 pt-7">
                    {/* 왼쪽 링 구멍 */}
                    <span aria-hidden="true" className="absolute bottom-6 left-2.5 top-6 flex flex-col justify-between">
                        {Array.from({ length: 9 }, (_, i) => <span key={i} className="block h-3 w-3 rounded-full bg-[#f3e6dc] shadow-[inset_0_1px_2px_rgba(120,80,60,.35)]" />)}
                    </span>

                    {/* 마스킹테이프 날짜 */}
                    <span className="st-place ah-light absolute -top-2 left-1/2 block -translate-x-1/2 px-5 py-1.5 text-[12.5px]" style={{ ["--r" as string]: "-2deg", ["--d" as string]: "60ms", rotate: "-2deg" }}>
                        <Tape className="inset-0" color="repeating-linear-gradient(90deg, rgba(255,200,215,.85) 0 8px, rgba(255,226,234,.85) 8px 16px)" />
                        <span className="relative">{date}</span>
                    </span>

                    {/* 인사 + 폴라로이드 */}
                    <div className="relative flex min-h-[8.2rem] items-start">
                        <div className="relative z-[1] w-[60%] pt-2">
                            <span className="st-place block" style={{ ["--r" as string]: "-1deg", ["--d" as string]: "140ms" }}>
                                <TriTitle text={member ? `${SAMPLE.pet.name}야, 안녕!` : "어서 와요!"} className="text-[1.6rem]" />
                            </span>
                            <p className="ah-display mt-2 whitespace-nowrap text-[14px]">{member ? `${SAMPLE.guardian}님, ${greeting(w.bucket)}` : "댕다방에 오신 걸 환영해요"}</p>
                            <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>{walkAdvice(w)}</p>
                        </div>
                        {/* 폴라로이드: 우리 아이(회원) / 검정 푸들(비회원) */}
                        <span className="st-place st-polaroid absolute right-0 top-0 block w-[7.4rem] bg-white p-1.5 pb-6" style={{ ["--r" as string]: "5deg", ["--d" as string]: "220ms", rotate: "5deg" }}>
                            <Tape className="-top-2 left-1/2 h-4 w-12 -translate-x-1/2" color="rgba(200,226,255,.85)" style={{ rotate: "-6deg" }} />
                            <span className="relative block aspect-square overflow-hidden bg-[#fff3e8]">
                                <Image src={member ? "/images/pet-companion/cute-v4-breeds/toy-poodle-poster.webp" : "/images/logo-black-poodle-v2.png"} alt={member ? `${SAMPLE.pet.name} 사진` : "댕다방 검정 푸들"} fill sizes="120px" className="object-cover" />
                            </span>
                            <span className="ah-display absolute inset-x-0 bottom-1 text-center text-[13px]" style={{ color: "#ea4c7c" }}>{member ? SAMPLE.pet.name : "댕다방"}</span>
                        </span>
                        {/* 동그란 날씨 스티커 */}
                        <span className="st-place st-diecut ah-display absolute -right-1.5 top-[7rem] z-[2] grid h-[3.3rem] w-[3.3rem] place-items-center rounded-full text-center text-[11px] leading-[1.05]"
                            style={{ ["--r" as string]: "-8deg", ["--d" as string]: "300ms", rotate: "-8deg", background: "linear-gradient(160deg,#fff6c9,#ffe08a)", color: "#8f5e12" }}>
                            <span>{WEATHER_KO[w.weather]}<br />{w.temp === null ? "" : w.temp}<span className="ah-deg">°</span></span>
                        </span>
                    </div>

                    {/* ── 출근 스티커 칸 — 옆으로 밀면 속지가 넘어가 지난주 (회원만) ── */}
                    {member ? (
                    <section className="st-place mt-3 touch-pan-y select-none" style={{ ["--r" as string]: "0deg", ["--d" as string]: "380ms" }} aria-label="출근 스티커"
                        onPointerDown={(e) => { swipeX.current = e.clientX; }}
                        onPointerUp={(e) => {
                            if (swipeX.current === null) return;
                            const dx = e.clientX - swipeX.current;
                            swipeX.current = null;
                            if (dx > 50) turnTo(1);
                            else if (dx < -50) turnTo(0);
                        }}
                        onPointerCancel={() => { swipeX.current = null; }}>
                        <div className="flex items-center justify-between">
                            <span className="ah-display st-marker text-[15px]">
                                {weekPage === 0 ? "이번 주 출근 스티커" : `지난주 출근 스티커${member ? ` · ${LAST_WEEK.filter(Boolean).length}/7` : ""}`}
                            </span>
                            {member ? <CoinChip ref={coinRef} coins={today.coins} /> : null}
                        </div>
                        <div className={`st-week ${flip === "out" ? "is-out" : flip === "in" ? "is-in" : ""}`}>
                            <ol className={`mt-2.5 grid grid-cols-7 gap-1 ${today.stamped && weekPage === 0 ? "hc-thud" : ""}`}>
                                {WEEK.map((d, i) => {
                                    const isToday = weekPage === 0 && i === wd;
                                    const on = weekPage === 0 ? (member && i < wd) || (isToday && today.stamped) : member && LAST_WEEK[i];
                                    return (
                                        <li key={d.ko} className="flex flex-col items-center gap-1">
                                            <span ref={isToday ? slotRef : undefined} className={`relative grid aspect-square w-full place-items-center rounded-full ${on ? "" : "st-slot"} ${isToday && !on ? "is-today" : ""}`}>
                                                {on ? <Image src={d.img} alt="" width={44} height={44} className={`st-stuck h-full w-full object-contain ${isToday ? "hc-slam" : ""}`} style={{ ["--rot" as string]: `${((i * 37) % 13) - 6}deg` }} /> : null}
                                            </span>
                                            <span className={`ah-display text-[12px] ${isToday ? "text-[#ea4c7c]" : "text-[#b7a9a1]"}`}>{d.ko}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                            {weekPage === 1 && !member ? <p className="ah-light mt-1.5 text-center text-[12px]" style={{ color: TEXT_SOFT }}>로그인하면 지난 스티커가 모두 남아요</p> : null}
                        </div>
                        {/* 속지 표시 · 밀기 안내 */}
                        <div className="mt-2 flex items-center justify-center gap-1.5">
                            {([1, 0] as const).map((pg) => (
                                <button key={pg} type="button" onClick={() => turnTo(pg)} aria-label={pg === 0 ? "이번 주 보기" : "지난주 보기"}
                                    className="h-1.5 rounded-full transition-all duration-300" style={{ width: weekPage === pg ? 18 : 6, background: weekPage === pg ? "#f48fac" : "#ecd8cf" }} />
                            ))}
                            <span className="ah-light ml-1 text-[11px]" style={{ color: "#b7a9a1" }}>{weekPage === 0 ? "→ 밀면 지난주" : "← 밀면 이번 주"}</span>
                        </div>
                    </section>
                    ) : null}

                    {/* ── 오늘의 스티커 받침(떼어 붙이기) → 붙인 뒤엔 손글씨 체크리스트 ── */}
                    {!member ? (
                        <LoginInvite />
                    ) : !today.stamped ? (
                        <div className="st-place st-sheet relative mt-4 flex items-center gap-3 rounded-[1.1rem] px-3 py-2.5" style={{ ["--r" as string]: "0deg", ["--d" as string]: "460ms" }}>
                            <button ref={stickerRef} type="button" aria-label="오늘 출근 스티커 붙이기" onPointerDown={onDown} onPointerMove={onMoveDrag} onPointerUp={onUp} onPointerCancel={onUp}
                                className={`st-peel relative h-[4.4rem] w-[4.4rem] shrink-0 touch-none ${lifted ? "is-lifted" : ""}`}
                                style={{ transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.r}deg)` }}>
                                <Image src={WEEK[wd].img} alt="" fill sizes="72px" className="st-diecut-img object-contain" draggable={false} />
                            </button>
                            <span className="min-w-0 flex-1">
                                <span className="ah-display block text-[14px]">오늘의 {WEEK[wd].ko}요일 스티커</span>
                                <span className="ah-light block text-[12px]" style={{ color: TEXT_SOFT }}>
                                    떼어서 오늘 칸에 붙여요 · +{SAMPLE.dailyRewardCoins}코인
                                </span>
                            </span>
                            <i aria-hidden="true" className="fa-solid fa-hand-pointer st-hint text-[16px] text-[#f4a9bd]" />
                        </div>
                    ) : (
                        <ul className="mt-4 space-y-1">
                            {SAMPLE.tasks.map((t, i) => {
                                const on = today.done[t.taskId];
                                return (
                                    <li key={t.taskId} className="hc-in" style={{ ["--d" as string]: `${i * 90}ms` }}>
                                        <button type="button" disabled={on} onClick={() => { today.complete(t.taskId); haptic("light"); }} className="flex w-full items-center gap-2.5 py-1.5 text-left">
                                            {/* 펜으로 그린 네모 + 체크 */}
                                            <svg viewBox="0 0 28 28" className="h-7 w-7 shrink-0" aria-hidden="true">
                                                <path d="M5 6 Q4 4 7 4 L22 5 Q24 5 24 8 L23 22 Q23 24 20 24 L6 23 Q4 23 4 20 Z" fill="none" stroke="#c9b4a8" strokeWidth="1.6" strokeLinejoin="round" />
                                                {on ? <path d="M7 14 L12 19 L23 6" fill="none" stroke="#ea4c7c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="st-check" /> : null}
                                            </svg>
                                            <span className={`ah-display flex-1 text-[15px] ${on ? "st-strike" : ""}`}>{t.title}</span>
                                            <span className="ah-light text-[12px]" style={{ color: TEXT_SOFT }}>+{t.xp}XP</span>
                                        </button>
                                    </li>
                                );
                            })}
                            {today.allDone ? <li className="ah-display hc-pop pt-1 text-[13px] text-[#ea4c7c]">오늘 완료! 내일 새 스티커까지 {untilTomorrow(now)}</li> : null}
                        </ul>
                    )}

                    {/* ── 댕다방 즐기기: 테이프로 붙인 카드 스티커 ── */}
                    <div className="mt-6 flex items-center gap-2">
                        <span className="ah-display st-marker text-[15px]">댕다방 즐기기</span>
                        <span className="h-px flex-1 border-t-2 border-dashed border-[#f0d9cf]" />
                        <i aria-hidden="true" className="fa-solid fa-paw text-[12px] text-[#ff8fae]" />
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                        {COVERS.map((c, i) => (
                            <StickerCard key={c.key} cover={c} i={i} note={notes[i]}
                                onTap={(el) => go(el, coverHref("sticker", c.key), toneBg(c), <CoverWindow cover={c} className="opacity-90" />)}
                                onLongPress={(el) => setPeek({ cover: c, rect: el.getBoundingClientRect() })} />
                        ))}
                    </div>

                    {/* 바로 가기 스티커 두 장 — 케어톡(라벤더) · 동네 돌봄 찾기(민트 접힌 지도, 전용 화면 /app/sticker/care)
                        그림 스티커가 카드 위로 튀어나오고, 카드 · 그림을 한 장으로 둘러싼 흰 칼선(다이컷) */}
                    <div className="mb-2 mt-[4.5rem] grid grid-cols-2 gap-3">
                        <Link href="/chat/" className="hm-short st-place relative block" style={{ ["--r" as string]: "-2deg", ["--d" as string]: "820ms", rotate: "-2deg" }}>
                            <span className="hm-card relative flex h-full flex-col rounded-[20px] px-3.5 pb-3 pt-9" style={{ background: "#ece4ff", color: "#563fa8" }}>
                                <span className="ah-display text-[14.5px]">케어톡에 물어보기</span>
                                <span className="ah-light mt-0.5 text-[11.5px] leading-snug opacity-80">{member ? `${SAMPLE.pet.name} 산책 몇 분이 좋을까?` : "무엇이든 편하게 물어보세요"}</span>
                                <span className="hm-go mt-2 grid h-7 w-7 place-items-center self-end rounded-full bg-white/85 text-[10px] text-[#7457d8]"><i aria-hidden="true" className="fa-solid fa-chevron-right" /></span>
                            </span>
                            <Image src="/images/ui/stickers/home-caretalk.webp" alt="" width={140} height={140} className="hm-icon absolute -top-9 left-1.5 h-[4.4rem] w-[4.4rem]" style={{ ["--ir" as string]: "-8deg" }} />
                        </Link>
                        <Link href="/app/sticker/care/" className="hm-short st-place relative block" style={{ ["--r" as string]: "2deg", ["--d" as string]: "900ms", rotate: "2deg" }}>
                            <span className="hm-card hm-fold relative flex h-full flex-col rounded-[20px] px-3.5 pb-3 pt-9" style={{ background: "#d9f2e4", color: "#1f7a59" }}>
                                <span className="ah-display text-[14.5px]">동네 돌봄 찾기</span>
                                <span className="ah-light mt-0.5 text-[11.5px] leading-snug opacity-80">근처 병원 · 미용<br />호텔 · 데이케어</span>
                                {/* 지도 위 발자국 점선 */}
                                <svg aria-hidden="true" viewBox="0 0 60 22" className="absolute bottom-3 left-3.5 h-[22px] w-[60px]"><path d="M2 18 C 16 4, 30 22, 46 8" fill="none" stroke="#7cc9a2" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" /><circle cx="52" cy="6" r="3.2" fill="#3fb381" /></svg>
                                <span className="hm-go mt-2 grid h-7 w-7 place-items-center self-end rounded-full bg-white/85 text-[10px] text-[#1f9e75]"><i aria-hidden="true" className="fa-solid fa-chevron-right" /></span>
                            </span>
                            <Image src="/images/ui/stickers/home-care.webp" alt="" width={140} height={140} className="hm-icon absolute -top-9 left-1.5 h-[4.4rem] w-[4.4rem]" style={{ ["--ir" as string]: "6deg" }} />
                        </Link>
                    </div>
                </article>
            </div>

            {/* 꾹 눌러 미리보기 */}
            {peek ? (
                <Peek from={peek.rect} bg={toneBg(peek.cover)} onClose={() => setPeek(null)}>
                    <div className="relative h-[150px] overflow-hidden"><CoverWindow cover={peek.cover} /></div>
                    <div className="pk-body px-4 pb-2 pt-4">
                        <SectionNow cover={peek.cover} member={member} today={today} days={days} past={past} now={now}
                            onStamp={() => { today.stamp(); haptic("medium"); if (member) flyCoin(peekStampRef.current, coinRef.current, 2); }}
                            stampRef={peekStampRef} signupRedirect="/app/home-1/" base="/app/sticker" />
                    </div>
                </Peek>
            ) : null}
            {/* 톡: 화면 가득 커지며 이동 */}
            {overlay}
        </div>
    );
}

/* 홈(스티커북) 바로 가기 스티커 CSS */
const HOME_CSS = `
/* 카드 · 그림을 한 장으로 둘러싼 흰 칼선 + 종이에 붙은 그림자 */
.hm-short { filter: drop-shadow(2.5px 0 0 #fff) drop-shadow(-2.5px 0 0 #fff) drop-shadow(0 2.5px 0 #fff) drop-shadow(0 -2.5px 0 #fff)
  drop-shadow(0 0 .6px rgba(170,120,115,.5)) drop-shadow(0 8px 7px rgba(90,60,50,.2));
  transition: transform .5s cubic-bezier(.3,1.7,.45,1); -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; }
/* 동네 돌봄: 오른쪽 아래 모서리가 접힌 지도 */
.hm-fold { clip-path: polygon(0 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%); }
.hm-fold::after { content: ""; position: absolute; right: 0; bottom: 0; width: 22px; height: 22px; border-radius: 0 0 0 6px;
  background: linear-gradient(135deg, #b6e3cb 50%, transparent 50%); }
.hm-fold .hm-go { margin-right: 14px; }
/* 그림 스티커: 살짝 기울어 카드 위로 튀어나옴 */
.hm-icon { rotate: var(--ir); transition: transform .45s cubic-bezier(.3,1.8,.5,1); }
/* 누르면 카드가 종이에서 들리고 그림은 한 번 더 통통 */
.hm-short:active { transform: translateY(-4px) scale(1.03); transition-duration: .12s; }
.hm-short:active .hm-icon { transform: scale(1.12) translateY(-3px); transition-duration: .12s; }
.hm-go { transition: transform .3s; }
.hm-short:active .hm-go { transform: translateX(3px); }
@media (prefers-reduced-motion: reduce) { .hm-short, .hm-icon { transition: none; } }
`;
