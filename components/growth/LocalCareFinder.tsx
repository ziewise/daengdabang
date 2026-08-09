"use client";

import { useEffect, useRef, useState } from "react";
import { ddbApiBase } from "@/lib/customer-api";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";

type LocalCareCategory = "veterinary" | "grooming" | "hotel" | "daycare";

type CategoryOption = {
    id: LocalCareCategory;
    label: string;
    shortLabel: string;
    query: string;
    helper: string;
    icon: string;
    tone: "coral" | "teal" | "orange";
};

type LocalCarePlace = {
    id: string;
    name: string;
    address: string;
    phone?: string;
    distanceMeters?: number | null;
    mapUrl: string;
};

type Coordinates = { latitude: number; longitude: number };

type SearchState =
    | { status: "idle" }
    | { status: "loading"; category: LocalCareCategory }
    | { status: "done"; category: LocalCareCategory; places: LocalCarePlace[]; fallbackUrl: string }
    | { status: "error"; category: LocalCareCategory; message: string; fallbackUrl: string };

const CATEGORIES: readonly CategoryOption[] = [
    {
        id: "veterinary",
        label: "동물병원",
        shortLabel: "병원",
        query: "동물병원",
        helper: "진료·응급 여부 확인",
        icon: "fa-stethoscope",
        tone: "coral",
    },
    {
        id: "grooming",
        label: "반려견 미용",
        shortLabel: "미용",
        query: "애견미용",
        helper: "견종·서비스 범위 확인",
        icon: "fa-scissors",
        tone: "teal",
    },
    {
        id: "hotel",
        label: "반려견 호텔",
        shortLabel: "호텔",
        query: "애견호텔",
        helper: "숙박·야간 돌봄 확인",
        icon: "fa-bed",
        tone: "orange",
    },
    {
        id: "daycare",
        label: "반려견 데이케어",
        shortLabel: "데이케어",
        query: "애견유치원",
        helper: "등원·놀이 프로그램 확인",
        icon: "fa-school",
        tone: "teal",
    },
] as const;

function buildNaverMapUrl(...parts: Array<string | undefined>) {
    const searchText = parts
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(" ")
        .slice(0, 240) || "반려동물 돌봄";
    return `https://map.naver.com/p/search/${encodeURIComponent(searchText)}`;
}

function formatDistance(value?: number | null) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "거리 확인";
    if (value < 1000) return `${Math.round(value)}m`;
    return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}km`;
}

function currentPosition(): Promise<Coordinates> {
    if (!("geolocation" in navigator)) {
        return Promise.reject(new Error("location-unavailable"));
    }
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            }),
            reject,
            { enableHighAccuracy: false, timeout: 9000, maximumAge: 120000 },
        );
    });
}

function safePlaces(value: unknown, category: CategoryOption): LocalCarePlace[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((raw, index): LocalCarePlace[] => {
        if (!raw || typeof raw !== "object") return [];
        const place = raw as Record<string, unknown>;
        const name = typeof place.name === "string" ? place.name.trim() : "";
        if (!name) return [];
        const address = typeof place.address === "string" ? place.address.trim() : "";
        const phone = typeof place.phone === "string" ? place.phone.trim() : "";
        const distanceMeters = typeof place.distanceMeters === "number" ? place.distanceMeters : null;
        return [{
            id: typeof place.id === "string" && place.id ? place.id : `${category.id}-${index}-${name}`,
            name,
            address,
            phone: phone || undefined,
            distanceMeters,
            mapUrl: buildNaverMapUrl(name, address),
        }];
    }).slice(0, 5);
}

export default function LocalCareFinder() {
    const [selectedCategory, setSelectedCategory] = useState<LocalCareCategory>("veterinary");
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
    const abortRef = useRef<AbortController | null>(null);
    const selected = CATEGORIES.find((category) => category.id === selectedCategory) || CATEGORIES[0];

    useEffect(() => () => abortRef.current?.abort(), []);

    const search = async (categoryId: LocalCareCategory, knownCoordinates?: Coordinates | null) => {
        const category = CATEGORIES.find((candidate) => candidate.id === categoryId) || CATEGORIES[0];
        const fallbackUrl = buildNaverMapUrl(category.query);
        setSearchState({ status: "loading", category: category.id });
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const nextCoordinates = knownCoordinates || await currentPosition();
            if (controller.signal.aborted) return;
            setCoordinates(nextCoordinates);
            const base = ddbApiBase();
            if (!base) throw new Error("service-unavailable");
            const params = new URLSearchParams({
                category: category.id,
                lat: String(nextCoordinates.latitude),
                lon: String(nextCoordinates.longitude),
                limit: "5",
            });
            const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/local/pet-care?${params}`, {
                headers: { Accept: "application/json" },
                signal: controller.signal,
            });
            if (!response.ok) throw new Error("service-unavailable");
            const data = await response.json() as { places?: unknown; fallbackMapUrl?: string };
            const places = safePlaces(data.places, category);
            setSearchState({ status: "done", category: category.id, places, fallbackUrl });
            trackStorefrontEvent("local_care_search_completed", {
                surface: "treasure_mine",
                category: category.id,
                resultCount: places.length,
            });
        } catch (caught) {
            if (controller.signal.aborted) return;
            const code = typeof caught === "object" && caught !== null && "code" in caught
                ? Number((caught as { code?: unknown }).code)
                : 0;
            const message = code === 1
                ? "위치 권한이 꺼져 있어요. 권한을 허용한 뒤 다시 찾거나 네이버지도에서 바로 확인해 주세요."
                : "주변 후보를 바로 불러오지 못했어요. 잠시 후 다시 찾거나 네이버지도에서 확인할 수 있어요.";
            setSearchState({ status: "error", category: category.id, message, fallbackUrl });
            trackStorefrontEvent("local_care_search_failed", {
                surface: "treasure_mine",
                category: category.id,
                reason: code === 1 ? "permission_denied" : "provider_unavailable",
            });
        }
    };

    const selectCategory = (categoryId: LocalCareCategory) => {
        setSelectedCategory(categoryId);
        setSearchState({ status: "idle" });
        if (coordinates) void search(categoryId, coordinates);
    };

    const stateForSelection = searchState.status !== "idle" && searchState.category === selected.id
        ? searchState
        : { status: "idle" as const };
    const mapUrl = stateForSelection.status === "done" || stateForSelection.status === "error"
        ? stateForSelection.fallbackUrl
        : buildNaverMapUrl(selected.query);

    return (
        <section id="local-care-finder" className="scroll-mt-28 py-10 md:py-14" aria-labelledby="local-care-title" data-local-care-finder>
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="ddb-crayon-kicker text-xs">LOCAL CARE NOW</p>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-800">오늘 바로 사용</span>
                        </div>
                        <h2 id="local-care-title" className="ddb-crayon-title ddb-crayon-underline mt-2 text-3xl text-neutral-950 md:text-4xl">필요할 때, 동네 돌봄부터 찾아요</h2>
                        <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-neutral-600">
                            병원·미용·호텔·데이케어 중 필요한 곳을 고르면 현재 위치 주변의 공개 지도 후보를 찾아드려요.
                        </p>
                    </div>
                    <span className="w-fit rounded-full border border-sky-200 bg-white px-4 py-2 text-[10px] font-black text-sky-900">예약·제휴 표시가 아닌 위치 검색</span>
                </div>

                <div className="ddb-crayon-paper overflow-hidden rounded-[32px] border" data-local-care-panel>
                    <div className="grid gap-2 border-b border-neutral-200 bg-white/70 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4" role="tablist" aria-label="동네 돌봄 종류">
                        {CATEGORIES.map((category) => {
                            const active = category.id === selected.id;
                            return (
                                <button
                                    key={category.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => selectCategory(category.id)}
                                    className={`ddb-motion-lift flex min-h-16 items-center gap-3 rounded-[20px] border px-3 text-left transition ${active ? "border-indigo-400 bg-indigo-50 text-indigo-950 shadow-[2px_3px_0_rgba(79,70,229,0.12)]" : "border-neutral-200 bg-white text-neutral-700 hover:border-cyan-300"}`}
                                >
                                    <span className="ddb-crayon-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm" data-crayon-tone={category.tone}>
                                        <i className={`fa-solid ${category.icon}`} aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0">
                                        <strong className="block text-sm font-black">{category.shortLabel}</strong>
                                        <small className="mt-0.5 block truncate text-[10px] font-bold text-neutral-500">{category.helper}</small>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:p-7">
                        <div className="ddb-crayon-banner rounded-[26px] border border-sky-100 p-5">
                            <span className="ddb-crayon-icon grid h-12 w-12 place-items-center rounded-2xl text-lg" data-crayon-tone={selected.tone}>
                                <i className={`fa-solid ${selected.icon}`} aria-hidden="true" />
                            </span>
                            <p className="ddb-crayon-kicker mt-4 text-[10px]">CURRENT LOCATION</p>
                            <h3 className="ddb-crayon-title mt-1 text-2xl text-neutral-950">내 주변 {selected.label}</h3>
                            <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">위치는 이 검색에만 사용하며 계정에 저장하지 않아요.</p>
                            <button
                                type="button"
                                onClick={() => void search(selected.id, null)}
                                disabled={stateForSelection.status === "loading"}
                                className="ddb-crayon-link ddb-attention-cta mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full px-4 text-sm disabled:cursor-wait disabled:opacity-60"
                            >
                                {stateForSelection.status === "loading" ? (
                                    <><i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />주변 후보 찾는 중</>
                                ) : (
                                    <><i className="fa-solid fa-location-crosshairs mr-2" aria-hidden="true" />현재 위치로 찾기</>
                                )}
                            </button>
                            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ddb-motion-lift mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-neutral-300 bg-white px-4 text-xs font-black text-neutral-700">
                                네이버지도에서 바로 보기 <i className="fa-solid fa-arrow-up-right-from-square ml-2 text-[9px]" aria-hidden="true" />
                            </a>
                        </div>

                        <div className="min-w-0" aria-live="polite">
                            {stateForSelection.status === "idle" ? (
                                <div className="grid min-h-64 place-items-center rounded-[26px] border-2 border-dashed border-cyan-200 bg-white/65 px-5 text-center">
                                    <div>
                                        <i className="fa-solid fa-map-location-dot text-3xl text-cyan-600" aria-hidden="true" />
                                        <h3 className="ddb-crayon-title mt-3 text-2xl text-neutral-950">{selected.label} 후보를 준비할게요</h3>
                                        <p className="mt-2 text-xs font-bold leading-5 text-neutral-500">현재 위치 버튼을 누르면 가까운 순으로 최대 5곳을 보여드려요.</p>
                                    </div>
                                </div>
                            ) : stateForSelection.status === "loading" ? (
                                <div className="grid min-h-64 place-items-center rounded-[26px] border border-cyan-100 bg-cyan-50/60 px-5 text-center">
                                    <div>
                                        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-cyan-700" aria-hidden="true" />
                                        <p className="mt-3 text-sm font-black text-neutral-700">현재 위치 주변을 확인하고 있어요</p>
                                        <p className="mt-1 text-[11px] font-bold text-neutral-500">기다리는 동안 네이버지도 버튼도 바로 사용할 수 있어요.</p>
                                    </div>
                                </div>
                            ) : stateForSelection.status === "error" ? (
                                <div className="grid min-h-64 place-items-center rounded-[26px] border border-amber-200 bg-amber-50/70 px-5 text-center">
                                    <div>
                                        <i className="fa-solid fa-location-dot text-3xl text-amber-600" aria-hidden="true" />
                                        <p className="mt-3 text-sm font-black leading-6 text-neutral-800">{stateForSelection.message}</p>
                                        <a href={stateForSelection.fallbackUrl} target="_blank" rel="noopener noreferrer" className="ddb-motion-lift mt-4 inline-flex min-h-11 items-center rounded-full border border-amber-300 bg-white px-5 text-xs font-black text-amber-900">네이버지도에서 {selected.shortLabel} 보기</a>
                                    </div>
                                </div>
                            ) : stateForSelection.places.length ? (
                                <div>
                                    <div className="flex flex-wrap items-end justify-between gap-2">
                                        <div>
                                            <p className="ddb-crayon-kicker text-[10px]">NEARBY CANDIDATES</p>
                                            <h3 className="ddb-crayon-title mt-1 text-2xl text-neutral-950">가까운 {selected.shortLabel} 후보 {stateForSelection.places.length}곳</h3>
                                        </div>
                                        <span className="text-[10px] font-black text-neutral-500">가까운 순</span>
                                    </div>
                                    <div className="mt-3 grid gap-2">
                                        {stateForSelection.places.map((place, index) => (
                                            <article key={place.id} className="flex flex-col gap-3 rounded-[20px] border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-black text-indigo-800">{index + 1}</span>
                                                        <h4 className="truncate text-sm font-black text-neutral-950">{place.name}</h4>
                                                        <span className="shrink-0 rounded-full bg-cyan-50 px-2 py-1 text-[9px] font-black text-cyan-800">{formatDistance(place.distanceMeters)}</span>
                                                    </div>
                                                    <p className="mt-1 truncate pl-8 text-[10px] font-bold text-neutral-500">{place.address || "주소는 지도에서 확인해 주세요"}</p>
                                                </div>
                                                <div className="flex shrink-0 gap-2 pl-8 sm:pl-0">
                                                    {place.phone ? <a href={`tel:${place.phone}`} className="ddb-motion-lift inline-flex min-h-9 items-center rounded-full border border-neutral-200 px-3 text-[10px] font-black text-neutral-700">전화</a> : null}
                                                    <a href={place.mapUrl} target="_blank" rel="noopener noreferrer" className="ddb-motion-lift inline-flex min-h-9 items-center rounded-full bg-indigo-700 px-3 text-[10px] font-black text-white">지도 보기</a>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid min-h-64 place-items-center rounded-[26px] border border-sky-200 bg-sky-50/70 px-5 text-center">
                                    <div>
                                        <i className="fa-solid fa-map text-3xl text-sky-700" aria-hidden="true" />
                                        <h3 className="ddb-crayon-title mt-3 text-2xl text-neutral-950">지도 검색은 계속할 수 있어요</h3>
                                        <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">확인된 업체명을 바로 불러오지 못했어요. 네이버지도에서 현재 위치 주변 {selected.shortLabel}을 확인해 주세요.</p>
                                        <a href={stateForSelection.fallbackUrl} target="_blank" rel="noopener noreferrer" className="ddb-motion-lift mt-4 inline-flex min-h-11 items-center rounded-full bg-indigo-700 px-5 text-xs font-black text-white">네이버지도에서 {selected.shortLabel} 보기</a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <footer className="border-t border-neutral-200 bg-white/75 px-4 py-3 text-[10px] font-bold leading-5 text-neutral-500 sm:px-6">
                        표시된 곳은 공개 지도에서 찾은 후보이며 댕다방 제휴·예약 가능 업체라는 뜻이 아닙니다. 영업시간, 진료·미용·숙박·등원 가능 여부와 비용은 방문 전에 업체에 직접 확인해 주세요.
                    </footer>
                </div>
            </div>
        </section>
    );
}
