/**
 * Pagination — 페이지 번호 + 이전/다음 + 점프
 * ---------------------------------------------------------------------
 * 최대 5~7개의 페이지 번호 윈도우. 양 끝에 「<」「>」, 멀리 점프할 땐 「<<」「>>」.
 * 현재 페이지 강조. onPageChange 로 부모에게 통지.
 */
"use client";

interface Props {
    page: number;          // 현재 페이지 (1-based)
    totalPages: number;    // 총 페이지 수
    onPageChange: (page: number) => void;
}

/** 윈도우 (현재 페이지 주변 5칸) 생성 */
function getPageWindow(current: number, total: number): number[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const half = 2;
    let start = Math.max(1, current - half);
    let end = Math.min(total, current + half);
    // 가장자리에서 폭 5 보장
    if (end - start < 4) {
        if (start === 1) end = Math.min(total, start + 4);
        else if (end === total) start = Math.max(1, end - 4);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function Pagination({ page, totalPages, onPageChange }: Props) {
    if (totalPages <= 1) return null;
    const win = getPageWindow(page, totalPages);
    const first = win[0];
    const last = win[win.length - 1];

    const go = (p: number) => {
        if (p < 1 || p > totalPages || p === page) return;
        onPageChange(p);
    };

    const btnBase = "min-w-[36px] h-9 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center transition";
    const btnIdle = "border border-neutral-200 text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo";
    const btnActive = "bg-aurora-indigo text-white border border-aurora-indigo";
    const btnDisabled = "border border-neutral-100 text-neutral-300 cursor-not-allowed";

    return (
        <nav className="flex items-center justify-center gap-1.5" aria-label="페이지네이션">
            {/* « 처음 */}
            <button
                type="button"
                onClick={() => go(1)}
                disabled={page === 1}
                className={`${btnBase} ${page === 1 ? btnDisabled : btnIdle}`}
                aria-label="첫 페이지"
            >
                <i className="fa-solid fa-angles-left text-[10px]" />
            </button>
            {/* ‹ 이전 */}
            <button
                type="button"
                onClick={() => go(page - 1)}
                disabled={page === 1}
                className={`${btnBase} ${page === 1 ? btnDisabled : btnIdle}`}
                aria-label="이전 페이지"
            >
                <i className="fa-solid fa-angle-left text-[10px]" />
            </button>

            {/* 시작 「1 ...」생략 표시 */}
            {first > 1 && (
                <>
                    <button type="button" onClick={() => go(1)} className={`${btnBase} ${btnIdle}`}>1</button>
                    {first > 2 && <span className="px-1 text-neutral-300 text-xs">…</span>}
                </>
            )}

            {/* 윈도우 */}
            {win.map((p) => (
                <button
                    key={p}
                    type="button"
                    onClick={() => go(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={`${btnBase} ${p === page ? btnActive : btnIdle}`}
                >
                    {p}
                </button>
            ))}

            {/* 끝 「... last」생략 표시 */}
            {last < totalPages && (
                <>
                    {last < totalPages - 1 && <span className="px-1 text-neutral-300 text-xs">…</span>}
                    <button type="button" onClick={() => go(totalPages)} className={`${btnBase} ${btnIdle}`}>
                        {totalPages}
                    </button>
                </>
            )}

            {/* › 다음 */}
            <button
                type="button"
                onClick={() => go(page + 1)}
                disabled={page === totalPages}
                className={`${btnBase} ${page === totalPages ? btnDisabled : btnIdle}`}
                aria-label="다음 페이지"
            >
                <i className="fa-solid fa-angle-right text-[10px]" />
            </button>
            {/* » 마지막 */}
            <button
                type="button"
                onClick={() => go(totalPages)}
                disabled={page === totalPages}
                className={`${btnBase} ${page === totalPages ? btnDisabled : btnIdle}`}
                aria-label="마지막 페이지"
            >
                <i className="fa-solid fa-angles-right text-[10px]" />
            </button>
        </nav>
    );
}
