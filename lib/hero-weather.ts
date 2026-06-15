import { type HeroWeather } from "@/lib/hero-assets";

export type HeroWeatherReport = {
    weather: HeroWeather;
    locationName: string;
    temperatureC: number | null;
    apparentTemperatureC: number | null;
    weatherCode: number | null;
    cloudCover: number | null;
    windSpeedKmh: number | null;
    windGustKmh: number | null;
    precipitationMm: number | null;
    fetchedAt: number;
    source: "api" | "cache";
};

type OpenMeteoCurrent = {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    rain?: number;
    showers?: number;
    snowfall?: number;
    weather_code?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
};

type OpenMeteoResponse = {
    current?: OpenMeteoCurrent;
};

const CACHE_KEY = "ddb.hero.openmeteo.v1";
const CACHE_MS = 15 * 60 * 1000;
const DEFAULT_LATITUDE = 37.5665;
const DEFAULT_LONGITUDE = 126.978;
const DEFAULT_LOCATION_NAME = "서울";

function parseConfigNumber(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const WEATHER_LATITUDE = parseConfigNumber(process.env.NEXT_PUBLIC_DDB_WEATHER_LAT, DEFAULT_LATITUDE);
const WEATHER_LONGITUDE = parseConfigNumber(process.env.NEXT_PUBLIC_DDB_WEATHER_LON, DEFAULT_LONGITUDE);
const WEATHER_LOCATION_NAME = process.env.NEXT_PUBLIC_DDB_WEATHER_LOCATION_NAME || DEFAULT_LOCATION_NAME;

function numberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function classifyHeroWeather(current: OpenMeteoCurrent | undefined): HeroWeather {
    const code = numberOrNull(current?.weather_code);
    const windSpeed = numberOrNull(current?.wind_speed_10m) ?? 0;
    const windGust = numberOrNull(current?.wind_gusts_10m) ?? 0;
    const cloudCover = numberOrNull(current?.cloud_cover) ?? 0;
    const precipitation = numberOrNull(current?.precipitation) ?? 0;
    const rain = numberOrNull(current?.rain) ?? 0;
    const showers = numberOrNull(current?.showers) ?? 0;
    const snowfall = numberOrNull(current?.snowfall) ?? 0;

    if (code === 95 || code === 96 || code === 99) return "storm";
    if (code === 45 || code === 48) return "fog";
    if ([71, 73, 75, 77, 85, 86].includes(code ?? -1) || snowfall > 0) return "snow";
    if (code === 82 || precipitation >= 6 || rain >= 6 || showers >= 6) return "storm";
    if ([61, 63, 65, 66, 67, 80, 81].includes(code ?? -1) || rain > 0 || showers > 0) return "rain";
    if ([51, 53, 55, 56, 57].includes(code ?? -1) || (precipitation > 0 && precipitation < 1)) return "drizzle";
    if (windGust >= 38 || windSpeed >= 24) return "wind";
    if (code === 3 || cloudCover >= 75) return "cloudy";
    if (code === 2 || cloudCover >= 55) return "cloudy";
    return "clear";
}

function buildReport(data: OpenMeteoResponse, source: HeroWeatherReport["source"]): HeroWeatherReport {
    const current = data.current;
    return {
        weather: classifyHeroWeather(current),
        locationName: WEATHER_LOCATION_NAME,
        temperatureC: numberOrNull(current?.temperature_2m),
        apparentTemperatureC: numberOrNull(current?.apparent_temperature),
        weatherCode: numberOrNull(current?.weather_code),
        cloudCover: numberOrNull(current?.cloud_cover),
        windSpeedKmh: numberOrNull(current?.wind_speed_10m),
        windGustKmh: numberOrNull(current?.wind_gusts_10m),
        precipitationMm: numberOrNull(current?.precipitation),
        fetchedAt: Date.now(),
        source,
    };
}

function getCachedReport(): HeroWeatherReport | null {
    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw) as HeroWeatherReport;
        if (!cached.fetchedAt || Date.now() - cached.fetchedAt > CACHE_MS) return null;
        return { ...cached, source: "cache" };
    } catch {
        return null;
    }
}

function setCachedReport(report: HeroWeatherReport) {
    try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...report, source: "api" }));
    } catch {
        // Weather is decorative context; failing to cache should not affect shopping.
    }
}

export async function fetchHeroWeatherReport(): Promise<HeroWeatherReport | null> {
    const cached = getCachedReport();
    if (cached) return cached;

    const params = new URLSearchParams({
        latitude: String(WEATHER_LATITUDE),
        longitude: String(WEATHER_LONGITUDE),
        current: [
            "temperature_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "rain",
            "showers",
            "snowfall",
            "weather_code",
            "cloud_cover",
            "wind_speed_10m",
            "wind_gusts_10m",
        ].join(","),
        timezone: "Asia/Seoul",
        forecast_days: "1",
    });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
            signal: controller.signal,
        });
        if (!response.ok) return null;
        const data = (await response.json()) as OpenMeteoResponse;
        const report = buildReport(data, "api");
        setCachedReport(report);
        return report;
    } catch {
        return null;
    } finally {
        window.clearTimeout(timeout);
    }
}

export function heroWeatherSummary(report: HeroWeatherReport | null): string | null {
    if (!report) return null;
    const parts = [report.locationName];
    if (report.temperatureC !== null) parts.push(`${Math.round(report.temperatureC)}°`);
    if (report.windSpeedKmh !== null && report.windSpeedKmh >= 12) {
        parts.push(`바람 ${Math.round(report.windSpeedKmh)}km/h`);
    }
    if (report.precipitationMm !== null && report.precipitationMm > 0) {
        parts.push(`강수 ${report.precipitationMm.toFixed(1)}mm`);
    }
    return parts.join(" · ");
}
