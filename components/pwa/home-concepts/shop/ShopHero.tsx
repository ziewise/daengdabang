"use client";

/**
 * 스티커북 시안 — 쇼핑 첫 화면 히어로 (로컬 시안 전용, 배포 X)
 * ---------------------------------------------------------------------
 * 협업자 히어로(components/home/HeroSection)와 같은 엔진 · 같은 정보를 앱 모양으로.
 *  - 엔진 그대로: 날씨(Open-Meteo) · 계절 · 시간 감지(lib/hero-assets · hero-weather) → 영상 선택(lib/hero-summer-video)
 *    지역 선택은 웹과 같은 저장 키라 웹 · 앱이 같은 지역을 기억
 *  - 순서: 브랜드 문구(맨 위, 제목 테이프 대신 · 영문 꼬리표 없이) → 폴라로이드 영상(위에 글자 없음) → 사진 설명 자리에 날씨 칩
 *    (왼쪽 끝: 지역 고르기(톡 → 아래에서 올라오는 지역 고르기) / 오른쪽 끝: 지역 · 온도 + 계절 시간) — 작은 글씨는 나눔스퀘어라운드
 *  - 견종 얼굴 배지(그 영상 속 강아지 얼굴 영상): 폴라로이드 모서리에 걸친 동그란 스티커 + "저를 콕 눌러 분석하기!" 말풍선
 *    → 앱에서는 연구소 탭으로 이동(경로만 넘김 — 연구소의 사진·외형 / 행동·소리 분석이 같은 펫렌즈 화면으로 이어짐, 웹은 펫렌즈 창)
 *  - 산책 친구는 히어로 위로 오지 않음(충돌 회피 표시) · 히어로가 화면에 크게 보이는 동안은 숨었다가 내려가면 나타남
 */

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fallbackHeroWeather, getHeroSeason, getHeroTimeBucket, normalizeHeroWeather, seasonLabel, timeBucketLabel, type HeroContext, type HeroWeather } from "@/lib/hero-assets";
import { HERO_AUTO_REGION_ID, HERO_WEATHER_REGION_OPTIONS, fetchHeroWeatherReport, heroWeatherSummary, type HeroWeatherReport } from "@/lib/hero-weather";
import { pickHeroBreedVideo, pickHeroVideo } from "@/lib/hero-summer-video";
import { haptic } from "../gestures";
import { Tape } from "../sticker-kit";
import { Sheet } from "../show-parts";

/* ── 협업자 히어로와 같은 지역 저장(같은 키 · 같은 이벤트) ── */
const DEFAULT_CONTEXT: HeroContext = { weather: "clear", season: "summer", timeBucket: "day" };
const REGION_KEY = "ddb.hero.weather.region.v1";
const REGION_EVENT = "ddb:hero-weather-region-change";
const KR_REGIONS = HERO_WEATHER_REGION_OPTIONS.filter((r) => r.countryCode === "KR");
let memRegion = HERO_AUTO_REGION_ID;
const normRegion = (v: string | null | undefined) => {
    const n = v?.trim().toLowerCase();
    if (!n || n === HERO_AUTO_REGION_ID) return HERO_AUTO_REGION_ID;
    return KR_REGIONS.some((r) => r.id === n) ? n : HERO_AUTO_REGION_ID;
};
const readRegion = () => {
    try { memRegion = normRegion(window.localStorage.getItem(REGION_KEY)); } catch { /* 저장 막힘 — 메모리 값 */ }
    return memRegion;
};
const writeRegion = (id: string) => {
    memRegion = normRegion(id);
    try { window.localStorage.setItem(REGION_KEY, memRegion); } catch { /* 편의 기능 — 실패해도 날씨는 기본값 */ }
    window.dispatchEvent(new Event(REGION_EVENT));
};
const subscribeRegion = (cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(REGION_EVENT, cb);
    return () => { window.removeEventListener("storage", cb); window.removeEventListener(REGION_EVENT, cb); };
};
/** 주소 ?heroWeather= 또는 저장된 수동 날씨(협업자 시연용) */
const manualWeather = (): HeroWeather | null => {
    try {
        return normalizeHeroWeather(new URLSearchParams(window.location.search).get("heroWeather")) ?? normalizeHeroWeather(window.localStorage.getItem("ddb.hero.weather"));
    } catch { return null; }
};
const parseLocal = (v?: string | null) => {
    const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
};
const contextOf = (w?: HeroWeather, basis?: Date | null): HeroContext => {
    const now = basis ?? new Date();
    const season = getHeroSeason(now);
    return { weather: w ?? manualWeather() ?? fallbackHeroWeather(season), season, timeBucket: getHeroTimeBucket(now) };
};

export default function ShopHero() {
    const stored = useSyncExternalStore(subscribeRegion, readRegion, () => null);
    const ready = stored !== null;
    const region = stored ?? HERO_AUTO_REGION_ID;
    const [context, setContext] = useState<HeroContext>(DEFAULT_CONTEXT);
    const [report, setReport] = useState<HeroWeatherReport | null>(null);
    const [regionOpen, setRegionOpen] = useState(false);
    const [cue, setCue] = useState(false); // "저를 콕 눌러 분석하기!" 말풍선 — 잠깐씩 떠오름

    // 날씨 — 협업자 히어로와 같은 순서(수동 날씨 → 지역 날씨)
    useEffect(() => {
        if (!ready) return;
        let active = true;
        void (async () => {
            await Promise.resolve();
            if (!active) return;
            const manual = manualWeather();
            setContext(contextOf(manual ?? undefined));
            setReport(null);
            if (manual) return;
            const r = await fetchHeroWeatherReport({ regionId: region });
            if (!active || !r) return;
            setReport(r);
            setContext(contextOf(r.weather, parseLocal(r.localTime)));
        })();
        return () => { active = false; };
    }, [ready, region]);

    // 산책 친구는 히어로가 화면에 크게 보이는 동안 숨김 — <html data-shop-hero="on"> (AppShell CSS 가 강아지를 감춤)
    const heroRef = useRef<HTMLElement>(null);
    useEffect(() => {
        const el = heroRef.current;
        if (!el) return;
        const html = document.documentElement;
        const io = new IntersectionObserver(([e]) => {
            // 히어로가 화면 높이의 35% 이상을 차지하면 "보이는 중"
            const shown = e.isIntersecting && e.intersectionRect.height >= window.innerHeight * 0.35;
            html.dataset.shopHero = shown ? "on" : "off";
        }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
        io.observe(el);
        return () => { io.disconnect(); delete html.dataset.shopHero; };
    }, []);

    // 말풍선: 3초 뒤 나타나 4초 머물고, 10초마다 다시
    useEffect(() => {
        let t2 = 0;
        const show = () => { setCue(true); t2 = window.setTimeout(() => setCue(false), 4000); };
        const t1 = window.setTimeout(show, 3000);
        const iv = window.setInterval(show, 14000);
        return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearInterval(iv); };
    }, []);

    const video = pickHeroVideo(context.weather, context.timeBucket, true); // 앱 = 세로(모바일) 영상
    const breedVideo = pickHeroBreedVideo(context.weather, context.timeBucket);
    const summary = heroWeatherSummary(report, "ko");
    const regionName = region === HERO_AUTO_REGION_ID ? "현재 위치" : KR_REGIONS.find((r) => r.id === region)?.name ?? "현재 위치";

    return (
        // data-pet-companion-avoid: 산책 친구(협업자 충돌 회피)가 히어로(제목 · 영상 · 날씨 칩) 위로는 오지 않게
        <section ref={heroRef} aria-label="오늘의 댕다방" className="relative" data-pet-companion-avoid="true">
            {/* 브랜드 문구 — 페이지 맨 위(제목 테이프 대신) */}
            <h1 className="ah-display text-[25px] leading-[1.18]">
                매일이 더 특별한<br /><span className="text-[#ef5f8f]">댕댕이의 일상</span>
            </h1>

            {/* 폴라로이드 영상 — 위에 글자 없음 · 세로 영상을 정사각으로 — 아래쪽(워터마크 쪽)과 빈 하늘을 잘라 강아지가 있는 가운데를 보여 줌 */}
            <div className="shp-pol relative mt-4 bg-white p-2 pb-3">
                <Tape className="-top-2 left-1/2 z-10 h-4 w-16 -translate-x-1/2" color="rgba(255,200,215,.9)" style={{ rotate: "-3deg" }} />
                <div className="relative aspect-square overflow-hidden rounded-[3px] bg-[#f3ede6]">
                    <video key={video} src={video} autoPlay muted loop playsInline preload="auto" aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "center 70%" }} />
                </div>
                {/* 사진 설명 자리 — 왼쪽 끝: 지역 고르기 / 오른쪽 끝: 지역 · 온도 + 계절 시간 */}
                <div className="mt-2.5 flex items-center justify-between gap-1.5">
                    <button type="button" disabled={!ready} onClick={() => { haptic("light"); setRegionOpen(true); }} aria-label={`날씨 지역 바꾸기 · 지금 ${regionName}`}
                        className="shp-chip is-btn ah-light inline-flex shrink-0 items-center gap-1"><i aria-hidden="true" className="fa-solid fa-location-dot text-[9px]" />{regionName}<i aria-hidden="true" className="fa-solid fa-chevron-down text-[8px]" /></button>
                    <span className="flex min-w-0 items-center justify-end gap-1.5">
                        {summary ? <span className="shp-chip ah-light truncate">{summary}</span> : null}
                        <span className="shp-chip ah-light shrink-0">{`${seasonLabel(context.season, "ko")} ${timeBucketLabel(context.timeBucket, "ko")}`}</span>
                    </span>
                </div>

                {/* 견종 얼굴 배지 — 모서리 스티커 · 말풍선 */}
                <Link href="/app/sticker/lab/" aria-label="저를 콕 눌러 분석하기 — 연구소로" onClick={() => haptic("light")}
                    className="shp-badge absolute -right-2.5 bottom-[4.2rem] z-10 block h-[4.4rem] w-[4.4rem] rounded-full">
                    <video key={breedVideo} src={breedVideo} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" className="h-full w-full rounded-full object-cover" />
                    <span aria-hidden="true" className={`shp-cue ah-light ${cue ? "is-on" : ""}`}>저를 <b className="font-normal text-[#ef5f8f]">콕</b> 눌러 분석하기!</span>
                </Link>
            </div>

            {/* 지역 고르기 — 아래에서 올라오는 속지 */}
            <Sheet open={regionOpen} onClose={() => setRegionOpen(false)} label="날씨 지역 고르기" title="어느 동네 날씨로 볼까요?">
                <div className="grid grid-cols-3 gap-2 pb-2">
                    {[{ id: HERO_AUTO_REGION_ID, name: "현재 위치" }, ...KR_REGIONS].map((r) => (
                        <button key={r.id} type="button" aria-pressed={region === r.id}
                            onClick={() => { haptic("light"); writeRegion(r.id); setRegionOpen(false); }}
                            className={`shp-region ah-light rounded-full py-2 text-[13px] ${region === r.id ? "is-on" : ""}`}>{r.name}</button>
                    ))}
                </div>
            </Sheet>
        </section>
    );
}

export const SHOP_HERO_CSS = `
/* 히어로 폴라로이드 · 날씨 칩 · 견종 배지 */
.shp-pol { rotate: -.8deg; border-radius: 4px; box-shadow: 0 16px 26px -16px rgba(90,60,50,.55), 0 1px 2px rgba(90,60,50,.12); }
.shp-chip { font-size: 11px; line-height: 1; padding: 6px 9px; border-radius: 999px; background: #fff0f4; color: #b03a63; box-shadow: inset 0 0 0 1.5px #fbd3df; }
.shp-chip.is-btn { background: #fff; -webkit-tap-highlight-color: transparent; transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.shp-chip.is-btn:active { transform: scale(.94); }
.shp-badge { box-shadow: 0 0 0 3px #fff, 0 8px 14px -6px rgba(90,60,50,.5); rotate: 6deg; -webkit-tap-highlight-color: transparent; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.shp-badge:active { transform: scale(.92); }
.shp-cue { position: absolute; right: 50%; bottom: calc(100% + 8px); white-space: nowrap; font-size: 11px; padding: 6px 10px; border-radius: 14px; background: #fff8d9; color: #6b46d9;
  box-shadow: inset 0 0 0 1.5px #d9ccff, 0 6px 12px -6px rgba(61,43,160,.35); rotate: -6deg; opacity: 0; transform: translateY(6px) scale(.9); transform-origin: 90% 100%; transition: opacity .3s, transform .35s cubic-bezier(.3,1.6,.5,1); pointer-events: none; }
.shp-cue.is-on { opacity: 1; transform: none; }
.shp-region { background: #fff; color: #6f5b52; box-shadow: inset 0 0 0 1.5px #f1e3da; }
.shp-region.is-on { background: #ffe1ea; color: #c23d6c; box-shadow: inset 0 0 0 1.5px #f6a9bf; }
`;
