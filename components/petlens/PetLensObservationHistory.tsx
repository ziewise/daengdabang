"use client";

import type { PetObservationHistoryItem } from "@/lib/petlens-observation";

type Props = {
    items: PetObservationHistoryItem[];
    loading?: boolean;
    onOpen: (item: PetObservationHistoryItem) => void;
};

const URGENCY_LABEL = {
    emergency: "즉시 병원 연락",
    same_day: "오늘 병원 문의",
    observe: "평소와 비교 관찰",
    unclear: "판단 어려움",
} as const;

function historyDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "분석 시각 미상";
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export default function PetLensObservationHistory({ items, loading = false, onOpen }: Props) {
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-4" data-petlens-observation-history>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-black text-neutral-950">최근 행동·소리·건강 신호 분석</p>
                    <p className="mt-1 text-[10px] font-bold text-neutral-500">원본 영상 없이 분석 결과만 다시 확인합니다.</p>
                </div>
                {loading && <i className="fa-solid fa-circle-notch fa-spin text-xs text-indigo-600" aria-label="분석 기록 불러오는 중" />}
            </div>
            {!loading && items.length === 0 ? (
                <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-3 text-[11px] font-bold text-neutral-500">
                    아직 저장된 분석 결과가 없습니다.
                </p>
            ) : (
                <div className="mt-3 grid gap-2">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onOpen(item)}
                            className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50"
                        >
                            <span className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-indigo-700">
                                    {URGENCY_LABEL[item.result.urgency.level]}
                                </span>
                                <time className="text-[10px] font-bold text-neutral-400" dateTime={item.createdAt}>
                                    {historyDate(item.createdAt)}
                                </time>
                            </span>
                            <span className="mt-1.5 line-clamp-2 block text-xs font-bold leading-5 text-neutral-700">
                                {item.result.summary}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}
