"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { ddbApiBase } from "@/lib/customer-api";
import type { ShopChatCta, ShopChatMedical, ShopChatSource } from "@/lib/daengdabang-llm";

type ChatResponseExtrasProps = {
    medical?: ShopChatMedical;
    sources?: ShopChatSource[];
    ctas?: ShopChatCta[];
    onAsk: (prompt: string) => boolean | Promise<boolean>;
    compact?: boolean;
    followUpsEnabled?: boolean;
};

type ChoiceViewGroup = {
    title: string;
    choices: Array<{ label: string; prompt: string; description?: string }>;
    answerInput?: boolean;
};

type FollowUpSlot = NonNullable<ShopChatMedical["followUpSlots"]>[number];

export const CHAT_FOLLOW_UP_BUNDLE_PREFIX = "추가로 알려드릴 내용입니다.";

export function isFollowUpBundlePrompt(value: string) {
    return value.trimStart().startsWith(CHAT_FOLLOW_UP_BUNDLE_PREFIX);
}

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
    source?: "naver" | "openstreetmap";
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
    try {
        const daengdabangPlaces = await fetchDaengDaBangVetPlaces(latitude, longitude, query);
        if (daengdabangPlaces?.places.length) return daengdabangPlaces;
    } catch {
        // Keep the public map fallback path below.
    }

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
            const places: VetPlace[] = (data.elements ?? []).flatMap((element): VetPlace[] => {
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
                    source: "openstreetmap",
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

async function fetchDaengDaBangVetPlaces(latitude: number, longitude: number, query = "동물병원") {
    const base = ddbApiBase();
    if (!base) return null;

    const params = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        query,
        limit: "5",
    });
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/local/vets?${params}`, {
        headers: { "Accept": "application/json" },
    });
    if (!response.ok) return null;
    const data = await response.json() as {
        configured?: boolean;
        places?: Array<{
            id?: string;
            name?: string;
            address?: string;
            phone?: string;
            lat?: number | null;
            lon?: number | null;
            distanceMeters?: number | null;
            mapUrl?: string;
            source?: string;
        }>;
    };
    if (!data.configured || !Array.isArray(data.places)) return null;

    const places = data.places.flatMap((place, index): VetPlace[] => {
        const lat = Number(place.lat);
        const lon = Number(place.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
        const name = String(place.name || "이름 미확인 동물병원").trim();
        return [{
            id: place.id || `naver-${index}-${name}`,
            name,
            address: String(place.address || "").trim(),
            phone: place.phone ? String(place.phone) : undefined,
            lat,
            lon,
            distanceMeters: typeof place.distanceMeters === "number"
                ? place.distanceMeters
                : distanceMeters({ latitude, longitude }, { latitude: lat, longitude: lon }),
            mapUrl: place.mapUrl || `https://map.naver.com/p/search/${encodeURIComponent(name)}`,
            source: place.source === "naver" ? "naver" : "openstreetmap",
        }];
    });

    return { fallbackUrl: buildMapUrl(query, latitude, longitude), places };
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
                source: "openstreetmap",
            });
        }
        if (places.length >= 5) break;
    }

    return places.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 5);
}

function FollowUpBundleForm({
    slots,
    onAsk,
    compact,
    enabled,
}: {
    slots: FollowUpSlot[];
    onAsk: ChatResponseExtrasProps["onAsk"];
    compact?: boolean;
    enabled: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submittedCount, setSubmittedCount] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const formId = useId();
    const toggleRef = useRef<HTMLButtonElement>(null);
    const firstInputRef = useRef<HTMLTextAreaElement>(null);
    const returnFocusRef = useRef(false);
    const answeredEntries = slots.flatMap((slot) => {
        const answer = answers[slot.key]?.trim();
        return answer ? [{ label: slot.label, answer }] : [];
    });

    useEffect(() => {
        if (expanded && enabled) {
            firstInputRef.current?.focus();
            return;
        }
        if (!expanded && returnFocusRef.current) {
            returnFocusRef.current = false;
            toggleRef.current?.focus();
        }
    }, [enabled, expanded]);

    if (!enabled) {
        return submittedCount > 0 ? (
            <div className="mt-2 rounded-md border border-dashed border-emerald-300 bg-emerald-50/80 px-3 py-2 text-[13px] font-extrabold leading-[1.45] text-emerald-900">
                <i className="fa-solid fa-check mr-1.5" aria-hidden="true" />
                추가 정보 {submittedCount}개를 한 번에 전달했어요.
            </div>
        ) : null;
    }

    const submitBundle = async (event: FormEvent) => {
        event.preventDefault();
        if (!answeredEntries.length || submitting) return;
        const prompt = [
            CHAT_FOLLOW_UP_BUNDLE_PREFIX,
            ...answeredEntries.map(({ label, answer }) => `- ${label}: ${answer}`),
        ].join("\n");
        setSubmitting(true);
        const accepted = await onAsk(prompt);
        if (accepted) {
            setSubmittedCount(answeredEntries.length);
            setExpanded(false);
        }
        setSubmitting(false);
    };

    return (
        <div className="mt-2 rounded-lg border border-dashed border-sky-300 bg-sky-50/75 p-2.5 text-left">
            {!expanded ? (
                <button
                    ref={toggleRef}
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="w-full rounded-md border border-sky-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-sky-400 hover:bg-sky-50"
                    aria-expanded="false"
                    aria-controls={formId}
                >
                    <span className="block text-[14px] font-extrabold leading-[1.35] text-sky-950">
                        <i className="fa-solid fa-pencil mr-1.5 text-sky-600" aria-hidden="true" />
                        추가정보 한 번에 입력
                    </span>
                    <span className="mt-1 block text-[13px] font-semibold leading-[1.45] text-sky-700">
                        아는 내용만 적고 한 번에 보내세요.
                    </span>
                </button>
            ) : (
                <form id={formId} onSubmit={submitBundle} className="rounded-md border border-sky-200 bg-white p-2.5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[14px] font-extrabold leading-[1.35] text-sky-950">추가정보 모아 보내기</p>
                            <p className="mt-1 text-[13px] font-semibold leading-[1.45] text-neutral-600">모르는 항목은 비워도 괜찮아요.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                returnFocusRef.current = true;
                                setExpanded(false);
                            }}
                            className="shrink-0 rounded-full px-2 py-1 text-[12px] font-extrabold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                        >
                            접기
                        </button>
                    </div>
                    <div className={`mt-3 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
                        {slots.map((slot, index) => (
                            <label key={slot.key} className="block rounded-md border border-sky-100 bg-sky-50/60 p-2">
                                <span className="block text-[13px] font-extrabold leading-[1.45] text-sky-950">{slot.label}</span>
                                <textarea
                                    ref={index === 0 ? firstInputRef : undefined}
                                    value={answers[slot.key] ?? ""}
                                    onChange={(event) => setAnswers((current) => ({
                                        ...current,
                                        [slot.key]: event.target.value,
                                    }))}
                                    rows={slot.prompt.length > 34 ? 2 : 1}
                                    disabled={submitting}
                                    className="mt-1 min-h-10 w-full resize-y rounded-md border border-sky-200 bg-white px-2.5 py-2 text-[16px] font-semibold leading-[1.4] text-neutral-900 outline-none placeholder:text-[13px] placeholder:font-semibold placeholder:text-neutral-600 focus:border-sky-500 disabled:opacity-60"
                                    placeholder={slot.prompt}
                                    aria-label={`${slot.label} 추가 정보 입력`}
                                />
                            </label>
                        ))}
                    </div>
                    <button
                        type="submit"
                        className="mt-3 w-full rounded-md bg-sky-700 px-3 py-2.5 text-[13px] font-extrabold leading-[1.35] text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!answeredEntries.length || submitting}
                    >
                        {submitting ? "답변을 확인하고 있어요…" : "입력한 내용 한 번에 보내기"}
                    </button>
                </form>
            )}
        </div>
    );
}

function ChoiceGroups({
    medical,
    onAsk,
    compact,
    followUpsEnabled = true,
}: Pick<ChatResponseExtrasProps, "medical" | "onAsk" | "compact" | "followUpsEnabled">) {
    const [customGroupTitle, setCustomGroupTitle] = useState<string | null>(null);
    const [customText, setCustomText] = useState("");
    const [answerSlot, setAnswerSlot] = useState<{ label: string; prompt: string } | null>(null);
    const groups: ChoiceViewGroup[] = medical?.choiceGroups?.filter((group) => group.choices.length > 0) ?? [];
    const followUpSlots = (medical?.followUpSlots ?? []).slice(0, 8);
    const bundleSlots = followUpSlots.some((slot) => slot.required) ? followUpSlots : [];

    if (bundleSlots.length) {
        return (
            <FollowUpBundleForm
                slots={bundleSlots}
                onAsk={onAsk}
                compact={compact}
                enabled={followUpsEnabled}
            />
        );
    }

    if (!followUpsEnabled) return null;

    const fallbackChoices: ChoiceViewGroup[] = !groups.length && medical?.followUpSlots?.length
        ? [{
            title: "추가로 알려주실 내용",
            choices: medical.followUpSlots.map((slot) => ({
                label: slot.label,
                prompt: slot.prompt,
                description: slot.prompt,
            })),
            answerInput: true,
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
        setAnswerSlot(null);
        void onAsk(value);
    };

    return (
        <div className="mt-2 space-y-2">
            {allGroups.slice(0, 2).map((group) => (
                <div key={group.title} className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5 text-left">
                    <p className="text-[13px] font-extrabold leading-[1.45] text-sky-900">{group.title}</p>
                    <div className="mt-2 grid gap-1.5">
                        {group.choices.slice(0, compact ? 5 : 8).map((choice) => (
                            <button
                                key={`${group.title}-${choice.label}`}
                                type="button"
                                onClick={() => {
                                    if (group.answerInput) {
                                        setCustomGroupTitle(group.title);
                                        setAnswerSlot({ label: choice.label, prompt: choice.prompt });
                                        setCustomText("");
                                        return;
                                    }
                                    void onAsk(choice.prompt);
                                }}
                                className="rounded-md border border-sky-200 bg-white px-2.5 py-2 text-left text-[14px] font-extrabold leading-[1.35] text-sky-900 shadow-sm transition hover:border-sky-400 hover:bg-sky-100"
                            >
                                <span className="block">{choice.label}</span>
                                {choice.description ? (
                                    <span className="mt-1 block text-[13px] font-semibold leading-[1.45] text-sky-800">{choice.description}</span>
                                ) : null}
                            </button>
                        ))}
                    </div>
                    {!group.answerInput ? (
                        <button
                            type="button"
                            onClick={() => {
                                setAnswerSlot(null);
                                setCustomGroupTitle((current) => current === group.title ? null : group.title);
                            }}
                            className="mt-2 w-full rounded-md border border-dashed border-sky-300 bg-white/70 px-2.5 py-2 text-left text-[13px] font-extrabold leading-[1.45] text-sky-900 transition hover:bg-white"
                        >
                            답이 없어요. 직접 적을게요
                        </button>
                    ) : null}
                    {customGroupTitle === group.title ? (
                        <form onSubmit={submitCustom} className="mt-2 rounded-md border border-sky-200 bg-white p-2">
                            {answerSlot ? (
                                <label className="mb-1.5 block text-[13px] font-extrabold leading-[1.45] text-sky-900">{answerSlot.label} 답변</label>
                            ) : null}
                            <div className="flex gap-1.5">
                                <input
                                    value={customText}
                                    onChange={(event) => setCustomText(event.target.value)}
                                    className="min-w-0 flex-1 rounded-md border border-sky-200 bg-white px-2.5 py-2 text-[16px] font-semibold leading-[1.4] text-neutral-900 outline-none focus:border-sky-500"
                                    placeholder={answerSlot?.prompt || "상황을 직접 입력"}
                                    aria-label={answerSlot ? `${answerSlot.label} 답변 입력` : "객관식에 없는 답 직접 입력"}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="shrink-0 rounded-md bg-sky-700 px-2.5 py-2 text-[12px] font-extrabold leading-[1.35] text-white disabled:opacity-50"
                                    disabled={!customText.trim()}
                                >
                                    답변 보내기
                                </button>
                            </div>
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
                            <p className="mt-0.5 text-[10px] font-black text-indigo-700">
                                {place.source === "naver" ? "네이버 지역검색" : "공개 지도"}
                            </p>
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

export default function ChatResponseExtras({
    medical,
    sources,
    ctas,
    onAsk,
    compact = false,
    followUpsEnabled = true,
}: ChatResponseExtrasProps) {
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
                    <ChoiceGroups medical={medical} onAsk={onAsk} compact={compact} followUpsEnabled={followUpsEnabled} />
                </div>
            )}

            {!showMedicalCard && (
                <ChoiceGroups medical={medical} onAsk={onAsk} compact={compact} followUpsEnabled={followUpsEnabled} />
            )}

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
