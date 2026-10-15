"use client";

/**
 * 스티커북 시안 — 동네 돌봄 찾기(/app/sticker/care) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 홈의 "동네 돌봄 찾기" 포스트잇이 여는 전용 화면 — 이 기능만 담는다(홈의 하위 화면, 위쪽에 뒤로 가기).
 *  - 분류 스티커 4개(병원 · 미용 · 호텔 · 데이케어, 협업자 화면의 실제 분류) → 현재 위치로 찾기 → 근처 후보 명함(거리 · 주소 · 네이버지도)
 *  - 로그인 없이 쓸 수 있음. 실제 앱은 내 위치로 서버(local/pet-care)를 부르고, 로컬 시안은 예시 결과("예시" 표시).
 *  - 고른 분류는 주소 ?cat= 으로도 열 수 있음(예: ?cat=grooming).
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { CARE_SAMPLE, CATEGORIES, buildNaverMapUrl } from "../page-data";
import { ConceptBar, HC_CSS, useDemoSession } from "../shared";
import { DiaryBody, PARTS_CSS } from "../sticker-parts";
import { PostIt, STICKER_CSS, Tape, Patch } from "../sticker-kit";

export default function StickerCare() {
    const [session, setSession] = useDemoSession();
    const sp = useSearchParams();
    const [cat, setCat] = useState<string>(() => CATEGORIES.find((c) => c.id === sp.get("cat"))?.id ?? CATEGORIES[0].id);
    const [care, setCare] = useState<"idle" | "loading" | "done">("idle");
    const catOpt = CATEGORIES.find((c) => c.id === cat) ?? CATEGORIES[0];

    const find = () => {
        setCare("loading");
        haptic("light");
        window.setTimeout(() => { setCare("done"); haptic("medium"); }, 900);
    };

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
                                <button key={c.id} type="button" onClick={() => { setCat(c.id); setCare("idle"); haptic("light"); }} aria-pressed={on}
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

                    <Patch onClick={find} className="mt-4"><span className="relative">현재 위치로 {catOpt.shortLabel} 찾기</span><i aria-hidden="true" className="fa-solid fa-location-crosshairs relative text-[14px]" /></Patch>

                    {care === "loading" ? (
                        <p className="ah-display mt-5 flex items-center justify-center gap-2 text-[13px] text-[#1f7a59]"><i aria-hidden="true" className="fa-solid fa-paw fa-bounce" />가까운 {catOpt.label}을 찾고 있어요</p>
                    ) : null}
                    {care === "done" ? (
                        <ul className="mt-5 space-y-3">
                            {(CARE_SAMPLE[cat] ?? []).map((p, i) => (
                                <li key={p.name} className="hc-pop relative rounded-[10px] bg-white px-3.5 py-3 shadow-[0_8px_14px_-10px_rgba(90,60,50,.45)]" style={{ rotate: `${i % 2 ? 1 : -1}deg`, animationDelay: `${i * 90}ms` }}>
                                    <Tape className="-top-2 left-4 h-3.5 w-12" color="rgba(217,242,228,.95)" style={{ rotate: "-4deg" }} />
                                    <p className="ah-display text-[15px]">{p.name}</p>
                                    <p className="ah-light text-[12px]" style={{ color: TEXT_SOFT }}>{p.dist} · {p.addr}</p>
                                    <a href={buildNaverMapUrl(catOpt.query, p.name)} target="_blank" rel="noreferrer" className="ah-display mt-2 inline-flex items-center gap-1 rounded-full bg-[#e6f6ec] px-3 py-1 text-[12px] text-[#1f7a59]">
                                        <i aria-hidden="true" className="fa-solid fa-map-location-dot" /> 네이버지도에서 보기
                                    </a>
                                </li>
                            ))}
                            <li className="ah-light text-center text-[11px]" style={{ color: TEXT_SOFT }}>로컬 시안 예시 결과예요 · 실제 앱은 내 위치 기준으로 찾아요</li>
                        </ul>
                    ) : null}

                    <PostIt color="#fff3a6" rot={-1} className="!static mt-6 !block w-full !px-3 !py-2 !text-left !text-[12px]">
                        진료 · 예약 가능 여부는 전화나 지도에서 한 번 더 확인해 주세요. 위치는 찾을 때만 쓰고 저장하지 않아요.
                    </PostIt>
                    <Link href="/chat/" className="ah-display mt-4 flex items-center justify-center gap-1.5 text-[13px] text-[#563fa8]">
                        <i aria-hidden="true" className="fa-solid fa-comment-dots" /> 어디로 가야 할지 모르겠다면 케어톡에 물어보기
                    </Link>
                </DiaryBody>
            </div>
        </div>
    );
}
