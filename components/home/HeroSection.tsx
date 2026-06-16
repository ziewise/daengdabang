"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
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
    type HeroWeather,
} from "@/lib/hero-assets";
import { fetchHeroWeatherReport, heroWeatherSummary, type HeroWeatherReport } from "@/lib/hero-weather";
import { useAuth } from "@/lib/store";

type Props = {
    featuredProducts: CatalogProduct[];
};

const DEFAULT_CONTEXT: HeroContext = {
    weather: "clear",
    season: "summer",
    timeBucket: "day",
};

const overlayClass = {
    warm: "from-[#22180f]/80 via-[#3f2612]/50 to-transparent",
    cool: "from-[#071820]/80 via-[#0d3340]/45 to-transparent",
    rain: "from-[#07151c]/85 via-[#164252]/50 to-[#0b1b22]/20",
    snow: "from-[#102132]/80 via-[#31506a]/35 to-white/10",
    storm: "from-[#05070c]/90 via-[#102838]/64 to-[#071018]/30",
    fog: "from-[#26323b]/72 via-[#70808b]/30 to-white/10",
};

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

function resolveClientContext(weatherOverride?: HeroWeather): HeroContext {
    const now = new Date();
    const season = getHeroSeason(now);
    const timeBucket = getHeroTimeBucket(now);
    const weather = weatherOverride ?? readManualHeroWeather() ?? fallbackHeroWeather(season);

    return { weather, season, timeBucket };
}

function accountState(user: ReturnType<typeof useAuth>["user"]): HeroAccountState {
    if (user?.pets.some((pet) => pet.name)) return "pet";
    if (user) return "member";
    return "guest";
}

export default function HeroSection({ featuredProducts: _featuredProducts }: Props) {
    const { user } = useAuth();
    const [context, setContext] = useState<HeroContext>(DEFAULT_CONTEXT);
    const [weatherReport, setWeatherReport] = useState<HeroWeatherReport | null>(null);

    useEffect(() => {
        const initialContext = resolveClientContext();
        setContext(initialContext);

        if (readManualHeroWeather()) return;

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
    const weatherSummary = heroWeatherSummary(weatherReport);
    const primaryPet = user?.pets.find((pet) => pet.name);
    const state = accountState(user);
    const headline = primaryPet ? `${primaryPet.name}와 오늘 산책` : "댕다방";
    const body =
        state === "pet"
            ? `${primaryPet?.name} 사진과 오늘 날씨를 함께 보고, 산책 준비부터 먹거리와 생활용품까지 딱 맞게 추천해드려요.`
            : state === "member"
              ? "펫렌즈로 우리 아이 사진을 더하면, 날씨와 취향에 맞춘 초개인화 추천을 바로 받아볼 수 있어요."
              : "펫렌즈로 우리 아이를 알아보고, 오늘 날씨와 계절에 맞는 산책용품부터 먹거리까지 쉽게 고르세요.";
    const contextLabel = `${seasonLabel(context.season)} ${timeBucketLabel(context.timeBucket)}`;

    return (
        <section className="hero-shell relative isolate overflow-hidden bg-neutral-950 text-white">
            <div className="absolute inset-0">
                <div className="hero-video-scene" aria-hidden="true">
                    {scene.video ? (
                        <video
                            key={scene.video}
                            src={scene.video}
                            poster={scene.poster}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="auto"
                            className="hero-scene-media"
                        />
                    ) : (
                        <Image
                            src={scene.poster}
                            alt=""
                            fill
                            sizes="100vw"
                            className="hero-scene-media"
                            priority
                        />
                    )}
                </div>
                <div className={`absolute inset-0 bg-gradient-to-r ${overlayClass[scene.overlay]}`} />
                {scene.effect !== "none" && (
                    <div className={`hero-weather-effect hero-weather-${scene.effect}`} aria-hidden="true" />
                )}
                <div className="hero-ziewcore-badge" aria-hidden="true">
                    <span>Powered by</span>
                    <strong>Ziewcore</strong>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f7f8fb] via-[#f7f8fb]/45 to-transparent" />
            </div>

            <div className="hero-content-stage relative z-10 mx-auto flex max-w-[1280px] flex-col justify-end px-4 pb-8 pt-20 md:px-6 md:pb-10">
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
                    <div className="hero-title-lockup mt-4">
                        <h1 className="hero-wordmark-title" aria-label={headline}>
                            {primaryPet ? (
                                <span className="text-5xl font-black leading-none text-white md:text-7xl">
                                    {headline}
                                </span>
                            ) : (
                                <Image
                                    src="/images/wordmark.png"
                                    alt="댕다방"
                                    width={2048}
                                    height={768}
                                    className="hero-wordmark-image"
                                    priority
                                />
                            )}
                        </h1>
                        <Link href="/pet-lens" className="hero-petlens-cta" aria-label="펫렌즈로 사진 추천 받기">
                            <span className="hero-petlens-icon" aria-hidden="true">
                                <i className="fa-solid fa-camera" />
                            </span>
                            <span className="hero-petlens-copy">
                                <strong>펫렌즈</strong>
                                <small>사진으로 초개인화 추천</small>
                            </span>
                        </Link>
                    </div>
                    <p className="mt-5 max-w-xl text-base font-bold leading-7 text-white/88 md:text-lg md:leading-8">
                        {body}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-2">
                        <Link href="/bundles" className="btn btn-hero-light">
                            <i className="fa-solid fa-gift text-xs" />
                            기획전 보기
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
