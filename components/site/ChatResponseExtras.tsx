"use client";

import { FormEvent, useState } from "react";
import type { ShopChatCta, ShopChatMedical, ShopChatSource } from "@/lib/daengdabang-llm";

type ChatResponseExtrasProps = {
    medical?: ShopChatMedical;
    sources?: ShopChatSource[];
    ctas?: ShopChatCta[];
    onAsk: (prompt: string) => void | Promise<void>;
    compact?: boolean;
};

type ChoiceViewGroup = {
    title: string;
    choices: Array<{ label: string; prompt: string; description?: string }>;
};

type VetPlace = {
    id: string;
    name: string;
    address: string;
    phone?: string;
    openingHours?: string;
    distanceMeters: number;
    lat: number;
    lon: number;
    mapUrl: string;
};

type VetSearchState =
    | { status: "idle" }
    | { status: "loading"; message: string }
    | { status: "done"; places: VetPlace[]; fallbackUrl: string }
    | { status: "error"; message: string; fallbackUrl: string };

function triageLabel(medical?: ShopChatMedical) {
    if (!medical?.mode && medical?.triage === "vet_locator") return "병원 찾기";
    if (!medical?.mode) return "";
    if (medical.triage === "emergency") return "응급 가능성";
    if (medical.triage === "preventive_care") return "예방/복약 안내";
    return "건강 상담";
}

function buildMapUrl(query: string, latitude?: number, longitude?: number) {
    const encoded = encodeURIComponent(query || "동물병원");
    if (typeof latitude === "number" && typeof longitude === "number") {
        return `https://www.google.com/maps/search/${encoded}/@${latitude},${longitude},15z`;
    }
    return `https://www.google.com/maps/search/${encoded}`;
}

function openExternal(url?: string) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
}

function distanceMeters(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
    const radius = 6371000;
    const toRad = (value: number) => value * Math.PI / 180;
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistance(meters: number) {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)}km`;
}

function compactAddress(tags: Record<string, string>) {
    const full = tags["addr:full"] || tags["contact:address"];
    if (full) return full;
    return [
        tags["addr:province"],
        tags["addr:city"],
        tags["addr:district"],
        tags["addr:suburb"],
        tags["addr:street"],
        tags["addr:housenumber"],
    ].filter(Boolean).join(" ");
}

async function fetchNearbyVetPlaces(latitude: number, longitude: number, query = "동물병원") {
    const fallbackUrl = buildMapUrl(query, latitude, longitude);
    const radius = 6000;
    const overpassQuery = `[out:json][timeout:9];(node(around:${radius},${latitude},${longitude})["amenity"="veterinary"];way(around:${radius},${latitude},${longitude})["amenity"="veterinary"];relation(around:${radius},${latitude},${longitude})["amenity"="veterinary"];);out center tags 20;`;
    const endpoints = [
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass-api.de/api/interpreter",
    ];

    let lastError: unknown = null;
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
                body: new URLSearchParams({ data: overpassQuery }),
            });
            if (!response.ok) throw new Error(`place search ${response.status}`);
            const data = await response.json() as {
                elements?: Array<{
                    id: number;
                    type: string;
                    lat?: number;
                    lon?: number;
                    center?: { lat?: number; lon?: number };
                    tags?: Record<string, string>;
                }>;
            };
            const places = (data.elements ?? []).flatMap((element) => {
                const lat = element.lat ?? element.center?.lat;
                const lon = element.lon ?? element.center?.lon;
                if (typeof lat !== "number" || typeof lon !== "number") return [];
                const tags = element.tags ?? {};
                const name = tags["name:ko"] || tags.name || tags["official_name"] || "이름 미확인 동물병원";
                const address = compactAddress(tags);
                const phone = tags.phone || tags["contact:phone"];
                const openingHours = tags.opening_hours || tags["opening_hours:covid19"];
                const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lon},17z`;
                return [{
                    id: `${element.type}-${element.id}`,
                    name,
                    address,
                    phone,
                    openingHours,
                    lat,
                    lon,
                    mapUrl,
                    distanceMeters: distanceMeters(
                        { latitude, longitude },
                        { latitude: lat, longitude: lon }
                    ),
                }];
            });
            const sortedPlaces = places
                .sort((a, b) => a.distanceMeters - b.distanceMeters)
                .slice(0, 5);
            if (sortedPlaces.length > 0) return { fallbackUrl, places: sortedPlaces };
        } catch (error) {
            lastError = error;
        }
    }

    try {
        const nominatim = await fetchNominatimVetPlaces(latitude, longitude);
        return { fallbackUrl, places: nominatim };
    } catch (error) {
        lastError = error;
    }

    throw lastError instanceof Error ? lastError : new Error("place search failed");
}

async function fetchNominatimVetPlaces(latitude: number, longitude: number) {
    const delta = 0.1;
    const queries = ["animal hospital", "veterinary", "동물병원"];
    const places: VetPlace[] = [];
    const seen = new Set<string>();

    for (const search of queries) {
        const params = new URLSearchParams({
            format: "jsonv2",
            q: search,
            limit: "8",
            bounded: "1",
            addressdetails: "1",
            "accept-language": "ko,en",
            viewbox: `${longitude - delta},${latitude + delta},${longitude + delta},${latitude - delta}`,
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
        if (!response.ok) continue;
        const data = await response.json() as Array<{
            place_id?: number;
            display_name?: string;
            lat?: string;
            lon?: string;
            name?: string;
            type?: string;
            category?: string;
        }>;
        for (const item of data) {
            const lat = Number(item.lat);
            const lon = Number(item.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
            if (item.category && item.category !== "amenity" && item.type !== "veterinary") continue;
            const id = String(item.place_id ?? `${lat},${lon}`);
            if (seen.has(id)) continue;
            seen.add(id);
            const displayName = item.display_name || "이름 미확인 동물병원";
            const name = item.name || displayName.split(",")[0] || "이름 미확인 동물병원";
            places.push({
                id: `nominatim-${id}`,
                name,
                address: displayName,
                lat,
                lon,
                distanceMeters: distanceMeters(
                    { latitude, longitude },
                    { latitude: lat, longitude: lon }
                ),
                mapUrl: `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lon},17z`,
            });
        }
        if (places.length >= 5) break;
    }

    return places.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 5);
}

function ChoiceGroups({ medical, onAsk, compact }: Pick<ChatResponseExtrasProps, "medical" | "onAsk" | "compact">) {
    const [customGroupTitle, setCustomGroupTitle] = useState<string | null>(null);
    const [customText, setCustomText] = useState("");
    const groups: ChoiceViewGroup[] = medical?.choiceGroups?.filter((group) => group.choices.length > 0) ?? [];
    const fallbackChoices: ChoiceViewGroup[] = !groups.length && medical?.followUpSlots?.length
        ? [{
            title: "바로 선택",
            choices: medical.followUpSlots.map((slot) => ({ label: slot.label, prompt: slot.prompt })),
        }]
        : [];
    const allGroups = groups.length ? groups : fallbackChoices;
    if (!allGroups.length) return null;

    const submitCustom = (event: FormEvent) => {
        event.preventDefault();
        const value = customText.trim();
        if (!value) return;
        setCustomText("");
        setCustomGroupTitle(null);
        void onAsk(value);
    };

    return (
        <div className="mt-2 space-y-2">
            {allGroups.slice(0, 2).map((group) => (
                <div key={group.title} className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5 text-left">
                    <p className="text-[11px] font-black text-sky-900">{group.title}</p>
                    <div className="mt-2 grid gap-1.5">
                        {group.choices.slice(0, compact ? 5 : 8).map((choice) => (
                            <button
                                key={`${group.title}-${choice.label}`}
                                type="button"
                                onClick={() => void onAsk(choice.prompt)}
                                className="rounded-md border border-sky-200 bg-white px-2.5 py-2 text-left text-[11px] font-extrabold leading-4 text-sky-900 shadow-sm transition hover:border-sky-400 hover:bg-sky-100"
                            >
                                <span className="block">{choice.label}</span>
                                {choice.description ? (
                                    <span className="mt-0.5 block text-[10px] font-bold text-sky-700/80">{choice.description}</span>
                                ) : null}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setCustomGroupTitle((current) => current === group.title ? null : group.title)}
                        className="mt-2 w-full rounded-md border border-dashed border-sky-300 bg-white/70 px-2.5 py-2 text-left text-[11px] font-black text-sky-900 transition hover:bg-white"
                    >
                        답이 없어요. 직접 적을게요
                    </button>
                    {customGroupTitle === group.title ? (
                        <form onSubmit={submitCustom} className="mt-2 flex gap-1.5">
                            <input
                                value={customText}
                                onChange={(event) => setCustomText(event.target.value)}
                                className="min-w-0 flex-1 rounded-md border border-sky-200 bg-white px-2.5 py-2 text-[11px] font-bold text-neutral-900 outline-none focus:border-sky-500"
                                placeholder="상황을 직접 입력"
                                aria-label="객관식에 없는 답 직접 입력"
                            />
                            <button
                                type="submit"
                                className="shrink-0 rounded-md bg-sky-700 px-2.5 py-2 text-[11px] font-black text-white disabled:opacity-50"
                                disabled={!customText.trim()}
                            >
                                보내기
                            </button>
                        </form>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

function VetSearchResults({ state }: { state: VetSearchState }) {
    if (state.status === "idle") return null;
    if (state.status === "loading") {
        return (
            <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-left text-xs font-black text-indigo-900">
                <i className="fa-solid fa-spinner fa-spin mr-1.5" />
                {state.message}
            </div>
        );
    }

    if (state.status === "error") {
        return (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
                <p className="text-xs font-black leading-5 text-amber-900">{state.message}</p>
                <button
                    type="button"
                    onClick={() => openExternal(state.fallbackUrl)}
                    className="mt-2 rounded-md bg-neutral-950 px-3 py-2 text-[11px] font-black text-white"
                >
                    지도에서 직접 보기
                </button>
            </div>
        );
    }

    if (state.places.length === 0) {
        return (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
                <p className="text-xs font-black leading-5 text-amber-900">
                    공개 지도 데이터에서 가까운 동물병원 후보를 찾지 못했어요. 위치 주변 지도 검색으로 바로 확인해 주세요.
                </p>
                <button
                    type="button"
                    onClick={() => openExternal(state.fallbackUrl)}
                    className="mt-2 rounded-md bg-neutral-950 px-3 py-2 text-[11px] font-black text-white"
                >
                    지도에서 직접 보기
                </button>
            </div>
        );
    }

    return (
        <div className="mt-2 space-y-2 rounded-lg border border-indigo-100 bg-white p-2.5 text-left shadow-sm">
            <p className="text-[11px] font-black text-indigo-800">현재 위치 기준 가까운 동물병원 후보</p>
            {state.places.map((place, index) => (
                <div key={place.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-2.5">
                    <div className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                            {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black leading-5 text-neutral-950">{place.name}</p>
                            <p className="mt-0.5 text-[11px] font-bold leading-4 text-neutral-600">
                                {formatDistance(place.distanceMeters)}
                                {place.address ? ` · ${place.address}` : " · 주소는 지도에서 확인"}
                            </p>
                            {place.phone ? (
                                <a href={`tel:${place.phone}`} className="mt-1 inline-block text-[11px] font-black text-indigo-700">
                                    {place.phone}
                                </a>
                            ) : null}
                            {place.openingHours ? (
                                <p className="mt-1 text-[10px] font-bold leading-4 text-neutral-500">영업시간 데이터: {place.openingHours}</p>
                            ) : null}
                        </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => openExternal(place.mapUrl)}
                            className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-black text-neutral-700"
                        >
                            지도 열기
                        </button>
                        {place.phone ? (
                            <a
                                href={`tel:${place.phone}`}
                                className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-black text-neutral-700"
                            >
                                전화하기
                            </a>
                        ) : null}
                    </div>
                </div>
            ))}
            <p className="text-[10px] font-bold leading-4 text-neutral-500">
                공개 지도 데이터 기준 후보입니다. 실제 진료 가능 여부와 야간/응급 운영은 전화로 확인해 주세요.
            </p>
        </div>
    );
}

export default function ChatResponseExtras({ medical, sources, ctas, onAsk, compact = false }: ChatResponseExtrasProps) {
    const [vetSearch, setVetSearch] = useState<VetSearchState>({ status: "idle" });
    const widthClass = compact ? "max-w-[86%]" : "max-w-[82%]";
    const label = triageLabel(medical);
    const showMedicalCard = Boolean(
        medical?.mode &&
        (label || medical?.topicLabel || medical?.careWindow || medical?.redFlags?.length || medical?.firstSteps?.length)
    );

    const handleCta = async (cta: ShopChatCta) => {
        if (cta.kind === "prompt" && cta.prompt) {
            void onAsk(cta.prompt);
            return;
        }
        if (cta.kind === "external_link") {
            openExternal(cta.url);
            return;
        }
        if (cta.kind !== "geo_vet_search") return;

        const query = cta.query || "동물병원";
        const fallbackUrl = buildMapUrl(query);
        if (!("geolocation" in navigator)) {
            setVetSearch({
                status: "error",
                message: "이 브라우저에서는 현재 위치를 읽을 수 없어요. 지도 검색으로 확인해 주세요.",
                fallbackUrl,
            });
            return;
        }

        setVetSearch({ status: "loading", message: "현재 위치 기준으로 가까운 동물병원을 찾고 있어요." });
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 7000,
                    maximumAge: 60000,
                });
            });
            const result = await fetchNearbyVetPlaces(position.coords.latitude, position.coords.longitude, query);
            setVetSearch({ status: "done", places: result.places, fallbackUrl: result.fallbackUrl });
        } catch {
            setVetSearch({
                status: "error",
                message: "위치 권한이 거절됐거나 지도 후보 검색이 잠시 불안정해요. 아래 버튼으로 지도 검색을 열어 확인해 주세요.",
                fallbackUrl,
            });
        }
    };

    return (
        <>
            {ctas && ctas.length > 0 && (
                <div className={`mt-2 ${widthClass} space-y-1.5`}>
                    {ctas.slice(0, 3).map((cta) => (
                        <button
                            key={`${cta.kind}-${cta.label}`}
                            type="button"
                            onClick={() => void handleCta(cta)}
                            disabled={cta.kind === "geo_vet_search" && vetSearch.status === "loading"}
                            className="flex w-full items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-left text-xs font-black text-neutral-900 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50"
                        >
                            <i className={`fa-solid ${cta.icon || "fa-arrow-up-right-from-square"} text-indigo-600`} />
                            <span className="min-w-0">
                                <span className="block">{cta.label}</span>
                                {cta.helperText ? (
                                    <span className="mt-0.5 block text-[10px] font-bold leading-4 text-neutral-500">{cta.helperText}</span>
                                ) : null}
                            </span>
                        </button>
                    ))}
                    <VetSearchResults state={vetSearch} />
                </div>
            )}

            {showMedicalCard && (
                <div className={`mt-2 ${widthClass} rounded-lg border border-sky-100 bg-white p-3 text-left shadow-sm`}>
                    <div className="flex flex-wrap items-center gap-2">
                        {label ? (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                medical?.triage === "emergency" ? "bg-red-50 text-red-700" : "bg-sky-50 text-sky-800"
                            }`}>
                                {label}
                            </span>
                        ) : null}
                        {medical?.topicLabel ? (
                            <span className="text-xs font-black text-neutral-700">{medical.topicLabel}</span>
                        ) : null}
                        {medical?.knowledgeLevel ? (
                            <span className="text-[11px] font-black text-neutral-400">{medical.knowledgeLevel}</span>
                        ) : null}
                    </div>
                    {medical?.careWindow ? (
                        <p className="mt-2 text-xs font-black leading-5 text-neutral-700">{medical.careWindow}</p>
                    ) : null}
                    {medical?.redFlags && medical.redFlags.length > 0 ? (
                        <div className="mt-3">
                            <p className="text-[11px] font-black uppercase text-red-600">바로 병원 신호</p>
                            <ul className="mt-1 space-y-1 text-xs font-bold leading-5 text-neutral-700">
                                {medical.redFlags.slice(0, 3).map((item) => (
                                    <li key={item}>- {item}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    {medical?.firstSteps && medical.firstSteps.length > 0 ? (
                        <div className="mt-3">
                            <p className="text-[11px] font-black uppercase text-sky-700">지금 할 일</p>
                            <ul className="mt-1 space-y-1 text-xs font-bold leading-5 text-neutral-700">
                                {medical.firstSteps.slice(0, 3).map((item) => (
                                    <li key={item}>- {item}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    <ChoiceGroups medical={medical} onAsk={onAsk} compact={compact} />
                </div>
            )}

            {!showMedicalCard && <ChoiceGroups medical={medical} onAsk={onAsk} compact={compact} />}

            {sources && sources.length > 0 && (
                <div className={`mt-2 flex ${widthClass} flex-wrap gap-1.5`}>
                    {sources.slice(0, compact ? 3 : 4).map((source) => (
                        <a
                            key={`${source.name}-${source.url}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-extrabold text-neutral-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700"
                        >
                            {source.name}
                        </a>
                    ))}
                </div>
            )}
        </>
    );
}
