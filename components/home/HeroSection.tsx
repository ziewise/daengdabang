"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import {
    fallbackHeroWeather,
    getHeroSeason,
    getHeroTimeBucket,
    normalizeHeroWeather,
    resolveHeroScene,
    seasonLabel,
    timeBucketLabel,
    type HeroContext,
    type HeroWeather,
} from "@/lib/hero-assets";
import {
    HERO_AUTO_REGION_ID,
    HERO_DEVICE_REGION_ID,
    HERO_WEATHER_REGION_OPTIONS,
    fetchHeroWeatherReport,
    heroWeatherSummary,
    type HeroWeatherReport,
} from "@/lib/hero-weather";
import { useI18n } from "@/lib/i18n";
// 우리 영상 매핑 — 협업자 날씨/시간 감지 결과로 여름 영상 24종(PC/모바일) 중 선택,
// 그리고 그 영상 속 강아지 견종에 맞는 얼굴 배지 영상 선택
import { pickHeroVideo, pickHeroBreedVideo } from "@/lib/hero-summer-video";
// 워터마크(✦)를 브라우저 크기와 무관하게 동적 추적해 덮는 견종 얼굴 배지
import WatermarkBadge from "./WatermarkBadge";
// 펫렌즈 모달 런처 — 배지 클릭 시 펫렌즈 실행(Header·FloatingDock 과 동일한 런처)
import { usePetLensModal } from "@/components/petlens/PetLensModalLauncher";

type Props = {
    featuredProducts: CatalogProduct[];
};

const DEFAULT_CONTEXT: HeroContext = {
    weather: "clear",
    season: "summer",
    timeBucket: "day",
};
const HERO_REGION_STORAGE_KEY = "ddb.hero.weather.region.v1";

function normalizeStoredHeroRegion(value: string | null | undefined): string {
    const normalized = value?.trim().toLowerCase();
    if (!normalized || normalized === HERO_AUTO_REGION_ID) return HERO_AUTO_REGION_ID;
    if (normalized === HERO_DEVICE_REGION_ID) return HERO_DEVICE_REGION_ID;
    return HERO_WEATHER_REGION_OPTIONS.some((region) => region.id === normalized) ? normalized : HERO_AUTO_REGION_ID;
}

function readStoredHeroRegion(): string {
    if (typeof window === "undefined") return HERO_AUTO_REGION_ID;
    try {
        return normalizeStoredHeroRegion(window.localStorage.getItem(HERO_REGION_STORAGE_KEY));
    } catch {
        return HERO_AUTO_REGION_ID;
    }
}

function readQueryHeroRegion(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const params = new URLSearchParams(window.location.search);
        if (!params.has("heroRegion")) return null;
        return normalizeStoredHeroRegion(params.get("heroRegion"));
    } catch {
        return null;
    }
}

function readInitialHeroRegion(): string {
    return readQueryHeroRegion() ?? readStoredHeroRegion();
}

function writeStoredHeroRegion(regionId: string) {
    try {
        window.localStorage.setItem(HERO_REGION_STORAGE_KEY, normalizeStoredHeroRegion(regionId));
    } catch {
        // Region choice is a convenience preference; weather still falls back gracefully.
    }
}

function readManualHeroWeather(): HeroWeather | null {
    try {
        const params = new URLSearchParams(window.location.search);
        return (
            normalizeHeroWeather(params.get("heroWeather")) ??
            normalizeHeroWeather(window.localStorage.getItem("ddb.hero.weather"))
        );
    } catch {
        return null;
    }
}

function parseOpenMeteoLocalDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function resolveClientContext(weatherOverride?: HeroWeather, basisDate?: Date | null): HeroContext {
    const now = basisDate ?? new Date();
    const season = getHeroSeason(now);
    const timeBucket = getHeroTimeBucket(now);
    const weather = weatherOverride ?? readManualHeroWeather() ?? fallbackHeroWeather(season);

    return { weather, season, timeBucket };
}

function regionOptionLabel(region: { name: string; nameEn?: string }, locale: "ko" | "en") {
    return locale === "en" ? region.nameEn || region.name : region.name;
}

function localizedSceneLabel(key: string, fallback: string, locale: "ko" | "en") {
    if (locale === "ko") return fallback;
    const base = key.split("-")[0];
    return {
        snow: "Snowy walk",
        storm: "Heavy rain caution",
        rain: "Rainy walk",
        drizzle: "Light rain walk",
        fog: "Misty walk",
        wind: "Breezy walk",
        cloudy: "Cloudy walk",
        clear: "Walk-ready weather",
    }[base] || "Walk-ready weather";
}

export default function HeroSection({ featuredProducts: _featuredProducts }: Props) {
    // 펫렌즈 모달 열기 — 히어로 배지 클릭 시 실행
    const { open: openPetLens } = usePetLensModal();
    const { locale } = useI18n();
    const [weatherRegion, setWeatherRegion] = useState(readInitialHeroRegion);
    const [context, setContext] = useState<HeroContext>(DEFAULT_CONTEXT);
    const [weatherReport, setWeatherReport] = useState<HeroWeatherReport | null>(null);
    // 모바일(세로) 여부 — 9:16 영상, 데스크탑은 16:9 영상
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const initialContext = resolveClientContext();
        setContext(initialContext);
        setWeatherReport(null);

        if (readManualHeroWeather()) return;

        let active = true;
        fetchHeroWeatherReport({ regionId: weatherRegion }).then((report) => {
            if (!active || !report) return;
            setWeatherReport(report);
            setContext(resolveClientContext(report.weather, parseOpenMeteoLocalDate(report.localTime)));
        });

        return () => {
            active = false;
        };
    }, [weatherRegion]);

    function handleWeatherRegionChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextRegion = normalizeStoredHeroRegion(event.target.value);
        setWeatherRegion(nextRegion);
        writeStoredHeroRegion(nextRegion);
    }

    const scene = useMemo(() => resolveHeroScene(context), [context]);
    // 협업자가 감지한 날씨/시간 → 우리 여름 영상 경로 (PC/모바일)
    const heroVideo = pickHeroVideo(context.weather, context.timeBucket, isMobile);
    // 그 영상 속 강아지 견종에 맞는 얼굴 배지 영상 (비로그인 = 영상 견종, 로그인 펫 견종은 추후)
    const heroBreedVideo = pickHeroBreedVideo(context.weather, context.timeBucket);
    const weatherSummary = heroWeatherSummary(weatherReport, locale);
    const contextLabel = `${seasonLabel(context.season, locale)} ${timeBucketLabel(context.timeBucket, locale)}`;
    const sceneLabel = localizedSceneLabel(scene.key, scene.label, locale);

    return (
        <section className="hero-shell relative isolate overflow-hidden bg-neutral-950 text-white">
            <div className="absolute inset-0">
                <div className="hero-video-scene" aria-hidden="true">
                    {/* 여름 영상 24종(날씨×시간×PC/모바일) 중 선택.
                        key={heroVideo} 로 날씨/시간/기기 바뀌면 영상 자동 교체.
                        poster 는 협업자 HeroScene 에 없어 생략(preload="auto" 로 첫 프레임 빠르게).
                        모바일(9:16): scale 확대 없이 object-position "center bottom" 으로 영상 전체를 노출.
                        (예전엔 scale 1.1 + top 정렬로 워터마크 ✦ 를 화면 밖으로 잘라냈으나, 강아지·인물의
                        발 아래까지 함께 잘려 "아래가 잘린다"는 피드백 → scale 제거. 영상 맨 하단 워터마크는
                        섹션 하단의 흰색 그라데이션(아래 div, h-32)이 자연스럽게 덮어 가린다.)
                        PC(16:9)는 협업자 기본 유지(워터마크는 배지가 동적 추적해 가림). */}
                    <video
                        key={heroVideo}
                        src={heroVideo}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        className="hero-scene-media"
                        style={isMobile ? { objectPosition: "center bottom" } : undefined}
                    />
                </div>
                {/* 배경 위 어두운 그라데이션 overlay 제거 — 배경 원본 톤 유지 */}
                {/* 날씨 효과 오버레이(빗금·눈·안개·구름) 렌더 제거 — 영상 자체에 날씨가
                    표현돼 있어 중복이라 끔. 협업자 엔진(hero-assets 의 scene.effect)은
                    그대로 두고, 여기서 오버레이 div 만 렌더하지 않는다. */}
                {/* 견종 얼굴 영상 배지 — 워터마크(✦)를 브라우저 크기와 무관하게 동적 추적해 덮는다.
                    영상 object-position(posX/posY)까지 반영해 object-cover 변환하므로, 창을 확대/축소/줌
                    해도 영상의 실제 크롭을 따라가 배지가 워터마크에서 벗어나지 않는다.
                    PC: "center bottom"(posX 0.5, posY 1) / 모바일: "top center"(posY 0, 세로는 꽉 차 무관).
                    sizeRatio 0.12 로 키워 영상마다 조금씩 다른 워터마크 위치 편차도 흡수한다. */}
                {/* 견종 얼굴 배지.
                    PC(16:9): 워터마크(88%, 78%)를 배지가 동적 추적해 가린다.
                    모바일(9:16): 위 video 에서 영상 하단을 잘라내 워터마크가 안 보이므로, 배지는
                    "가림"이 아니라 "재미 요소"다. 잘 보이고 화면 하단에 안 잘리는 우측 중하단(78%)에 둔다. */}
                <WatermarkBadge
                    src={heroBreedVideo}
                    xRatio={isMobile ? 0.82 : 0.88}
                    yRatio={isMobile ? 0.58 : 0.78}
                    sizeRatio={isMobile ? 0.2 : 0.12}
                    videoAspect={isMobile ? 9 / 16 : 16 / 9}
                    posX={0.5}
                    posY={isMobile ? 0 : 1}
                    onClick={openPetLens}
                />
                {/* 하단 그라데이션 — 다음 섹션 전환 + 영상 맨 하단 워터마크(✦) 가림.
                    모바일은 더 높고(h-44) 진하게(via 65%) 해서 svh 가 작아도 워터마크가 비치지 않게 한다. */}
                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f7f8fb] via-[#f7f8fb]/65 to-transparent sm:h-32 sm:via-[#f7f8fb]/45" />
            </div>

            <div className="hero-content-stage relative z-10 mx-auto flex max-w-[1280px] flex-col justify-start px-4 pt-6 pb-20 md:px-6 md:py-20 md:justify-center">
                <div className="max-w-[720px]">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-neutral-900/40 px-3 py-1 text-xs font-black text-white ring-1 ring-white/20 backdrop-blur">
                            {sceneLabel}
                        </span>
                        <span className="rounded-full bg-neutral-900/40 px-3 py-1 text-xs font-black text-white ring-1 ring-white/20 backdrop-blur">
                            {contextLabel}
                        </span>
                        <select
                            className="hero-region-select"
                            value={weatherRegion}
                            onChange={handleWeatherRegionChange}
                            aria-label={locale === "en" ? "Hero weather location" : "히어로 날씨 지역"}
                        >
                            <option value={HERO_AUTO_REGION_ID}>
                                {locale === "en" ? "Auto location" : "자동 위치"}
                            </option>
                            <option value={HERO_DEVICE_REGION_ID}>
                                {locale === "en" ? "Precise current location" : "정확한 현재 위치"}
                            </option>
                            {HERO_WEATHER_REGION_OPTIONS.map((region) => (
                                <option key={region.id} value={region.id}>
                                    {regionOptionLabel(region, locale)}
                                </option>
                            ))}
                        </select>
                        {weatherSummary && (
                            <span className="rounded-full bg-neutral-900/40 px-3 py-1 text-xs font-black text-white ring-1 ring-white/20 backdrop-blur">
                                {weatherSummary}
                            </span>
                        )}
                        {/* 펫렌즈 진입은 우하단 플로팅 FAB(FloatingDock)로 이동 — 히어로 버튼 제거 */}
                    </div>
                    {/* hero-title-lockup(flex) 제거 — 라벨/제목을 세로로, 왼쪽 끝선 정렬 */}
                    <div className="mt-4">
                        {/* 컬렉션 라벨 */}
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-white md:text-sm [text-shadow:0_1px_3px_rgb(0_0_0_/_75%),0_2px_12px_rgb(0_0_0_/_55%)]">
                            DAENGDABANG · COLLECTION
                        </p>
                        {/* 메인 카피 — 첨부 이미지 색상: 윗줄 흰색, 아랫줄 핑크. 밝은 배경 가독성 위해 다중 text-shadow */}
                        <h1
                            className="mt-3 font-black leading-[1.08]"
                            aria-label={locale === "en" ? "Every day made special for your dog" : "매일이 더 특별한 댕댕이의 일상"}
                        >
                            <span className="block text-4xl text-white md:text-6xl [text-shadow:0_2px_5px_rgb(0_0_0_/_80%),0_5px_28px_rgb(0_0_0_/_50%)]">
                                {locale === "en" ? "Every day made special" : "매일이 더 특별한"}
                            </span>
                            <span className="block text-4xl text-aurora-pink md:text-6xl [text-shadow:0_2px_6px_rgb(0_0_0_/_45%),0_5px_22px_rgb(0_0_0_/_30%)]">
                                {locale === "en" ? "for your dog" : "댕댕이의 일상"}
                            </span>
                        </h1>
                    </div>
                </div>
            </div>
        </section>
    );
}
