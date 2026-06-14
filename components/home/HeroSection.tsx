"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    fallbackHeroWeather,
    getHeroSeason,
    getHeroTimeBucket,
    normalizeHeroWeather,
    resolveHeroScene,
    seasonLabel,
    timeBucketLabel,
    type HeroAccountState,
    type HeroContext,
    type HeroSeason,
    type HeroTimeBucket,
    type HeroWeather,
} from "@/lib/hero-assets";
import { fetchHeroWeatherReport, heroWeatherSummary, type HeroWeatherReport } from "@/lib/hero-weather";
import { useAuth } from "@/lib/store";

const DEFAULT_CONTEXT: HeroContext = {
    weather: "clear",
    season: "summer",
    timeBucket: "day",
};

const HERO_SEASONS: HeroSeason[] = ["spring", "summer", "autumn", "winter"];
const HERO_TIME_BUCKETS: HeroTimeBucket[] = ["morning", "day", "evening", "night"];

const overlayClass = {
    warm: "from-neutral-950/58 via-neutral-900/18 to-transparent",
    cool: "from-neutral-950/60 via-slate-900/18 to-transparent",
    rain: "from-slate-950/66 via-slate-900/28 to-transparent",
    snow: "from-slate-950/58 via-slate-800/16 to-transparent",
    storm: "from-neutral-950/74 via-slate-950/36 to-transparent",
    fog: "from-slate-950/52 via-slate-700/18 to-transparent",
};

function normalizeHeroSeason(value: string | null | undefined): HeroSeason | null {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (HERO_SEASONS.includes(normalized as HeroSeason)) return normalized as HeroSeason;
    return null;
}

function normalizeHeroTimeBucket(value: string | null | undefined): HeroTimeBucket | null {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (HERO_TIME_BUCKETS.includes(normalized as HeroTimeBucket)) return normalized as HeroTimeBucket;
    return null;
}

function readHeroParam(key: string): string | null {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get(key);
    } catch {
        return null;
    }
}

function readHeroStorage(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function readManualHeroWeather(): HeroWeather | null {
    return normalizeHeroWeather(readHeroParam("heroWeather")) ?? normalizeHeroWeather(readHeroStorage("ddb.hero.weather"));
}

function readManualHeroSeason(): HeroSeason | null {
    return normalizeHeroSeason(readHeroParam("heroSeason")) ?? normalizeHeroSeason(readHeroStorage("ddb.hero.season"));
}

function readManualHeroTimeBucket(): HeroTimeBucket | null {
    return normalizeHeroTimeBucket(readHeroParam("heroTime")) ?? normalizeHeroTimeBucket(readHeroStorage("ddb.hero.time"));
}

function hasManualHeroContext(): boolean {
    return Boolean(readManualHeroWeather() || readManualHeroSeason() || readManualHeroTimeBucket());
}

function resolveClientContext(weatherOverride?: HeroWeather): HeroContext {
    const now = new Date();
    const season = readManualHeroSeason() ?? getHeroSeason(now);
    const timeBucket = readManualHeroTimeBucket() ?? getHeroTimeBucket(now);
    const weather = weatherOverride ?? readManualHeroWeather() ?? fallbackHeroWeather(season);

    return { weather, season, timeBucket };
}

function accountState(user: ReturnType<typeof useAuth>["user"]): HeroAccountState {
    if (user?.pets.some((pet) => pet.name)) return "pet";
    if (user) return "member";
    return "guest";
}

export default function HeroSection() {
    const { user } = useAuth();
    const [context, setContext] = useState<HeroContext>(DEFAULT_CONTEXT);
    const [weatherReport, setWeatherReport] = useState<HeroWeatherReport | null>(null);

    useEffect(() => {
        const initialContext = resolveClientContext();
        setContext(initialContext);

        if (hasManualHeroContext()) return;

        let active = true;
        fetchHeroWeatherReport().then((report) => {
            if (!active || !report) return;
            setWeatherReport(report);
            setContext(resolveClientContext(report.weather));
        });

        return () => {
            active = false;
        };
    }, []);

    const scene = useMemo(() => resolveHeroScene(context), [context]);
    const isNight = context.timeBucket === "night";
    const weatherSummary = heroWeatherSummary(weatherReport);
    const primaryPet = user?.pets.find((pet) => pet.name);
    const state = accountState(user);
    const body =
        state === "pet"
            ? `${primaryPet?.name} 사진과 프로필로 펫렌즈 초개인화 추천을 받고, 오늘 날씨에 맞는 산책템까지 바로 골라보세요.`
            : state === "member"
              ? "저장된 아이 정보에 펫렌즈 분석을 더해, 우리 아이에게 맞는 상품을 더 빠르게 추천해 드릴게요."
              : "사진 한 장으로 우리 아이에게 맞춘 펫렌즈 초개인화 추천을 받고, 날씨에 맞는 산책·간식·케어 기획전까지 한 번에 확인하세요.";
    const contextLabel = `${seasonLabel(context.season)} ${timeBucketLabel(context.timeBucket)}`;

    return (
        <section className={`hero-section relative isolate overflow-hidden bg-neutral-950 text-white ${isNight ? "hero-section-night" : ""}`}>
            <div className="hero-media-plane">
                <Image src={scene.poster} alt="" fill sizes="100vw" className="hero-media-backdrop" priority />
                <Image src={scene.poster} alt="" fill sizes="100vw" className="hero-media-main" priority />
                {scene.video && (
                    <video
                        key={scene.video}
                        className="hero-media-main"
                        poster={scene.poster}
                        autoPlay
                        muted
                        loop
                        playsInline
                    >
                        <source src={scene.video} type="video/mp4" />
                    </video>
                )}
                {isNight && (
                    <>
                        <div className="hero-night-layer" aria-hidden="true" />
                        <div className="hero-moon-crescent" aria-hidden="true" />
                        <div className="hero-stars" aria-hidden="true" />
                    </>
                )}
                <div className={`absolute inset-0 bg-gradient-to-r ${overlayClass[scene.overlay]}`} />
                {scene.effect !== "none" && (
                    <div className={`hero-weather-effect hero-weather-${scene.effect}`} aria-hidden="true" />
                )}
                <div className="hero-ziewcore-badge" aria-hidden="true">
                    <span>Powered by</span>
                    <strong>Ziewcore</strong>
                </div>
            </div>

            <div className="hero-content relative z-10 mx-auto flex max-w-[1280px] flex-col justify-end px-4 pb-10 pt-20 md:px-6 md:pb-12">
                <div className="max-w-[720px]">
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-black text-white ring-1 ring-white/28 backdrop-blur">
                            {scene.label}
                        </span>
                        <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-black text-white ring-1 ring-white/28 backdrop-blur">
                            {contextLabel}
                        </span>
                        {weatherSummary && (
                            <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-black text-white ring-1 ring-white/28 backdrop-blur">
                                {weatherSummary}
                            </span>
                        )}
                    </div>

                    <div className="hero-brand-row">
                        <h1 className="hero-wordmark-title">
                            <Image
                                src="/images/wordmark.png"
                                alt="댕다방"
                                width={520}
                                height={150}
                                className="hero-wordmark-image"
                                priority
                            />
                        </h1>
                        <Link href="/pet-lens" className="hero-petlens-badge" aria-label="펫렌즈로 이동">
                            <span className="petlens-illo" aria-hidden="true">
                                <span className="petlens-ear petlens-ear-left" />
                                <span className="petlens-ear petlens-ear-right" />
                                <span className="petlens-face">
                                    <span className="petlens-eye petlens-eye-left" />
                                    <span className="petlens-eye petlens-eye-right" />
                                    <span className="petlens-nose" />
                                    <span className="petlens-lens">
                                        <span />
                                    </span>
                                </span>
                                <span className="petlens-sparkle petlens-sparkle-one" />
                                <span className="petlens-sparkle petlens-sparkle-two" />
                            </span>
                            <span className="hero-petlens-copy">
                                <strong>펫렌즈</strong>
                                <em>사진으로 추천</em>
                            </span>
                        </Link>
                    </div>

                    <p className="mt-5 max-w-xl text-base font-bold leading-7 text-white/88 md:text-lg md:leading-8">
                        {body}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-2">
                        <Link href="#special-bundles" className="btn btn-hero-light">
                            <i className="fa-solid fa-tags text-xs" />
                            기획전
                        </Link>
                        <Link href="/recommendations" className="btn border border-white/35 bg-neutral-950/30 text-white backdrop-blur hover:bg-neutral-950/40">
                            추천 보기
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
