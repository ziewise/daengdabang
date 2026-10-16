"use client";

/**
 * AppProductFilter — 앱 상품 목록(상품군 · 전체 상품)의 "필터" 버튼 + 아래에서 올라오는 속지 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 협업자 ProductsClient 의 검색 · 카테고리 · 세부 · 정렬 4칸이 앱 첫 화면 절반을 차지해서(사용자 결정 2026-10-17):
 *  - 앱에서는 검색칸 + 이 "필터" 버튼 한 줄만(앱 CSS appShopSkin 이 나머지 칸을 숨기고 한 줄로 붙임). 세부 칸은 앱에서 쓰지 않음
 *  - 버튼을 누르면 다이어리 속지(댕자랑 속지와 같은 Sheet)에서 정렬을 고름. 전체 상품 화면(카테고리를 바꿀 수 있을 때)만 카테고리도
 *  - 고르면 협업자 화면의 같은 함수(setSort · 카테고리 바꾸기)를 그대로 부르고 속지를 닫음 — 목록은 협업자 화면이 그대로 다시 그림
 * 웹: 뿌리 요소가 hidden 이라 보이지도, 칸을 차지하지도 않음(앱 CSS 에서만 보임).
 */

import { useState } from "react";
import { haptic } from "@/components/pwa/home-concepts/gestures";
import { SHOW_PARTS_CSS, Sheet } from "@/components/pwa/home-concepts/show-parts";

type Option = { value: string; label: string };

export default function AppProductFilter({ sort, sortOptions, onSort, category, categoryOptions, onCategory }: {
    sort: string;
    sortOptions: Option[];
    onSort: (value: string) => void;
    /** 카테고리를 바꿀 수 있을 때만(전체 상품 화면) — 상품군 화면은 넘기지 않음 */
    category?: string;
    categoryOptions?: Option[];
    onCategory?: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const sortLabel = sortOptions.find((o) => o.value === sort)?.label ?? "";
    const pick = (fn: () => void) => { fn(); haptic("light"); setOpen(false); };

    return (
        <div className="hidden" data-app-product-filter>
            <button type="button" onClick={() => { haptic("light"); setOpen(true); }} aria-haspopup="dialog" aria-label={`필터 · 지금 ${sortLabel}`} className="apf-btn">
                <i aria-hidden="true" className="fa-solid fa-sliders text-[12px]" />
                <span className="apf-d">{sortLabel}</span>
            </button>
            {open ? <style>{SHOW_PARTS_CSS + APF_CSS}</style> : null}
            <Sheet open={open} onClose={() => setOpen(false)} label="필터"
                title={<p className="apf-d text-[18px]"><span className="apf-marker">필터</span></p>}>
                {categoryOptions && onCategory ? (
                    <>
                        <p className="apf-d mt-1 text-[13px] text-[#b07a8a]">카테고리</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {categoryOptions.map((o) => (
                                <button key={o.value} type="button" aria-pressed={category === o.value} onClick={() => pick(() => onCategory(o.value))}
                                    className={`sp-pet apf-d rounded-full px-3.5 py-1.5 text-[13px] ${category === o.value ? "is-on" : ""}`}>{o.label}</button>
                            ))}
                        </div>
                    </>
                ) : null}
                <p className={`apf-d text-[13px] text-[#b07a8a] ${categoryOptions ? "mt-5" : "mt-1"}`}>정렬</p>
                <div className="mt-2 flex flex-wrap gap-2 pb-2">
                    {sortOptions.map((o) => (
                        <button key={o.value} type="button" aria-pressed={sort === o.value} onClick={() => pick(() => onSort(o.value))}
                            className={`sp-pet apf-d rounded-full px-3.5 py-1.5 text-[13px] ${sort === o.value ? "is-on" : ""}`}>{o.label}</button>
                    ))}
                </div>
            </Sheet>
        </div>
    );
}

/* 속지 안 글꼴(카페24 써라운드) · 제목 형광펜 — 상품 화면엔 시안 공통 글꼴 클래스가 없어 여기서만 */
const APF_CSS = `
.apf-d { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
.apf-marker { background: linear-gradient(transparent 58%, #ffd6e2 58% 92%, transparent 92%); padding: 0 3px; }
`;
