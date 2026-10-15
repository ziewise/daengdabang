"use client";

/**
 * LocalCarePanel — 매일 댕생활 탭 ④ "동네" · 프리미엄 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 기존 LocalCareFinder 와 같은 기능 · 문구 · 분석 이벤트:
 *  병원 · 미용 · 호텔 · 데이케어 고르기 → 현재 위치로 가까운 후보 최대 5곳 (/api/v1/local/pet-care) → 전화 · 네이버지도
 *  위치 권한이 없거나 서버가 안 되면 네이버지도 검색으로 이어 준다. 위치는 계정에 저장하지 않는다.
 * 화면: 분할 버튼(종류) · 위치 신호 카드(얇은 원이 퍼지는 신호 — 찾는 중엔 빠르게) · 정돈된 결과 목록
 * 분류 · 지도 주소 · 거리 표시 · 위치 읽기 · 결과 정리 함수는 LocalCareFinder 에서 그대로 가져온다.
 */

import { useEffect, useRef, useState } from "react";
import {
    CATEGORIES,
    buildNaverMapUrl,
    currentPosition,
    formatDistance,
    safePlaces,
    type Coordinates,
    type LocalCareCategory,
    type SearchState,
} from "@/components/growth/LocalCareFinder";
import { ddbApiBase } from "@/lib/customer-api";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import { IconDot, Pill, Reveal, SectionHead, TEXT, TONES } from "./ui";

const TONE = TONES.green;

export default function LocalCarePanel() {
    const [selectedCategory, setSelectedCategory] = useState<LocalCareCategory>("veterinary");
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
    const abortRef = useRef<AbortController | null>(null);
    const selected = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
    const selectedIndex = CATEGORIES.findIndex((c) => c.id === selected.id);
    const stateForSelection = searchState.status !== "idle" && searchState.category === selected.id ? searchState : { status: "idle" as const };
    const mapUrl = buildNaverMapUrl(selected.query);
    const loading = stateForSelection.status === "loading";

    useEffect(() => () => abortRef.current?.abort(), []);

    // 검색 — 기존 LocalCareFinder.search 와 같은 순서 · 이벤트 · 안내 문구
    const search = async (categoryId: LocalCareCategory, knownCoordinates?: Coordinates | null) => {
        const category = CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0];
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
            const params = new URLSearchParams({ category: category.id, lat: String(nextCoordinates.latitude), lon: String(nextCoordinates.longitude), limit: "5" });
            const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/local/pet-care?${params}`, { headers: { Accept: "application/json" }, signal: controller.signal });
            if (!response.ok) throw new Error("service-unavailable");
            const data = await response.json() as { places?: unknown };
            const places = safePlaces(data.places, category);
            setSearchState({ status: "done", category: category.id, places, fallbackUrl });
            trackStorefrontEvent("local_care_search_completed", { surface: "treasure_mine", category: category.id, resultCount: places.length });
        } catch (caught) {
            if (controller.signal.aborted) return;
            const code = typeof caught === "object" && caught !== null && "code" in caught ? Number((caught as { code?: unknown }).code) : 0;
            const message = code === 1
                ? "위치 권한이 꺼져 있어요. 권한을 허용한 뒤 다시 찾거나 네이버지도에서 바로 확인해 주세요."
                : "주변 후보를 바로 불러오지 못했어요. 잠시 후 다시 찾거나 네이버지도에서 확인할 수 있어요.";
            setSearchState({ status: "error", category: category.id, message, fallbackUrl });
            trackStorefrontEvent("local_care_search_failed", { surface: "treasure_mine", category: category.id, reason: code === 1 ? "permission_denied" : "provider_unavailable" });
        }
    };

    // 종류 바꾸기 — 위치를 이미 알면 바로 다시 찾는다
    const selectCategory = (categoryId: LocalCareCategory) => {
        setSelectedCategory(categoryId);
        setSearchState({ status: "idle" });
        if (coordinates) void search(categoryId, coordinates);
    };

    return (
        <section id="local-care-finder" className="dl-anchor space-y-5" aria-labelledby="pv-local-title">
            <Reveal>
                <SectionHead kicker="LOCAL CARE NOW" extra={<Pill tone={TONE}>오늘 바로 사용</Pill>} title={<span id="pv-local-title">필요할 때, 동네 돌봄부터 찾아요</span>} tone={TONE}>
                    병원·미용·호텔·데이케어 중 필요한 곳을 고르면 현재 위치 주변의 공개 지도 후보를 찾아드려요.
                </SectionHead>
            </Reveal>

            <Reveal order={1}>
                {/* 종류 — 분할 버튼 (흰 판이 미끄러짐) */}
                <div className="relative grid grid-cols-4 rounded-[16px] bg-[rgba(31,26,24,0.06)] p-1" role="tablist" aria-label="동네 돌봄 종류">
                    <span className="absolute bottom-1 top-1 rounded-[12px] bg-white shadow-[0_1px_2px_rgba(31,26,24,.08),0_6px_14px_-6px_rgba(31,26,24,.22)] transition-[left] duration-500 ease-[cubic-bezier(.22,1.2,.36,1)]"
                        style={{ left: `calc(4px + (100% - 8px) * ${selectedIndex} / 4)`, width: "calc((100% - 8px) / 4)" }} aria-hidden="true" />
                    {CATEGORIES.map((c) => {
                        const on = c.id === selected.id;
                        return (
                            <button key={c.id} type="button" role="tab" aria-selected={on} onClick={() => selectCategory(c.id)}
                                className="relative z-10 flex h-[54px] flex-col items-center justify-center gap-1 transition-colors duration-300" style={{ color: on ? TONE.accent : "#8c7f78" }}>
                                <i className={`fa-solid ${c.icon} text-[15px]`} aria-hidden="true" />
                                <span className="text-[12.5px] font-bold" style={{ color: on ? TEXT : "#8c7f78" }}>{c.shortLabel}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 위치 신호 카드 */}
                <div className="pv-card mt-3 overflow-hidden">
                    <div className="relative flex h-[132px] items-center justify-center overflow-hidden" style={{ background: "radial-gradient(60% 90% at 50% 100%, rgba(19,161,132,.10), rgba(19,161,132,0) 70%), #fbfdfc" }} aria-hidden="true">
                        {/* 얇은 원이 퍼지는 신호 — 찾는 중엔 빠르게 */}
                        {[0, 1, 2].map((i) => (
                            <span key={i} className={`pv-sonar ${loading ? "is-fast" : ""}`} style={{ animationDelay: `${i * (loading ? 0.4 : 1)}s` }} />
                        ))}
                        <span className="relative grid h-12 w-12 place-items-center rounded-full bg-white shadow-[0_8px_18px_-8px_rgba(19,161,132,.6)]">
                            <i className={`fa-solid ${loading ? "fa-spinner fa-spin" : selected.icon} text-[17px]`} style={{ color: TONE.accent }} />
                        </span>
                        <span className="absolute bottom-3 left-4 text-[11px] font-semibold text-[#8c9c96]">{loading ? "현재 위치 주변을 확인하고 있어요" : "CURRENT LOCATION"}</span>
                    </div>
                    <div className="p-5">
                        <p className="pv-h3">내 주변 {selected.label}</p>
                        <p className="pv-small mt-0.5">{selected.helper}</p>
                        <p className="pv-small mt-2 flex items-center gap-1.5"><i className="fa-solid fa-lock text-[10px]" aria-hidden="true" />위치는 이 검색에만 사용하며 계정에 저장하지 않아요.</p>
                        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                            <button type="button" onClick={() => void search(selected.id, null)} disabled={loading} className="pv-btn" style={{ background: TONE.accent, boxShadow: "0 10px 22px -12px rgba(19,161,132,.7)" }}>
                                <i className="fa-solid fa-location-arrow text-[13px]" aria-hidden="true" />{loading ? "주변 후보 찾는 중" : "현재 위치로 찾기"}
                            </button>
                            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="pv-btn-ghost min-h-[50px] px-4 text-[13.5px]">
                                <span className="grid h-5 w-5 place-items-center rounded-[6px] bg-[#03c75a] text-[11px] font-black text-white" aria-hidden="true">N</span>네이버지도
                            </a>
                        </div>
                    </div>
                </div>
            </Reveal>

            {/* 결과 */}
            <div aria-live="polite">
                {stateForSelection.status === "idle" && (
                    <Notice title={`${selected.label} 후보를 준비할게요`} body="현재 위치 버튼을 누르면 가까운 순으로 최대 5곳을 보여드려요." />
                )}
                {stateForSelection.status === "loading" && (
                    <Notice title="현재 위치 주변을 확인하고 있어요" body="기다리는 동안 네이버지도 버튼도 바로 사용할 수 있어요." />
                )}
                {stateForSelection.status === "error" && (
                    <Notice title={stateForSelection.message} tone={TONES.rose}>
                        <a href={stateForSelection.fallbackUrl} target="_blank" rel="noopener noreferrer" className="pv-btn-ghost mt-3 min-h-[40px] text-[13px]">네이버지도에서 {selected.shortLabel} 보기</a>
                    </Notice>
                )}
                {stateForSelection.status === "done" && stateForSelection.places.length === 0 && (
                    <Notice title="지도 검색은 계속할 수 있어요" body={`확인된 업체명을 바로 불러오지 못했어요. 네이버지도에서 현재 위치 주변 ${selected.shortLabel}을 확인해 주세요.`}>
                        <a href={stateForSelection.fallbackUrl} target="_blank" rel="noopener noreferrer" className="pv-btn-ghost mt-3 min-h-[40px] text-[13px]">네이버지도에서 {selected.shortLabel} 보기</a>
                    </Notice>
                )}
                {stateForSelection.status === "done" && stateForSelection.places.length > 0 && (
                    <div>
                        <div className="flex items-end justify-between px-0.5">
                            <div>
                                <p className="pv-kicker" style={{ color: TONE.accent }}>NEARBY CANDIDATES</p>
                                <h3 className="pv-h3 mt-1">가까운 {selected.shortLabel} 후보 {stateForSelection.places.length}곳</h3>
                            </div>
                            <span className="pv-small">가까운 순</span>
                        </div>
                        <ol className="pv-card mt-3 overflow-hidden">
                            {stateForSelection.places.map((place, index) => (
                                <li key={place.id} className="pv-row items-start">
                                    <article className="flex w-full items-start gap-3">
                                        <span className="pv-num grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px]" style={{ background: TONE.tint, color: TONE.ink }}>{index + 1}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="flex items-center gap-2">
                                                <span className="truncate text-[14.5px] font-bold" style={{ color: TEXT }}>{place.name}</span>
                                                <span className="pv-num shrink-0 text-[12px]" style={{ color: TONE.accent }}>{formatDistance(place.distanceMeters)}</span>
                                            </p>
                                            <p className="pv-small mt-0.5">{place.address || "주소는 지도에서 확인해 주세요"}</p>
                                            <div className="mt-2.5 flex gap-1.5">
                                                {place.phone && <a href={`tel:${place.phone}`} className="pv-btn-ghost min-h-[34px] rounded-[10px] px-3 text-[12px]"><i className="fa-solid fa-phone text-[11px]" aria-hidden="true" />전화</a>}
                                                <a href={place.mapUrl} target="_blank" rel="noopener noreferrer" className="pv-btn-ghost min-h-[34px] rounded-[10px] px-3 text-[12px]"><i className="fa-solid fa-map text-[11px]" aria-hidden="true" />지도 보기</a>
                                            </div>
                                        </div>
                                    </article>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>

            <p className="pv-small px-0.5">
                표시된 곳은 공개 지도에서 찾은 후보이며 댕다방 제휴·예약 가능 업체라는 뜻이 아닙니다. 영업시간, 진료·미용·숙박·등원 가능 여부와 비용은 방문 전에 업체에 직접 확인해 주세요.
            </p>
        </section>
    );
}

/** 결과 자리 안내 */
function Notice({ title, body, tone = TONE, children }: { title: string; body?: string; tone?: typeof TONE; children?: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 rounded-[20px] p-4" style={{ background: "rgba(31,26,24,.035)" }}>
            <IconDot icon="fa-circle-info" tone={tone} size={34} />
            <div className="min-w-0 pt-0.5">
                <p className="text-[14px] font-bold leading-snug" style={{ color: TEXT }}>{title}</p>
                {body && <p className="pv-small mt-1">{body}</p>}
                {children}
            </div>
        </div>
    );
}
