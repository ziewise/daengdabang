"use client";

import { useEffect, useRef, useState } from "react";
import { resumeShopChatQuestion, type ShopChatAnswer } from "@/lib/daengdabang-llm";
import { CHAT_VIEW_DETACHED, pendingChatKey, readPendingChat } from "@/lib/shop-chat-jobs";
import { customerVisibleChatAnswer } from "@/lib/chat-display";
import ChatProductCards from "@/components/site/ChatProductCards";
import ChatResponseExtras from "@/components/site/ChatResponseExtras";

/** Restored work is visibly separate; an invisible old transcript is never reused. */
export default function ChatPendingRecovery({ scope, accessToken, busy, onPendingChange }: {
    scope: string; accessToken?: string; busy: boolean; onPendingChange: (pending: boolean) => void;
}) {
    const [answer, setAnswer] = useState<ShopChatAnswer | null>(null);
    const [notice, setNotice] = useState("");
    const [pending, setPending] = useState(false);
    const controllerRef = useRef<AbortController | null>(null);
    useEffect(() => {
        if (busy) return;
        let active = true;
        const controller = new AbortController();
        controllerRef.current = controller;
        void (async () => {
            const key = await pendingChatKey(scope);
            if (!active || !readPendingChat(key)) return;
            setPending(true);
            onPendingChange(true);
            setNotice("이전 요청의 답변을 이어서 기다리고 있어요.");
            try {
                const result = await resumeShopChatQuestion(scope, {accessToken, signal: controller.signal});
                if (!active) return;
                setAnswer(result);
                setNotice(result ? "이전 요청의 답변이에요. 아래에서 새 상담을 시작할 수 있어요." : "이전 요청을 확인할 수 없어요.");
            } catch {
                if (active) setNotice(controller.signal.aborted ? "이전 요청을 멈췄어요." : "이전 답변이 만료됐거나 처리가 중단됐어요. 질문은 자동으로 다시 보내지 않았어요.");
            } finally {
                if (active) { setPending(false); onPendingChange(false); }
            }
        })().catch(() => { if (active) onPendingChange(false); });
        return () => {
            active = false;
            controller.abort(CHAT_VIEW_DETACHED);
            onPendingChange(false);
        };
    }, [scope, accessToken, busy, onPendingChange]);
    if (!notice) return null;
    return <section aria-label="이전 요청 이어보기" className="rounded-xl border border-teal-200 bg-white p-3 text-sm leading-6">
        <p role="status" className="font-bold text-teal-900">{notice}</p>
        {pending ? <button type="button" className="mt-2 rounded-lg border px-3 py-1" onClick={() => controllerRef.current?.abort()}>이전 요청 멈추기</button> : null}
        {answer ? <>
            <p className="mt-3 whitespace-pre-wrap">{customerVisibleChatAnswer(answer.answer, Boolean(answer.sources?.length))}</p>
            <ChatProductCards products={answer.products} externalProducts={answer.externalProducts} />
            <ChatResponseExtras medical={answer.medical} generation={answer.generation} accessToken={accessToken}
                sources={answer.sources} research={answer.research} ctas={answer.ctas} followUpsEnabled={false} onAsk={() => false} />
        </> : null}
    </section>;
}
