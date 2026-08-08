"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import MemberAiDashboard from "@/components/home/MemberAiDashboard";
import GrowthPolicySummary from "@/components/growth/GrowthPolicySummary";
import GrowthPrograms from "@/components/growth/GrowthPrograms";
import GrowthShareCard from "@/components/growth/GrowthShareCard";
import { useAuth } from "@/lib/store";
import type { PetProfile } from "@/lib/store";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";

const GUEST_STEPS = [
    {
        label: "01",
        title: "출근도장",
        body: "한국 시간 기준 하루 한 번, 계정에 안전하게 기록해요.",
        icon: "fa-calendar-check",
        tone: "orange",
    },
    {
        label: "02",
        title: "작은 돌봄",
        body: "산책과 눈 상태 확인처럼 오늘 할 수 있는 한 가지를 완료해요.",
        icon: "fa-paw",
        tone: "teal",
    },
    {
        label: "03",
        title: "변화 기록",
        body: "AI 분석과 지난 기록을 모아 평소와 달라진 점을 살펴봐요.",
        icon: "fa-chart-line",
        tone: "coral",
    },
] as const;

function hasShareableAiRecord(pet: PetProfile): boolean {
    if (pet.lastAnalyzedAt) return true;
    const raw = pet.rawAnalysis;
    if (!raw) return false;
    return Boolean(
        raw.petLens
        || raw.analysis_ready
        || raw.analysisReady
        || raw.recommendation_signals
        || raw.recommendationSignals
        || raw.visible_features
        || raw.visibleFeatures,
    );
}

export default function GrowthHub() {
    const { hydrated, user } = useAuth();
    const trackedViewRef = useRef(false);
    const isMember = Boolean(user);
    const hasPet = Boolean(user?.pets.length);
    const hasAiRecord = Boolean(user?.pets.some(hasShareableAiRecord));

    useEffect(() => {
        if (!hydrated || trackedViewRef.current) return;
        trackedViewRef.current = true;
        trackStorefrontEvent("growth_hub_viewed", {
            surface: "treasure_mine",
            audience: user ? "member" : "guest",
        });
    }, [hydrated, user]);

    return (
        <main className="w-full overflow-x-clip">
            <section className="px-4 pt-8 sm:px-6 md:pt-12" aria-labelledby="treasure-mine-title">
                <div className="ddb-crayon-paper ddb-crayon-banner relative mx-auto max-w-[1352px] overflow-hidden rounded-[34px] border px-5 py-8 sm:px-8 md:px-10 md:py-11">
                    <div className="absolute -right-14 top-8 h-2 w-52 rotate-[-8deg] rounded-full bg-cyan-500/20 shadow-[0_11px_0_rgba(239,71,111,0.15),0_22px_0_rgba(245,158,11,0.18)]" aria-hidden="true" />
                    <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full border-[18px] border-dashed border-indigo-300/20" aria-hidden="true" />

                    <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="ddb-crayon-kicker text-xs">DAENGDABANG TREASURE MINE</p>
                                <span className="rounded-full border border-emerald-200 bg-white/85 px-2.5 py-1 text-[10px] font-black text-emerald-800">오늘 기능 운영 중</span>
                            </div>
                            <h1 id="treasure-mine-title" className="ddb-crayon-title mt-3 max-w-4xl text-4xl leading-tight text-neutral-950 md:text-6xl">
                                매일 하나씩, <span className="ddb-crayon-underline">우리 아이 돌봄 보물</span>을 모아요
                            </h1>
                            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-neutral-650 md:text-base">
                                출근도장·작은 돌봄·AI 기록을 오늘의 한 흐름으로 묶었어요. 새 프로그램은 한곳에서 준비 상태만 확인해 페이지가 복잡해지지 않도록 했습니다.
                            </p>
                        </div>

                        <nav className="grid min-w-[220px] grid-cols-2 gap-2" aria-label="보물광산 구역 바로가기">
                            <a href="#today-treasure" className="ddb-crayon-link inline-flex min-h-12 items-center justify-center rounded-full px-4 text-xs">
                                오늘의 보물
                            </a>
                            <a href="#growth-programs" className="inline-flex min-h-12 items-center justify-center rounded-full border border-neutral-300 bg-white px-4 text-xs font-black text-neutral-700 transition hover:border-indigo-400 hover:text-indigo-800">
                                성장 프로그램
                            </a>
                        </nav>
                    </div>
                </div>
            </section>

            <section id="today-treasure" className="scroll-mt-28 pt-10 md:pt-14" aria-labelledby="today-treasure-title">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                    <p className="ddb-crayon-kicker text-xs">TODAY&apos;S TREASURE</p>
                    <h2 id="today-treasure-title" className="ddb-crayon-title ddb-crayon-underline mt-2 text-3xl text-neutral-950 md:text-4xl">오늘 돌아올 이유는 딱 세 가지</h2>
                    <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-neutral-600">도장 찍고, 작은 돌봄 하나를 끝내고, 변화 기록을 살펴보세요.</p>
                </div>

                {!hydrated ? (
                    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6" aria-label="회원 돌봄 현황 확인 중">
                        <div className="ddb-crayon-paper grid min-h-64 animate-pulse place-items-center rounded-[30px] border text-sm font-black text-neutral-400">
                            <span><i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />오늘의 보물을 준비하는 중</span>
                        </div>
                    </div>
                ) : user ? (
                    <MemberAiDashboard variant="full" />
                ) : (
                    <GuestTodayCard />
                )}

                <div className="mx-auto max-w-[1400px] px-4 pt-2 sm:px-6">
                    <GrowthShareCard canShareAiRecord={hasAiRecord} isMember={isMember} />
                    <CommerceBridge isMember={isMember} hasPet={hasPet} hasAiRecord={hasAiRecord} />
                </div>
            </section>

            <GrowthPrograms />
            <GrowthPolicySummary />
        </main>
    );
}

function CommerceBridge({
    isMember,
    hasPet,
    hasAiRecord,
}: {
    isMember: boolean;
    hasPet: boolean;
    hasAiRecord: boolean;
}) {
    const primaryHref = hasPet ? "/#recommend" : isMember ? "/my-pet/" : "/products/";
    const primaryLabel = hasPet ? "우리 아이 맞춤 상품 보기" : isMember ? "프로필 등록하고 맞춤 추천" : "전체 상품 둘러보기";

    return (
        <aside className="ddb-crayon-paper mt-4 flex flex-col gap-4 rounded-[24px] border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" aria-label="돌봄 기록을 상품 선택으로 이어보기">
            <div className="flex items-center gap-3">
                <span className="ddb-crayon-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm" data-crayon-tone="orange">
                    <i className="fa-solid fa-basket-shopping" aria-hidden="true" />
                </span>
                <div>
                    <p className="text-sm font-black text-neutral-950">
                        {hasAiRecord
                            ? "우리 아이 프로필과 확인된 AI 기록을 상품 선택에 참고해요"
                            : hasPet
                                ? "우리 아이 프로필을 상품 선택에 참고해요"
                                : isMember
                                ? "우리 아이 프로필을 등록하면 맞춤 추천을 시작할 수 있어요"
                                : "돌봄을 살펴본 뒤 쇼핑으로 자연스럽게 이어가세요"}
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-4 text-neutral-500">프로필 맞춤 추천 또는 판매량 순위가 아닌 댕다방 추천 셀렉트로 이어보세요.</p>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
                <Link href={primaryHref} className="ddb-crayon-link inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs">
                    {primaryLabel}
                </Link>
                <Link href="/best/" className="inline-flex min-h-10 items-center justify-center rounded-full border border-neutral-300 bg-white px-4 text-xs font-black text-neutral-700">추천 셀렉트 보기</Link>
            </div>
        </aside>
    );
}

function GuestTodayCard() {
    return (
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
            <div className="ddb-crayon-paper overflow-hidden rounded-[32px] border">
                <div className="grid gap-3 p-4 sm:p-6 lg:grid-cols-3">
                    {GUEST_STEPS.map((step) => (
                        <article key={step.label} className="rounded-[24px] border border-neutral-200 bg-white/80 p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                                <span className="ddb-crayon-icon grid h-10 w-10 place-items-center rounded-xl text-sm" data-crayon-tone={step.tone}>
                                    <i className={`fa-solid ${step.icon}`} aria-hidden="true" />
                                </span>
                                <span className="ddb-crayon-kicker text-[10px]">{step.label}</span>
                            </div>
                            <h3 className="ddb-crayon-title mt-4 text-2xl text-neutral-950">{step.title}</h3>
                            <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">{step.body}</p>
                        </article>
                    ))}
                </div>
                <div className="ddb-crayon-banner flex flex-col gap-5 border-t border-neutral-200 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <div>
                        <h3 className="ddb-crayon-title text-2xl text-neutral-950">로그인하면 오늘 기록이 계정에 이어져요</h3>
                        <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">비회원도 아래 성장 프로그램과 운영 정책은 먼저 둘러볼 수 있습니다.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/auth/login/?redirect=%2Ftreasure-mine%2F" className="ddb-crayon-link inline-flex min-h-11 items-center justify-center rounded-full px-5 text-xs">로그인하고 시작</Link>
                        <Link href="/auth/signup/?redirect=%2Ftreasure-mine%2F" className="inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 text-xs font-black text-neutral-700">처음이라면 회원가입</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
