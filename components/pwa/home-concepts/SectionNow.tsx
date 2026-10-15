"use client";

/**
 * SectionNow — 카드 그림 한 장을 펼쳤을 때 보이는 그 섹션의 "지금" 화면 (홈 새 시안 공통, 로컬 시안 전용)
 * ---------------------------------------------------------------------
 *  - 매일 댕생활: 이번 주 출근도장(발바닥 줄) → 출근도장 찍기(+코인) → 오늘 할 일 2개(+XP) → 다 하면 내일까지 남은 시간
 *  - 댕자랑: 새 응원 수 · 오늘의 댕주제(D-day) · 응원 보러 가기
 *  - 댕다방 연구소: 이번 주 기록 · 행동·소리 분석 코인 · 이번 주 사진 남기기
 *  비회원은 같은 자리에 로그인 · 가입 안내(출근 체험은 없음). 그림체는 원래 시안 3(kit.tsx) 그대로.
 */

import { appLoginHref, appSignupHref } from "@/components/app-shell/appTabs";
import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { PawWeek, TEXT, TEXT_SOFT, type Cover } from "./kit";
import { SAMPLE, untilTomorrow, type useTodayDemo } from "./shared";
import { Patch } from "./sticker-kit";

type Today = ReturnType<typeof useTodayDemo>;

/** 흰 판 */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <div className={`ah-sq rounded-[1.2rem] bg-white/80 px-3.5 py-3 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.9)] ${className}`}>{children}</div>;
}

/** 맨 아래 "전체 보기" 링크 */
function MoreLink({ href, ink, children }: { href: string; ink: string; children: ReactNode }) {
    return (
        <Link href={href} className="ah-display mt-3 flex items-center justify-center gap-1 text-[13px]" style={{ color: ink }}>
            {children} <i aria-hidden="true" className="fa-solid fa-chevron-right text-[10px]" />
        </Link>
    );
}

export default function SectionNow({ cover, member, today, days, past, now, onStamp, stampRef, signupRedirect, base }: {
    cover: Cover; member: boolean; today: Today; days: string[]; past: boolean[]; now: Date | null;
    onStamp: () => void; stampRef?: Ref<HTMLButtonElement>; signupRedirect: string;
    base?: string; // 시안 화면 주소 앞부분(예: /app/sticker) — 있으면 그 시안의 화면으로 이동
}) {
    const c = cover;
    const hrefOf = base ? `${base}/${c.key}/` : c.href;
    if (c.key === "daily" && !member) {
        // 로그인 전: 출근 체험 없이 로그인 유도
        return (
            <>
                <Panel>
                    <p className="ah-display text-[17px]" style={{ color: TEXT }}>로그인하고 오늘부터 출근해요</p>
                    <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>하루 한 번 출근도장을 찍으면 {SAMPLE.dailyRewardCoins}코인, 오늘 할 일을 하면 XP가 쌓여요</p>
                </Panel>
                <Patch href={appLoginHref(signupRedirect)} className="mt-3"><span className="relative">로그인하고 출근하기</span><i aria-hidden="true" className="fa-solid fa-paw relative text-[14px] text-white/90" /></Patch>
                <Link href={appSignupHref(signupRedirect)} className="ah-display mt-3 block text-center text-[13px]" style={{ color: "#ea4c7c" }}>
                    처음이에요 · 가입하면 {SAMPLE.signupBonus}코인 선물
                </Link>
            </>
        );
    }
    if (c.key === "daily") {
        return (
            <>
                <Panel>
                    <div className="flex items-center justify-between">
                        <span className="ah-display text-[14px]" style={{ color: TEXT }}>이번 주 출근도장</span>
                        {member ? <span className="ah-display flex items-center gap-1 text-[12px] text-[#f2701f]"><i aria-hidden="true" className="fa-solid fa-fire text-[10px]" />{today.streak}일 연속</span> : null}
                    </div>
                    <div className="mt-2.5"><PawWeek days={days} past={past} claimed={today.stamped} size={30} /></div>
                </Panel>
                {!today.stamped ? (
                    <Patch ref={stampRef} onClick={onStamp} className="mt-3">
                        <span className="relative">{member ? "오늘 출근도장 찍기" : "출근도장 찍어 보기"}</span>
                        <span className="ah-light relative rounded-full bg-white/25 px-2 py-0.5 text-[12px]">{member ? `+${SAMPLE.dailyRewardCoins} 코인` : "체험"}</span>
                    </Patch>
                ) : member ? (
                    <ul className="mt-3 space-y-2">
                        {SAMPLE.tasks.map((t) => {
                            const on = today.done[t.taskId];
                            return (
                                <li key={t.taskId}>
                                    <button type="button" disabled={on} onClick={() => today.complete(t.taskId)}
                                        className="ah-press flex w-full items-center gap-2.5 rounded-[1.1rem] bg-white/85 px-3 py-2.5 text-left shadow-[0_8px_16px_-14px_rgba(60,40,30,.6)]">
                                        <span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] ${on ? "ah-stamp text-white" : "text-[#9cc9f0]"}`}
                                            style={on ? { background: "linear-gradient(180deg,#7cc4ff,#2f86d6)" } : { border: "2px dashed #9cc9f0" }}>
                                            <i aria-hidden="true" className={`fa-solid ${on ? "fa-check" : "fa-paw"}`} />
                                        </span>
                                        <span className={`ah-display flex-1 text-[14px] ${on ? "line-through opacity-50" : ""}`} style={{ color: TEXT }}>{t.title}</span>
                                        <span className="ah-light text-[12px]" style={{ color: TEXT_SOFT }}>+{t.xp}XP</span>
                                    </button>
                                </li>
                            );
                        })}
                        {today.allDone ? <li className="ah-display text-center text-[13px] text-[#1f5f99]">오늘 돌봄 완료! 내일 새 도장까지 {untilTomorrow(now)}</li> : null}
                    </ul>
                ) : (
                    <div className="mt-3">
                        <p className="ah-light text-center text-[13px]" style={{ color: TEXT_SOFT }}>로그인하면 내일도 이어지고, 매일 {SAMPLE.dailyRewardCoins}코인씩 쌓여요</p>
                        <Patch href={appSignupHref(signupRedirect)} className="mt-2.5"><span className="relative">가입하고 {SAMPLE.signupBonus}코인 받기</span></Patch>
                    </div>
                )}
                <MoreLink href={hrefOf} ink={c.tone.ink}>매일 댕생활 전체 보기</MoreLink>
            </>
        );
    }
    if (c.key === "show") {
        return (
            <>
                <Panel>
                    <p className="ah-light text-[12.5px]" style={{ color: TEXT_SOFT }}>{member ? "내 댕자랑에 도착한 응원" : "누구나 구경할 수 있어요"}</p>
                    <p className="ah-display mt-1 flex items-center gap-2 text-[26px]" style={{ color: "#e0285f" }}>
                        {member ? (
                            <>새 응원 {SAMPLE.newBones}개 <span className="flex gap-0.5 text-[16px]">{[0, 1, 2].map((i) => <i key={i} aria-hidden="true" className="fa-solid fa-heart hc-pop" style={{ animationDelay: `${300 + i * 120}ms` }} />)}</span></>
                        ) : "오늘의 댕자랑"}
                    </p>
                </Panel>
                <Panel className="mt-2.5">
                    <div className="flex items-center justify-between">
                        <span className="ah-light text-[12.5px]" style={{ color: TEXT_SOFT }}>오늘의 댕주제</span>
                        <span className="ah-display rounded-full bg-[#ffe1ea] px-2 py-0.5 text-[12px] text-[#e0285f]">D-{SAMPLE.topic.dday}</span>
                    </div>
                    <p className="ah-display mt-1 text-[17px]" style={{ color: TEXT }}>&lsquo;{SAMPLE.topic.title}&rsquo;</p>
                </Panel>
                <Patch href={hrefOf} className="mt-3"><span className="relative">{member ? "응원 보러 가기" : "댕자랑 구경하기"}</span><i aria-hidden="true" className="fa-solid fa-paw relative text-[14px] text-white/90" /></Patch>
            </>
        );
    }
    return (
        <>
            <Panel>
                <p className="ah-light text-[12.5px]" style={{ color: TEXT_SOFT }}>{member ? `이번 주 ${SAMPLE.pet.name} 기록` : "사진 한 장으로"}</p>
                <p className="ah-display mt-1 text-[19px]" style={{ color: TEXT }}>{member ? "아직 비어 있어요" : "우리 아이를 기록해요"}</p>
                <p className="ah-light mt-1.5 text-[12.5px]" style={{ color: TEXT_SOFT }}>{member ? `지난 기록: ${SAMPLE.lastReport}` : "매주 남기면 달라진 점을 비교해 줘요"}</p>
            </Panel>
            <Panel className="mt-2.5 flex items-center justify-between">
                <span className="ah-display text-[14px]" style={{ color: TEXT }}>행동·소리 분석</span>
                <span className="ah-light text-[12.5px]" style={{ color: "#8f5e12" }}>{member ? `${SAMPLE.analysisCoinCost}코인 · ${Math.floor(today.coins / SAMPLE.analysisCoinCost)}회 가능` : `가입하면 ${SAMPLE.signupBonus}코인`}</span>
            </Panel>
            <Patch href={member ? "/my-pet/" : hrefOf} className="mt-3"><span className="relative">{member ? "이번 주 사진 남기기" : "예시 결과 보기"}</span></Patch>
            <MoreLink href={hrefOf} ink={c.tone.ink}>댕다방 연구소 가기</MoreLink>
        </>
    );
}
