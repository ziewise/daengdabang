/**
 * SortSelector — 정렬 옵션 (인기도순/최신/가격/할인/판매/리뷰/평점)
 * ---------------------------------------------------------------------
 * 디자인: 텍스트 가로 나열 + 구분자 | + 선택 시 ✓ + bold.
 * 모바일: 가로 스크롤 (overflow-x-auto), 데스크탑: 한 줄.
 */
"use client";

import type { SortKey } from "@/lib/catalog";
import { SORT_LABEL } from "@/lib/catalog";

const ORDER: SortKey[] = [
    "popular", "newest", "priceAsc", "priceDesc",
    "discount", "salesDesc", "reviewDesc", "ratingDesc",
];

interface Props {
    value: SortKey;
    onChange: (key: SortKey) => void;
}

export default function SortSelector({ value, onChange }: Props) {
    return (
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs md:text-[13px]" style={{ scrollbarWidth: "none" }}>
            {ORDER.map((k, i) => {
                const active = k === value;
                return (
                    <span key={k} className="flex items-center">
                        <button
                            type="button"
                            onClick={() => onChange(k)}
                            aria-pressed={active}
                            className={`px-1.5 py-1 transition ${
                                active
                                    ? "text-foreground font-extrabold"
                                    : "text-neutral-400 font-bold hover:text-foreground"
                            }`}
                        >
                            {active && (
                                <i className="fa-solid fa-check text-aurora-indigo mr-1 text-[11px]" />
                            )}
                            {SORT_LABEL[k]}
                        </button>
                        {i < ORDER.length - 1 && (
                            <span className="text-neutral-200 mx-0.5">|</span>
                        )}
                    </span>
                );
            })}
            <style jsx>{`
                div::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}
