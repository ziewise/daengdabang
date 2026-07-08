import { type HeroWeather } from "@/lib/hero-assets";

export type HeroWeatherReport = {
    weather: HeroWeather;
    locationName: string;
    locationNameEn?: string;
    locationSource: "default" | "ip" | "manual" | "selected" | "timezone";
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

type OpenMeteoGeocodingResponse = {
    results?: Array<{
        name?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
        country_code?: string;
        country?: string;
    }>;
};

type FreeIpApiResponse = {
    latitude?: number;
    longitude?: number;
    cityName?: string;
    regionName?: string;
    countryName?: string;
    countryCode?: string;
    timeZones?: string[];
    isProxy?: boolean;
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
const CACHE_KEY_PREFIX = "ddb.hero.openmeteo.v5";
const CACHE_MS = 15 * 60 * 1000;
const IP_GEO_CACHE_KEY = "ddb.hero.ipgeo.v1";
const IP_GEO_CACHE_MS = 60 * 60 * 1000;
const IP_GEO_TIMEOUT_MS = 3200;
const GEOCODING_TIMEOUT_MS = 3200;
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

const CORE_HERO_WEATHER_REGION_OPTIONS: HeroWeatherRegionOption[] = [
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

const EXPANDED_GLOBAL_REGION_OPTIONS: HeroWeatherRegionOption[] = [
    { id: "chicago", name: "Chicago", nameEn: "Chicago", latitude: 41.8781, longitude: -87.6298, timeZone: "America/Chicago", countryCode: "US" },
    { id: "seattle", name: "Seattle", nameEn: "Seattle", latitude: 47.6062, longitude: -122.3321, timeZone: "America/Los_Angeles", countryCode: "US" },
    { id: "washington-dc", name: "Washington DC", nameEn: "Washington DC", latitude: 38.9072, longitude: -77.0369, timeZone: "America/New_York", countryCode: "US" },
    { id: "boston", name: "Boston", nameEn: "Boston", latitude: 42.3601, longitude: -71.0589, timeZone: "America/New_York", countryCode: "US" },
    { id: "miami", name: "Miami", nameEn: "Miami", latitude: 25.7617, longitude: -80.1918, timeZone: "America/New_York", countryCode: "US" },
    { id: "dallas", name: "Dallas", nameEn: "Dallas", latitude: 32.7767, longitude: -96.797, timeZone: "America/Chicago", countryCode: "US" },
    { id: "houston", name: "Houston", nameEn: "Houston", latitude: 29.7604, longitude: -95.3698, timeZone: "America/Chicago", countryCode: "US" },
    { id: "denver", name: "Denver", nameEn: "Denver", latitude: 39.7392, longitude: -104.9903, timeZone: "America/Denver", countryCode: "US" },
    { id: "las-vegas", name: "Las Vegas", nameEn: "Las Vegas", latitude: 36.1716, longitude: -115.1391, timeZone: "America/Los_Angeles", countryCode: "US" },
    { id: "atlanta", name: "Atlanta", nameEn: "Atlanta", latitude: 33.749, longitude: -84.388, timeZone: "America/New_York", countryCode: "US" },
    { id: "honolulu", name: "Honolulu", nameEn: "Honolulu", latitude: 21.3099, longitude: -157.8581, timeZone: "Pacific/Honolulu", countryCode: "US" },
    { id: "anchorage", name: "Anchorage", nameEn: "Anchorage", latitude: 61.2181, longitude: -149.9003, timeZone: "America/Anchorage", countryCode: "US" },
    { id: "montreal", name: "Montreal", nameEn: "Montreal", latitude: 45.5019, longitude: -73.5674, timeZone: "America/Toronto", countryCode: "CA" },
    { id: "mexico-city", name: "Mexico City", nameEn: "Mexico City", latitude: 19.4326, longitude: -99.1332, timeZone: "America/Mexico_City", countryCode: "MX" },
    { id: "cancun", name: "Cancun", nameEn: "Cancun", latitude: 21.1619, longitude: -86.8515, timeZone: "America/Cancun", countryCode: "MX" },
    { id: "sao-paulo", name: "Sao Paulo", nameEn: "Sao Paulo", latitude: -23.5558, longitude: -46.6396, timeZone: "America/Sao_Paulo", countryCode: "BR" },
    { id: "rio-de-janeiro", name: "Rio de Janeiro", nameEn: "Rio de Janeiro", latitude: -22.9068, longitude: -43.1729, timeZone: "America/Sao_Paulo", countryCode: "BR" },
    { id: "buenos-aires", name: "Buenos Aires", nameEn: "Buenos Aires", latitude: -34.6037, longitude: -58.3816, timeZone: "America/Argentina/Buenos_Aires", countryCode: "AR" },
    { id: "santiago", name: "Santiago", nameEn: "Santiago", latitude: -33.4489, longitude: -70.6693, timeZone: "America/Santiago", countryCode: "CL" },
    { id: "lima", name: "Lima", nameEn: "Lima", latitude: -12.0464, longitude: -77.0428, timeZone: "America/Lima", countryCode: "PE" },
    { id: "bogota", name: "Bogota", nameEn: "Bogota", latitude: 4.711, longitude: -74.0721, timeZone: "America/Bogota", countryCode: "CO" },
    { id: "panama-city", name: "Panama City", nameEn: "Panama City", latitude: 8.9824, longitude: -79.5199, timeZone: "America/Panama", countryCode: "PA" },
    { id: "amsterdam", name: "Amsterdam", nameEn: "Amsterdam", latitude: 52.3676, longitude: 4.9041, timeZone: "Europe/Amsterdam", countryCode: "NL" },
    { id: "brussels", name: "Brussels", nameEn: "Brussels", latitude: 50.8503, longitude: 4.3517, timeZone: "Europe/Brussels", countryCode: "BE" },
    { id: "zurich", name: "Zurich", nameEn: "Zurich", latitude: 47.3769, longitude: 8.5417, timeZone: "Europe/Zurich", countryCode: "CH" },
    { id: "vienna", name: "Vienna", nameEn: "Vienna", latitude: 48.2082, longitude: 16.3738, timeZone: "Europe/Vienna", countryCode: "AT" },
    { id: "prague", name: "Prague", nameEn: "Prague", latitude: 50.0755, longitude: 14.4378, timeZone: "Europe/Prague", countryCode: "CZ" },
    { id: "warsaw", name: "Warsaw", nameEn: "Warsaw", latitude: 52.2297, longitude: 21.0122, timeZone: "Europe/Warsaw", countryCode: "PL" },
    { id: "stockholm", name: "Stockholm", nameEn: "Stockholm", latitude: 59.3293, longitude: 18.0686, timeZone: "Europe/Stockholm", countryCode: "SE" },
    { id: "copenhagen", name: "Copenhagen", nameEn: "Copenhagen", latitude: 55.6761, longitude: 12.5683, timeZone: "Europe/Copenhagen", countryCode: "DK" },
    { id: "oslo", name: "Oslo", nameEn: "Oslo", latitude: 59.9139, longitude: 10.7522, timeZone: "Europe/Oslo", countryCode: "NO" },
    { id: "helsinki", name: "Helsinki", nameEn: "Helsinki", latitude: 60.1699, longitude: 24.9384, timeZone: "Europe/Helsinki", countryCode: "FI" },
    { id: "dublin", name: "Dublin", nameEn: "Dublin", latitude: 53.3498, longitude: -6.2603, timeZone: "Europe/Dublin", countryCode: "IE" },
    { id: "lisbon", name: "Lisbon", nameEn: "Lisbon", latitude: 38.7223, longitude: -9.1393, timeZone: "Europe/Lisbon", countryCode: "PT" },
    { id: "athens", name: "Athens", nameEn: "Athens", latitude: 37.9838, longitude: 23.7275, timeZone: "Europe/Athens", countryCode: "GR" },
    { id: "istanbul", name: "Istanbul", nameEn: "Istanbul", latitude: 41.0082, longitude: 28.9784, timeZone: "Europe/Istanbul", countryCode: "TR" },
    { id: "doha", name: "Doha", nameEn: "Doha", latitude: 25.2854, longitude: 51.531, timeZone: "Asia/Qatar", countryCode: "QA" },
    { id: "riyadh", name: "Riyadh", nameEn: "Riyadh", latitude: 24.7136, longitude: 46.6753, timeZone: "Asia/Riyadh", countryCode: "SA" },
    { id: "tel-aviv", name: "Tel Aviv", nameEn: "Tel Aviv", latitude: 32.0853, longitude: 34.7818, timeZone: "Asia/Jerusalem", countryCode: "IL" },
    { id: "cairo", name: "Cairo", nameEn: "Cairo", latitude: 30.0444, longitude: 31.2357, timeZone: "Africa/Cairo", countryCode: "EG" },
    { id: "johannesburg", name: "Johannesburg", nameEn: "Johannesburg", latitude: -26.2041, longitude: 28.0473, timeZone: "Africa/Johannesburg", countryCode: "ZA" },
    { id: "nairobi", name: "Nairobi", nameEn: "Nairobi", latitude: -1.2921, longitude: 36.8219, timeZone: "Africa/Nairobi", countryCode: "KE" },
    { id: "lagos", name: "Lagos", nameEn: "Lagos", latitude: 6.5244, longitude: 3.3792, timeZone: "Africa/Lagos", countryCode: "NG" },
    { id: "casablanca", name: "Casablanca", nameEn: "Casablanca", latitude: 33.5731, longitude: -7.5898, timeZone: "Africa/Casablanca", countryCode: "MA" },
    { id: "shanghai", name: "Shanghai", nameEn: "Shanghai", latitude: 31.2304, longitude: 121.4737, timeZone: "Asia/Shanghai", countryCode: "CN" },
    { id: "beijing", name: "Beijing", nameEn: "Beijing", latitude: 39.9042, longitude: 116.4074, timeZone: "Asia/Shanghai", countryCode: "CN" },
    { id: "guangzhou", name: "Guangzhou", nameEn: "Guangzhou", latitude: 23.1291, longitude: 113.2644, timeZone: "Asia/Shanghai", countryCode: "CN" },
    { id: "shenzhen", name: "Shenzhen", nameEn: "Shenzhen", latitude: 22.5431, longitude: 114.0579, timeZone: "Asia/Shanghai", countryCode: "CN" },
    { id: "manila", name: "Manila", nameEn: "Manila", latitude: 14.5995, longitude: 120.9842, timeZone: "Asia/Manila", countryCode: "PH" },
    { id: "jakarta", name: "Jakarta", nameEn: "Jakarta", latitude: -6.2088, longitude: 106.8456, timeZone: "Asia/Jakarta", countryCode: "ID" },
    { id: "kuala-lumpur", name: "Kuala Lumpur", nameEn: "Kuala Lumpur", latitude: 3.139, longitude: 101.6869, timeZone: "Asia/Kuala_Lumpur", countryCode: "MY" },
    { id: "ho-chi-minh-city", name: "Ho Chi Minh City", nameEn: "Ho Chi Minh City", latitude: 10.8231, longitude: 106.6297, timeZone: "Asia/Ho_Chi_Minh", countryCode: "VN" },
    { id: "hanoi", name: "Hanoi", nameEn: "Hanoi", latitude: 21.0278, longitude: 105.8342, timeZone: "Asia/Bangkok", countryCode: "VN" },
    { id: "delhi", name: "Delhi", nameEn: "Delhi", latitude: 28.6139, longitude: 77.209, timeZone: "Asia/Kolkata", countryCode: "IN" },
    { id: "mumbai", name: "Mumbai", nameEn: "Mumbai", latitude: 19.076, longitude: 72.8777, timeZone: "Asia/Kolkata", countryCode: "IN" },
    { id: "bangalore", name: "Bengaluru", nameEn: "Bengaluru", latitude: 12.9716, longitude: 77.5946, timeZone: "Asia/Kolkata", countryCode: "IN" },
    { id: "dhaka", name: "Dhaka", nameEn: "Dhaka", latitude: 23.8103, longitude: 90.4125, timeZone: "Asia/Dhaka", countryCode: "BD" },
    { id: "karachi", name: "Karachi", nameEn: "Karachi", latitude: 24.8607, longitude: 67.0011, timeZone: "Asia/Karachi", countryCode: "PK" },
    { id: "auckland", name: "Auckland", nameEn: "Auckland", latitude: -36.8509, longitude: 174.7645, timeZone: "Pacific/Auckland", countryCode: "NZ" },
    { id: "melbourne", name: "Melbourne", nameEn: "Melbourne", latitude: -37.8136, longitude: 144.9631, timeZone: "Australia/Melbourne", countryCode: "AU" },
    { id: "brisbane", name: "Brisbane", nameEn: "Brisbane", latitude: -27.4698, longitude: 153.0251, timeZone: "Australia/Brisbane", countryCode: "AU" },
    { id: "perth", name: "Perth", nameEn: "Perth", latitude: -31.9523, longitude: 115.8613, timeZone: "Australia/Perth", countryCode: "AU" },
];

export const HERO_WEATHER_REGION_OPTIONS: HeroWeatherRegionOption[] = [
    ...CORE_HERO_WEATHER_REGION_OPTIONS,
    ...EXPANDED_GLOBAL_REGION_OPTIONS,
];

const TIMEZONE_ONLY_REGION_OPTIONS: HeroWeatherRegionOption[] = [
    { id: "phoenix", name: "Phoenix", nameEn: "Phoenix", latitude: 33.4484, longitude: -112.074, timeZone: "America/Phoenix", countryCode: "US" },
    { id: "halifax", name: "Halifax", nameEn: "Halifax", latitude: 44.6488, longitude: -63.5752, timeZone: "America/Halifax", countryCode: "CA" },
    { id: "st-johns", name: "St. John's", nameEn: "St. John's", latitude: 47.5615, longitude: -52.7126, timeZone: "America/St_Johns", countryCode: "CA" },
    { id: "caracas", name: "Caracas", nameEn: "Caracas", latitude: 10.4806, longitude: -66.9036, timeZone: "America/Caracas", countryCode: "VE" },
    { id: "quito", name: "Quito", nameEn: "Quito", latitude: -0.1807, longitude: -78.4678, timeZone: "America/Guayaquil", countryCode: "EC" },
    { id: "la-paz", name: "La Paz", nameEn: "La Paz", latitude: -16.4897, longitude: -68.1193, timeZone: "America/La_Paz", countryCode: "BO" },
    { id: "montevideo", name: "Montevideo", nameEn: "Montevideo", latitude: -34.9011, longitude: -56.1645, timeZone: "America/Montevideo", countryCode: "UY" },
    { id: "asuncion", name: "Asuncion", nameEn: "Asuncion", latitude: -25.2637, longitude: -57.5759, timeZone: "America/Asuncion", countryCode: "PY" },
    { id: "guatemala-city", name: "Guatemala City", nameEn: "Guatemala City", latitude: 14.6349, longitude: -90.5069, timeZone: "America/Guatemala", countryCode: "GT" },
    { id: "san-jose-cr", name: "San Jose", nameEn: "San Jose", latitude: 9.9281, longitude: -84.0907, timeZone: "America/Costa_Rica", countryCode: "CR" },
    { id: "san-juan", name: "San Juan", nameEn: "San Juan", latitude: 18.4655, longitude: -66.1057, timeZone: "America/Puerto_Rico", countryCode: "PR" },
    { id: "reykjavik", name: "Reykjavik", nameEn: "Reykjavik", latitude: 64.1466, longitude: -21.9426, timeZone: "Atlantic/Reykjavik", countryCode: "IS" },
    { id: "kyiv", name: "Kyiv", nameEn: "Kyiv", latitude: 50.4501, longitude: 30.5234, timeZone: "Europe/Kyiv", countryCode: "UA" },
    { id: "bucharest", name: "Bucharest", nameEn: "Bucharest", latitude: 44.4268, longitude: 26.1025, timeZone: "Europe/Bucharest", countryCode: "RO" },
    { id: "sofia", name: "Sofia", nameEn: "Sofia", latitude: 42.6977, longitude: 23.3219, timeZone: "Europe/Sofia", countryCode: "BG" },
    { id: "belgrade", name: "Belgrade", nameEn: "Belgrade", latitude: 44.7866, longitude: 20.4489, timeZone: "Europe/Belgrade", countryCode: "RS" },
    { id: "zagreb", name: "Zagreb", nameEn: "Zagreb", latitude: 45.815, longitude: 15.9819, timeZone: "Europe/Zagreb", countryCode: "HR" },
    { id: "vilnius", name: "Vilnius", nameEn: "Vilnius", latitude: 54.6872, longitude: 25.2797, timeZone: "Europe/Vilnius", countryCode: "LT" },
    { id: "riga", name: "Riga", nameEn: "Riga", latitude: 56.9496, longitude: 24.1052, timeZone: "Europe/Riga", countryCode: "LV" },
    { id: "tallinn", name: "Tallinn", nameEn: "Tallinn", latitude: 59.437, longitude: 24.7536, timeZone: "Europe/Tallinn", countryCode: "EE" },
    { id: "moscow", name: "Moscow", nameEn: "Moscow", latitude: 55.7558, longitude: 37.6173, timeZone: "Europe/Moscow", countryCode: "RU" },
    { id: "tehran", name: "Tehran", nameEn: "Tehran", latitude: 35.6892, longitude: 51.389, timeZone: "Asia/Tehran", countryCode: "IR" },
    { id: "beirut", name: "Beirut", nameEn: "Beirut", latitude: 33.8938, longitude: 35.5018, timeZone: "Asia/Beirut", countryCode: "LB" },
    { id: "amman", name: "Amman", nameEn: "Amman", latitude: 31.9539, longitude: 35.9106, timeZone: "Asia/Amman", countryCode: "JO" },
    { id: "baghdad", name: "Baghdad", nameEn: "Baghdad", latitude: 33.3152, longitude: 44.3661, timeZone: "Asia/Baghdad", countryCode: "IQ" },
    { id: "muscat", name: "Muscat", nameEn: "Muscat", latitude: 23.588, longitude: 58.3829, timeZone: "Asia/Muscat", countryCode: "OM" },
    { id: "kuwait-city", name: "Kuwait City", nameEn: "Kuwait City", latitude: 29.3759, longitude: 47.9774, timeZone: "Asia/Kuwait", countryCode: "KW" },
    { id: "tbilisi", name: "Tbilisi", nameEn: "Tbilisi", latitude: 41.7151, longitude: 44.8271, timeZone: "Asia/Tbilisi", countryCode: "GE" },
    { id: "yerevan", name: "Yerevan", nameEn: "Yerevan", latitude: 40.1872, longitude: 44.5152, timeZone: "Asia/Yerevan", countryCode: "AM" },
    { id: "baku", name: "Baku", nameEn: "Baku", latitude: 40.4093, longitude: 49.8671, timeZone: "Asia/Baku", countryCode: "AZ" },
    { id: "tashkent", name: "Tashkent", nameEn: "Tashkent", latitude: 41.2995, longitude: 69.2401, timeZone: "Asia/Tashkent", countryCode: "UZ" },
    { id: "almaty", name: "Almaty", nameEn: "Almaty", latitude: 43.222, longitude: 76.8512, timeZone: "Asia/Almaty", countryCode: "KZ" },
    { id: "kathmandu", name: "Kathmandu", nameEn: "Kathmandu", latitude: 27.7172, longitude: 85.324, timeZone: "Asia/Kathmandu", countryCode: "NP" },
    { id: "colombo", name: "Colombo", nameEn: "Colombo", latitude: 6.9271, longitude: 79.8612, timeZone: "Asia/Colombo", countryCode: "LK" },
    { id: "yangon", name: "Yangon", nameEn: "Yangon", latitude: 16.8409, longitude: 96.1735, timeZone: "Asia/Yangon", countryCode: "MM" },
    { id: "phnom-penh", name: "Phnom Penh", nameEn: "Phnom Penh", latitude: 11.5564, longitude: 104.9282, timeZone: "Asia/Phnom_Penh", countryCode: "KH" },
    { id: "vientiane", name: "Vientiane", nameEn: "Vientiane", latitude: 17.9757, longitude: 102.6331, timeZone: "Asia/Vientiane", countryCode: "LA" },
    { id: "ulaanbaatar", name: "Ulaanbaatar", nameEn: "Ulaanbaatar", latitude: 47.8864, longitude: 106.9057, timeZone: "Asia/Ulaanbaatar", countryCode: "MN" },
    { id: "accra", name: "Accra", nameEn: "Accra", latitude: 5.6037, longitude: -0.187, timeZone: "Africa/Accra", countryCode: "GH" },
    { id: "addis-ababa", name: "Addis Ababa", nameEn: "Addis Ababa", latitude: 8.9806, longitude: 38.7578, timeZone: "Africa/Addis_Ababa", countryCode: "ET" },
    { id: "tunis", name: "Tunis", nameEn: "Tunis", latitude: 36.8065, longitude: 10.1815, timeZone: "Africa/Tunis", countryCode: "TN" },
    { id: "algiers", name: "Algiers", nameEn: "Algiers", latitude: 36.7538, longitude: 3.0588, timeZone: "Africa/Algiers", countryCode: "DZ" },
    { id: "darwin", name: "Darwin", nameEn: "Darwin", latitude: -12.4634, longitude: 130.8456, timeZone: "Australia/Darwin", countryCode: "AU" },
    { id: "fiji", name: "Suva", nameEn: "Suva", latitude: -18.1248, longitude: 178.4501, timeZone: "Pacific/Fiji", countryCode: "FJ" },
    { id: "guam", name: "Guam", nameEn: "Guam", latitude: 13.4443, longitude: 144.7937, timeZone: "Pacific/Guam", countryCode: "GU" },
    { id: "tahiti", name: "Tahiti", nameEn: "Tahiti", latitude: -17.6509, longitude: -149.426, timeZone: "Pacific/Tahiti", countryCode: "PF" },
];

const HERO_TIMEZONE_REGION_OPTIONS: HeroWeatherRegionOption[] = [
    ...HERO_WEATHER_REGION_OPTIONS,
    ...TIMEZONE_ONLY_REGION_OPTIONS,
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
    if (!normalized || normalized === HERO_AUTO_REGION_ID) return null;
    return HERO_TIMEZONE_REGION_OPTIONS.find((region) => (
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
    const nearest = HERO_TIMEZONE_REGION_OPTIONS
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
        const timeZone = readBrowserTimeZone();
        if (!timeZone) return null;
        const region = HERO_TIMEZONE_REGION_OPTIONS.find((option) => option.timeZone === timeZone);
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

function readBrowserTimeZone(): string | null {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
        return null;
    }
}

function timezoneCityQuery(timeZone: string): string | null {
    if (!timeZone || timeZone.startsWith("Etc/")) return null;
    const parts = timeZone.split("/").filter(Boolean);
    const city = parts[parts.length - 1]?.replace(/_/g, " ").trim();
    if (!city || !/[A-Za-z]/.test(city)) return null;
    return city;
}

async function geocodedTimezoneLocation(): Promise<HeroWeatherLocation | null> {
    const timeZone = readBrowserTimeZone();
    const query = timeZone ? timezoneCityQuery(timeZone) : null;
    if (!timeZone || !query || typeof fetch === "undefined") return null;

    const params = new URLSearchParams({
        name: query,
        count: "5",
        language: "en",
        format: "json",
    });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS);

    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, {
            signal: controller.signal,
        });
        if (!response.ok) return null;
        const data = (await response.json()) as OpenMeteoGeocodingResponse;
        const results = data.results ?? [];
        const best = results.find((result) => result.timezone === timeZone) ?? results[0];
        const latitude = numberOrNull(best?.latitude);
        const longitude = numberOrNull(best?.longitude);
        if (latitude === null || longitude === null) return null;
        const name = best?.name || query;
        return {
            latitude,
            longitude,
            name,
            nameEn: name,
            timeZone: best?.timezone || timeZone,
            source: "timezone",
        };
    } catch {
        return null;
    } finally {
        window.clearTimeout(timeout);
    }
}

function freeIpApiLocation(data: FreeIpApiResponse): HeroWeatherLocation | null {
    const latitude = numberOrNull(data.latitude);
    const longitude = numberOrNull(data.longitude);
    if (latitude === null || longitude === null) return null;

    const nearest = nearestGlobalLocationName(latitude, longitude);
    const fallbackName = data.cityName || data.regionName || data.countryName || "Current location";
    const timeZone = Array.isArray(data.timeZones) ? data.timeZones[0] : undefined;

    return {
        latitude,
        longitude,
        name: nearest.nameEn === "Current location" ? fallbackName : nearest.name,
        nameEn: nearest.nameEn === "Current location" ? fallbackName : nearest.nameEn,
        timeZone,
        source: "ip",
    };
}

function getCachedIpGeoLocation(): HeroWeatherLocation | null {
    try {
        const raw = window.localStorage.getItem(IP_GEO_CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw) as HeroWeatherLocation & { fetchedAt?: number };
        if (!cached.fetchedAt || Date.now() - cached.fetchedAt > IP_GEO_CACHE_MS) return null;
        if (!Number.isFinite(cached.latitude) || !Number.isFinite(cached.longitude)) return null;
        return {
            latitude: cached.latitude,
            longitude: cached.longitude,
            name: cached.name,
            nameEn: cached.nameEn,
            timeZone: cached.timeZone,
            source: "ip",
        };
    } catch {
        return null;
    }
}

function setCachedIpGeoLocation(location: HeroWeatherLocation) {
    try {
        window.localStorage.setItem(IP_GEO_CACHE_KEY, JSON.stringify({ ...location, fetchedAt: Date.now() }));
    } catch {
        // GeoIP cache is only a rate-limit guard; location fallback still works without it.
    }
}

async function ipGeoLocation(): Promise<HeroWeatherLocation | null> {
    if (typeof fetch === "undefined") return null;
    const cached = getCachedIpGeoLocation();
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), IP_GEO_TIMEOUT_MS);

    try {
        const response = await fetch("https://free.freeipapi.com/api/json", {
            signal: controller.signal,
            cache: "no-store",
        });
        if (!response.ok) return null;
        const data = (await response.json()) as FreeIpApiResponse;
        const location = freeIpApiLocation(data);
        if (location) setCachedIpGeoLocation(location);
        return location;
    } catch {
        return null;
    } finally {
        window.clearTimeout(timeout);
    }
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
    const ipLocation = manualLocation || selectedLocation ? null : await ipGeoLocation();
    const mappedTimezoneLocation = manualLocation || selectedLocation || ipLocation ? null : timezoneLocation();
    const geocodedLocation = manualLocation || selectedLocation || ipLocation || mappedTimezoneLocation
        ? null
        : await geocodedTimezoneLocation();
    const location = manualLocation
        ?? selectedLocation
        ?? ipLocation
        ?? mappedTimezoneLocation
        ?? geocodedLocation
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
