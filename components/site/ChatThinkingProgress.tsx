"use client";

import { shopChatProgressLabel, type ShopChatStreamStage } from "@/lib/shop-chat-stream";

type ChatThinkingProgressProps = {
    compact?: boolean;
    hasHistory?: boolean;
    stage?: ShopChatStreamStage;
};

const STEPS = [
    { label: "생각 정리", stages: ["queued", "planning"] },
    { label: "자료 검색", stages: ["searching"] },
    { label: "답변 작성", stages: ["answering"] },
] as const;

export default function ChatThinkingProgress({
    compact = false,
    hasHistory = false,
    stage = "planning",
}: ChatThinkingProgressProps) {
    const activeIndex = Math.max(0, STEPS.findIndex((step) => (step.stages as readonly string[]).includes(stage)));
    return (
        <div
            role="status"
            aria-live="polite"
            data-chat-thinking-progress="true"
            data-chat-thinking-stage={stage}
            className={`${compact ? "text-[11px]" : "text-xs"} font-black text-neutral-700`}
        >
            <div className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                <span>{shopChatProgressLabel(stage, hasHistory)}</span>
            </div>
            <div className={`mt-2 flex items-center ${compact ? "gap-1" : "gap-1.5"}`} aria-hidden="true">
                {STEPS.map((step, index) => (
                    <span
                        key={step.label}
                        className={`rounded-full border px-2 py-1 text-[9px] leading-none transition-colors ${
                            index < activeIndex
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : index === activeIndex
                                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                    : "border-neutral-200 bg-neutral-50 text-neutral-400"
                        }`}
                    >
                        {index < activeIndex ? "✓ " : ""}{step.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
