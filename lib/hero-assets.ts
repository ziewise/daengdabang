export type HeroWeather =
    | "clear"
    | "cloudy"
    | "drizzle"
    | "rain"
    | "snow"
    | "wind"
    | "storm"
    | "fog";
export type HeroSeason = "spring" | "summer" | "autumn" | "winter";
export type HeroTimeBucket = "morning" | "day" | "evening" | "night";
export type HeroAccountState = "guest" | "member" | "pet";

export type HeroContext = {
    weather: HeroWeather;
    season: HeroSeason;
    timeBucket: HeroTimeBucket;
};

export type HeroWatermarkCover = {
    right: string;
    bottom: string;
    width: string;
    height: string;
};

export type HeroScene = {
    key: string;
    label: string;
    video: string;
    watermarkCover: HeroWatermarkCover;
};

export const HERO_WEATHERS: HeroWeather[] = [
    "clear",
    "cloudy",
    "drizzle",
    "rain",
    "snow",
    "wind",
    "storm",
    "fog",
];

export const HERO_TIME_BUCKETS: HeroTimeBucket[] = ["morning", "day", "evening", "night"];

const HERO_MOVIE_VERSION = "20260622-weather-watermark-cover-v3";

function heroMovie(filename: string): string {
    return `/images/hero/${filename}?v=${HERO_MOVIE_VERSION}`;
}

const WATERMARK_COVER: Record<"standard" | "low" | "wide", HeroWatermarkCover> = {
    standard: {
        right: "clamp(8px, 1.1vw, 18px)",
        bottom: "clamp(8px, 1.2vh, 16px)",
        width: "clamp(74px, 6.6vw, 92px)",
        height: "clamp(74px, 6.6vw, 92px)",
    },
    low: {
        right: "clamp(8px, 1vw, 16px)",
        bottom: "clamp(8px, 1.1vh, 14px)",
        width: "clamp(74px, 6.8vw, 96px)",
        height: "clamp(74px, 6.8vw, 96px)",
    },
    wide: {
        right: "clamp(8px, 1.1vw, 18px)",
        bottom: "clamp(8px, 1.2vh, 16px)",
        width: "clamp(82px, 7.2vw, 102px)",
        height: "clamp(82px, 7.2vw, 102px)",
    },
};

function pickTimeMovie(
    context: HeroContext,
    movies: {
        morning?: string;
        day: string;
        evening?: string;
        night?: string;
    },
): string {
    if (context.timeBucket === "morning" && movies.morning) return heroMovie(movies.morning);
    if (context.timeBucket === "night" && movies.night) return heroMovie(movies.night);
    if (context.timeBucket === "evening" && movies.evening) return heroMovie(movies.evening);
    return heroMovie(movies.day);
}

export function normalizeHeroWeather(value: string | null | undefined): HeroWeather | null {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (HERO_WEATHERS.includes(normalized as HeroWeather)) return normalized as HeroWeather;
    return null;
}

export function normalizeHeroTimeBucket(value: string | null | undefined): HeroTimeBucket | null {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (HERO_TIME_BUCKETS.includes(normalized as HeroTimeBucket)) return normalized as HeroTimeBucket;
    return null;
}

export function getHeroSeason(date: Date): HeroSeason {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
}

export function getHeroTimeBucket(date: Date): HeroTimeBucket {
    const hour = date.getHours();
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 17) return "day";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
}

export function fallbackHeroWeather(season: HeroSeason): HeroWeather {
    void season;
    return "clear";
}

export function resolveHeroScene(context: HeroContext): HeroScene {
    if (context.weather === "snow") {
        return {
            key: "snow",
            label: "눈 오는 산책길",
            video: pickTimeMovie(context, {
                morning: "weather-snow-day-v1.mp4",
                day: "weather-snow-day-v2.mp4",
                evening: "weather-snow-day-v1.mp4",
                night: "weather-snow-night.mp4",
            }),
            watermarkCover: context.timeBucket === "night" ? WATERMARK_COVER.low : WATERMARK_COVER.standard,
        };
    }

    if (context.weather === "storm") {
        return {
            key: "storm",
            label: "거센 비 산책 주의",
            video: pickTimeMovie(context, {
                morning: "weather-rain-day-v1.mp4",
                day: "weather-rain-day-v1.mp4",
                evening: "weather-rain-night-v1.mp4",
                night: "weather-rain-night-v1.mp4",
            }),
            watermarkCover: context.timeBucket === "evening" || context.timeBucket === "night" ? WATERMARK_COVER.low : WATERMARK_COVER.wide,
        };
    }

    if (context.weather === "rain") {
        return {
            key: "rain",
            label: "비 오는 산책길",
            video: pickTimeMovie(context, {
                morning: "weather-rain-day-v2.mp4",
                day: "weather-rain-day-v1.mp4",
                evening: "weather-rain-night-v1.mp4",
                night: "weather-rain-night-v1.mp4",
            }),
            watermarkCover: context.timeBucket === "evening" || context.timeBucket === "night" ? WATERMARK_COVER.low : WATERMARK_COVER.wide,
        };
    }

    if (context.weather === "drizzle") {
        return {
            key: "drizzle",
            label: "가랑비 산책길",
            video: pickTimeMovie(context, {
                morning: "weather-rain-day-v2.mp4",
                day: "weather-rain-day-v2.mp4",
                evening: "weather-rain-night-v1.mp4",
                night: "weather-rain-night-v1.mp4",
            }),
            watermarkCover: context.timeBucket === "evening" || context.timeBucket === "night" ? WATERMARK_COVER.low : WATERMARK_COVER.wide,
        };
    }

    if (context.weather === "fog") {
        return {
            key: "fog",
            label: "안개 낀 산책길",
            video: heroMovie("weather-fog-morning.mp4"),
            watermarkCover: WATERMARK_COVER.standard,
        };
    }

    if (context.weather === "wind") {
        return {
            key: "wind",
            label: "바람 부는 산책길",
            video: heroMovie("weather-wind-day.mp4"),
            watermarkCover: WATERMARK_COVER.wide,
        };
    }

    if (context.weather === "cloudy") {
        return {
            key: "cloudy",
            label: "구름 많은 산책길",
            video: pickTimeMovie(context, {
                morning: "weather-clear-day-v1.mp4",
                day: "weather-clear-day-v1.mp4",
                evening: "weather-clear-evening-ltr-v2.mp4",
                night: "weather-clear-night.mp4",
            }),
            watermarkCover: context.timeBucket === "night" ? WATERMARK_COVER.low : WATERMARK_COVER.standard,
        };
    }

    return {
        key: `clear-${context.timeBucket}`,
        label: context.timeBucket === "night" ? "밤 산책 준비" : "오늘의 산책 준비",
        video: pickTimeMovie(context, {
            morning: "weather-clear-day-v1.mp4",
            day: "weather-clear-day-v2.mp4",
            evening: "weather-clear-evening-rtl.mp4",
            night: "weather-clear-night.mp4",
        }),
        watermarkCover: context.timeBucket === "night" ? WATERMARK_COVER.low : WATERMARK_COVER.standard,
    };
}

export function seasonLabel(season: HeroSeason): string {
    return {
        spring: "봄",
        summer: "여름",
        autumn: "가을",
        winter: "겨울",
    }[season];
}

export function timeBucketLabel(timeBucket: HeroTimeBucket): string {
    return {
        morning: "아침",
        day: "낮",
        evening: "저녁",
        night: "밤",
    }[timeBucket];
}
