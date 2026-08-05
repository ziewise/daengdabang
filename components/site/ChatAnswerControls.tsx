"use client";

import { useState } from "react";
import {
    submitShopChatFeedback,
    type ShopChatDelivery,
    type ShopChatFeedbackVerdict,
    type ShopChatQuality,
} from "@/lib/daengdabang-llm";

type Props = {
    delivery?: ShopChatDelivery;
    quality?: ShopChatQuality;
    traceId?: string;
    accessToken?: string;
    onRetry?: () => void;
    compact?: boolean;
};

type FeedbackState = "idle" | "sending" | ShopChatFeedbackVerdict | "error";

export default function ChatAnswerControls({
    delivery,
    quality,
    traceId,
    accessToken,
    onRetry,
    compact = false,
}: Props) {
    const [feedback, setFeedback] = useState<FeedbackState>("idle");

    const sendFeedback = async (verdict: ShopChatFeedbackVerdict) => {
        if (!traceId || feedback === "sending" || feedback === "helpful" || feedback === "not_helpful") return;
        setFeedback("sending");
        try {
            await submitShopChatFeedback({ traceId, verdict, accessToken });
            setFeedback(verdict);
        } catch {
            setFeedback("error");
        }
    };

    const showDeliveryNotice = delivery?.status === "degraded" || delivery?.status === "retry";
    if (!showDeliveryNotice && !traceId && !quality) return null;

    return (
        <div className={`${compact ? "max-w-[86%]" : "max-w-[82%]"} mt-2 space-y-2 text-left`}>
            {showDeliveryNotice ? (
                <div
                    className={`rounded-lg border px-3 py-2.5 ${
                        delivery.status === "retry"
                            ? "border-amber-200 bg-amber-50 text-amber-950"
                            : "border-sky-200 bg-sky-50 text-sky-950"
                    }`}
                    role="status"
                    data-chat-delivery={delivery.status}
                >
                    <p className="text-[12px] font-extrabold leading-5">
                        {delivery.message || "연결이 잠시 불안정해요. 잠시 뒤 다시 확인해 주세요."}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {typeof delivery.retryAfterSeconds === "number" && delivery.retryAfterSeconds > 0 ? (
                            <span className="text-[11px] font-bold opacity-70">약 {delivery.retryAfterSeconds}초 후 재시도</span>
                        ) : null}
                        {onRetry ? (
                            <button
                                type="button"
                                onClick={onRetry}
                                className="rounded-full border border-current/20 bg-white px-3 py-1.5 text-[11px] font-black transition hover:-translate-y-0.5"
                            >
                                다시 확인하기
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {traceId ? (
                <div className="flex min-h-8 items-center gap-1.5 text-[11px] font-bold text-neutral-500" data-chat-feedback>
                    <span className="mr-1">답변이 도움됐나요?</span>
                    <button
                        type="button"
                        onClick={() => void sendFeedback("helpful")}
                        disabled={feedback === "sending" || feedback === "helpful" || feedback === "not_helpful"}
                        className={`grid h-8 w-8 place-items-center rounded-full border transition ${
                            feedback === "helpful"
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-neutral-200 bg-white text-neutral-500 hover:border-emerald-400 hover:text-emerald-700"
                        } disabled:cursor-default`}
                        aria-label="도움된 답변으로 평가"
                        aria-pressed={feedback === "helpful"}
                        title="도움됐어요"
                    >
                        <i className="fa-regular fa-thumbs-up" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => void sendFeedback("not_helpful")}
                        disabled={feedback === "sending" || feedback === "helpful" || feedback === "not_helpful"}
                        className={`grid h-8 w-8 place-items-center rounded-full border transition ${
                            feedback === "not_helpful"
                                ? "border-rose-500 bg-rose-50 text-rose-700"
                                : "border-neutral-200 bg-white text-neutral-500 hover:border-rose-400 hover:text-rose-700"
                        } disabled:cursor-default`}
                        aria-label="도움되지 않은 답변으로 평가"
                        aria-pressed={feedback === "not_helpful"}
                        title="아쉬워요"
                    >
                        <i className="fa-regular fa-thumbs-down" aria-hidden="true" />
                    </button>
                    {feedback === "sending" ? <span aria-live="polite">반영 중…</span> : null}
                    {feedback === "helpful" || feedback === "not_helpful" ? <span aria-live="polite">고마워요. 다음 답변 개선에 반영할게요.</span> : null}
                    {feedback === "error" ? <span className="text-amber-700" aria-live="polite">지금은 반영하지 못했어요.</span> : null}
                </div>
            ) : quality?.grounded || quality?.status === "verified" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                    <i className="fa-solid fa-check" aria-hidden="true" /> 근거 확인 답변
                </span>
            ) : null}
        </div>
    );
}
