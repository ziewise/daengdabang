"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";

import { POLICIES } from "@/lib/growth-display-data";
export { POLICIES } from "@/lib/growth-display-data";

// 운영 기준 세 칸 그림(2026-10-22 사용자 그림 웹노광고 · 웹보상 · 웹정보 → webp) — POLICIES 순서대로
const POLICY_ART = [
    "/images/ui/policy-noad-192.webp",
    "/images/ui/policy-reward-192.webp",
    "/images/ui/policy-info-192.webp",
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
                            {POLICIES.map((policy, index) => (
                                <article key={policy.title} className="p-5 sm:p-6">
                                    <Image src={POLICY_ART[index]} alt="" width={56} height={56} className="dw-policy-art" aria-hidden="true" />
                                    <h3 className="mt-3 text-sm font-black text-neutral-950">{policy.title}</h3>
                                    <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">{policy.body}</p>
                                </article>
                            ))}
                        </div>
                        <div className="flex justify-end border-t border-neutral-100 bg-white/70 px-5 py-3 sm:px-7">
                            {/* 웹은 12px 분홍 글씨(daily-web.css data-web-privacy-link), 앱은 그대로 */}
                            <Link href="/privacy/" className="text-[10px] font-black text-indigo-800 underline underline-offset-4" data-web-privacy-link>개인정보처리방침</Link>
                        </div>
                    </div>
                </details>
            </div>
        </section>
    );
}
