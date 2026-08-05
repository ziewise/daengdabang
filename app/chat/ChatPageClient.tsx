"use client";

import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    answerShopQuestionSmart,
    ShopChatReferenceRequestError,
    ShopChatRequestCancelledError,
    type ShopChatCta,
    type ShopChatAction,
    type ShopChatConversation,
    type ShopChatGeneration,
    type ShopChatHistoryTurn,
    type ShopChatMedical,
    type ShopChatResearch,
    type ShopChatSource,
    type ShopChatDelivery,
    type ShopChatQuality,
} from "@/lib/daengdabang-llm";
import type { CatalogProduct } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";
import { useAuth } from "@/lib/store";
import ChatResponseExtras, { isFollowUpBundlePrompt } from "@/components/site/ChatResponseExtras";
import ChatThinkingProgress from "@/components/site/ChatThinkingProgress";
import ProgressiveRevealText from "@/components/site/ProgressiveRevealText";
import {
    GenerationReferencePhotoButton,
    GenerationReferenceTray,
    useGenerationReferenceAttachments,
} from "@/components/site/GenerationReferenceComposer";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import { customerVisibleChatAnswer } from "@/lib/chat-display";
import ChatAnswerControls from "@/components/site/ChatAnswerControls";

type Message = {
    role: "user" | "assistant";
    text: string;
    products?: CatalogProduct[];
    medical?: ShopChatMedical;
    sources?: ShopChatSource[];
    research?: ShopChatResearch;
    actions?: ShopChatAction[];
    ctas?: ShopChatCta[];
    conversation?: ShopChatConversation;
    generation?: ShopChatGeneration;
    traceId?: string;
    quality?: ShopChatQuality;
    delivery?: ShopChatDelivery;
    retryPrompt?: string;
};

export default function ChatPageClient() {
    const params = useSearchParams();
    const { user } = useAuth();
    const pets = useMemo(() => user?.pets ?? [], [user]);
    const [selectedPetIndex, setSelectedPetIndex] = useState(0);
    const selectedPet = pets[selectedPetIndex] ?? pets[0] ?? null;
    const initialQuestionSentRef = useRef<string | null>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const inFlightRef = useRef(false);
    const requestSequenceRef = useRef(0);
    const activeRequestRef = useRef<AbortController | null>(null);
    const activeQuestionRef = useRef("");
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [requestNotice, setRequestNotice] = useState("");
    const generationReferences = useGenerationReferenceAttachments({ accessToken: user?.apiAccessToken });
    const {
        hasUploadErrors,
        isUploading: referencesUploading,
        readyReferences,
        showLoginNotice: showReferenceLoginNotice,
        showNotice: showReferenceNotice,
    } = generationReferences;

    useEffect(() => {
        trackStorefrontEvent("chat_opened", { surface: "chat_page" });
        return () => activeRequestRef.current?.abort();
    }, []);

    const clearChat = () => {
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        activeQuestionRef.current = "";
        requestSequenceRef.current += 1;
        inFlightRef.current = false;
        setInput("");
        setLoading(false);
        setMessages([]);
        setRequestNotice("");
        generationReferences.clear();
    };

    const cancelActiveRequest = () => {
        if (!activeRequestRef.current) return;
        const cancelledQuestion = activeQuestionRef.current;
        activeRequestRef.current.abort();
        activeRequestRef.current = null;
        activeQuestionRef.current = "";
        requestSequenceRef.current += 1;
        inFlightRef.current = false;
        setLoading(false);
        setInput((current) => current.trim() ? current : cancelledQuestion);
        setMessages((current) => {
            const pending = current.at(-1);
            return pending?.role === "user" && pending.text === cancelledQuestion
                ? current.slice(0, -1)
                : current;
        });
        setRequestNotice("요청을 멈췄어요. 질문을 고쳐서 다시 보내도 괜찮아요.");
        trackStorefrontEvent("chat_response_failed", {
            surface: "chat_page",
            errorCode: "request_cancelled",
        });
    };

    const ask = useCallback(async (question: string) => {
        const trimmed = question.trim();
        if (referencesUploading) {
            showReferenceNotice("사진을 올리는 중이에요. 첨부가 끝난 뒤 보내 주세요.");
            return false;
        }
        if (hasUploadErrors) {
            showReferenceNotice("올리지 못한 사진을 다시 시도하거나 삭제한 뒤 보내 주세요.");
            return false;
        }
        if (!trimmed || inFlightRef.current) return false;
        inFlightRef.current = true;
        const requestSequence = ++requestSequenceRef.current;
        const requestController = new AbortController();
        activeRequestRef.current = requestController;
        activeQuestionRef.current = trimmed;
        setInput("");
        setLoading(true);
        setRequestNotice("");
        trackStorefrontEvent("chat_message_sent", {
            surface: "chat_page",
            hasPetProfile: Boolean(selectedPet),
        });
        const history: ShopChatHistoryTurn[] = messages.slice(-12).map((item) => ({
            role: item.role,
            content: item.text,
        }));
        setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
        try {
            const result = await answerShopQuestionSmart(trimmed, {
                pet: selectedPet,
                history,
                references: readyReferences,
                accessToken: readyReferences.length ? user?.apiAccessToken : undefined,
                signal: requestController.signal,
            });
            if (requestSequence !== requestSequenceRef.current) return false;
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: result.answer,
                    products: result.products,
                    medical: result.medical,
                    sources: result.sources,
                    research: result.research,
                    actions: result.actions,
                    ctas: result.ctas,
                    conversation: result.conversation,
                    generation: result.generation,
                    traceId: result.traceId,
                    quality: result.quality,
                    delivery: result.delivery,
                    retryPrompt: result.delivery?.status === "live" ? undefined : trimmed,
                },
            ]);
            if (!result.delivery || result.delivery.status === "live") {
                trackStorefrontEvent("chat_response_succeeded", {
                    surface: "chat_page",
                    hasProducts: Boolean(result.products?.length),
                    hasMedicalGuidance: Boolean(result.medical),
                });
            } else {
                trackStorefrontEvent("chat_response_failed", {
                    surface: "chat_page",
                    errorCode: `delivery_${result.delivery.reason || result.delivery.status}`,
                });
            }
            return true;
        } catch (reason) {
            if (requestSequence === requestSequenceRef.current) {
                if (reason instanceof ShopChatRequestCancelledError) {
                    setRequestNotice("요청을 멈췄어요. 질문을 고쳐서 다시 보내도 괜찮아요.");
                    return false;
                }
                if (reason instanceof ShopChatReferenceRequestError) {
                    setInput((current) => current.trim() ? current : trimmed);
                    setMessages((current) => {
                        const pending = current.at(-1);
                        return pending?.role === "user" && pending.text === trimmed
                            ? current.slice(0, -1)
                            : current;
                    });
                    if (reason.status === 401) showReferenceLoginNotice(reason.message);
                    else showReferenceNotice(reason.message);
                }
                trackStorefrontEvent("chat_response_failed", {
                    surface: "chat_page",
                    errorCode: "request_failed",
                });
            }
            return false;
        } finally {
            if (activeRequestRef.current === requestController) {
                activeRequestRef.current = null;
                activeQuestionRef.current = "";
            }
            if (requestSequence === requestSequenceRef.current) {
                inFlightRef.current = false;
                setLoading(false);
            }
        }
    }, [
        hasUploadErrors,
        messages,
        readyReferences,
        referencesUploading,
        selectedPet,
        showReferenceLoginNotice,
        showReferenceNotice,
        user,
    ]);

    useEffect(() => {
        const initialQuestion = params.get("q");
        if (!initialQuestion || initialQuestionSentRef.current === initialQuestion) return;
        initialQuestionSentRef.current = initialQuestion;
        void ask(initialQuestion);
    }, [params, ask]);

    useLayoutEffect(() => {
        const container = messagesRef.current;
        const latestMessage = messages.at(-1);
        if (!container || !latestMessage) return;
        const latestRow = container.querySelector<HTMLElement>(`[data-chat-message-index="${messages.length - 1}"]`);
        if (!latestRow || latestMessage.role === "user") {
            container.scrollTop = container.scrollHeight;
            return;
        }
        const rowTop = latestRow.getBoundingClientRect().top
            - container.getBoundingClientRect().top
            + container.scrollTop;
        container.scrollTop = Math.max(0, rowTop - 8);
    }, [messages]);

    const selectPet = (nextIndex: number) => {
        if (nextIndex === selectedPetIndex) return;
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        activeQuestionRef.current = "";
        requestSequenceRef.current += 1;
        inFlightRef.current = false;
        setLoading(false);
        setMessages([]);
        setInput("");
        setRequestNotice("");
        generationReferences.clear();
        setSelectedPetIndex(nextIndex);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void ask(input);
    };

    const latestProducts = [...messages].reverse().find((message) => message.products && message.products.length > 0)?.products ?? [];

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <header className="mb-6">
                <div>
                    <p className="text-sm font-black text-indigo-700">댕다방 케어톡</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">상담</h1>
                </div>
                {pets.length > 0 && (
                    <label className="mt-4 inline-flex max-w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-black text-neutral-700">
                        <span className="shrink-0 text-neutral-500">개인화 기준</span>
                        <select
                            value={selectedPetIndex}
                            onChange={(event) => selectPet(Number(event.target.value))}
                            disabled={loading}
                            className="min-w-0 bg-transparent font-black text-neutral-950 outline-none"
                        >
                            {pets.map((pet, index) => (
                                <option key={`${pet.name}-${pet.lastAnalyzedAt ?? index}`} value={index}>
                                    {pet.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </header>

            <div className={`grid gap-6 ${latestProducts.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""}`}>
                <section className="surface flex h-[min(720px,calc(100dvh-180px))] min-h-[420px] flex-col overflow-hidden">
                    <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4">
                        <div>
                            <b className="text-sm font-black text-neutral-900">대화 내용</b>
                            {messages.length > 0 ? (
                                <span className="ml-2 text-xs font-bold text-neutral-400">{messages.length}개</span>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={clearChat}
                            disabled={messages.length === 0 || loading}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-black text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="대화 내용 비우기"
                        >
                            <i className="fa-solid fa-trash-can text-[11px]" />
                            비우기
                        </button>
                    </div>
                    <div
                        ref={messagesRef}
                        role="log"
                        aria-live="polite"
                        aria-relevant="additions"
                        aria-busy={loading}
                        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-neutral-50 p-4 overscroll-contain"
                    >
                        {messages.map((message, index) => (
                            <div
                                key={`${message.role}-${index}`}
                                data-chat-message-index={index}
                                className={message.role === "user" ? "text-right" : "text-left"}
                            >
                                <div
                                    className={`inline-block max-w-[82%] whitespace-pre-line rounded-lg px-4 py-3 text-sm font-bold leading-6 ${
                                        message.role === "user" ? "bg-neutral-950 text-white" : "bg-white text-neutral-800 shadow-sm"
                                    }`}
                                >
                                    {message.role === "assistant" ? (
                                        <ProgressiveRevealText
                                            text={customerVisibleChatAnswer(message.text, Boolean(message.sources?.length))}
                                        />
                                    ) : (
                                        message.text
                                    )}
                                </div>
                                {message.role === "assistant" && message.conversation?.continued && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
                                        <span aria-hidden="true">↳</span>
                                        앞 대화와 연결한 답변
                                    </div>
                                )}
                                {message.role === "assistant" && (
                                    <>
                                        <ChatResponseExtras
                                            medical={message.medical}
                                            generation={message.generation}
                                            sources={message.sources}
                                            research={message.research}
                                            ctas={message.ctas}
                                            onAsk={ask}
                                            followUpsEnabled={
                                                !loading
                                                && index === messages.length - 1
                                                && !isFollowUpBundlePrompt(
                                                    messages[index - 1]?.role === "user" ? messages[index - 1].text : ""
                                                )
                                            }
                                        />
                                        <ChatAnswerControls
                                            delivery={message.delivery}
                                            quality={message.quality}
                                            traceId={message.traceId}
                                            accessToken={user?.apiAccessToken}
                                            onRetry={
                                                !loading && message.retryPrompt && index === messages.length - 1
                                                    ? () => void ask(message.retryPrompt || "")
                                                    : undefined
                                            }
                                        />
                                    </>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="text-left">
                                <div className="inline-block max-w-[86%] rounded-lg bg-white px-4 py-4 shadow-sm">
                                    <ChatThinkingProgress hasHistory={messages.length > 1} />
                                    <button
                                        type="button"
                                        onClick={cancelActiveRequest}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-600 hover:border-neutral-400 hover:text-neutral-950"
                                    >
                                        <i className="fa-solid fa-stop text-[9px]" aria-hidden="true" />
                                        답변 멈추기
                                    </button>
                                </div>
                            </div>
                        )}
                        {!loading && requestNotice ? (
                            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-600" role="status">
                                {requestNotice}
                            </div>
                        ) : null}
                        <div aria-hidden="true" className="h-px" />
                    </div>
                    <form onSubmit={submit} className="flex shrink-0 flex-col border-t border-neutral-200 bg-white p-4">
                        <GenerationReferenceTray controller={generationReferences} />
                        <div className="flex gap-2">
                            <GenerationReferencePhotoButton controller={generationReferences} disabled={loading} />
                            <input
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                className="input h-12 flex-1"
                                placeholder="메시지를 입력하세요"
                                aria-label="채팅 질문"
                            />
                            {loading ? (
                                <button
                                    type="button"
                                    onClick={cancelActiveRequest}
                                    className="btn h-12 shrink-0 border border-neutral-300 bg-white text-neutral-800"
                                    aria-label="답변 생성 멈추기"
                                >
                                    <i className="fa-solid fa-stop text-xs" />
                                    멈추기
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={generationReferences.isUploading || generationReferences.hasUploadErrors}
                                    className="btn btn-primary h-12 shrink-0 disabled:opacity-50"
                                >
                                    <i className="fa-solid fa-paper-plane text-xs" />
                                    전송
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                {latestProducts.length > 0 ? (
                    <aside>
                        <h2 className="mb-4 text-lg font-black text-neutral-950">추천 상품</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {latestProducts.slice(0, 4).map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </aside>
                ) : null}
            </div>
        </main>
    );
}
