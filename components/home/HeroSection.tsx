"use client";

import { useEffect, useMemo, useState } from "react";
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
import { fetchHeroWeatherReport, heroWeatherSummary, type HeroWeatherReport } from "@/lib/hero-weather";
// 우리 영상 매핑 — 협업자 날씨/시간 감지 결과로 여름 영상 24종(PC/모바일) 중 선택,
// 그리고 그 영상 속 강아지 견종에 맞는 얼굴 배지 영상 선택
import { pickHeroVideo, pickHeroBreedVideo } from "@/lib/hero-summer-video";
// 워터마크(✦)를 브라우저 크기와 무관하게 동적 추적해 덮는 견종 얼굴 배지
import WatermarkBadge from "./WatermarkBadge";

type Props = {
    featuredProducts: CatalogProduct[];
};

const DEFAULT_CONTEXT: HeroContext = {
    weather: "clear",
    season: "summer",
    timeBucket: "day",
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

export default function HeroSection({ featuredProducts: _featuredProducts }: Props) {
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
    // 협업자가 감지한 날씨/시간 → 우리 여름 영상 경로 (PC/모바일)
    const heroVideo = pickHeroVideo(context.weather, context.timeBucket, isMobile);
    // 그 영상 속 강아지 견종에 맞는 얼굴 배지 영상 (비로그인 = 영상 견종, 로그인 펫 견종은 추후)
    const heroBreedVideo = pickHeroBreedVideo(context.weather, context.timeBucket);
    const weatherSummary = heroWeatherSummary(weatherReport);
    const contextLabel = `${seasonLabel(context.season)} ${timeBucketLabel(context.timeBucket)}`;

    return (
        <section className="hero-shell relative isolate overflow-hidden bg-neutral-950 text-white">
            <div className="absolute inset-0">
                <div className="hero-video-scene" aria-hidden="true">
                    {/* 여름 영상 24종(날씨×시간×PC/모바일) 중 선택.
                        key={heroVideo} 로 날씨/시간/기기 바뀌면 영상 자동 교체.
                        poster 는 협업자 HeroScene 에 없어 생략(preload="auto" 로 첫 프레임 빠르게).
                        모바일(9:16): 협업자 기본 object-position(72% 100% = 하단 정렬)을 top 으로 바꾸고
                        살짝 확대해 영상 "하단"을 화면 밖으로 잘라낸다 → 영상마다 위치가 다른 모바일
                        워터마크(✦)가 아예 안 보이게 한다. 강아지·인물은 중상단이라 그대로 보인다.
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
                        style={
                            isMobile
                                ? { objectPosition: "top center", transform: "scale(1.18)", transformOrigin: "top center" }
                                : undefined
                        }
                    />
                </div>
                {/* 배경 위 어두운 그라데이션 overlay 제거 — 배경 원본 톤 유지 */}
                {/* 날씨 효과 오버레이(빗금·눈·안개·구름) 렌더 제거 — 영상 자체에 날씨가
                    표현돼 있어 중복이라 끔. 협업자 엔진(hero-assets 의 scene.effect)은
                    그대로 두고, 여기서 오버레이 div 만 렌더하지 않는다. */}
                {/* 견종 얼굴 영상 배지 — 워터마크(✦)를 브라우저 크기와 무관하게 동적 추적해 덮는다.
                    좌표(가로 88%·세로 78%)는 여름 영상 24종 공통. PC 16:9 / 모바일 9:16 비율로
                    object-cover 변환하여 워터마크의 현재 화면 위치/크기에 배지를 정확히 맞춘다. */}
                {/* 견종 얼굴 배지.
                    PC(16:9): 워터마크(88%, 78%)를 배지가 동적 추적해 가린다.
                    모바일(9:16): 위 video 에서 영상 하단을 잘라내 워터마크가 안 보이므로, 배지는
                    "가림"이 아니라 "재미 요소"다. 잘 보이고 화면 하단에 안 잘리는 우측 중하단(78%)에 둔다. */}
                <WatermarkBadge
                    src={heroBreedVideo}
                    xRatio={isMobile ? 0.82 : 0.88}
                    yRatio={isMobile ? 0.78 : 0.78}
                    sizeRatio={isMobile ? 0.2 : 0.09}
                    videoAspect={isMobile ? 9 / 16 : 16 / 9}
                />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f7f8fb] via-[#f7f8fb]/45 to-transparent" />
            </div>

            <div className="hero-content-stage relative z-10 mx-auto flex max-w-[1280px] flex-col justify-start px-4 pt-6 pb-20 md:px-6 md:py-20 md:justify-center">
                <div className="max-w-[720px]">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-neutral-900/40 px-3 py-1 text-xs font-black text-white ring-1 ring-white/20 backdrop-blur">
                            {scene.label}
                        </span>
                        <span className="rounded-full bg-neutral-900/40 px-3 py-1 text-xs font-black text-white ring-1 ring-white/20 backdrop-blur">
                            {contextLabel}
                        </span>
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
                        <h1 className="mt-3 font-black leading-[1.08]" aria-label="매일이 더 특별한 댕댕이의 일상">
                            <span className="block text-4xl text-white md:text-6xl [text-shadow:0_2px_5px_rgb(0_0_0_/_80%),0_5px_28px_rgb(0_0_0_/_50%)]">
                                매일이 더 특별한
                            </span>
                            <span className="block text-4xl text-aurora-pink md:text-6xl [text-shadow:0_2px_6px_rgb(0_0_0_/_45%),0_5px_22px_rgb(0_0_0_/_30%)]">
                                댕댕이의 일상
                            </span>
                        </h1>
                    </div>
                </div>
            </div>
        </section>
    );
}
