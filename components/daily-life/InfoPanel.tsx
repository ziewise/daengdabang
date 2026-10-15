"use client";

/**
 * InfoPanel — 매일 댕생활 탭 ⑤ "안내" · 프리미엄 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 *  1) 댕다방 확장 계획 (#community-commerce-roadmap) — CommerceCommunityExpansion 의 카드 4장 그대로.
 *     큰 번호의 편집형 목록, 누르면 그 자리에서 부드럽게 펼쳐져 설명 · 지켜지는 기준 · 바로가기.
 *     "#…" 로 가는 바로가기(예: 멤버십 소식 관심등록 → #growth-programs)는 같은 화면의 다른 탭으로 이동
 *  2) 안심하고 이용하세요 — GrowthPolicySummary 의 기준 3가지. 처음 펼칠 때 growth_policy_opened 기록
 *     관리자 화면에서 숨기면(visibility.policy) 빼고 보여 준다.
 */

import Link from "next/link";
import { useRef, useState } from "react";
import { EXPANSION_CARDS } from "@/components/growth/CommerceCommunityExpansion";
import { POLICIES } from "@/components/growth/GrowthPolicySummary";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import { IconDot, Pill, Reveal, SectionHead, TEXT, TONES, toneOf, type Tone } from "./ui";

/** 진행 상태 글자 → 색 (운영 중 · 상담 접수 중은 초록, 검토 중은 주황, 준비 중은 보라) */
function statusTone(status: string): Tone {
    if (/운영|접수/.test(status)) return TONES.green;
    if (/검토/.test(status)) return TONES.amber;
    return TONES.violet;
}

export default function InfoPanel({ showPolicy, goTo }: { showPolicy: boolean; goTo: (anchor: string) => void }) {
    // 펼친 단계 — 한 번에 하나
    const [openStep, setOpenStep] = useState<string | null>(EXPANSION_CARDS[0]?.step ?? null);

    return (
        <div className="space-y-8">
            <section id="community-commerce-roadmap" className="dl-anchor space-y-4" aria-labelledby="pv-roadmap-title">
                <Reveal>
                    <SectionHead kicker="CARE TO COMMUNITY" title={<span id="pv-roadmap-title">돌봄 기록이 좋은 발견으로 이어지도록</span>} tone={TONES.amber}
                        extra={<Pill tone={TONES.blue}>운영 기능과 준비 기능을 구분해 안내해요</Pill>}>
                        혼자 쓰는 AI 도구를 넘어, 서로의 경험에서 배우고 좋은 브랜드를 함께 발견하는 댕다방을 만들고 있어요. 지금 이용할 수 있는 기능은 바로 연결하고, 준비 단계는 약속보다 진행 상태를 먼저 알려드립니다.
                    </SectionHead>
                </Reveal>

                {/* 큰 번호 목록 — 누르면 그 자리에서 펼쳐짐 */}
                <Reveal order={1}>
                    <ol className="pv-card overflow-hidden" aria-label="커뮤니티·콘텐츠·브랜드·기본템 확장 계획">
                        {EXPANSION_CARDS.map((card) => {
                            const tone = toneOf(card.tone);
                            const st = statusTone(card.status);
                            const open = openStep === card.step;
                            const internal = card.href.startsWith("#");
                            const cta = <>{card.cta}<i className="fa-solid fa-arrow-right text-[11px]" aria-hidden="true" /></>;
                            return (
                                <li key={card.step} className="pv-sep">
                                    <button type="button" onClick={() => setOpenStep(open ? null : card.step)} className="pv-press flex w-full items-center gap-4 px-5 py-4 text-left" aria-expanded={open}>
                                        <span className="pv-num w-9 shrink-0 text-[26px] leading-none transition-colors duration-300" style={{ color: open ? tone.accent : "#d6ccc6" }}>{card.step}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="pv-kicker block text-[10px]" style={{ color: "#a3968f" }}>{card.eyebrow}</span>
                                            <span className="pv-h3 mt-0.5 block">{card.title}</span>
                                        </span>
                                        <Pill tone={st}>{card.status}</Pill>
                                        <i className="fa-solid fa-chevron-down text-[11px] text-[#c9bfb9] transition-transform duration-500" style={{ transform: open ? "rotate(180deg)" : "none" }} aria-hidden="true" />
                                    </button>
                                    {/* 펼침 — 높이를 부드럽게 */}
                                    <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                        <div className="overflow-hidden">
                                            <div className="px-5 pb-5 pl-[73px]">
                                                {card.activeFeature && <Pill tone={TONES.green}><i className="fa-solid fa-check" aria-hidden="true" />{card.activeFeature}</Pill>}
                                                <p className="pv-body mt-2 text-[13px]">{card.description}</p>
                                                <p className="mt-3 flex gap-2 rounded-2xl px-3.5 py-3 text-[12.5px] leading-[1.6]" style={{ background: "rgba(31,26,24,.035)", color: "#6f625c" }}>
                                                    <i className="fa-solid fa-circle-info mt-[4px] text-[11px]" style={{ color: tone.accent }} aria-hidden="true" />{card.guardrail}
                                                </p>
                                                {internal ? (
                                                    <button type="button" onClick={() => goTo(card.href.slice(1))} className="pv-btn-ghost mt-3 min-h-[40px] text-[13px]">{cta}</button>
                                                ) : (
                                                    <Link href={card.href} className="pv-btn-ghost mt-3 min-h-[40px] text-[13px]">{cta}</Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </Reveal>
                <p className="pv-small px-0.5">준비 중인 기능은 일정·가격·혜택이 확정될 때 다시 안내하며, 관심등록만으로 구매나 유료 멤버십이 시작되지 않습니다.</p>
            </section>

            {showPolicy && <Reveal><PolicyCard /></Reveal>}
        </div>
    );
}

/** 안심하고 이용하세요 — 펼쳐 보는 판 (처음 펼칠 때 한 번만 기록) */
function PolicyCard() {
    const wasOpenRef = useRef(false);
    return (
        <section aria-labelledby="pv-policy-title">
            <details
                className="pv-card group overflow-hidden"
                onToggle={(event) => {
                    const isOpen = event.currentTarget.open;
                    if (isOpen && !wasOpenRef.current) {
                        wasOpenRef.current = true;
                        trackStorefrontEvent("growth_policy_opened", { surface: "treasure_mine" });
                    }
                }}
            >
                <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
                    <IconDot icon="fa-shield-heart" tone={TONES.green} size={44} />
                    <div className="min-w-0 flex-1">
                        <p className="pv-kicker" style={{ color: TONES.green.accent }}>SAFE BY DEFAULT</p>
                        <h2 id="pv-policy-title" className="pv-h3 mt-0.5">안심하고 이용하세요</h2>
                        <p className="pv-small mt-0.5">AI 기록은 의료 진단이 아니며, 광고·보상 운영 기준도 함께 확인할 수 있어요.</p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f4efec] transition-transform duration-500 group-open:rotate-180" aria-hidden="true">
                        <i className="fa-solid fa-chevron-down text-[11px] text-[#8c7f78]" />
                    </span>
                </summary>
                <ul className="px-5 pb-5">
                    {POLICIES.map((p) => {
                        const tone = toneOf(p.tone);
                        return (
                            <li key={p.title} className="flex gap-3 border-t border-[rgba(31,26,24,.06)] py-4 first:border-t-0 first:pt-1">
                                <i className={`fa-solid ${p.icon} mt-1 w-4 text-center text-[14px]`} style={{ color: tone.accent }} aria-hidden="true" />
                                <div className="min-w-0">
                                    <p className="text-[14px] font-bold leading-snug" style={{ color: TEXT }}>{p.title}</p>
                                    <p className="pv-small mt-1 text-[12.5px]">{p.body}</p>
                                </div>
                            </li>
                        );
                    })}
                    <li className="pt-1">
                        <Link href="/privacy/" className="pv-small inline-flex items-center gap-1 font-bold underline underline-offset-2">개인정보처리방침</Link>
                    </li>
                </ul>
            </details>
        </section>
    );
}
