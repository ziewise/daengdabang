"use client";

/**
 * DailyLifeApp — 앱용 "매일 댕생활"(/treasure-mine) 화면 틀 · 프리미엄 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 기존 GrowthHub 의 항목은 모두 그대로 두고, 긴 한 줄 스크롤 대신 페이지 안 탭 5개로 나눈다.
 *   오늘 돌봄  — 출근도장 · 오늘 할 일                       (#today-treasure)
 *   성장 기록  — 레벨 · 진행률 · 기록 나누기 · 맞춤 상품       (#growth-record)
 *   이벤트     — 굿즈 500명 공모전 · 준비 중인 혜택            (#goods-contest · #growth-programs)
 *   동네 돌봄  — 병원 · 미용 · 호텔 · 데이케어 찾기            (#local-care-finder)  ← 관리자 화면에서 숨기면 탭도 빠짐
 *   안내       — 댕다방 확장 계획 · 안심 이용 기준            (#community-commerce-roadmap)
 * 화면:
 *  - 머리: 매일 댕생활 일러스트를 꽉 채운 사진형 카드 — 스크롤하면 그림이 천천히 밀려 올라가며 살짝 확대(시차)
 *  - 탭: 아이폰식 분할 버튼 — 흰 판이 스프링처럼 미끄러짐. 화면은 넘긴 방향에서 흐림→또렷하게 들어오고, 옆으로 밀어도 넘어감
 *  - 바탕: 고른 탭 강조색이 위쪽에 아주 옅게 번짐
 * 머리 문구는 관리자 화면에서 바꾸는 content.hero 를 그대로 쓴다. 주소 끝 #구역 이름으로 들어오면 그 탭 · 구역을 연다.
 */

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { hasShareableAiRecord } from "@/components/growth/GrowthHub";
import { DEFAULT_GROWTH_HUB_CONTENT, loadPublishedGrowthContent } from "@/lib/growth-content";
import { useAuth } from "@/lib/store";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import EventsPanel from "./EventsPanel";
import GrowthPanel from "./GrowthPanel";
import InfoPanel from "./InfoPanel";
import LocalCarePanel from "./LocalCarePanel";
import TodayPanel from "./TodayPanel";
import { DL_CSS, TONES, type Tone } from "./ui";

type TabKey = "today" | "growth" | "events" | "local" | "info";

type PageTab = { key: TabKey; label: string; tone: Tone; anchors: string[] };

// anchors[0] = 탭 주소 이름, 나머지 = 그 탭 안 구역 이름
const PAGE_TABS: PageTab[] = [
    { key: "today", label: "오늘", tone: TONES.blue, anchors: ["today-treasure"] },
    { key: "growth", label: "성장", tone: TONES.violet, anchors: ["growth-record"] },
    { key: "events", label: "이벤트", tone: TONES.rose, anchors: ["growth-events", "goods-contest", "growth-programs"] },
    { key: "local", label: "동네", tone: TONES.green, anchors: ["local-care-finder"] },
    { key: "info", label: "안내", tone: TONES.amber, anchors: ["growth-info", "community-commerce-roadmap"] },
];

export default function DailyLifeApp() {
    const { hydrated, user } = useAuth();
    const [content, setContent] = useState(DEFAULT_GROWTH_HUB_CONTENT);
    const [contentReady, setContentReady] = useState(false);
    const [tab, setTab] = useState<TabKey>("today");
    const [dir, setDir] = useState<"next" | "prev" | "none">("none");
    const sentinelRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLElement>(null);
    const trackedViewRef = useRef(false);
    const touchRef = useRef<{ x: number; y: number } | null>(null);

    const member = Boolean(user);
    const hasPet = Boolean(user?.pets.length);
    const hasAiRecord = Boolean(user?.pets.some(hasShareableAiRecord));
    // 관리자 화면 보이기/숨기기 — 동네 돌봄은 탭째로, 혜택 · 안심 기준은 탭 안에서
    const tabs = PAGE_TABS.filter((t) => t.key !== "local" || content.visibility.localCare);
    const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === tab));
    const active = tabs[activeIndex];

    // 관리자 화면에서 바꾼 문구 불러오기 (실패하면 기본 문구)
    useEffect(() => {
        const controller = new AbortController();
        loadPublishedGrowthContent(controller.signal).then((published) => {
            if (controller.signal.aborted) return;
            if (published) setContent(published.content);
            setContentReady(true);
        });
        return () => controller.abort();
    }, []);

    // 화면 본 기록 — 기존 화면과 같은 이벤트 한 번
    useEffect(() => {
        if (!hydrated || trackedViewRef.current) return;
        trackedViewRef.current = true;
        trackStorefrontEvent("growth_hub_viewed", { surface: "treasure_mine", audience: user ? "member" : "guest" });
    }, [hydrated, user]);

    // 스크롤 따라 머리 그림 시차 — 0(맨 위) ~ 1 값을 CSS 변수 --p 로 (매 프레임 React 다시 그리기 없이)
    useEffect(() => {
        const hero = heroRef.current;
        if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let frame = 0;
        const update = () => {
            frame = 0;
            hero.style.setProperty("--p", Math.min(1, Math.max(0, window.scrollY / 260)).toFixed(3));
        };
        const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);

    // 탭 머리로 올리기 — 이미 아래로 내려와 있을 때만
    const scrollToTabs = useCallback(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const css = getComputedStyle(document.documentElement);
        const stickyTop = (parseFloat(css.getPropertyValue("--app-topbar-h")) || 56) + (parseFloat(css.getPropertyValue("--app-subbar-h")) || 0);
        const target = el.getBoundingClientRect().top + window.scrollY - stickyTop;
        if (window.scrollY > target) window.scrollTo({ top: target, behavior: "smooth" });
    }, []);

    // 탭 바꾸기 — 넘기는 방향 기억(들어오는 쪽) + 주소 #이름 바꾸기
    const switchTo = useCallback((key: TabKey, anchor?: string) => {
        const from = PAGE_TABS.findIndex((t) => t.key === tab);
        const to = PAGE_TABS.findIndex((t) => t.key === key);
        if (key !== tab) setDir(to > from ? "next" : "prev");
        setTab(key);
        window.history.replaceState(null, "", `#${anchor || PAGE_TABS[to].anchors[0]}`);
    }, [tab]);

    // 구역 이름 → 탭 열고, 탭 안 구역이면 그 자리로
    const goTo = useCallback((anchor: string) => {
        const target = PAGE_TABS.find((t) => t.anchors.includes(anchor));
        if (!target) return;
        switchTo(target.key, anchor);
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
            const el = target.anchors[0] === anchor ? null : document.getElementById(anchor);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            else scrollToTabs();
        }));
    }, [scrollToTabs, switchTo]);

    // 처음 들어올 때 주소의 #구역 이름 따르기 (한 번만)
    const initialHashRef = useRef(false);
    useEffect(() => {
        if (initialHashRef.current) return;
        initialHashRef.current = true;
        const anchor = window.location.hash.replace(/^#/, "");
        if (anchor) window.setTimeout(() => goTo(anchor), 0);
    }, [goTo]);

    const pickTab = (key: TabKey) => {
        switchTo(key);
        scrollToTabs();
    };

    // 화면을 옆으로 밀면 이웃 탭으로 — 가로로 60px 넘게, 세로보다 확실히 가로일 때만
    const onTouchStart = (event: React.TouchEvent) => {
        const t = event.touches[0];
        touchRef.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (event: React.TouchEvent) => {
        const start = touchRef.current;
        touchRef.current = null;
        if (!start) return;
        const t = event.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
        const next = tabs[activeIndex + (dx < 0 ? 1 : -1)];
        if (next) pickTab(next.key);
    };

    const hero = content.hero;

    return (
        <div
            className="relative isolate flex-1 overflow-x-clip break-keep px-4 pb-12 pt-3"
            style={{ "--bg-tint": active.tone.tint } as CSSProperties}
            data-growth-motion-scope
        >
            <style dangerouslySetInnerHTML={{ __html: DL_CSS + HERO_CSS }} />
            <div className="pv-bg pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />

            <div className="mx-auto w-full max-w-md">
                {/* ── 머리 — 일러스트를 꽉 채운 사진형 카드 ── */}
                <section ref={heroRef} className="pv-hero relative h-[232px] overflow-hidden rounded-[28px]" aria-labelledby="treasure-mine-title">
                    <span className="pv-hero-img absolute inset-0 block" aria-hidden="true">
                        <Image src="/images/ui/card-daily.webp" alt="" fill sizes="(max-width: 480px) 100vw, 448px" className="object-cover object-[50%_60%]" priority />
                    </span>
                    {/* 아래쪽 어둡게 — 글씨가 또렷하게 */}
                    <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,30,48,0)_30%,rgba(18,30,48,0.62)_100%)]" aria-hidden="true" />
                    <span className="pv-glass absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-bold text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#5ef0b4] motion-safe:animate-pulse" />{hero.badge}
                    </span>
                    <div className="pv-hero-copy absolute inset-x-4 bottom-4 text-white">
                        <p className="pv-kicker text-white/70">{hero.kicker}</p>
                        <h1 id="treasure-mine-title" className="mt-1 font-['Cafe24Ssurround',var(--font-wanted-sans)] text-[30px] leading-none tracking-[-0.03em]">매일 댕생활</h1>
                        <p className="mt-2 text-[13.5px] font-medium leading-snug text-white/90">
                            {hero.titlePrefix} <b className="font-extrabold text-white">{hero.titleHighlight}</b>{hero.titleSuffix}
                        </p>
                        <p className="mt-1 line-clamp-1 text-[12px] text-white/65">{hero.description}</p>
                    </div>
                </section>

                {/* ── 페이지 안 탭 — 아이폰식 분할 버튼, 상단바 밑에 붙어 따라온다 ── */}
                <div ref={sentinelRef} aria-hidden="true" />
                <div className="sticky z-[980] -mx-4 mt-4 px-4 pb-3 pt-2" style={{ top: "calc(var(--app-topbar-h, 56px) + var(--app-subbar-h, 0px))", background: "linear-gradient(180deg, rgba(250,247,244,0.97) 75%, rgba(250,247,244,0))" }}>
                    <nav className="relative grid rounded-[16px] bg-[rgba(31,26,24,0.06)] p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} role="tablist" aria-label="매일 댕생활 구역">
                        {/* 고른 탭 흰 판 — 스프링처럼 미끄러짐 */}
                        <span
                            className="absolute bottom-1 top-1 rounded-[12px] bg-white shadow-[0_1px_2px_rgba(31,26,24,.08),0_6px_14px_-6px_rgba(31,26,24,.22)] transition-[left] duration-500 ease-[cubic-bezier(.22,1.2,.36,1)]"
                            style={{ left: `calc(4px + (100% - 8px) * ${activeIndex} / ${tabs.length})`, width: `calc((100% - 8px) / ${tabs.length})` }}
                            aria-hidden="true"
                        />
                        {tabs.map((t) => {
                            const on = t.key === active.key;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    role="tab"
                                    id={`dl-tab-${t.key}`}
                                    aria-selected={on}
                                    aria-controls="dl-tabpanel"
                                    onClick={() => pickTab(t.key)}
                                    className="relative z-10 flex h-9 items-center justify-center gap-1.5 text-[13.5px] font-bold tracking-[-0.02em] transition-colors duration-300"
                                    style={{ color: on ? "#1f1a18" : "#8c7f78" }}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full transition-all duration-300" style={{ background: t.tone.accent, transform: on ? "scale(1)" : "scale(0)", opacity: on ? 1 : 0 }} aria-hidden="true" />
                                    {t.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* ── 고른 탭 화면 — 넘긴 방향에서 들어오고, 옆으로 밀어 넘길 수 있다 ── */}
                <div
                    key={active.key}
                    id="dl-tabpanel"
                    role="tabpanel"
                    aria-labelledby={`dl-tab-${active.key}`}
                    data-dir={dir}
                    className="pv-panel mt-1"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    {active.key === "today" && <div id="today-treasure" className="dl-anchor"><TodayPanel content={content.today} member={member} /></div>}
                    {active.key === "growth" && <div id="growth-record" className="dl-anchor"><GrowthPanel member={member} hasPet={hasPet} hasAiRecord={hasAiRecord} commerce={content.commerce} /></div>}
                    {active.key === "events" && (
                        <EventsPanel goods={content.goods} contentReady={contentReady} showPrograms={content.visibility.programs} member={member} hydrated={hydrated} goTo={goTo} />
                    )}
                    {active.key === "local" && <LocalCarePanel />}
                    {active.key === "info" && <InfoPanel showPolicy={content.visibility.policy} goTo={goTo} />}
                </div>
            </div>
        </div>
    );
}

// 머리 전용 — --p(0~1): 스크롤한 정도 · 유리 알약
const HERO_CSS = `
.pv-hero { --p: 0; box-shadow: 0 0 0 1px rgba(31,26,24,.05), 0 24px 44px -26px rgba(20,40,80,.55); }
.pv-hero-img { transform: translateY(calc(var(--p) * 34px)) scale(calc(1.04 + var(--p) * 0.08)); transform-origin: 50% 40%; }
.pv-hero-copy { transform: translateY(calc(var(--p) * -10px)); opacity: calc(1 - var(--p) * 0.35); }
.pv-glass { background: rgba(255,255,255,.18); backdrop-filter: blur(14px) saturate(160%); -webkit-backdrop-filter: blur(14px) saturate(160%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.3); }
@media (prefers-reduced-motion: reduce) { .pv-hero-img, .pv-hero-copy { transform: none; opacity: 1; } }
`;
