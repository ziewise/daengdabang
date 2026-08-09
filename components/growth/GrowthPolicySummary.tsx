"use client";

import { useRef } from "react";
import Link from "next/link";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";

const POLICIES = [
    {
        icon: "fa-circle-play",
        tone: "orange",
        title: "광고 없이도 오늘의 돌봄은 그대로",
        body: "광고형 리워드는 준비가 끝난 뒤 선택 기능으로만 열어요. 지금의 출근도장·돌봄 기록·AI 기능은 광고를 보지 않아도 이용할 수 있습니다.",
    },
    {
        icon: "fa-coins",
        tone: "coral",
        title: "완료한 활동만 보상에 반영",
        body: "출근도장처럼 실제로 완료한 활동만 서버에서 확인해 반영해요. 준비 중인 기능은 보상처럼 보이게 표시하지 않습니다.",
    },
    {
        icon: "fa-shield-heart",
        tone: "teal",
        title: "AI 기록은 의료 진단이 아닌 참고 정보",
        body: "평소와 달라진 점을 기록하고 돌봄 결정을 돕는 참고 정보이며 의료 진단을 대신하지 않아요. 걱정되는 변화가 계속되거나 심해지면 동물병원에 확인해 주세요.",
    },
] as const;

export default function GrowthPolicySummary() {
    const wasOpenRef = useRef(false);

    return (
        <section className="pb-14 pt-2 md:pb-20" aria-labelledby="growth-policy-title">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                <details
                    className="ddb-crayon-paper group overflow-hidden rounded-[26px] border"
                    data-growth-policy-summary
                    onToggle={(event) => {
                        const isOpen = event.currentTarget.open;
                        if (isOpen && !wasOpenRef.current) {
                            trackStorefrontEvent("growth_policy_opened", { surface: "treasure_mine" });
                        }
                        wasOpenRef.current = isOpen;
                    }}
                >
                    <summary className="ddb-crayon-banner flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:px-7">
                        <div className="min-w-0">
                            <p className="ddb-crayon-kicker text-[10px]">SAFE BY DEFAULT</p>
                            <h2 id="growth-policy-title" className="ddb-crayon-title mt-1 text-xl text-neutral-950 sm:text-2xl">안심하고 이용하세요</h2>
                            <p className="mt-1 text-[11px] font-bold text-neutral-500">AI 기록은 의료 진단이 아니며, 광고·보상 운영 기준도 함께 확인할 수 있어요.</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-[10px] font-black text-neutral-700">
                            운영 기준 보기
                            <i className="fa-solid fa-chevron-down text-[9px] transition-transform group-open:rotate-180" aria-hidden="true" />
                        </span>
                    </summary>
                    <div className="border-t border-neutral-200">
                        <div className="grid divide-y divide-neutral-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                            {POLICIES.map((policy) => (
                                <article key={policy.title} className="p-5 sm:p-6">
                                    <span className="ddb-crayon-icon grid h-10 w-10 place-items-center rounded-xl text-sm" data-crayon-tone={policy.tone}>
                                        <i className={`fa-solid ${policy.icon}`} aria-hidden="true" />
                                    </span>
                                    <h3 className="mt-3 text-sm font-black text-neutral-950">{policy.title}</h3>
                                    <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">{policy.body}</p>
                                </article>
                            ))}
                        </div>
                        <div className="flex justify-end border-t border-neutral-100 bg-white/70 px-5 py-3 sm:px-7">
                            <Link href="/privacy/" className="text-[10px] font-black text-indigo-800 underline underline-offset-4">개인정보처리방침</Link>
                        </div>
                    </div>
                </details>
            </div>
        </section>
    );
}
