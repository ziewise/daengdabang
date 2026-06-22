/**
 * /demo/hero — 히어로 섹션 데모 (의뢰인 시연용, 임시 페이지)
 * ---------------------------------------------------------------------
 * 날씨·시간대·기기를 드롭다운/토글로 선택하면 그에 맞는 히어로 배경 영상과
 * 견종 배지가 즉시 바뀌는 모습을 보여준다. 실제 사이트는 접속 지역 날씨로
 * 자동 선택되지만, 여기선 수동 선택해 변화를 한눈에 시연한다.
 *
 * ⚠ 임시 시연 페이지 — app/demo/ 폴더만 지우면 깔끔히 제거된다.
 *   협업자 엔진/우리 lib(pickHeroVideo·pickHeroBreedVideo)는 그대로 "호출"만 한다.
 */
"use client";

import { useState } from "react";
import WatermarkBadge from "@/components/home/WatermarkBadge";
import { pickHeroVideo, pickHeroBreedVideo } from "@/lib/hero-summer-video";
import type { HeroWeather, HeroTimeBucket } from "@/lib/hero-assets";

// 데모 선택지 — 영상이 준비된 3종 날씨 × 4종 시간대
const WEATHERS: { value: HeroWeather; label: string }[] = [
    { value: "clear", label: "맑음 ☀️" },
    { value: "rain", label: "비 🌧️" },
    { value: "cloudy", label: "흐림 ☁️" },
];
const TIMES: { value: HeroTimeBucket; label: string }[] = [
    { value: "morning", label: "아침" },
    { value: "day", label: "점심" },
    { value: "evening", label: "저녁" },
    { value: "night", label: "밤" },
];

export default function HeroDemoPage() {
    const [weather, setWeather] = useState<HeroWeather>("clear");
    const [time, setTime] = useState<HeroTimeBucket>("day");
    const [mobile, setMobile] = useState(false);

    // 선택값 → 우리 lib 으로 영상/배지 경로 결정 (실제 사이트와 동일 로직)
    const video = pickHeroVideo(weather, time, mobile);
    const breedVideo = pickHeroBreedVideo(weather, time);
    const breed = breedVideo.split("/").pop()?.replace(".mp4", "") ?? "";

    return (
        <div className="mx-auto max-w-[1100px] px-4 py-10">
            <header className="mb-6 text-center">
                <p className="text-xs font-black text-aurora-indigo">DAENGDABANG · HERO DEMO</p>
                <h1 className="mt-1 text-2xl font-black text-neutral-950">히어로 섹션 — 날씨 · 시간대별 변화</h1>
                <p className="mt-1 text-sm font-bold text-neutral-500">
                    실제 사이트는 접속 지역 날씨로 자동 선택됩니다. 아래에서 직접 골라 변화를 확인해보세요.
                </p>
            </header>

            {/* 컨트롤 — 날씨 / 시간대 / 기기 */}
            <div className="mb-6 flex flex-wrap items-end justify-center gap-3">
                <label className="block">
                    <span className="mb-1 block text-xs font-black text-neutral-500">날씨</span>
                    <select
                        value={weather}
                        onChange={(e) => setWeather(e.target.value as HeroWeather)}
                        className="input min-w-[130px]"
                    >
                        {WEATHERS.map((w) => (
                            <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-black text-neutral-500">시간대</span>
                    <select
                        value={time}
                        onChange={(e) => setTime(e.target.value as HeroTimeBucket)}
                        className="input min-w-[130px]"
                    >
                        {TIMES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </label>
                <button type="button" onClick={() => setMobile((m) => !m)} className="btn btn-secondary">
                    {mobile ? "📱 모바일 (9:16)" : "🖥️ PC (16:9)"}
                </button>
            </div>

            {/* 미리보기 — 영상 + 견종 배지(워터마크 동적 추적 그대로 재사용) */}
            <div className="flex justify-center">
                <div
                    className={`relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 shadow-card ${
                        mobile ? "aspect-[9/16] w-[320px]" : "aspect-video w-full max-w-[860px]"
                    }`}
                >
                    {/* 모바일: 메인 히어로와 동일 — 영상을 위(top)로 정렬 + 확대해 하단 워터마크를 크롭 */}
                    <video
                        key={video}
                        src={video}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="h-full w-full object-cover"
                        style={
                            mobile
                                ? { objectPosition: "top center", transform: "scale(1.1)", transformOrigin: "top center" }
                                : undefined
                        }
                    />
                    {/* 모바일: 워터마크가 크롭돼 안 보이므로 배지는 재미 요소로 우측 중하단(78%) */}
                    <WatermarkBadge
                        src={breedVideo}
                        xRatio={mobile ? 0.82 : 0.88}
                        yRatio={mobile ? 0.78 : 0.78}
                        sizeRatio={mobile ? 0.2 : 0.09}
                        videoAspect={mobile ? 9 / 16 : 16 / 9}
                    />
                </div>
            </div>

            {/* 현재 선택된 파일 정보 (개발 확인용) */}
            <div className="mt-5 text-center text-sm font-bold text-neutral-500">
                영상: <span className="text-neutral-800">{video.split("/").pop()}</span>
                {" · "}배지 견종: <span className="text-aurora-indigo">{breed}</span>
            </div>
        </div>
    );
}
