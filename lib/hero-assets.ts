export type HeroWeather = "clear" | "cloudy" | "rain" | "snow" | "wind" | "storm" | "fog";
export type HeroSeason = "spring" | "summer" | "autumn" | "winter";
export type HeroTimeBucket = "morning" | "day" | "evening" | "night";
export type HeroAccountState = "guest" | "member" | "pet";

export type HeroContext = {
    weather: HeroWeather;
    season: HeroSeason;
    timeBucket: HeroTimeBucket;
};

export type HeroScene = {
    key: string;
    label: string;
    video?: string;
    poster: string;
    accentImage?: string;
    overlay: "warm" | "cool" | "rain" | "snow";
};

export const HERO_WEATHERS: HeroWeather[] = ["clear", "cloudy", "rain", "snow", "wind", "storm", "fog"];

export function normalizeHeroWeather(value: string | null | undefined): HeroWeather | null {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (HERO_WEATHERS.includes(normalized as HeroWeather)) return normalized as HeroWeather;
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
    if (season === "winter") return "snow";
    return "clear";
}

export function resolveHeroScene(context: HeroContext): HeroScene {
    if (context.weather === "snow") {
        return {
            key: "snow",
            label: "눈 오는 산책길",
            video: "/images/hero/snow.mp4?v=20260614",
            poster: "/images/hero/snow-neighborhood.png?v=20260614",
            accentImage: "/images/hero/winter-sketch.png?v=20260614",
            overlay: "snow",
        };
    }

    if (context.weather === "rain" || context.weather === "storm") {
        return {
            key: "rain",
            label: "비 오는 산책길",
            poster: "/images/hero/rain-neighborhood.png?v=20260614",
            accentImage: "/images/hero/walker-cutout.png?v=20260614",
            overlay: "rain",
        };
    }

    if (context.weather === "cloudy" || context.weather === "fog" || context.weather === "wind") {
        return {
            key: "cloudy",
            label: "차분한 산책길",
            video: "/images/hero/default.mp4?v=20260614",
            poster: "/images/hero/clear-evening.png?v=20260614",
            accentImage: "/images/hero/walker-cutout.png?v=20260614",
            overlay: "cool",
        };
    }

    return {
        key: `clear-${context.timeBucket}`,
        label: context.timeBucket === "night" ? "밤 산책 준비" : "오늘의 산책 준비",
        video: "/images/hero/default.mp4?v=20260614",
        poster: "/images/hero/clear-evening.png?v=20260614",
        accentImage: "/images/hero/walker-cutout.png?v=20260614",
        overlay: context.timeBucket === "evening" || context.timeBucket === "night" ? "warm" : "cool",
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
