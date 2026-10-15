"use client";

/**
 * EventsPanel — 매일 댕생활 탭 ③ "이벤트" · 프리미엄 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 고르고 신청하는 참여형을 모은다.
 *  1) 굿즈 500명 공모전 (#goods-contest) — 굿즈 사진을 크게(천천히 다가오는 움직임) + 기존 소개 문구 그대로
 *     + 실시간 진행(마감 D-day 크게 · 참여 수 · 인기 굿즈 3개 진행 막대 — 불러왔을 때만)
 *  2) 준비 중인 혜택 (#growth-programs) — lib/growth-programs 의 카드 4장 그대로, 정돈된 목록 → 누르면 아래 판에서 자세히
 *     로그인 전: "로그인 후 관심등록"(로그인 뒤 이 구역으로 돌아옴) · 로그인 후 관심등록 화면은 다음 단계에서 연결
 * 관리자 화면에서 "준비 중인 혜택"을 숨기면(visibility.programs) 2) 를 빼고 보여 준다.
 */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GOODS_CONTEST_CATALOG, GOODS_CONTEST_GOAL } from "@/lib/goods-contest";
import { loadGoodsContestSummary, type GoodsContestSummary } from "@/lib/customer-api";
import type { GrowthHubPublishedContent } from "@/lib/growth-content";
import { GROWTH_PROGRAM_CARDS, type GrowthProgramCard } from "@/lib/growth-programs";
import { BottomSheet, IconDot, Pill, PROGRAMS_LOGIN_HREF, Reveal, SectionHead, TEXT, TONES, toneOf } from "./ui";

type Props = {
    goods: GrowthHubPublishedContent["goods"];
    contentReady: boolean;
    showPrograms: boolean;
    member: boolean;
    hydrated: boolean;
    goTo: (anchor: string) => void; // 다른 탭의 구역으로 이동 (예: #local-care-finder)
};

export default function EventsPanel({ goods, contentReady, showPrograms, member, hydrated, goTo }: Props) {
    return (
        <div className="space-y-8">
            <Reveal><GoodsContestCard goods={goods} contentReady={contentReady} /></Reveal>
            {showPrograms && <Programs member={member} hydrated={hydrated} goTo={goTo} />}
        </div>
    );
}

/** 공모전 상태 글자 — 전체 공모전 화면(GoodsContest)과 같은 규칙 */
function statusLabel(summary: GoodsContestSummary) {
    if (summary.status === "expired") return "기간 종료";
    if (summary.status === "ended") return "운영자 종료";
    if (typeof summary.daysRemaining === "number") return `D-${summary.daysRemaining}`;
    return "90일 공모 진행 중";
}

function GoodsContestCard({ goods, contentReady }: { goods: GrowthHubPublishedContent["goods"]; contentReady: boolean }) {
    // 실시간 진행 — 실패하면 조용히 소개만 보여 준다
    const [summary, setSummary] = useState<GoodsContestSummary | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        loadGoodsContestSummary(controller.signal).then(setSummary).catch(() => undefined);
        return () => controller.abort();
    }, []);

    // 많이 고른 굿즈 3개
    const top = summary
        ? [...summary.items].sort((a, b) => b.selectionCount - a.selectionCount).slice(0, 3).flatMap((item) => {
            const meta = GOODS_CONTEST_CATALOG.find((c) => c.id === item.itemId);
            const name = goods.items[item.itemId]?.name || meta?.defaultName;
            return meta && name ? [{ ...item, name, imageSrc: meta.imageSrc }] : [];
        })
        : [];

    return (
        <section id="goods-contest" className="dl-anchor" aria-labelledby="pv-goods-title">
            <div className="pv-card overflow-hidden">
                {/* 굿즈 사진 — 천천히 다가오는 움직임 */}
                <Link href="/goods-contest/" className="relative block h-[214px] overflow-hidden bg-[#f6efe6]" aria-label="굿즈 공모전 전체 이미지와 상품 보기">
                    <span className="pv-kenburns absolute inset-0 block">
                        <Image src="/images/goods/goods-hero-lineup.webp" alt="댕다방 굿즈 공모전 전체 구성" fill sizes="(max-width: 480px) 100vw, 448px" className="object-cover" />
                    </span>
                    <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(31,26,24,0)_45%,rgba(31,26,24,0.55)_100%)]" aria-hidden="true" />
                    {/* 실시간 마감 — 불러왔을 때만 크게 */}
                    {summary && (
                        <span className="pv-glass-dark absolute left-4 top-4 rounded-2xl px-3 py-2 text-white">
                            <span className="pv-kicker block text-white/60">마감까지</span>
                            <span className="pv-num block text-[22px] leading-none">{statusLabel(summary)}</span>
                        </span>
                    )}
                    <span className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                        <span className="pv-kicker text-white/75">{goods.kicker}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[12px] font-bold">
                            {GOODS_CONTEST_CATALOG.length}개 아이템 보기 <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
                        </span>
                    </span>
                </Link>

                <div className="p-5">
                    <div className="flex flex-wrap gap-1.5">
                        <Pill tone={TONES.rose}>90일 한정 · 누구나 참여</Pill>
                        <Pill tone={TONES.green}><i className="fa-solid fa-shield-heart" aria-hidden="true" />선택 단계 결제 없음</Pill>
                    </div>
                    <h3 id="pv-goods-title" className="pv-title mt-3 text-[20px]">500명의 선택으로 만드는 댕다방 굿즈</h3>
                    <p className="pv-body mt-2 text-[13px]">
                        회원은 바로, 비회원은 이메일을 한 번 확인한 뒤 마음에 드는 굿즈를 선택할 수 있어요. 주문과 결제는 500명 달성 후 최종 조건에 동의할 때만 진행합니다.
                    </p>

                    {/* 실시간 — 인기 굿즈 3개 진행 막대 */}
                    {top.length > 0 && (
                        <div className="mt-4">
                            <p className="flex items-center justify-between">
                                <span className="pv-h3 text-[14px]">지금 인기 굿즈</span>
                                <span className="pv-small">총 {summary?.totalSelectionCount.toLocaleString("ko-KR")}명 선택</span>
                            </p>
                            <ul className="mt-2.5 space-y-3">
                                {top.map((item) => {
                                    const pct = Math.min(100, Math.round((item.selectionCount / (item.goal || GOODS_CONTEST_GOAL)) * 100));
                                    return (
                                        <li key={item.itemId} className="flex items-center gap-3">
                                            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#f6efe6]">
                                                <Image src={item.imageSrc} alt="" fill sizes="44px" className="object-cover" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center justify-between gap-2 text-[13px] font-bold" style={{ color: TEXT }}>
                                                    <span className="truncate">{item.name}</span>
                                                    <span className="pv-num shrink-0 text-[12px]" style={{ color: TONES.rose.accent }}>
                                                        {item.productionEligible ? "500명 달성" : `${item.remainingCount.toLocaleString("ko-KR")}명 남음`}
                                                    </span>
                                                </p>
                                                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[rgba(31,26,24,.07)]">
                                                    <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: TONES.rose.accent }} />
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    <Link href="/goods-contest/" className="pv-btn mt-5 w-full">굿즈 공모전 전체 보기</Link>
                    {!contentReady && <p className="pv-small mt-2 text-center">최신 공모 설정 확인 중…</p>}
                </div>
            </div>
        </section>
    );
}

function Programs({ member, hydrated, goTo }: { member: boolean; hydrated: boolean; goTo: (anchor: string) => void }) {
    // 자세히 볼 카드 — 아래에서 올라오는 판으로
    const [openId, setOpenId] = useState<GrowthProgramCard["id"] | null>(null);
    const close = useCallback(() => setOpenId(null), []);
    const card = GROWTH_PROGRAM_CARDS.find((c) => c.id === openId) || null;

    return (
        <section id="growth-programs" className="dl-anchor space-y-4" aria-labelledby="pv-programs-title">
            <Reveal>
                <SectionHead kicker="GROWTH PROGRAMS" title={<span id="pv-programs-title">다음 보물은 함께 검증해요</span>} tone={TONES.amber}
                    extra={<Pill tone={TONES.amber}><span className="h-1.5 w-1.5 rounded-full motion-safe:animate-pulse" style={{ background: TONES.amber.accent }} />전 프로그램 준비 중</Pill>}>
                    아직 판매·예약 가능한 서비스가 아닙니다. 관심 수요를 확인한 뒤 운영 조건과 시작 일정을 별도로 안내하며, 등록은 이 화면에서 언제든 취소할 수 있어요.
                </SectionHead>
            </Reveal>
            <Reveal order={1}>
                <p className="pv-small px-0.5" aria-label="전 프로그램 준비 중">광고·제휴 혜택은 검증을 마친 뒤 선택 기능으로 열어요.</p>
                {/* 혜택 4가지 — 정돈된 목록, 누르면 자세히 */}
                <ul className="pv-card mt-3 overflow-hidden">
                    {GROWTH_PROGRAM_CARDS.map((c) => {
                        const tone = toneOf(c.tone);
                        return (
                            <li key={c.id} className="pv-sep">
                                <button type="button" onClick={() => setOpenId(c.id)} className="pv-press flex w-full items-center gap-3 px-4 py-3.5 text-left" aria-haspopup="dialog">
                                    <IconDot icon={c.icon} tone={tone} size={42} />
                                    <span className="min-w-0 flex-1">
                                        <span className="pv-h3 block text-[14.5px]">{c.title}</span>
                                        <span className="pv-small mt-0.5 block">{c.status}</span>
                                    </span>
                                    <i className="fa-solid fa-chevron-right text-[12px] text-[#c9bfb9]" aria-hidden="true" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </Reveal>

            {/* 자세히 — 설명 · 확인 사항 · 지금 쓸 수 있는 기능 · 관심등록 */}
            <BottomSheet open={card !== null} onClose={close} label={card ? card.title : "준비 중인 혜택"}>
                {card && <ProgramDetail card={card} member={member} hydrated={hydrated} onUseFeature={(anchor) => { close(); goTo(anchor); }} />}
            </BottomSheet>
        </section>
    );
}

/** 혜택 자세히 — 아래 판 안 내용 */
function ProgramDetail({ card, member, hydrated, onUseFeature }: { card: GrowthProgramCard; member: boolean; hydrated: boolean; onUseFeature: (anchor: string) => void }) {
    const tone = toneOf(card.tone);
    const feature = card.existingFeature;
    return (
        <div className="pb-1">
            <IconDot icon={card.icon} tone={tone} size={52} />
            <div className="mt-3 flex items-center gap-2">
                <p className="pv-kicker" style={{ color: tone.accent }}>{card.eyebrow}</p>
                <Pill tone={TONES.amber}>준비 중</Pill>
            </div>
            <h3 className="pv-title mt-1.5">{card.title}</h3>
            <p className="pv-small mt-1" style={{ color: tone.ink }}>{card.status}</p>
            <p className="pv-body mt-3">{card.description}</p>
            <ul className="mt-4 space-y-2.5">
                {card.details.map((d) => (
                    <li key={d} className="flex items-start gap-2.5 text-[13.5px] leading-[1.55]" style={{ color: "#4d433e" }}>
                        <i className="fa-solid fa-check mt-[5px] text-[11px]" style={{ color: tone.accent }} aria-hidden="true" />{d}
                    </li>
                ))}
            </ul>

            {/* 지금 쓸 수 있는 기능 (예: 동네 돌봄 찾기) — 같은 화면의 다른 탭으로 */}
            {feature && (
                <button type="button" onClick={() => onUseFeature(feature.href.replace(/^#/, ""))} className="pv-press mt-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left" style={{ background: tone.tint }}>
                    <i className="fa-solid fa-location-arrow text-[15px]" style={{ color: tone.accent }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-bold" style={{ color: tone.ink }}>{feature.label}</span>
                        <span className="pv-small block">{feature.helper}</span>
                    </span>
                    <i className="fa-solid fa-chevron-right text-[12px]" style={{ color: tone.accent }} aria-hidden="true" />
                </button>
            )}

            {/* 관심등록 — 로그인 전에는 로그인 뒤 이 구역으로 돌아오는 주소 */}
            <div className="mt-5 flex flex-col gap-2">
                {!hydrated ? (
                    <span className="h-[50px] w-full animate-pulse rounded-2xl bg-[#f4efec]" aria-label="회원 상태 확인 중" />
                ) : !member ? (
                    <Link href={PROGRAMS_LOGIN_HREF} className="pv-btn w-full">로그인 후 관심등록</Link>
                ) : (
                    card.interestOptions.map((option) => (
                        <span key={option.programId} className="pv-btn w-full opacity-50" title="회원 관심등록 화면은 다음 단계에서 연결해요">{option.label}</span>
                    ))
                )}
                <p className="pv-small text-center">관심등록은 주문·예약·결제가 아니며 언제든 취소할 수 있어요.</p>
            </div>
        </div>
    );
}
