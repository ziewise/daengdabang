"use client";

import type { ShopChatStreamStage } from "@/lib/shop-chat-stream";

type ChatThinkingProgressProps = {
    compact?: boolean;
    hasHistory?: boolean;
    stage?: ShopChatStreamStage;
};

export default function ChatThinkingProgress({
    compact = false,
    hasHistory = false,
}: ChatThinkingProgressProps) {
    const progressMessage = hasHistory
        ? "앞 대화도 함께 살펴보며 답변을 정리하고 있어요"
        : "답변을 정리하고 있어요";
    return (
        <div
            role="status"
            aria-live="polite"
            data-chat-thinking-progress="true"
            className={`${compact ? "text-[11px]" : "text-xs"} font-black text-neutral-700`}
        >
            <div className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                <span>{progressMessage}</span>
            </div>
        </div>
    );
}
