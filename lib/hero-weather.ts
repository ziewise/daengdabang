import { type HeroWeather } from "@/lib/hero-assets";

export type HeroWeatherReport = {
    weather: HeroWeather;
    locationName: string;
    locationSource: "device" | "default" | "manual";
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

type HeroWeatherLocation = {
    latitude: number;
    longitude: number;
    name: string;
    source: HeroWeatherReport["locationSource"];
};

const CACHE_KEY_PREFIX = "ddb.hero.openmeteo.v2";
const CACHE_MS = 15 * 60 * 1000;
const GEOLOCATION_TIMEOUT_MS = 2600;
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
const DEFAULT_LOCATION: HeroWeatherLocation = {
    latitude: WEATHER_LATITUDE,
    longitude: WEATHER_LONGITUDE,
    name: WEATHER_LOCATION_NAME,
    source: "default",
};

const KOREA_LOCATION_LABELS = [
    { name: "서울", latitude: 37.5665, longitude: 126.978 },
    { name: "부산", latitude: 35.1796, longitude: 129.0756 },
    { name: "인천", latitude: 37.4563, longitude: 126.7052 },
    { name: "대구", latitude: 35.8714, longitude: 128.6014 },
    { name: "대전", latitude: 36.3504, longitude: 127.3845 },
    { name: "광주", latitude: 35.1595, longitude: 126.8526 },
    { name: "울산", latitude: 35.5384, longitude: 129.3114 },
    { name: "세종", latitude: 36.4801, longitude: 127.289 },
    { name: "제주", latitude: 33.4996, longitude: 126.5312 },
    { name: "수원", latitude: 37.2636, longitude: 127.0286 },
    { name: "고양", latitude: 37.6584, longitude: 126.832 },
    { name: "용인", latitude: 37.2411, longitude: 127.1776 },
    { name: "창원", latitude: 35.228, longitude: 128.6811 },
    { name: "청주", latitude: 36.6424, longitude: 127.489 },
    { name: "전주", latitude: 35.8242, longitude: 127.148 },
    { name: "천안", latitude: 36.8151, longitude: 127.1139 },
    { name: "춘천", latitude: 37.8813, longitude: 127.7298 },
    { name: "강릉", latitude: 37.7519, longitude: 128.8761 },
    { name: "포항", latitude: 36.019, longitude: 129.3435 },
    { name: "여수", latitude: 34.7604, longitude: 127.6622 },
];

function numberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readManualLocation(): HeroWeatherLocation | null {
    try {
        const params = new URLSearchParams(window.location.search);
        const latitudeText = params.get("heroLat");
        const longitudeText = params.get("heroLon");
        if (!latitudeText || !longitudeText) return null;
        const latitude = Number(latitudeText);
        const longitude = Number(longitudeText);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        return {
            latitude,
            longitude,
            name: params.get("heroLocation") || nearestKoreanLocationName(latitude, longitude),
            source: "manual",
        };
    } catch {
        return null;
    }
}

function toRad(value: number) {
    return (value * Math.PI) / 180;
}

function distanceKm(a: Pick<HeroWeatherLocation, "latitude" | "longitude">, b: Pick<HeroWeatherLocation, "latitude" | "longitude">) {
    const earthRadiusKm = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function nearestKoreanLocationName(latitude: number, longitude: number): string {
    const nearest = KOREA_LOCATION_LABELS
        .map((location) => ({
            ...location,
            distance: distanceKm({ latitude, longitude }, location),
        }))
        .sort((a, b) => a.distance - b.distance)[0];
    return nearest && nearest.distance <= 90 ? nearest.name : "현재 위치";
}

function getDeviceLocation(): Promise<HeroWeatherLocation | null> {
    if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = Number(position.coords.latitude.toFixed(3));
                const longitude = Number(position.coords.longitude.toFixed(3));
                resolve({
                    latitude,
                    longitude,
                    name: nearestKoreanLocationName(latitude, longitude),
                    source: "device",
                });
            },
            () => resolve(null),
            {
                enableHighAccuracy: false,
                maximumAge: CACHE_MS,
                timeout: GEOLOCATION_TIMEOUT_MS,
            },
        );
    });
}

function locationCacheKey(location: HeroWeatherLocation): string {
    const latitude = location.source === "default" ? location.latitude : Number(location.latitude.toFixed(2));
    const longitude = location.source === "default" ? location.longitude : Number(location.longitude.toFixed(2));
    return `${CACHE_KEY_PREFIX}.${location.source}.${latitude}.${longitude}`;
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

function buildReport(
    data: OpenMeteoResponse,
    source: HeroWeatherReport["source"],
    location: HeroWeatherLocation,
): HeroWeatherReport {
    const current = data.current;
    return {
        weather: classifyHeroWeather(current),
        locationName: location.name,
        locationSource: location.source,
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

function getCachedReport(location: HeroWeatherLocation): HeroWeatherReport | null {
    try {
        const raw = window.localStorage.getItem(locationCacheKey(location));
        if (!raw) return null;
        const cached = JSON.parse(raw) as HeroWeatherReport;
        if (!cached.fetchedAt || Date.now() - cached.fetchedAt > CACHE_MS) return null;
        return { ...cached, locationName: location.name, locationSource: location.source, source: "cache" };
    } catch {
        return null;
    }
}

function setCachedReport(location: HeroWeatherLocation, report: HeroWeatherReport) {
    try {
        window.localStorage.setItem(locationCacheKey(location), JSON.stringify({ ...report, source: "api" }));
    } catch {
        // Weather is decorative context; failing to cache should not affect shopping.
    }
}

export async function fetchHeroWeatherReport(): Promise<HeroWeatherReport | null> {
    const location = readManualLocation() ?? (await getDeviceLocation()) ?? DEFAULT_LOCATION;
    const cached = getCachedReport(location);
    if (cached) return cached;

    const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
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
        const report = buildReport(data, "api", location);
        setCachedReport(location, report);
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
