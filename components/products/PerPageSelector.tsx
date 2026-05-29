/**
 * PerPageSelector — 한 페이지에 보일 상품 수 (20/30/40) 토글
 * ---------------------------------------------------------------------
 * 작은 칩 형태. 선택된 값 강조. 변경 시 부모에서 페이지 1로 리셋.
 */
"use client";

export const PER_PAGE_OPTIONS = [20, 30, 40] as const;
export type PerPage = (typeof PER_PAGE_OPTIONS)[number];

interface Props {
    value: PerPage;
    onChange: (n: PerPage) => void;
}

export default function PerPageSelector({ value, onChange }: Props) {
    return (
        <div className="inline-flex items-center gap-1.5">
            <span className="text-xs text-neutral-500 font-bold mr-1">보기</span>
            <div className="inline-flex rounded-full border border-neutral-200 overflow-hidden">
                {PER_PAGE_OPTIONS.map((n) => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChange(n)}
                        aria-pressed={n === value}
                        className={`px-3.5 py-1.5 text-xs font-extrabold transition ${
                            n === value
                                ? "bg-aurora-indigo text-white"
                                : "bg-white text-neutral-600 hover:bg-neutral-50"
                        }`}
                    >
                        {n}
                    </button>
                ))}
            </div>
        </div>
    );
}
