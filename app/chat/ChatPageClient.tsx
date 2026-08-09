"use client";

import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    type ShopChatStreamStage,
} from "@/lib/daengdabang-llm";
import type { CatalogProduct } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";
import { useAuth, type PetProfile } from "@/lib/store";
import ChatResponseExtras, {
    customerFriendlyLocalCareAnswer,
    isFollowUpBundlePrompt,
} from "@/components/site/ChatResponseExtras";
import ChatThinkingProgress from "@/components/site/ChatThinkingProgress";
import ProgressiveRevealText from "@/components/site/ProgressiveRevealText";
import {
    GenerationReferencePhotoButton,
    GenerationReferenceTray,
    useGenerationReferenceAttachments,
} from "@/components/site/GenerationReferenceComposer";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import { customerVisibleChatAnswer } from "@/lib/chat-display";
import { chatFontModeStorage, snapshots, subscribeStorage } from "@/lib/storage";
import ChatAnswerControls from "@/components/site/ChatAnswerControls";
import {
    clearShopChatConversationId,
    loadShopChatConversationId,
    saveShopChatConversationId,
    shopChatConversationOwnerKey,
} from "@/lib/shop-chat-conversation";

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
    streamed?: boolean;
};

function chatPetKey(pet: PetProfile) {
    return pet.apiProfileId
        ? `profile:${pet.apiProfileId}`
        : `local:${pet.name.trim().toLocaleLowerCase("ko-KR")}`;
}

const subscribeChatFontMode = (callback: () => void) => subscribeStorage("CHAT_FONT_MODE", callback);
const getServerChatFontMode = () => "readable" as const;

export default function ChatPageClient() {
    const navigation = useRouter();
    const params = useSearchParams();
    const { user, hydrated } = useAuth();
    const pets = useMemo(() => user?.pets ?? [], [user]);
    const [selectedPetKey, setSelectedPetKey] = useState("");
    const selectedPet = pets.find((pet) => chatPetKey(pet) === selectedPetKey) ?? pets[0] ?? null;
    const resolvedPetKey = selectedPet ? chatPetKey(selectedPet) : "";
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
    const [streamStage, setStreamStage] = useState<ShopChatStreamStage>("queued");
    const [streamedAnswer, setStreamedAnswer] = useState("");
    const conversationIdRef = useRef("");
    const conversationOwnerRef = useRef<string | null>(null);
    const conversationOwner = useMemo(() => user ? {
        apiUserId: user.apiUserId,
        email: user.email,
    } : null, [user]);
    const conversationOwnerKey = shopChatConversationOwnerKey(conversationOwner);
    const generationReferences = useGenerationReferenceAttachments({ accessToken: user?.apiAccessToken });
    const {
        hasUploadErrors,
        isUploading: referencesUploading,
        readyReferences,
        showLoginNotice: showReferenceLoginNotice,
        showNotice: showReferenceNotice,
        clear: clearReferences,
    } = generationReferences;
    const storedChatFontMode = useSyncExternalStore(
        subscribeChatFontMode,
        snapshots.chatFontMode,
        getServerChatFontMode,
    );
    const chatFontMode = storedChatFontMode === "crayon" ? "crayon" : "readable";
    const readableFontEnabled = chatFontMode === "readable";
    const fontToggleLabel = readableFontEnabled
        ? "기존 손글씨체로 보기"
        : "또박또박한 정자체로 보기";
    const messageFontClass = readableFontEnabled
        ? "text-base leading-7 tracking-normal"
        : "text-[15px] leading-6";

    useEffect(() => {
        trackStorefrontEvent("chat_opened", { surface: "chat_page" });
        return () => activeRequestRef.current?.abort();
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        const previousOwner = conversationOwnerRef.current;
        conversationOwnerRef.current = conversationOwnerKey;
        conversationIdRef.current = loadShopChatConversationId(conversationOwner);
        if (previousOwner === null || previousOwner === conversationOwnerKey) return;
        const interruptedQuestion = activeQuestionRef.current;
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        activeQuestionRef.current = "";
        requestSequenceRef.current += 1;
        inFlightRef.current = false;
        setInput((current) => current.trim() ? current : interruptedQuestion);
        setLoading(false);
        setMessages([]);
        setStreamedAnswer("");
        setStreamStage("queued");
        setRequestNotice("계정이 바뀌어 안전하게 새 대화를 시작했어요.");
        clearReferences();
    }, [clearReferences, conversationOwner, conversationOwnerKey, hydrated]);

    const clearChat = () => {
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        activeQuestionRef.current = "";
        requestSequenceRef.current += 1;
        inFlightRef.current = false;
        setInput("");
        setLoading(false);
        setMessages([]);
        setStreamedAnswer("");
        setStreamStage("queued");
        conversationIdRef.current = "";
        clearShopChatConversationId(conversationOwner);
        setRequestNotice(user ? "새 대화를 시작했어요. 무엇이든 다시 물어보세요." : "");
        generationReferences.clear();
    };

    const resetChatForPetChange = useCallback((notice = "아이를 바꿔 새 대화를 시작했어요.") => {
        const interruptedQuestion = activeQuestionRef.current;
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        activeQuestionRef.current = "";
        requestSequenceRef.current += 1;
        inFlightRef.current = false;
        setLoading(false);
        setMessages([]);
        setInput((current) => current.trim() ? current : interruptedQuestion);
        setStreamedAnswer("");
        setStreamStage("queued");
        conversationIdRef.current = "";
        clearShopChatConversationId(conversationOwner);
        setRequestNotice(notice);
        clearReferences();
    }, [clearReferences, conversationOwner]);

    useEffect(() => {
        if (resolvedPetKey === selectedPetKey) return;
        const syncTimer = window.setTimeout(() => {
            if (selectedPetKey) {
                resetChatForPetChange("선택한 아이 정보가 바뀌어 안전하게 새 대화를 시작했어요.");
            }
            setSelectedPetKey(resolvedPetKey);
        }, 0);
        return () => window.clearTimeout(syncTimer);
    }, [resetChatForPetChange, resolvedPetKey, selectedPetKey]);

    const cancelActiveRequest = () => {
        if (!activeRequestRef.current) return;
        const cancelledQuestion = activeQuestionRef.current;
        activeRequestRef.current.abort();
        activeRequestRef.current = null;
        activeQuestionRef.current = "";
        requestSequenceRef.current += 1;
        inFlightRef.current = false;
        setLoading(false);
        setStreamedAnswer("");
        setStreamStage("queued");
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
        setStreamStage("queued");
        setStreamedAnswer("");
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
        let streamed = false;
        try {
            const result = await answerShopQuestionSmart(trimmed, {
                pet: selectedPet,
                history,
                references: readyReferences,
                accessToken: user?.apiAccessToken,
                conversationId: conversationIdRef.current || undefined,
                onProgress: ({ stage }) => {
                    if (requestSequence === requestSequenceRef.current) setStreamStage(stage);
                },
                onDelta: (delta) => {
                    if (requestSequence !== requestSequenceRef.current || !delta) return;
                    streamed = true;
                    setStreamedAnswer((current) => `${current}${delta}`.slice(0, 50_000));
                },
                signal: requestController.signal,
            });
            if (requestSequence !== requestSequenceRef.current) return false;
            if (result.delivery?.reason === "conversation_not_found") {
                conversationIdRef.current = "";
                clearShopChatConversationId(conversationOwner);
            }
            if (result.delivery?.status === "live" && result.conversationId) {
                conversationIdRef.current = result.conversationId;
                saveShopChatConversationId(conversationOwner, result.conversationId);
            }
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
                    streamed,
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
                    setInput((current) => current.trim() ? current : trimmed);
                    setMessages((current) => {
                        const pending = current.at(-1);
                        return pending?.role === "user" && pending.text === trimmed
                            ? current.slice(0, -1)
                            : current;
                    });
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
                setStreamedAnswer("");
                setStreamStage("queued");
            }
        }
    }, [
        hasUploadErrors,
        messages,
        readyReferences,
        referencesUploading,
        conversationOwner,
        selectedPet,
        showReferenceLoginNotice,
        showReferenceNotice,
        user,
    ]);

    useEffect(() => {
        if (!hydrated || conversationOwnerRef.current !== conversationOwnerKey) return;
        const initialQuestion = params.get("q")?.trim();
        if (!initialQuestion || initialQuestionSentRef.current === initialQuestion) return;
        initialQuestionSentRef.current = initialQuestion;
        void ask(initialQuestion);
    }, [params, ask, conversationOwnerKey, hydrated]);

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
    }, [messages, streamStage, streamedAnswer]);

    const selectPet = (nextPetKey: string) => {
        if (nextPetKey === resolvedPetKey) return;
        resetChatForPetChange();
        setSelectedPetKey(nextPetKey);
    };

    const closeChat = () => {
        if (window.history.length > 1) {
            navigation.back();
            return;
        }
        navigation.replace("/");
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void ask(input);
    };

    const latestProducts = [...messages].reverse().find((message) => message.products && message.products.length > 0)?.products ?? [];

    return (
        <main className="mx-auto flex w-full max-w-[1080px] px-2 py-2 sm:px-4 sm:py-4 lg:px-6">
            <div
                data-chat-frame
                className="h-[min(43rem,calc(100dvh-9rem))] max-h-[calc(100dvh-9rem)] min-h-0 w-full rounded-[1.75rem] border-2 border-dashed border-[#f2a48f] bg-[#fff7e8] p-1 shadow-[0_18px_50px_rgba(67,56,202,0.13)] sm:p-1.5"
            >
                <section
                    data-chat-shell
                    data-chat-font-mode={chatFontMode}
                    className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[1.4rem] border-[3px] border-indigo-600 bg-[#fffaf1] ${
                        readableFontEnabled
                            ? "[font-family:var(--font-wanted-sans)]"
                            : "[font-family:var(--font-crayon)]"
                    }`}
                    aria-label="댕다방 케어 톡 상담"
                >
                    <header
                        data-chat-header
                        className="sticky top-0 z-20 shrink-0 border-b-2 border-dashed border-[#f2b29f] bg-[#fff9ed] px-3 py-2.5 sm:px-5 sm:py-3"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-600 bg-clip-text text-[10px] font-black tracking-[0.22em] text-transparent">
                                    CRAYON CARE NOTE
                                </p>
                                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                    <h1 className="text-xl font-black tracking-tight text-[#171b36] sm:text-2xl">댕다방 케어 톡</h1>
                                    <span className="text-[11px] font-bold text-neutral-500">
                                        대화 {messages.length}개
                                    </span>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => chatFontModeStorage.set(readableFontEnabled ? "crayon" : "readable")}
                                    className="inline-flex h-9 w-11 items-center justify-center rounded-full border border-indigo-200 bg-white text-indigo-800 transition hover:border-indigo-400 hover:bg-indigo-50"
                                    data-chat-font-toggle
                                    data-active={readableFontEnabled ? "true" : "false"}
                                    aria-label={fontToggleLabel}
                                    aria-pressed={readableFontEnabled}
                                    title={fontToggleLabel}
                                >
                                    <span className="inline-grid grid-cols-[auto_1px_auto] items-center gap-x-0.5 leading-none" aria-hidden="true">
                                        <span className="-rotate-6 text-base font-bold text-rose-500 [font-family:var(--font-crayon)]">가</span>
                                        <span className="h-4 w-px rotate-12 rounded-full bg-current opacity-30" />
                                        <span className="text-xs font-black text-indigo-950 [font-family:var(--font-wanted-sans)]">가</span>
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={clearChat}
                                    disabled={loading || (!user && messages.length === 0)}
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 text-xs font-black text-indigo-800 transition hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-35"
                                    aria-label="새 대화 시작"
                                >
                                    <i className="fa-solid fa-pen-to-square text-[10px]" aria-hidden="true" />
                                    <span className="hidden sm:inline">새 대화</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={closeChat}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
                                    aria-label="상담 닫기"
                                >
                                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                        {pets.length > 0 ? (
                            <label className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-100 bg-white/90 px-3 py-1.5 text-xs font-black text-neutral-700">
                                <span className="shrink-0 text-indigo-600">상담 아이</span>
                                <select
                                    value={resolvedPetKey}
                                    onChange={(event) => selectPet(event.target.value)}
                                    disabled={loading}
                                    className="min-w-0 max-w-[12rem] bg-transparent font-black text-neutral-950 outline-none"
                                >
                                    {pets.map((pet) => (
                                        <option key={chatPetKey(pet)} value={chatPetKey(pet)}>
                                            {pet.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}
                    </header>

                    <div
                        ref={messagesRef}
                        data-chat-scroll-region
                        role="log"
                        aria-live="polite"
                        aria-relevant="additions"
                        aria-busy={loading}
                        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 overscroll-contain sm:p-5"
                        style={{
                            backgroundColor: "#fffaf1",
                            backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(99, 102, 241, 0.10) 32px)",
                        }}
                    >
                        {messages.length === 0 && !loading ? (
                            <div data-chat-empty-note className="mx-auto mt-3 max-w-lg rounded-2xl border-2 border-dashed border-indigo-200 bg-white/90 px-5 py-5 text-center shadow-sm">
                                <i className="fa-solid fa-paw text-xl text-indigo-500" aria-hidden="true" />
                                <p className="mt-2 text-sm font-black text-neutral-900">우리 아이 이야기를 편하게 들려주세요</p>
                                <p className="mt-1 text-xs font-bold leading-5 text-neutral-600">
                                    건강·생활 고민부터 사료와 용품 비교까지, 필요한 내용만 차근차근 정리해 드릴게요.
                                </p>
                            </div>
                        ) : null}

                        {messages.map((message, index) => {
                            const questionContext = [...messages.slice(0, index)]
                                .reverse()
                                .find((item) => item.role === "user")?.text;
                            const visibleAnswer = message.role === "assistant"
                                ? customerFriendlyLocalCareAnswer(
                                    questionContext,
                                    customerVisibleChatAnswer(message.text, Boolean(message.sources?.length)),
                                    message.medical?.triage,
                                )
                                : message.text;
                            return (
                                <div
                                    key={`${message.role}-${index}`}
                                    data-chat-message-index={index}
                                    className={message.role === "user" ? "text-right" : "text-left"}
                                >
                                    <div
                                        className={`inline-block max-w-[92%] whitespace-pre-line rounded-2xl px-4 py-3 font-bold sm:max-w-[84%] ${messageFontClass} ${
                                            message.role === "user"
                                                ? "rounded-br-md bg-indigo-700 text-white shadow-sm"
                                                : "rounded-bl-md border border-indigo-100 bg-white/95 text-neutral-800 shadow-sm"
                                        }`}
                                    >
                                        {message.role === "assistant" ? (
                                            message.streamed ? visibleAnswer : <ProgressiveRevealText text={visibleAnswer} />
                                        ) : visibleAnswer}
                                    </div>
                                    {message.role === "assistant" && message.conversation?.continued ? (
                                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
                                            <span aria-hidden="true">↳</span>
                                            앞 대화와 연결한 답변
                                        </div>
                                    ) : null}
                                    {message.role === "assistant" ? (
                                        <>
                                            <ChatResponseExtras
                                                medical={message.medical}
                                                generation={message.generation}
                                                sources={message.sources}
                                                research={message.research}
                                                ctas={message.ctas}
                                                questionContext={questionContext}
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
                                    ) : null}
                                </div>
                            );
                        })}

                        {loading ? (
                            <div className="text-left">
                                <div className="inline-block max-w-[92%] rounded-2xl rounded-bl-md border border-indigo-100 bg-white/95 px-4 py-4 shadow-sm sm:max-w-[86%]">
                                    <ChatThinkingProgress hasHistory={messages.length > 1} stage={streamStage} />
                                    {streamedAnswer ? (
                                        <p className="mt-3 whitespace-pre-line border-t border-neutral-200 pt-3 text-sm font-bold leading-6 text-neutral-800">
                                            {customerVisibleChatAnswer(streamedAnswer, false)}
                                        </p>
                                    ) : null}
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
                        ) : null}

                        {!loading && requestNotice ? (
                            <div className="rounded-xl border border-neutral-200 bg-white/95 px-3 py-2 text-xs font-bold text-neutral-600" role="status">
                                {requestNotice}
                            </div>
                        ) : null}

                        {latestProducts.length > 0 ? (
                            <section data-chat-product-suggestions className="rounded-2xl border border-amber-200 bg-[#fffdf7]/95 p-3 text-left shadow-sm">
                                <h2 className="mb-3 text-sm font-black text-neutral-950">함께 살펴볼 상품</h2>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {latestProducts.slice(0, 4).map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            </section>
                        ) : null}
                        <div aria-hidden="true" className="h-px" />
                    </div>

                    <form
                        data-chat-composer
                        onSubmit={submit}
                        className="sticky bottom-0 z-20 flex shrink-0 flex-col border-t-2 border-dashed border-[#f2b29f] bg-[#fff9ed] p-2.5 sm:p-3"
                    >
                        <GenerationReferenceTray controller={generationReferences} />
                        <div className="flex min-w-0 gap-2">
                            <GenerationReferencePhotoButton controller={generationReferences} disabled={loading} />
                            <input
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                className={`input h-11 min-w-0 flex-1 bg-white sm:h-12 ${readableFontEnabled ? "text-base" : "text-[15px]"}`}
                                placeholder="메시지를 입력하세요"
                                aria-label="채팅 질문"
                            />
                            {loading ? (
                                <button
                                    type="button"
                                    onClick={cancelActiveRequest}
                                    className="btn h-11 shrink-0 border border-neutral-300 bg-white px-3 text-neutral-800 sm:h-12"
                                    aria-label="답변 생성 멈추기"
                                >
                                    <i className="fa-solid fa-stop text-xs" />
                                    <span className="hidden sm:inline">멈추기</span>
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading || generationReferences.isUploading || generationReferences.hasUploadErrors}
                                    className="btn btn-primary h-11 shrink-0 px-3 disabled:opacity-50 sm:h-12"
                                    aria-label="메시지 전송"
                                >
                                    <i className="fa-solid fa-paper-plane text-xs" />
                                    <span className="hidden sm:inline">전송</span>
                                </button>
                            )}
                        </div>
                    </form>
                </section>
            </div>
        </main>
    );
}
