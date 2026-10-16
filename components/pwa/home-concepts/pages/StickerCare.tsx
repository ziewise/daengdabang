"use client";

/**
 * 스티커북 시안 — 동네 돌봄 찾기(/app/sticker/care) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 홈의 "동네 돌봄 찾기" 포스트잇이 여는 전용 화면 — 이 기능만 담는다(홈의 하위 화면, 위쪽에 뒤로 가기).
 *  - 분류 스티커 4개(병원 · 미용 · 호텔 · 데이케어, 협업자 화면의 실제 분류) → 현재 위치로 찾기 → 근처 후보 명함(거리 · 주소 · 네이버지도)
 *  - 로그인 없이 쓸 수 있음. 협업자 LocalCareFinder 와 같은 순서(배포 전 연결 2026-10-16):
 *    현재 위치(currentPosition) → 서버 /api/v1/local/pet-care(분류 · 위도 · 경도 · 5곳) → safePlaces 로 정리 → 명함(거리 · 주소 · 전화 · 지도 4종)
 *    위치를 한 번 얻으면 분류를 바꿀 때 그 위치로 바로 다시 찾음. 실패 · 결과 없음은 네이버지도로 이어 줌(협업자 문구)
 *  - 고른 분류는 주소 ?cat= 으로도 열 수 있음(예: ?cat=grooming).
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { CATEGORIES, buildNaverMapUrl } from "../page-data";
import { currentPosition, formatDistance, safePlaces, type Coordinates, type LocalCareCategory, type SearchState } from "@/components/growth/LocalCareFinder";
import { ddbApiBase } from "@/lib/customer-api";
import { placeAddress, placeMapLinks } from "@/lib/place-map-links";
import { ConceptBar, HC_CSS, useDemoSession } from "../shared";
import { DiaryBody, PARTS_CSS } from "../sticker-parts";
import { PostIt, STICKER_CSS, Tape, Patch } from "../sticker-kit";

export default function StickerCare() {
    const [session, setSession] = useDemoSession();
    const sp = useSearchParams();
    const [cat, setCat] = useState<LocalCareCategory>(() => CATEGORIES.find((c) => c.id === sp.get("cat"))?.id ?? CATEGORIES[0].id);
    const catOpt = CATEGORIES.find((c) => c.id === cat) ?? CATEGORIES[0];
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
    const abortRef = useRef<AbortController | null>(null);
    useEffect(() => () => abortRef.current?.abort(), []);

    // 찾기 — 협업자 LocalCareFinder.search 와 같은 순서 · 같은 문구
    const search = async (categoryId: LocalCareCategory, knownCoordinates?: Coordinates | null) => {
        const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0];
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
            setSearchState({ status: "done", category: category.id, places: safePlaces(data.places, category), fallbackUrl });
            haptic("medium");
        } catch (caught) {
            if (controller.signal.aborted) return;
            const code = typeof caught === "object" && caught !== null && "code" in caught ? Number((caught as { code?: unknown }).code) : 0;
            const message = code === 1
                ? "위치 권한이 꺼져 있어요. 권한을 허용한 뒤 다시 찾거나 네이버지도에서 바로 확인해 주세요."
                : "주변 후보를 바로 불러오지 못했어요. 잠시 후 다시 찾거나 네이버지도에서 확인할 수 있어요.";
            setSearchState({ status: "error", category: category.id, message, fallbackUrl });
        }
    };
    const find = () => { haptic("light"); void search(cat, null); };
    // 분류 바꾸기 — 위치를 이미 알면 그 위치로 바로 다시 찾음(협업자 selectCategory 와 같음)
    const pick = (id: LocalCareCategory) => {
        setCat(id);
        setSearchState({ status: "idle" });
        haptic("light");
        if (coordinates) void search(id, coordinates);
    };
    const state = searchState.status !== "idle" && searchState.category === cat ? searchState : { status: "idle" as const };
    const mapUrl = state.status === "done" || state.status === "error" ? state.fallbackUrl : buildNaverMapUrl(catOpt.query);

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <ConceptBar session={session} onSession={setSession} />
                <DiaryBody pageKey="care" dir={1}>
                    <p className="ah-display text-[18px] leading-snug">우리 동네에서<br /><span className="st-marker">돌봄 장소를 찾아요</span></p>
                    <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>내 위치 근처 5곳 · 로그인 없이 쓸 수 있어요</p>

                    {/* 분류 스티커 — 고른 스티커는 들려 있음 */}
                    <div className="mt-5 grid grid-cols-4 gap-2">
                        {CATEGORIES.map((c) => {
                            const on = c.id === cat;
                            return (
                                <button key={c.id} type="button" onClick={() => pick(c.id)} aria-pressed={on}
                                    className={`flex flex-col items-center gap-1.5 transition-transform duration-300 ${on ? "-translate-y-1" : ""}`}>
                                    <span className={`st-diecut grid h-14 w-14 place-items-center rounded-full ${on ? "ring-4 ring-[#c4ecd6]" : ""}`} style={{ background: on ? "linear-gradient(160deg,#fff,#e6f6ec)" : "#fff" }}>
                                        <i aria-hidden="true" className={`fa-solid ${c.icon} text-[19px] ${on ? "text-[#1f7a59]" : "text-[#b7a9a1]"}`} />
                                    </span>
                                    <span className={`ah-display text-[12.5px] ${on ? "" : "text-[#9c8f88]"}`}>{c.shortLabel}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="ah-light mt-3 text-center text-[12px]" style={{ color: TEXT_SOFT }}>{catOpt.label} · {catOpt.helper}</p>

                    <Patch onClick={find} disabled={state.status === "loading"} className="mt-4"><span className="relative">{state.status === "loading" ? "주변 후보 찾는 중" : `현재 위치로 ${catOpt.shortLabel} 찾기`}</span><i aria-hidden="true" className={`fa-solid ${state.status === "loading" ? "fa-circle-notch fa-spin" : "fa-location-crosshairs"} relative text-[14px]`} /></Patch>
                    <p className="mt-2 text-center"><a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ah-display inline-flex items-center gap-1 text-[12.5px] text-[#1f7a59] underline decoration-dashed underline-offset-4">네이버지도에서 바로 보기<i aria-hidden="true" className="fa-solid fa-arrow-up-right-from-square text-[9px]" /></a></p>

                    <div aria-live="polite">
                        {state.status === "loading" ? (
                            <p className="ah-display mt-5 flex items-center justify-center gap-2 text-[13px] text-[#1f7a59]"><i aria-hidden="true" className="fa-solid fa-paw fa-bounce" />현재 위치 주변을 확인하고 있어요</p>
                        ) : null}
                        {/* 못 찾음 — 위치 권한 · 서버 문제(협업자 문구) + 네이버지도로 */}
                        {state.status === "error" ? (
                            <div className="st-postit relative mt-5 px-4 pb-3.5 pt-3.5 text-center" style={{ background: "#fff3c9", rotate: "-0.6deg" }}>
                                <Tape className="-top-2 left-1/2 h-3.5 w-14 -translate-x-1/2" color="rgba(255,214,140,.95)" />
                                <p className="ah-light text-[12.5px] leading-relaxed text-[#6b5420]"><i aria-hidden="true" className="fa-solid fa-location-dot mr-1 text-[#d9822b]" />{state.message}</p>
                                <a href={state.fallbackUrl} target="_blank" rel="noopener noreferrer" className="ah-display mt-2.5 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] text-[#a8560f]">네이버지도에서 {catOpt.shortLabel} 보기</a>
                            </div>
                        ) : null}
                        {state.status === "done" && state.places.length === 0 ? (
                            <div className="st-postit relative mt-5 px-4 pb-3.5 pt-3.5 text-center" style={{ background: "#e6f2ff", rotate: "0.6deg" }}>
                                <Tape className="-top-2 left-1/2 h-3.5 w-14 -translate-x-1/2" color="rgba(190,224,255,.9)" />
                                <p className="ah-display text-[14px]">지도 검색은 계속할 수 있어요</p>
                                <p className="ah-light mt-1 text-[12px] leading-relaxed" style={{ color: TEXT_SOFT }}>확인된 업체명을 바로 불러오지 못했어요. 네이버지도에서 현재 위치 주변 {catOpt.shortLabel}을 확인해 주세요.</p>
                                <a href={state.fallbackUrl} target="_blank" rel="noopener noreferrer" className="ah-display mt-2.5 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] text-[#3b63b8]">네이버지도에서 {catOpt.shortLabel} 보기</a>
                            </div>
                        ) : null}
                        {/* 가까운 순 명함 — 거리 · 주소(카카오맵 검색) · 전화 · 지도 4종 */}
                        {state.status === "done" && state.places.length > 0 ? (
                            <>
                                <p className="ah-display mt-5 flex items-center justify-between text-[14px]">가까운 {catOpt.shortLabel} 후보 {state.places.length}곳<span className="ah-light text-[11px]" style={{ color: TEXT_SOFT }}>가까운 순</span></p>
                                <ul className="mt-3 space-y-3">
                                    {state.places.map((p, i) => {
                                        const links = placeMapLinks(p);
                                        const maps: [string, string][] = [["카카오맵", links.kakao], ["네이버지도", links.naver], ["Google 지도", links.google], ...(links.position ? [["위치 보기", links.position] as [string, string]] : [])];
                                        return (
                                            <li key={p.id} className="hc-pop relative rounded-[10px] bg-white px-3.5 py-3 shadow-[0_8px_14px_-10px_rgba(90,60,50,.45)]" style={{ rotate: `${i % 2 ? 0.8 : -0.8}deg`, animationDelay: `${i * 90}ms` }}>
                                                <Tape className="-top-2 left-4 h-3.5 w-12" color="rgba(217,242,228,.95)" style={{ rotate: "-4deg" }} />
                                                <p className="flex items-center gap-2">
                                                    <span className="ah-display grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e6f6ec] text-[11px] text-[#1f7a59]">{i + 1}</span>
                                                    <span className="ah-display min-w-0 flex-1 truncate text-[15px]">{p.name}</span>
                                                    <span className="ah-display shrink-0 rounded-full bg-[#fff3c4] px-2 py-0.5 text-[11px] text-[#8f5e12]">{formatDistance(p.distanceMeters)}</span>
                                                </p>
                                                <a href={links.kakao} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} 주소와 장소 검색`} className="ah-light mt-1 block break-words pl-8 text-[12px] underline decoration-dashed underline-offset-2" style={{ color: TEXT_SOFT }}>{placeAddress(p) || "주소·상세 정보 찾기"}</a>
                                                <span className="mt-2 flex flex-wrap gap-1.5 pl-8">
                                                    {p.phone ? <a href={`tel:${p.phone}`} className="ah-display inline-flex items-center gap-1 rounded-full bg-[#ffe1ea] px-2.5 py-1 text-[11.5px] text-[#c4456f]"><i aria-hidden="true" className="fa-solid fa-phone text-[10px]" />전화</a> : null}
                                                    {maps.map(([label, href]) => (
                                                        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} ${label}${label === "위치 보기" ? "" : "에서 검색"}`} className="ah-display inline-flex items-center rounded-full bg-[#e6f6ec] px-2.5 py-1 text-[11.5px] text-[#1f7a59]">{label}</a>
                                                    ))}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        ) : null}
                    </div>

                    <PostIt color="#fff3a6" rot={-1} className="!static mt-6 !block w-full !px-3 !py-2 !text-left !text-[12px]">
                        표시된 곳은 공개 지도에서 찾은 후보이며 댕다방 제휴·예약 가능 업체라는 뜻이 아닙니다. 영업시간, 진료·미용·숙박·등원 가능 여부와 비용은 방문 전에 업체에 직접 확인해 주세요. 위치는 이 검색에만 사용하며 계정에 저장하지 않아요.
                    </PostIt>
                    <Link href="/chat/" className="ah-display mt-4 flex items-center justify-center gap-1.5 text-[13px] text-[#563fa8]">
                        <i aria-hidden="true" className="fa-solid fa-comment-dots" /> 어디로 가야 할지 모르겠다면 케어톡에 물어보기
                    </Link>
                </DiaryBody>
            </div>
        </div>
    );
}
