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

    // 페이지 안 탭(2026-10-22 사용자 "길게 나열한 느낌") — 지금 구역들을 빼지 않고 탭 네 개에 나눠 담음.
    // 머리 판 · 안심 안내는 늘 보이고, 고른 탭의 구역만 보임(숨긴 구역도 화면에 붙어 있어 동네 돌봄 검색 결과 · 관심등록 상태가 그대로 남음).
    // 고른 탭은 주소 # 에 남김(새로고침 · 뒤로 가기 그대로). 다른 화면 · 카드의 #구역 바로가기도 그 탭을 열고 그 구역으로 이동
    const tabs = HUB_TABS.filter((tab) => (tab.id !== "local" || content.visibility.localCare) && (tab.id !== "next" || content.visibility.programs));
    const [activeTab, setActiveTab] = useState<HubTabId>("today");
    const tabBarRef = useRef<HTMLDivElement>(null);

    // 주소 # → 탭(처음 열 때 · # 이 바뀔 때)
    useEffect(() => {
        const syncFromHash = () => {
            const tab = tabForAnchor(window.location.hash.slice(1));
            if (!tab) return;
            setActiveTab(tab);
            const anchor = window.location.hash.slice(1);
            // 탭이 그려진 뒤 그 구역으로(탭 이름 # 이면 탭 줄로)
            window.requestAnimationFrame(() => {
                const target = HUB_TABS.some((item) => item.anchor === anchor) ? tabBarRef.current : document.getElementById(anchor);
                target?.scrollIntoView({ block: "start" });
            });
        };
        syncFromHash();
        window.addEventListener("hashchange", syncFromHash);
        // 페이지 안 "#구역" 링크(예: 멤버십 소식 관심등록 → #growth-programs)는 Next 가 # 만 바꿔 hashchange 가 안 올 수 있어 직접 잡음
        const onClick = (event: MouseEvent) => {
            const link = (event.target as Element | null)?.closest?.("a[href^='#']");
            if (!link) return;
            const anchor = (link.getAttribute("href") || "").slice(1);
            const tab = tabForAnchor(anchor);
            if (!tab) return;
            event.preventDefault();
            setActiveTab(tab);
            window.history.replaceState(window.history.state, "", `#${anchor}`);
            window.requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: "start" }));
        };
        document.addEventListener("click", onClick);
        return () => {
            window.removeEventListener("hashchange", syncFromHash);
            document.removeEventListener("click", onClick);
        };
    }, []);

    // 탭 누름 — 주소 # 바꾸고, 탭 줄이 화면 위로 지나갔으면 탭 줄 위치로 올림
    const chooseTab = (tab: HubTabId) => {
        setActiveTab(tab);
        const anchor = HUB_TABS.find((item) => item.id === tab)?.anchor;
        if (anchor) window.history.replaceState(window.history.state, "", `#${anchor}`);
        const bar = tabBarRef.current;
        if (bar && bar.getBoundingClientRect().top < 100) {
            window.scrollTo({ top: bar.offsetTop - 80 });
        }
    };

    // 웹 매일 댕생활 꾸밈(2026-10-22 사용자 "귀엽고 보기 좋은 구성으로") — 배치 · 카드 모양만 바꿈, 문구 · 링크 · 동작은 그대로.
    // 꾸밈 CSS 는 app/daily-web.css(웹에서만, data-daily-web 범위)
    return (
        <main className="w-full overflow-x-clip" data-growth-motion-scope data-daily-web>
            {/* ① 머리 판 — 왼쪽 제목 · 설명, 오른쪽 보물상자 그림 무리(바로가기 알약은 아래 탭으로) */}
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

            {/* 탭 줄 — 내리는 동안 화면 위에 붙어 있음 */}
            <div ref={tabBarRef} className="dw-tabbar-wrap">
                <nav className="dw-tabbar" role="tablist" aria-label="보물광산 구역">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            id={`hub-tab-${tab.id}`}
                            aria-selected={activeTab === tab.id}
                            aria-controls={`hub-panel-${tab.id}`}
                            onClick={() => chooseTab(tab.id)}
                            className={`dw-tab ${activeTab === tab.id ? "is-on" : ""}`}
                        >
                            <Image src={tab.art} alt="" width={40} height={40} aria-hidden="true" />
                            <span className="text-left">
                                <b>{tab.label}</b>
                                <small>{tab.helper}</small>
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* 탭 ① 오늘의 보물 — 오늘의 보물 · 안전 공유 · 쇼핑으로 잇기 */}
            <div role="tabpanel" id="hub-panel-today" aria-labelledby="hub-tab-today" hidden={activeTab !== "today"}>
                <section id="today-treasure" className="scroll-mt-40 pt-10 md:pt-12" aria-labelledby="today-treasure-title">
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

                    {/* 안전 공유 · 쇼핑으로 잇기 나란히 */}
                    <div className="dw-pair mx-auto max-w-[1400px] px-4 pt-4 sm:px-6">
                        <GrowthShareCard canShareAiRecord={hasAiRecord} isMember={isMember} />
                        <CommerceBridge isMember={isMember} hasPet={hasPet} hasAiRecord={hasAiRecord} content={content.commerce} />
                    </div>
                </section>
            </div>

            {/* 탭 ② 동네 돌봄 */}
            {content.visibility.localCare ? (
                <div role="tabpanel" id="hub-panel-local" aria-labelledby="hub-tab-local" hidden={activeTab !== "local"}>
                    <LocalCareFinder />
                </div>
            ) : null}

            {/* 탭 ③ 굿즈 · 발견 — 확장 계획 · 굿즈 공모전 */}
            <div role="tabpanel" id="hub-panel-discover" aria-labelledby="hub-tab-discover" hidden={activeTab !== "discover"}>
                <CommerceCommunityExpansion />
                <GoodsContestTeaser content={content.goods} contentReady={contentReady} />
            </div>

            {/* 탭 ④ 다음 보물 */}
            {content.visibility.programs ? (
                <div role="tabpanel" id="hub-panel-next" aria-labelledby="hub-tab-next" hidden={activeTab !== "next"}>
                    <GrowthPrograms />
                </div>
            ) : null}

            {/* 안심 안내 — 어느 탭이든 맨 아래 */}
            {content.visibility.policy ? <div className="pt-6"><GrowthPolicySummary /></div> : null}
        </main>
    );
}

/* 페이지 안 탭 — 이름 · 그림 · 작은 설명 · 탭 주소(#) · 그 탭에 든 구역 # */
type HubTabId = "today" | "local" | "discover" | "next";
const HUB_TABS: readonly { id: HubTabId; label: string; helper: string; art: string; anchor: string; anchors: readonly string[] }[] = [
    { id: "today", label: "오늘의 보물", helper: "출근도장 · 작은 돌봄", art: "/images/ui/daily-checkin-256.webp", anchor: "today-treasure", anchors: ["today-treasure"] },
    { id: "local", label: "동네 돌봄", helper: "병원 · 미용 · 호텔 찾기", art: "/images/ui/daily-care-256.webp", anchor: "local-care-finder", anchors: ["local-care-finder"] },
    { id: "discover", label: "굿즈 · 발견", helper: "굿즈 500명 공모전", art: "/images/ui/daily-hero-goods-384.webp", anchor: "goods-contest", anchors: ["goods-contest", "community-commerce-roadmap"] },
    { id: "next", label: "다음 보물", helper: "준비 중인 혜택", art: "/images/ui/daily-hero-treasure-384.webp", anchor: "growth-programs", anchors: ["growth-programs"] },
];

function tabForAnchor(anchor: string): HubTabId | null {
    if (!anchor) return null;
    return HUB_TABS.find((tab) => tab.anchors.includes(anchor))?.id ?? null;
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

/** 비회원 오늘의 보물 — 한 줄 네 장(2026-10-22 사용자): 1 출근도장 → 2 작은 돌봄 → 3 변화 기록 → 로그인 카드(같은 크기, 흰 종이) */
function GuestTodayCard() {
    return (
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
            <div className="dw-today-row">
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
                {/* 넷째 카드 — 로그인하면 오늘 기록이 이어져요(열쇠 배지 · 기록 수첩 그림 · 버튼 두 개) */}
                <div className="dw-login-card">
                    <span className="dw-step-num dw-step-key" aria-hidden="true"><i className="fa-solid fa-key" /></span>
                    <Image src="/images/ui/daily-hero-mypet-384.webp" alt="" width={128} height={128} className="dw-step-art" aria-hidden="true" />
                    <h3 className="ddb-crayon-title dw-h3">로그인하면 오늘 기록이 계정에 이어져요</h3>
                    <p className="dw-card-body">비회원도 아래 성장 프로그램과 운영 정책은 먼저 둘러볼 수 있습니다.</p>
                    <div className="mt-auto grid w-full gap-2 pt-4">
                        <Link href="/auth/login/?redirect=%2Ftreasure-mine%2F" className="ddb-crayon-link ddb-attention-cta dw-pill dw-pill-main dw-pill-sm">로그인하고 시작</Link>
                        <Link href="/auth/signup/?redirect=%2Ftreasure-mine%2F" className="ddb-motion-lift dw-pill dw-pill-sm">처음이라면 회원가입</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
