import { type HeroWeather } from "@/lib/hero-assets";

export type HeroWeatherReport = {
    weather: HeroWeather;
    locationName: string;
    locationNameEn?: string;
    locationSource: "device" | "default" | "manual" | "selected" | "timezone";
    temperatureC: number | null;
    apparentTemperatureC: number | null;
    weatherCode: number | null;
    cloudCover: number | null;
    windSpeedKmh: number | null;
    windGustKmh: number | null;
    precipitationMm: number | null;
    localTime: string | null;
    timezone: string | null;
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
    timezone?: string;
    current?: OpenMeteoCurrent;
};

type HeroWeatherLocation = {
    latitude: number;
    longitude: number;
    name: string;
    nameEn?: string;
    timeZone?: string;
    source: HeroWeatherReport["locationSource"];
};

export type HeroWeatherRegionOption = {
    id: string;
    name: string;
    nameEn?: string;
    latitude: number;
    longitude: number;
    timeZone?: string;
    countryCode?: string;
};

export const HERO_AUTO_REGION_ID = "auto";
export const HERO_DEVICE_REGION_ID = "device";
const CACHE_KEY_PREFIX = "ddb.hero.openmeteo.v3";
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
    nameEn: WEATHER_LOCATION_NAME === "서울" ? "Seoul" : WEATHER_LOCATION_NAME,
    timeZone: "Asia/Seoul",
    source: "default",
};

export const HERO_WEATHER_REGION_OPTIONS: HeroWeatherRegionOption[] = [
    { id: "seoul", name: "서울", nameEn: "Seoul", latitude: 37.5665, longitude: 126.978, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "busan", name: "부산", nameEn: "Busan", latitude: 35.1796, longitude: 129.0756, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "incheon", name: "인천", nameEn: "Incheon", latitude: 37.4563, longitude: 126.7052, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "daegu", name: "대구", nameEn: "Daegu", latitude: 35.8714, longitude: 128.6014, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "daejeon", name: "대전", nameEn: "Daejeon", latitude: 36.3504, longitude: 127.3845, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "gwangju", name: "광주", nameEn: "Gwangju", latitude: 35.1595, longitude: 126.8526, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "ulsan", name: "울산", nameEn: "Ulsan", latitude: 35.5384, longitude: 129.3114, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "sejong", name: "세종", nameEn: "Sejong", latitude: 36.4801, longitude: 127.289, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "jeju", name: "제주", nameEn: "Jeju", latitude: 33.4996, longitude: 126.5312, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "suwon", name: "수원", nameEn: "Suwon", latitude: 37.2636, longitude: 127.0286, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "goyang", name: "고양", nameEn: "Goyang", latitude: 37.6584, longitude: 126.832, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "yongin", name: "용인", nameEn: "Yongin", latitude: 37.2411, longitude: 127.1776, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "changwon", name: "창원", nameEn: "Changwon", latitude: 35.228, longitude: 128.6811, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "cheongju", name: "청주", nameEn: "Cheongju", latitude: 36.6424, longitude: 127.489, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "jeonju", name: "전주", nameEn: "Jeonju", latitude: 35.8242, longitude: 127.148, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "cheonan", name: "천안", nameEn: "Cheonan", latitude: 36.8151, longitude: 127.1139, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "chuncheon", name: "춘천", nameEn: "Chuncheon", latitude: 37.8813, longitude: 127.7298, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "gangneung", name: "강릉", nameEn: "Gangneung", latitude: 37.7519, longitude: 128.8761, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "pohang", name: "포항", nameEn: "Pohang", latitude: 36.019, longitude: 129.3435, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "yeosu", name: "여수", nameEn: "Yeosu", latitude: 34.7604, longitude: 127.6622, timeZone: "Asia/Seoul", countryCode: "KR" },
    { id: "new-york", name: "뉴욕", nameEn: "New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York", countryCode: "US" },
    { id: "los-angeles", name: "로스앤젤레스", nameEn: "Los Angeles", latitude: 34.0522, longitude: -118.2437, timeZone: "America/Los_Angeles", countryCode: "US" },
    { id: "san-francisco", name: "샌프란시스코", nameEn: "San Francisco", latitude: 37.7749, longitude: -122.4194, timeZone: "America/Los_Angeles", countryCode: "US" },
    { id: "toronto", name: "토론토", nameEn: "Toronto", latitude: 43.6532, longitude: -79.3832, timeZone: "America/Toronto", countryCode: "CA" },
    { id: "vancouver", name: "밴쿠버", nameEn: "Vancouver", latitude: 49.2827, longitude: -123.1207, timeZone: "America/Vancouver", countryCode: "CA" },
    { id: "london", name: "런던", nameEn: "London", latitude: 51.5072, longitude: -0.1276, timeZone: "Europe/London", countryCode: "GB" },
    { id: "paris", name: "파리", nameEn: "Paris", latitude: 48.8566, longitude: 2.3522, timeZone: "Europe/Paris", countryCode: "FR" },
    { id: "berlin", name: "베를린", nameEn: "Berlin", latitude: 52.52, longitude: 13.405, timeZone: "Europe/Berlin", countryCode: "DE" },
    { id: "madrid", name: "마드리드", nameEn: "Madrid", latitude: 40.4168, longitude: -3.7038, timeZone: "Europe/Madrid", countryCode: "ES" },
    { id: "rome", name: "로마", nameEn: "Rome", latitude: 41.9028, longitude: 12.4964, timeZone: "Europe/Rome", countryCode: "IT" },
    { id: "tokyo", name: "도쿄", nameEn: "Tokyo", latitude: 35.6762, longitude: 139.6503, timeZone: "Asia/Tokyo", countryCode: "JP" },
    { id: "osaka", name: "오사카", nameEn: "Osaka", latitude: 34.6937, longitude: 135.5023, timeZone: "Asia/Tokyo", countryCode: "JP" },
    { id: "singapore", name: "싱가포르", nameEn: "Singapore", latitude: 1.3521, longitude: 103.8198, timeZone: "Asia/Singapore", countryCode: "SG" },
    { id: "bangkok", name: "방콕", nameEn: "Bangkok", latitude: 13.7563, longitude: 100.5018, timeZone: "Asia/Bangkok", countryCode: "TH" },
    { id: "taipei", name: "타이베이", nameEn: "Taipei", latitude: 25.033, longitude: 121.5654, timeZone: "Asia/Taipei", countryCode: "TW" },
    { id: "hong-kong", name: "홍콩", nameEn: "Hong Kong", latitude: 22.3193, longitude: 114.1694, timeZone: "Asia/Hong_Kong", countryCode: "HK" },
    { id: "dubai", name: "두바이", nameEn: "Dubai", latitude: 25.2048, longitude: 55.2708, timeZone: "Asia/Dubai", countryCode: "AE" },
    { id: "sydney", name: "시드니", nameEn: "Sydney", latitude: -33.8688, longitude: 151.2093, timeZone: "Australia/Sydney", countryCode: "AU" },
];

function numberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readManualLocation(): HeroWeatherLocation | null {
    try {
        const params = new URLSearchParams(window.location.search);
        const region = resolveHeroWeatherRegion(params.get("heroRegion"));
        if (region) {
            return {
                latitude: region.latitude,
                longitude: region.longitude,
                name: region.name,
                nameEn: region.nameEn,
                timeZone: region.timeZone,
                source: "manual",
            };
        }

        const latitudeText = params.get("heroLat");
        const longitudeText = params.get("heroLon");
        if (!latitudeText || !longitudeText) return null;
        const latitude = Number(latitudeText);
        const longitude = Number(longitudeText);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        return {
            latitude,
            longitude,
            name: params.get("heroLocation") || nearestGlobalLocationName(latitude, longitude).name,
            nameEn: params.get("heroLocationEn") || nearestGlobalLocationName(latitude, longitude).nameEn,
            source: "manual",
        };
    } catch {
        return null;
    }
}

export function resolveHeroWeatherRegion(regionId: string | null | undefined): HeroWeatherRegionOption | null {
    if (!regionId) return null;
    const normalized = regionId.trim().toLowerCase();
    if (!normalized || normalized === HERO_AUTO_REGION_ID || normalized === HERO_DEVICE_REGION_ID) return null;
    return HERO_WEATHER_REGION_OPTIONS.find((region) => (
        region.id === normalized ||
        region.name === regionId.trim() ||
        region.nameEn?.toLowerCase() === normalized
    )) ?? null;
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

function nearestGlobalLocationName(latitude: number, longitude: number): { name: string; nameEn: string } {
    const nearest = HERO_WEATHER_REGION_OPTIONS
        .map((location) => ({
            ...location,
            distance: distanceKm({ latitude, longitude }, location),
        }))
        .sort((a, b) => a.distance - b.distance)[0];
    return nearest && nearest.distance <= 140
        ? { name: nearest.name, nameEn: nearest.nameEn || nearest.name }
        : { name: "현재 위치", nameEn: "Current location" };
}

function selectedRegionLocation(regionId: string | null | undefined): HeroWeatherLocation | null {
    const region = resolveHeroWeatherRegion(regionId);
    if (!region) return null;
    return {
        latitude: region.latitude,
        longitude: region.longitude,
        name: region.name,
        nameEn: region.nameEn,
        timeZone: region.timeZone,
        source: "selected",
    };
}

function timezoneLocation(): HeroWeatherLocation | null {
    try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!timeZone) return null;
        const region = HERO_WEATHER_REGION_OPTIONS.find((option) => option.timeZone === timeZone);
        if (!region) return null;
        return {
            latitude: region.latitude,
            longitude: region.longitude,
            name: region.name,
            nameEn: region.nameEn,
            timeZone: region.timeZone,
            source: "timezone",
        };
    } catch {
        return null;
    }
}

function getDeviceLocation(): Promise<HeroWeatherLocation | null> {
    if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = Number(position.coords.latitude.toFixed(3));
                const longitude = Number(position.coords.longitude.toFixed(3));
                const nearest = nearestGlobalLocationName(latitude, longitude);
                resolve({
                    latitude,
                    longitude,
                    name: nearest.name,
                    nameEn: nearest.nameEn,
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
        locationNameEn: location.nameEn || location.name,
        locationSource: location.source,
        temperatureC: numberOrNull(current?.temperature_2m),
        apparentTemperatureC: numberOrNull(current?.apparent_temperature),
        weatherCode: numberOrNull(current?.weather_code),
        cloudCover: numberOrNull(current?.cloud_cover),
        windSpeedKmh: numberOrNull(current?.wind_speed_10m),
        windGustKmh: numberOrNull(current?.wind_gusts_10m),
        precipitationMm: numberOrNull(current?.precipitation),
        localTime: current?.time || null,
        timezone: data.timezone || location.timeZone || null,
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
        return {
            ...cached,
            locationName: location.name,
            locationNameEn: location.nameEn || cached.locationNameEn || location.name,
            locationSource: location.source,
            timezone: cached.timezone || location.timeZone || null,
            source: "cache",
        };
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

export async function fetchHeroWeatherReport(options: { regionId?: string | null } = {}): Promise<HeroWeatherReport | null> {
    const manualLocation = readManualLocation();
    const selectedLocation = manualLocation ? null : selectedRegionLocation(options.regionId);
    const useDeviceLocation = options.regionId === HERO_DEVICE_REGION_ID;
    const location = manualLocation
        ?? selectedLocation
        ?? (useDeviceLocation ? await getDeviceLocation() : null)
        ?? timezoneLocation()
        ?? DEFAULT_LOCATION;
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
        timezone: location.timeZone || "auto",
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

export function heroWeatherSummary(report: HeroWeatherReport | null, locale: "ko" | "en" = "ko"): string | null {
    if (!report) return null;
    const locationName = locale === "en" ? report.locationNameEn || report.locationName : report.locationName;
    const parts = [locationName];
    if (report.temperatureC !== null) parts.push(`${Math.round(report.temperatureC)}°`);
    if (report.windSpeedKmh !== null && report.windSpeedKmh >= 12) {
        parts.push(locale === "en" ? `Wind ${Math.round(report.windSpeedKmh)}km/h` : `바람 ${Math.round(report.windSpeedKmh)}km/h`);
    }
    if (report.precipitationMm !== null && report.precipitationMm > 0) {
        parts.push(locale === "en" ? `Rain ${report.precipitationMm.toFixed(1)}mm` : `강수 ${report.precipitationMm.toFixed(1)}mm`);
    }
    return parts.join(" · ");
}
