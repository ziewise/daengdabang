"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import MemberAiDashboard from "@/components/home/MemberAiDashboard";
import LocalCareFinder from "@/components/growth/LocalCareFinder";
import GrowthPolicySummary from "@/components/growth/GrowthPolicySummary";
import GrowthPrograms from "@/components/growth/GrowthPrograms";
import GrowthShareCard from "@/components/growth/GrowthShareCard";
import CommerceCommunityExpansion from "@/components/growth/CommerceCommunityExpansion";
import { useAuth } from "@/lib/store";
import type { PetProfile } from "@/lib/store";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import {
    DEFAULT_GROWTH_HUB_CONTENT,
    loadPublishedGrowthContent,
    type GrowthHubPublishedContent,
} from "@/lib/growth-content";

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
    const [content, setContent] = useState(DEFAULT_GROWTH_HUB_CONTENT);
    const [contentReady, setContentReady] = useState(false);
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

    useEffect(() => {
        const controller = new AbortController();
        loadPublishedGrowthContent(controller.signal).then((published) => {
            if (controller.signal.aborted) return;
            if (published) setContent(published.content);
            setContentReady(true);
        });
        return () => controller.abort();
    }, []);

    return (
        <main className="w-full overflow-x-clip" data-growth-motion-scope>
            <section className="px-4 pt-8 sm:px-6 md:pt-12" aria-labelledby="treasure-mine-title">
                <div className="ddb-crayon-paper ddb-crayon-banner relative mx-auto max-w-[1352px] overflow-hidden rounded-[34px] border px-5 py-8 sm:px-8 md:px-10 md:py-11">
                    <div className="absolute -right-14 top-8 h-2 w-52 rotate-[-8deg] rounded-full bg-cyan-500/20 shadow-[0_11px_0_rgba(239,71,111,0.15),0_22px_0_rgba(245,158,11,0.18)]" aria-hidden="true" />
                    <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full border-[18px] border-dashed border-indigo-300/20" aria-hidden="true" />

                    <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="ddb-crayon-kicker text-xs">{content.hero.kicker}</p>
                                <span className="rounded-full border border-emerald-200 bg-white/85 px-2.5 py-1 text-[10px] font-black text-emerald-800">{content.hero.badge}</span>
                            </div>
                            <h1 id="treasure-mine-title" className="ddb-crayon-title mt-3 max-w-4xl text-4xl leading-tight text-neutral-950 md:text-6xl">
                                {content.hero.titlePrefix} <span className="ddb-crayon-underline">{content.hero.titleHighlight}</span>{content.hero.titleSuffix}
                            </h1>
                            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-neutral-650 md:text-base">
                                {content.hero.description}
                            </p>
                        </div>

                        <nav className="grid min-w-[220px] grid-cols-2 gap-2 lg:grid-cols-1" aria-label="보물광산 구역 바로가기">
                            <a href="#today-treasure" className="ddb-crayon-link ddb-attention-cta inline-flex min-h-12 items-center justify-center rounded-full px-4 text-xs">
                                오늘의 보물
                            </a>
                            <Link href="/goods-contest/" className="ddb-motion-lift inline-flex min-h-12 items-center justify-center rounded-full border border-indigo-300 bg-white px-4 text-xs font-black text-indigo-900 transition hover:bg-indigo-50">
                                굿즈 500명 공모전
                            </Link>
                            {content.visibility.localCare ? (
                                <a href="#local-care-finder" className="ddb-motion-lift inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-300 bg-white px-4 text-xs font-black text-cyan-900 transition hover:bg-cyan-50">
                                    동네 돌봄 찾기
                                </a>
                            ) : null}
                            {content.visibility.programs ? (
                                <a href="#growth-programs" className="ddb-motion-lift inline-flex min-h-12 items-center justify-center rounded-full border border-neutral-300 bg-white px-4 text-xs font-black text-neutral-700 transition hover:border-indigo-400 hover:text-indigo-800">
                                    준비 중인 혜택
                                </a>
                            ) : null}
                        </nav>
                    </div>
                </div>
            </section>

            <section id="today-treasure" className="scroll-mt-28 pt-10 md:pt-14" aria-labelledby="today-treasure-title">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                    <p className="ddb-crayon-kicker text-xs">{content.today.kicker}</p>
                    <h2 id="today-treasure-title" className="ddb-crayon-title ddb-crayon-underline mt-2 text-3xl text-neutral-950 md:text-4xl">{content.today.title}</h2>
                    <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-neutral-600">{content.today.description}</p>
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
                    <CommerceBridge isMember={isMember} hasPet={hasPet} hasAiRecord={hasAiRecord} content={content.commerce} />
                </div>
            </section>

            <GoodsContestTeaser content={content.goods} contentReady={contentReady} />

            <CommerceCommunityExpansion />

            {content.visibility.localCare ? <LocalCareFinder /> : null}
            {content.visibility.programs ? <GrowthPrograms /> : null}
            {content.visibility.policy ? <GrowthPolicySummary /> : null}
        </main>
    );
}

function GoodsContestTeaser({
    content,
    contentReady,
}: {
    content: GrowthHubPublishedContent["goods"];
    contentReady: boolean;
}) {
    return (
        <section id="goods-contest" className="scroll-mt-28 px-4 py-10 sm:px-6 md:py-14" aria-labelledby="goods-contest-teaser-title">
            <div className="ddb-crayon-paper ddb-crayon-banner mx-auto grid max-w-[1352px] overflow-hidden rounded-[32px] border lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
                <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="ddb-crayon-kicker text-xs">{content.kicker}</p>
                        <span className="rounded-full border border-indigo-200 bg-white/90 px-3 py-1 text-[10px] font-black text-indigo-800">90일 한정 · 누구나 참여</span>
                    </div>
                    <h2 id="goods-contest-teaser-title" className="ddb-crayon-title mt-3 break-keep text-3xl leading-tight text-neutral-950 md:text-4xl">
                        500명의 선택으로 만드는 <span className="ddb-crayon-underline">댕다방 굿즈</span>
                    </h2>
                    <p className="mt-4 max-w-2xl break-keep text-sm font-bold leading-7 text-neutral-650">
                        회원은 바로, 비회원은 이메일을 한 번 확인한 뒤 마음에 드는 굿즈를 선택할 수 있어요. 주문과 결제는 500명 달성 후 최종 조건에 동의할 때만 진행합니다.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <Link href="/goods-contest/" className="ddb-crayon-link ddb-attention-cta inline-flex min-h-12 items-center justify-center rounded-full px-5 text-xs">
                            굿즈 공모전 전체 보기
                            <i className="fa-solid fa-arrow-right ml-2" aria-hidden="true" />
                        </Link>
                        <span className="inline-flex min-h-12 items-center rounded-full border border-neutral-200 bg-white/85 px-4 text-xs font-black text-neutral-600">
                            <i className="fa-solid fa-shield-heart mr-2 text-emerald-600" aria-hidden="true" />
                            선택 단계 결제 없음
                        </span>
                    </div>
                    {!contentReady ? <span className="mt-3 text-[10px] font-bold text-neutral-400">최신 공모 설정 확인 중…</span> : null}
                </div>
                <Link href="/goods-contest/" className="group relative min-h-[260px] overflow-hidden border-t border-neutral-200 bg-[#f5ead8] lg:min-h-[360px] lg:border-l lg:border-t-0" aria-label="굿즈 공모전 전체 이미지와 상품 보기">
                    <Image
                        src="/images/goods/goods-hero-lineup.webp"
                        alt="댕다방 굿즈 공모전 전체 구성"
                        fill
                        loading="lazy"
                        sizes="(max-width: 1024px) 100vw, 42vw"
                        className="object-contain p-3 transition duration-700 group-hover:scale-[1.025] motion-reduce:transition-none"
                    />
                    <span className="absolute bottom-4 right-4 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-[10px] font-black text-indigo-900 shadow-sm">21개 아이템 보기</span>
                </Link>
            </div>
        </section>
    );
}

function CommerceBridge({
    isMember,
    hasPet,
    hasAiRecord,
    content,
}: {
    isMember: boolean;
    hasPet: boolean;
    hasAiRecord: boolean;
    content: GrowthHubPublishedContent["commerce"];
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
                            ? content.aiRecordTitle
                            : hasPet
                                ? content.profileTitle
                                : isMember
                                ? content.memberTitle
                                : content.guestTitle}
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-4 text-neutral-500">{content.description}</p>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
                <Link href={primaryHref} className="ddb-crayon-link ddb-attention-cta inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs">
                    {primaryLabel}
                </Link>
                <Link href={content.secondaryCtaHref} className="ddb-motion-lift inline-flex min-h-10 items-center justify-center rounded-full border border-neutral-300 bg-white px-4 text-xs font-black text-neutral-700">{content.secondaryCtaLabel}</Link>
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
                        <Link href="/auth/login/?redirect=%2Ftreasure-mine%2F" className="ddb-crayon-link ddb-attention-cta inline-flex min-h-11 items-center justify-center rounded-full px-5 text-xs">로그인하고 시작</Link>
                        <Link href="/auth/signup/?redirect=%2Ftreasure-mine%2F" className="ddb-motion-lift inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 text-xs font-black text-neutral-700">처음이라면 회원가입</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
