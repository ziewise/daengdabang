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
import { productHref, versionProductImage } from "@/lib/shop";
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

export default function HeroSection({ featuredProducts }: Props) {
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
    const headline = primaryPet ? `${primaryPet.name}의 오늘 산책` : user ? `${user.name}님의 댕다방` : "댕다방";
    const body =
        state === "pet"
            ? `${primaryPet?.name}의 프로필과 지금 날씨를 함께 보고 필요한 용품을 먼저 보여드릴게요.`
            : state === "member"
              ? "저장된 취향과 오늘의 날씨 흐름을 이어 받아 필요한 반려견 용품을 빠르게 찾을 수 있어요."
              : "산책, 먹거리, 생활용품까지 실시간 날씨와 계절감에 맞춰 고르기 쉽게 정리했습니다.";
    const contextLabel = `${seasonLabel(context.season)} ${timeBucketLabel(context.timeBucket)}`;
    const products = featuredProducts.filter((product) => product.image).slice(0, 3);

    return (
        <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
            <div className="absolute inset-0">
                <Image src={scene.poster} alt="" fill sizes="100vw" className="object-cover" priority />
                {scene.video && (
                    <video
                        key={scene.video}
                        className="absolute inset-0 h-full w-full object-cover"
                        poster={scene.poster}
                        autoPlay
                        muted
                        loop
                        playsInline
                    >
                        <source src={scene.video} type="video/mp4" />
                    </video>
                )}
                <div className={`absolute inset-0 bg-gradient-to-r ${overlayClass[scene.overlay]}`} />
                {scene.effect !== "none" && (
                    <div className={`hero-weather-effect hero-weather-${scene.effect}`} aria-hidden="true" />
                )}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f7f8fb] via-[#f7f8fb]/45 to-transparent" />
            </div>

            {scene.accentImage && (
                <div className="pointer-events-none absolute bottom-6 right-6 hidden h-[42%] w-[38%] max-w-[520px] opacity-95 md:block xl:right-[calc((100vw-1280px)/2+24px)]">
                    <Image src={scene.accentImage} alt="" fill sizes="38vw" className="object-contain object-right-bottom" />
                </div>
            )}

            <div className="relative z-10 mx-auto flex min-h-[520px] max-w-[1280px] flex-col justify-end px-4 pb-8 pt-20 md:min-h-[560px] md:px-6 md:pb-10 lg:min-h-[600px]">
                <div className="max-w-[680px]">
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
                    <h1 className="mt-4 text-5xl font-black leading-none text-white md:text-7xl">
                        {headline}
                    </h1>
                    <p className="mt-5 max-w-xl text-base font-bold leading-7 text-white/85 md:text-lg md:leading-8">
                        {body}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-2">
                        <Link href="/products" className="btn btn-hero-light">
                            <i className="fa-solid fa-table-cells-large text-xs" />
                            전체상품
                        </Link>
                        <Link href="/pet-lens" className="btn border border-white/45 bg-white/10 text-white backdrop-blur hover:bg-white/20">
                            <i className="fa-solid fa-camera text-xs" />
                            펫렌즈
                        </Link>
                        <Link href="/recommendations" className="btn border border-white/35 bg-neutral-950/30 text-white backdrop-blur hover:bg-neutral-950/40">
                            추천 보기
                        </Link>
                    </div>
                </div>

                {products.length > 0 && (
                    <div className="mt-8 flex max-w-3xl gap-2 overflow-x-auto pb-1">
                        {products.map((product) => (
                            <Link
                                key={product.id}
                                href={productHref(product)}
                                className="grid min-w-[210px] grid-cols-[56px_1fr] items-center gap-3 rounded-lg border border-white/20 bg-white/15 p-2 text-white backdrop-blur transition hover:bg-white/20"
                            >
                                <span className="relative aspect-square overflow-hidden rounded-md bg-white">
                                    <Image src={versionProductImage(product.image)} alt="" fill sizes="56px" className="object-cover" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-[11px] font-black uppercase text-white/72">
                                        {product.brandEn || product.brandKo}
                                    </span>
                                    <span className="mt-0.5 block truncate text-sm font-black">{product.name}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
