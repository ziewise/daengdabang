/**
 * PreviewToggle — 오로라 ↔ 크레파스 테마 토글
 * ---------------------------------------------------------------------
 * 고객 데모용 — 히어로 좌측 상단에 작은 pill UI 로 노출.
 * 클릭 시 즉시 전체 사이트 컬러 테마 전환.
 */
"use client";

import { usePreview } from "./PreviewProvider";

export default function PreviewToggle() {
    const { preview, setPreview, hydrated } = usePreview();

    // hydration 전엔 SSR 과 동일한 placeholder (깜빡임 방지)
    if (!hydrated) {
        return (
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 opacity-0">
                <span className="px-3 py-1.5 text-[11px] font-bold text-white">...</span>
            </div>
        );
    }

    return (
        <div
            className="inline-flex items-center gap-0.5 p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/30 shadow-card"
            role="radiogroup"
            aria-label="디자인 미리보기 선택"
        >
            <button
                type="button"
                role="radio"
                aria-checked={preview === 1}
                onClick={() => setPreview(1)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold transition ${
                    preview === 1
                        ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white shadow-card"
                        : "text-white/85 hover:text-white"
                }`}
            >
                Preview 1 · 오로라
            </button>
            <button
                type="button"
                role="radio"
                aria-checked={preview === 2}
                onClick={() => setPreview(2)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold transition ${
                    preview === 2
                        ? "bg-gradient-to-r from-aurora-pink to-aurora-amber text-white shadow-card"
                        : "text-white/85 hover:text-white"
                }`}
            >
                Preview 2 · 크레파스
            </button>
        </div>
    );
}
