"use client";

import { useEffect, useMemo, useState } from "react";

const STAGE_STARTS = [0, 1800, 4500, 8000] as const;

const STAGES = [
    {
        label: "질문 내용 살펴보기",
        detail: "질문의 맥락과 필요한 조건을 함께 보고 있어요.",
    },
    {
        label: "필요한 정보 확인하기",
        detail: "관련된 건강·생활·상품 정보를 확인하고 있어요.",
    },
    {
        label: "답변 만들기",
        detail: "질문에 맞는 핵심 내용을 이해하기 쉽게 정리하고 있어요.",
    },
    {
        label: "마지막 확인하기",
        detail: "헷갈리는 표현과 꼭 필요한 주의사항을 확인하고 있어요.",
    },
] as const;

type ChatThinkingProgressProps = {
    compact?: boolean;
    hasHistory?: boolean;
};

export default function ChatThinkingProgress({ compact = false, hasHistory = false }: ChatThinkingProgressProps) {
    const [elapsedMs, setElapsedMs] = useState(0);

    useEffect(() => {
        const startedAt = Date.now();
        const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 500);
        return () => window.clearInterval(timer);
    }, []);

    const activeIndex = useMemo(() => {
        let index = 0;
        STAGE_STARTS.forEach((start, stageIndex) => {
            if (elapsedMs >= start) index = stageIndex;
        });
        return index;
    }, [elapsedMs]);

    const elapsedSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
    const activeDetail = hasHistory && activeIndex === 0
        ? "앞선 대화와 지금 질문의 연결을 함께 살펴보고 있어요."
        : elapsedMs >= 14000 && activeIndex === STAGES.length - 1
            ? "조금 더 걸리고 있지만 멈추지 않았어요. 꼼꼼하게 확인하고 있어요."
            : STAGES[activeIndex].detail;

    return (
        <div
            role="status"
            aria-live="polite"
            data-chat-thinking-progress="true"
            className={`${compact ? "text-[11px]" : "text-xs"} text-neutral-600`}
        >
            <div className="flex items-center justify-between gap-3 font-black text-neutral-800">
                <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                    답변을 준비하고 있어요
                </span>
                <span className="shrink-0 font-bold text-indigo-600">{elapsedSeconds}초째</span>
            </div>

            <div className={`${compact ? "mt-2 space-y-1" : "mt-3 space-y-1.5"}`}>
                {STAGES.map((stage, index) => {
                    const isDone = index < activeIndex;
                    const isActive = index === activeIndex;
                    return (
                        <div
                            key={stage.label}
                            className={`flex items-center gap-2 font-bold transition-colors ${
                                isActive ? "text-neutral-900" : isDone ? "text-emerald-700" : "text-neutral-300"
                            }`}
                        >
                            <span
                                aria-hidden="true"
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                                    isActive
                                        ? "animate-pulse bg-indigo-600 text-white"
                                        : isDone
                                            ? "bg-emerald-500 text-white"
                                            : "border border-neutral-200 bg-white"
                                }`}
                            >
                                {isDone ? "✓" : isActive ? "•" : ""}
                            </span>
                            <span>{stage.label}</span>
                        </div>
                    );
                })}
            </div>

            <p className={`${compact ? "mt-2 leading-4" : "mt-3 leading-5"} font-bold text-neutral-500`}>
                {activeDetail}
            </p>
        </div>
    );
}
