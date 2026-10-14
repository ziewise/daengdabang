export type MapPlace = { name: string; address?: string; lat?: number | null; lon?: number | null };

const clean = (value: string) => value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const key = (value: string) => clean(value).replace(/\s/g, "").toLowerCase();

export function placeAddress(place: MapPlace): string {
    const name = clean(place.name);
    const address = clean(place.address || "");
    if (!address.includes(",")) return address.startsWith(name) && name ? address.slice(name.length).trim() : address;
    const parts = address.split(",").map(clean).filter(part => part && key(part) !== key(name) && !/^(대한민국|한국|South Korea|Republic of Korea|\d{5})$/i.test(part));
    // Nominatim returns Korean addresses from the building to the province.
    if (parts.length > 1 && /(?:도|시)$/.test(parts.at(-1) || "")) parts.reverse();
    return [...new Set(parts)].join(" ");
}

export function placeSearchQuery(place: MapPlace): string {
    const address = placeAddress(place);
    const locality = address.split(/\s+/).filter(part => /(?:특별시|광역시|특별자치시|시|군|구)$/.test(part)).slice(0, 3).join(" ");
    // A short business + locality query avoids duplicated names and OSM's reverse address.
    return [locality, clean(place.name) || address].filter(Boolean).join(" ").slice(0, 180) || "동물병원";
}

export function placeMapLinks(place: MapPlace) {
    const query = encodeURIComponent(placeSearchQuery(place));
    const lat = place.lat;
    const lon = place.lon;
    const hasCoordinates = typeof lat === "number" && typeof lon === "number"
        && Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && (lat !== 0 || lon !== 0);
    return {
        kakao: `https://map.kakao.com/link/search/${query}`,
        naver: `https://map.naver.com/p/search/${query}`,
        google: `https://www.google.com/maps/search/?api=1&query=${query}`,
        position: hasCoordinates ? `https://map.kakao.com/link/map/${encodeURIComponent(clean(place.name).replace(/,/g, " "))},${lat},${lon}` : undefined,
    };
}
