/**
 * Pagination — 공용 페이지 네비게이션 (이전 / 번호 / 다음)
 * ---------------------------------------------------------------------
 * 상품 리스트 페이지들(전체상품·베스트·신상품·카테고리·브랜드·기획전)에서 공통 사용.
 * 현재 페이지 주변 ±1 + 처음/끝을 보여주고, 사이 구간은 "…" 로 축약한다.
 * totalPages 가 1 이하면 아무것도 렌더하지 않는다(페이지네이션 불필요).
 */
"use client";

/** 표시할 페이지 번호 배열 — 현재 ±1 + 처음/끝, 사이는 "..." 축약 */
function getPageNumbers(current: number, total: number): (number | "...")[] {
    const pages: (number | "...")[] = [];
    const left = Math.max(1, current - 1);
    const right = Math.min(total, current + 1);
    for (let i = left; i <= right; i++) pages.push(i);
    if (left > 1) {
        if (left > 2) pages.unshift("...");
        pages.unshift(1);
    }
    if (right < total) {
        if (right < total - 1) pages.push("...");
        pages.push(total);
    }
    return pages;
}

export default function Pagination({
    currentPage,
    totalPages,
    onChange,
}: {
    currentPage: number;
    totalPages: number;
    onChange: (page: number) => void;
}) {
    // 페이지가 하나뿐이면 네비게이션 숨김 (상품 30개 이하)
    if (totalPages <= 1) return null;

    return (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="페이지 이동">
            <button
                type="button"
                onClick={() => onChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex h-9 items-center rounded-lg border border-neutral-200 px-3 text-sm font-bold text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo disabled:opacity-40 disabled:hover:border-neutral-200 disabled:hover:text-neutral-600"
            >
                이전
            </button>
            {getPageNumbers(currentPage, totalPages).map((n, i) =>
                n === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-sm text-neutral-400">
                        …
                    </span>
                ) : (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChange(n)}
                        aria-current={n === currentPage ? "page" : undefined}
                        className={`h-9 w-9 rounded-lg text-sm font-bold ${
                            n === currentPage
                                ? "bg-aurora-indigo text-white"
                                : "border border-neutral-200 text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo"
                        }`}
                    >
                        {n}
                    </button>
                ),
            )}
            <button
                type="button"
                onClick={() => onChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex h-9 items-center rounded-lg border border-neutral-200 px-3 text-sm font-bold text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo disabled:opacity-40 disabled:hover:border-neutral-200 disabled:hover:text-neutral-600"
            >
                다음
            </button>
        </nav>
    );
}
