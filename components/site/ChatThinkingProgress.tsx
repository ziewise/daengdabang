"use client";

type ChatThinkingProgressProps = {
    compact?: boolean;
    hasHistory?: boolean;
};

export default function ChatThinkingProgress({ compact = false }: ChatThinkingProgressProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            data-chat-thinking-progress="true"
            className={`${compact ? "text-[11px]" : "text-xs"} flex items-center gap-2 font-black text-neutral-700`}
        >
            <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            답변을 정리하고 있어요
        </div>
    );
}
