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

export const GUEST_STEPS = [
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

export function hasShareableAiRecord(pet: PetProfile): boolean {
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

    // 웹 매일 댕생활 꾸밈(2026-10-22 사용자 "귀엽고 보기 좋은 구성으로") — 배치 · 카드 모양만 바꿈, 문구 · 링크 · 동작은 그대로.
    // 꾸밈 CSS 는 app/daily-web.css(웹에서만, data-daily-web 범위)
    return (
        <main className="w-full overflow-x-clip" data-growth-motion-scope data-daily-web>
            {/* ① 머리 판 — 왼쪽 제목 · 설명 · 바로가기 알약 줄, 오른쪽 보물상자 그림 무리 */}
            <section className="px-4 pt-8 sm:px-6 md:pt-12" aria-labelledby="treasure-mine-title">
                <div className="dw-hero dw-tint-yellow mx-auto max-w-[1352px]">
                    <div className="dw-hero-text">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="ddb-crayon-kicker dw-kicker">{content.hero.kicker}</p>
                            <span className="dw-chip dw-chip-mint">{content.hero.badge}</span>
                        </div>
                        <h1 id="treasure-mine-title" className="ddb-crayon-title dw-h1">
                            {content.hero.titlePrefix} <span className="ddb-crayon-underline">{content.hero.titleHighlight}</span>{content.hero.titleSuffix}
                        </h1>
                        <p className="dw-lead">{content.hero.description}</p>

                        <nav className="dw-hero-nav" aria-label="보물광산 구역 바로가기">
                            <a href="#today-treasure" className="ddb-crayon-link ddb-attention-cta dw-pill dw-pill-main">
                                오늘의 보물
                            </a>
                            <Link href="/goods-contest/" className="ddb-motion-lift dw-pill">
                                굿즈 500명 공모전
                            </Link>
                            {content.visibility.localCare ? (
                                <a href="#local-care-finder" className="ddb-motion-lift dw-pill">
                                    동네 돌봄 찾기
                                </a>
                            ) : null}
                            {content.visibility.programs ? (
                                <a href="#growth-programs" className="ddb-motion-lift dw-pill">
                                    준비 중인 혜택
                                </a>
                            ) : null}
                        </nav>
                    </div>

                    {/* 그림 무리(꾸밈) — 보물상자 + 출근도장 · 작은 돌봄 · 변화 기록 그림이 둥실 */}
                    <div className="dw-hero-art" aria-hidden="true">
                        <span className="dw-hero-plate" />
                        <Image src="/images/ui/daily-hero-treasure-384.webp" alt="" width={230} height={230} priority className="dw-hero-main" />
                        <Image src="/images/ui/daily-checkin-256.webp" alt="" width={92} height={92} className="dw-hero-float dw-f1" />
                        <Image src="/images/ui/daily-care-256.webp" alt="" width={84} height={84} className="dw-hero-float dw-f2" />
                        <Image src="/images/ui/daily-change-256.webp" alt="" width={80} height={80} className="dw-hero-float dw-f3" />
                    </div>
                </div>
            </section>

            {/* ② 오늘의 보물 — 가운데 정렬 제목, 아래 하루 보물 길(비회원) 또는 회원 기록판 */}
            <section id="today-treasure" className="scroll-mt-28 pt-12 md:pt-16" aria-labelledby="today-treasure-title">
                <div className="dw-section-head mx-auto max-w-[1400px] px-4 sm:px-6">
                    <p className="ddb-crayon-kicker dw-kicker">{content.today.kicker}</p>
                    <h2 id="today-treasure-title" className="ddb-crayon-title ddb-crayon-underline dw-h2">{content.today.title}</h2>
                    <p className="dw-sub">{content.today.description}</p>
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

                {/* ③ 안전 공유 · 쇼핑으로 잇기 — 위아래로 길게 쌓던 두 판을 나란히 */}
                <div className="dw-pair mx-auto max-w-[1400px] px-4 pt-4 sm:px-6">
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

/** ④ 굿즈 공모전 미리보기 — 연보라 크레파스 판, 오른쪽 굿즈 사진은 흰 액자 안에 */
function GoodsContestTeaser({
    content,
    contentReady,
}: {
    content: GrowthHubPublishedContent["goods"];
    contentReady: boolean;
}) {
    return (
        <section id="goods-contest" className="scroll-mt-28 px-4 py-12 sm:px-6 md:py-16" aria-labelledby="goods-contest-teaser-title">
            <div className="dw-goods dw-tint-lavender mx-auto max-w-[1352px]">
                <div className="dw-goods-text">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="ddb-crayon-kicker dw-kicker">{content.kicker}</p>
                        <span className="dw-chip dw-chip-violet">90일 한정 · 누구나 참여</span>
                    </div>
                    <h2 id="goods-contest-teaser-title" className="ddb-crayon-title dw-h2 break-keep">
                        500명의 선택으로 만드는 <span className="ddb-crayon-underline">댕다방 굿즈</span>
                    </h2>
                    <p className="dw-lead break-keep">
                        회원은 바로, 비회원은 이메일을 한 번 확인한 뒤 마음에 드는 굿즈를 선택할 수 있어요. 주문과 결제는 500명 달성 후 최종 조건에 동의할 때만 진행합니다.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                        <Link href="/goods-contest/" className="ddb-crayon-link ddb-attention-cta dw-pill dw-pill-main">
                            굿즈 공모전 전체 보기
                            <i className="fa-solid fa-arrow-right ml-2" aria-hidden="true" />
                        </Link>
                        <span className="dw-chip dw-chip-mint dw-chip-lg">
                            <i className="fa-solid fa-shield-heart mr-2" aria-hidden="true" />
                            선택 단계 결제 없음
                        </span>
                    </div>
                    {!contentReady ? <span className="mt-3 text-[10px] font-bold text-neutral-400">최신 공모 설정 확인 중…</span> : null}
                </div>
                <Link href="/goods-contest/" className="dw-goods-photo group" aria-label="굿즈 공모전 전체 이미지와 상품 보기">
                    <span className="dw-goods-frame">
                        <Image
                            src="/images/goods/goods-hero-lineup.webp"
                            alt="댕다방 굿즈 공모전 전체 구성"
                            fill
                            loading="lazy"
                            sizes="(max-width: 1024px) 100vw, 42vw"
                            className="object-contain p-3 transition duration-700 group-hover:scale-[1.025] motion-reduce:transition-none"
                        />
                    </span>
                    <span className="dw-goods-count">21개 아이템 보기</span>
                </Link>
            </div>
        </section>
    );
}

/** 돌봄 기록 → 쇼핑으로 잇기 — 공유 판 옆 작은 세로 카드(그림 · 제목 · 설명 · 버튼) */
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
        <aside className="dw-bridge dw-tint-mint" aria-label="돌봄 기록을 상품 선택으로 이어보기">
            {/* 웹 쇼핑 메뉴와 같은 3D 그림(꾸밈) */}
            <Image src="/images/ui/shop-menu-all-128.webp" alt="" width={72} height={72} className="dw-bridge-art" aria-hidden="true" />
            <p className="dw-card-title">
                {hasAiRecord
                    ? content.aiRecordTitle
                    : hasPet
                        ? content.profileTitle
                        : isMember
                        ? content.memberTitle
                        : content.guestTitle}
            </p>
            <p className="dw-card-body">{content.description}</p>
            <div className="mt-auto flex flex-wrap justify-center gap-2 pt-4">
                <Link href={primaryHref} className="ddb-crayon-link ddb-attention-cta dw-pill dw-pill-main dw-pill-sm">
                    {primaryLabel}
                </Link>
                <Link href={content.secondaryCtaHref} className="ddb-motion-lift dw-pill dw-pill-sm">{content.secondaryCtaLabel}</Link>
            </div>
        </aside>
    );
}

/* 하루 보물 길 그림(꾸밈) — GUEST_STEPS 순서대로 출근도장 · 작은 돌봄 · 변화 기록 */
const GUEST_STEP_ART = ["/images/ui/daily-checkin-256.webp", "/images/ui/daily-care-256.webp", "/images/ui/daily-change-256.webp"] as const;

/** 비회원 오늘의 보물 — 1 → 2 → 3 을 크레파스 점선으로 이은 하루 보물 길 + 말풍선 모양 로그인 안내 */
function GuestTodayCard() {
    return (
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
            <ol className="dw-steps">
                {GUEST_STEPS.map((step, index) => (
                    <li key={step.label} className={`dw-step dw-step-${step.tone}`}>
                        <span className="dw-step-num" aria-hidden="true">{index + 1}</span>
                        <Image src={GUEST_STEP_ART[index]} alt="" width={128} height={128} className="dw-step-art" aria-hidden="true" />
                        <span className="sr-only">{step.label}</span>
                        <h3 className="ddb-crayon-title dw-h3">{step.title}</h3>
                        <p className="dw-card-body">{step.body}</p>
                    </li>
                ))}
            </ol>
            <div className="dw-login-bubble">
                <div>
                    <h3 className="ddb-crayon-title dw-h3">로그인하면 오늘 기록이 계정에 이어져요</h3>
                    <p className="dw-card-body mt-2">비회원도 아래 성장 프로그램과 운영 정책은 먼저 둘러볼 수 있습니다.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                    <Link href="/auth/login/?redirect=%2Ftreasure-mine%2F" className="ddb-crayon-link ddb-attention-cta dw-pill dw-pill-main">로그인하고 시작</Link>
                    <Link href="/auth/signup/?redirect=%2Ftreasure-mine%2F" className="ddb-motion-lift dw-pill">처음이라면 회원가입</Link>
                </div>
            </div>
        </div>
    );
}
