"use client";

import { useEffect, useState } from "react";
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
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const started = Date.now();
        const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const defaultMessage = hasHistory
        ? "앞 대화도 함께 살펴보며 답변을 정리하고 있어요"
        : "답변을 정리하고 있어요";
    const stageMessages: Record<string, string> = {
        queued: "답변을 준비하고 있어요",
        planning: "질문 내용을 살펴보고 있어요",
        searching: "필요한 자료를 확인하고 있어요",
        answering: defaultMessage,
        reviewing: "질문에 맞는 답인지 검토하고 있어요",
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
                <span className="whitespace-pre-line leading-relaxed">{progressMessage}</span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-neutral-500" aria-live="off">
                {elapsed < 60 ? `${elapsed}초` : `${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`} 경과
                {stage === "queued" ? " · 다시 보내지 않아도 자동으로 순서를 확인해요. 멈추기로 취소할 수 있어요."
                    : elapsed >= 20 ? " · 답변을 확인하는 데 시간이 걸리고 있어요. 멈추기로 취소할 수 있어요." : ""}
            </p>
        </div>
    );
}
