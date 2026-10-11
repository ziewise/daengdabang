"use client";

import type { ShopChatStreamStage } from "@/lib/shop-chat-stream";

type ChatThinkingProgressProps = {
    compact?: boolean;
    hasHistory?: boolean;
    stage?: ShopChatStreamStage;
    message?: string;
};

export default function ChatThinkingProgress({
    compact = false,
    hasHistory = false,
    stage = "answering",
    message,
}: ChatThinkingProgressProps) {
    const defaultMessage = hasHistory
        ? "앞 대화도 함께 살펴보며 답변을 정리하고 있어요"
        : "답변을 정리하고 있어요";
    const stageMessages: Record<string, string> = {
        queued: "답변을 준비하고 있어요",
        planning: "질문 내용을 살펴보고 있어요",
        searching: "필요한 자료를 확인하고 있어요",
        answering: defaultMessage,
    };
    const progressMessage = message || stageMessages[stage] || defaultMessage;
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
