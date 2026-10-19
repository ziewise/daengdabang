"use client";

import { FormEvent, type ComponentType, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ChatPendingRecovery from "@/components/site/ChatPendingRecovery";
import { CHAT_VIEW_DETACHED } from "@/lib/shop-chat-jobs";
import ChatProductCards from "@/components/site/ChatProductCards";
import type { ChatExternalProduct } from "@/lib/chat-products";
import { useChatWindow } from "@/hooks/useChatWindow";
import { CHAT_RESIZE_EDGES } from "@/lib/chat-window-geometry";
import {
    answerShopQuestion,
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
import { useAuth } from "@/lib/store";
import {
    CHAT_WIDGET_OPEN_EVENT,
    CHAT_WIDGET_VISIBILITY_EVENT,
    consumeChatWidgetOpen,
    type ChatWidgetOpenDetail,
    type ChatWidgetVisibilityDetail,
} from "@/lib/chat-widget-events";
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
import type { ShopChatReferenceInput } from "@/lib/generation-reference-assets";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import { customerVisibleChatAnswer } from "@/lib/chat-display";
import { chatFontModeStorage, snapshots, subscribeStorage } from "@/lib/storage";
import ChatAnswerControls from "@/components/site/ChatAnswerControls";
import {
    clearShopChatConversationId,
    saveShopChatConversationId,
    shopChatConversationOwnerKey,
} from "@/lib/shop-chat-conversation";
import styles from "./ChatWidget.module.css";

type Message = {
    role: "user" | "assistant";
    text: string;
    products?: ReturnType<typeof answerShopQuestion>["products"];
    externalProducts?: ChatExternalProduct[];
    medical?: ShopChatMedical;
    sources?: ShopChatSource[];
    research?: ShopChatResearch;
    actions?: ShopChatAction[];
    ctas?: ShopChatCta[];
    conversation?: ShopChatConversation;
    generation?: ShopChatGeneration;
    generationRequest?: { message: string; references: ShopChatReferenceInput[] };
    traceId?: string;
    quality?: ShopChatQuality;
    delivery?: ShopChatDelivery;
    retryPrompt?: string;
    streamed?: boolean;
};

type Props = {
    isMobile?: boolean;
    launcherHidden?: boolean;
    onOpenChange?: (open: boolean) => void;
    // 앱 틀(로컬 시안)에서만: 대화가 비어 있을 때 보여 줄 첫 화면 — 예시 질문을 누르면 아래 ask(같은 질문 보내기)로 보냄. 안 넘기면(웹) 기존과 같음
    empty?: ComponentType<{ ask: (question: string) => void }>;
};

const subscribeChatFontMode = (callback: () => void) => subscribeStorage("CHAT_FONT_MODE", callback);
const getServerChatFontMode = () => "readable" as const;

export default function ChatWidget({ isMobile = false, launcherHidden = false, onOpenChange, empty: Empty }: Props = {}) {
    const { user, hydrated } = useAuth();
    const [open, setOpen] = useState(false);
    const chatWindow = useChatWindow(open);
    const [initialQuestion, setInitialQuestion] = useState<{ text: string } | null>(null);
    const consumedInitialQuestion = useRef<{ text: string } | null>(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const completedExchanges = messages.filter((message) => message.role === "assistant" && message.delivery?.status === "live").length;
    const sessionComplete = completedExchanges >= 5;
    const [productContext, setProductContext] = useState("");
    const messagesRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const previouslyOpenRef = useRef(false);
    const inFlightRef = useRef(false);
    const requestSequenceRef = useRef(0);
    const activeRequestRef = useRef<AbortController | null>(null);
    const activeQuestionRef = useRef("");
    const [requestNotice, setRequestNotice] = useState("");
    const [recovering, setRecovering] = useState(false);
    const [streamStage, setStreamStage] = useState<ShopChatStreamStage>("queued");
    const [streamMessage, setStreamMessage] = useState("");
    const [streamedAnswer, setStreamedAnswer] = useState("");
    const conversationIdRef = useRef("");
    const conversationOwnerRef = useRef<string | null>(null);
    const conversationOwner = useMemo(() => user ? {
        apiUserId: user.apiUserId,
        email: user.email,
    } : null, [user]);
    const conversationOwnerKey = shopChatConversationOwnerKey(conversationOwner);
    const recoveryScope = `widget:${conversationOwnerKey}`;
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

    useLayoutEffect(() => {
        if (!open) return;
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
    }, [messages, open, streamStage, streamedAnswer]);

    useLayoutEffect(() => {
        window.dispatchEvent(new CustomEvent<ChatWidgetVisibilityDetail>(CHAT_WIDGET_VISIBILITY_EVENT, {
            detail: { open },
        }));
        return () => {
            window.dispatchEvent(new CustomEvent<ChatWidgetVisibilityDetail>(CHAT_WIDGET_VISIBILITY_EVENT, {
                detail: { open: false },
            }));
        };
    }, [open]);

    useEffect(() => {
        onOpenChange?.(open);
        const wasOpen = previouslyOpenRef.current;
        previouslyOpenRef.current = open;
        if (open === wasOpen) return;
        if (open) {
            trackStorefrontEvent("chat_opened", {
                surface: isMobile ? "mobile_widget" : "desktop_widget",
                hasProductContext: Boolean(productContext),
            });
        }
        const focusFrame = window.requestAnimationFrame(() => {
            if (open) inputRef.current?.focus();
            else triggerRef.current?.focus();
        });
        return () => window.cancelAnimationFrame(focusFrame);
    }, [isMobile, onOpenChange, open, productContext]);

    useEffect(() => {
        const applyOpen = (detail?: ChatWidgetOpenDetail) => {
            if (typeof detail?.productName === "string") setProductContext(detail.productName.trim());
            // Ordinary menu opens preserve the draft and the current conversation.
            if (detail?.initialQuestion) setInitialQuestion({ text: detail.initialQuestion });
            setOpen(true);
        };
        const openFromPage = (event: Event) => applyOpen(consumeChatWidgetOpen() ?? (event as CustomEvent<ChatWidgetOpenDetail>).detail);
        window.addEventListener(CHAT_WIDGET_OPEN_EVENT, openFromPage);
        const pending = consumeChatWidgetOpen();
        if (pending) applyOpen(pending);
        return () => window.removeEventListener(CHAT_WIDGET_OPEN_EVENT, openFromPage);
    }, []);

    useEffect(() => () => activeRequestRef.current?.abort(CHAT_VIEW_DETACHED), []);

    useEffect(() => {
        const previousOwner = conversationOwnerRef.current;
        conversationOwnerRef.current = conversationOwnerKey;
        if (previousOwner === conversationOwnerKey) return;
        // There is no visible transcript restoration. A blank widget must
        // never silently resume an old server-side medical conversation.
        conversationIdRef.current = "";
        clearShopChatConversationId(conversationOwner);
        if (previousOwner === null || previousOwner === conversationOwnerKey) return;
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        activeQuestionRef.current = "";
        requestSequenceRef.current += 1;
        inFlightRef.current = false;
        setMessages([]);
        setInput("");
        setLoading(false);
        setStreamedAnswer("");
        setStreamStage("queued");
        setRequestNotice("계정이 바뀌어 안전하게 새 대화를 시작했어요.");
        clearReferences();
    }, [clearReferences, conversationOwner, conversationOwnerKey]);

    const clearChat = () => {
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        activeQuestionRef.current = "";
        requestSequenceRef.current += 1;
        inFlightRef.current = false;
        setMessages([]);
        setProductContext("");
        setInput("");
        setLoading(false);
        setStreamedAnswer("");
        setStreamStage("queued");
        conversationIdRef.current = "";
        clearShopChatConversationId(conversationOwner);
        setRequestNotice(user ? "새 대화를 시작했어요. 무엇이든 다시 물어보세요." : "");
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
            surface: isMobile ? "mobile_widget" : "desktop_widget",
            errorCode: "request_cancelled",
        });
    };

    const ask = async (question: string) => {
        const trimmed = question.trim();
        if (sessionComplete) {
            setRequestNotice("답변 5회를 마쳤어요. 내용을 확인한 뒤 새 상담을 시작해 주세요.");
            return false;
        }
        if (referencesUploading) {
            showReferenceNotice("사진을 올리는 중이에요. 첨부가 끝난 뒤 보내 주세요.");
            return false;
        }
        if (hasUploadErrors) {
            showReferenceNotice("올리지 못한 사진을 다시 시도하거나 삭제한 뒤 보내 주세요.");
            return false;
        }
        if (recovering) { setRequestNotice("이전 요청의 답변을 기다리거나 먼저 멈춰 주세요."); return false; }
        if (!trimmed || inFlightRef.current) return false;
        inFlightRef.current = true;
        const requestSequence = ++requestSequenceRef.current;
        const requestController = new AbortController();
        activeRequestRef.current = requestController;
        activeQuestionRef.current = trimmed;
        const questionForAnswer = productContext
            ? `${productContext} 상품 문의: ${trimmed}`
            : trimmed;
        setInput("");
        setLoading(true);
        setStreamStage("queued");
        setStreamMessage("");
        setStreamedAnswer("");
        setRequestNotice("");
        const analyticsSurface = isMobile ? "mobile_widget" : "desktop_widget";
        trackStorefrontEvent("chat_message_sent", {
            surface: analyticsSurface,
            hasProductContext: Boolean(productContext),
            hasPetProfile: Boolean(user?.pets?.[0]),
        });
        const history: ShopChatHistoryTurn[] = messages.slice(-12).map((item) => ({
            role: item.role,
            content: item.text,
        }));
        setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
        let streamed = false;
        try {
            const result = await answerShopQuestionSmart(questionForAnswer, {
                pet: user?.pets?.[0] ?? null,
                history,
                references: readyReferences,
                accessToken: user?.apiAccessToken,
                recoveryScope,
                conversationId: conversationIdRef.current || undefined,
                onProgress: ({ stage, message }) => {
                    if (requestSequence !== requestSequenceRef.current) return;
                    setStreamStage(stage);
                    setStreamMessage(message || "");
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
                    externalProducts: result.externalProducts,
                    medical: result.medical,
                    sources: result.sources,
                    research: result.research,
                    actions: result.actions,
                    ctas: result.ctas,
                    conversation: result.conversation,
                    generation: result.generation,
                    generationRequest: result.generation ? {
                        message: questionForAnswer,
                        references: readyReferences.map((reference) => ({ ...reference })),
                    } : undefined,
                    traceId: result.traceId,
                    quality: result.quality,
                    delivery: result.delivery,
                    retryPrompt: result.delivery?.status === "live" ? undefined : trimmed,
                    streamed,
                },
            ]);
            if (!result.delivery || result.delivery.status === "live") {
                trackStorefrontEvent("chat_response_succeeded", {
                    surface: analyticsSurface,
                    hasProducts: Boolean(result.products?.length),
                    hasMedicalGuidance: Boolean(result.medical),
                });
            } else {
                trackStorefrontEvent("chat_response_failed", {
                    surface: analyticsSurface,
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
                    surface: analyticsSurface,
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
    };

    useEffect(() => {
        if (!hydrated || loading || !initialQuestion || consumedInitialQuestion.current === initialQuestion) return;
        consumedInitialQuestion.current = initialQuestion;
        void ask(initialQuestion.text);
        // ask uses the hydrated owner and current transcript; identity guard prevents a second send.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, loading, initialQuestion]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void ask(input);
    };

    const hideTrigger = launcherHidden || (isMobile && open);

    return (
        <div className={`${styles.root} relative z-50`} data-chat-widget-open={open ? "true" : "false"}>
            {open && (
                <section
                    role="dialog"
                    aria-label="댕다방 케어톡"
                    data-chat-font-mode={chatFontMode}
                    data-chat-desktop={chatWindow.desktop ? "true" : "false"}
                    style={chatWindow.style}
                    className={`${styles.panel} absolute bottom-[calc(100%+12px)] z-[2201] flex h-[min(520px,calc(100dvh-112px))] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden`}
                >
                    <header {...chatWindow.dragHandlers} className={`${styles.header} flex items-center justify-between px-4`} title={chatWindow.desktop ? "제목을 잡고 끌어 창 이동" : undefined}>
                        <div className={styles.titleGroup}>
                            <span className={styles.noteEyebrow}>CRAYON CARE NOTE</span>
                            <b className={styles.title}>댕다방 케어톡</b>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <button
                                type="button"
                                onClick={() => chatFontModeStorage.set(readableFontEnabled ? "crayon" : "readable")}
                                className={`${styles.headerIconButton} flex h-10 w-12 items-center justify-center rounded-full`}
                                data-chat-font-toggle
                                data-active={readableFontEnabled ? "true" : "false"}
                                aria-label={fontToggleLabel}
                                aria-pressed={readableFontEnabled}
                                title={fontToggleLabel}
                            >
                                <span className={styles.fontModeGlyph} aria-hidden="true">
                                    <span className={styles.fontModeCrayonSample}>가</span>
                                    <span className={styles.fontModeDivider} />
                                    <span className={styles.fontModeReadableSample}>가</span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={clearChat}
                                disabled={loading}
                                className={`${styles.headerIconButton} flex h-10 items-center justify-center gap-1 rounded-full ${user ? "px-2 text-[10px] font-black" : "w-10"}`}
                                aria-label="채팅 비우기"
                                title={user ? "새 대화" : "채팅 비우기"}
                            >
                                <i className={`fa-solid ${user ? "fa-pen-to-square" : "fa-trash-can"} text-xs`} />
                                {user ? <span>새 대화</span> : null}
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className={`${styles.headerIconButton} flex h-10 w-10 items-center justify-center rounded-full`}
                                aria-label="채팅 닫기"
                                title="채팅 닫기"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                    </header>
                    {chatWindow.desktop ? (
                        <div className={styles.windowHint}>
                            제목을 끌어 이동 · 가장자리나 모서리를 끌어 크기 조절
                        </div>
                    ) : null}
                    {productContext ? (
                        <div className={`${styles.contextBar} flex shrink-0 items-center gap-2 px-3 py-2 text-[11px] font-bold`}>
                            <span className={`${styles.contextTag} shrink-0 px-2 py-0.5 text-[11px] font-black`}>상품 문의</span>
                            <span className="min-w-0 flex-1 truncate" title={productContext}>{productContext}</span>
                            <button
                                type="button"
                                onClick={() => setProductContext("")}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-indigo-500 hover:bg-indigo-100 hover:text-indigo-900"
                                aria-label="상품 문의 대상 지우기"
                            >
                                <i className="fa-solid fa-xmark text-[10px]" />
                            </button>
                        </div>
                    ) : null}
                    <div
                        ref={messagesRef}
                        role="log"
                        aria-live="polite"
                        aria-relevant="additions"
                        aria-busy={loading}
                        className={`${styles.messageList} min-h-0 flex-1 space-y-3 overflow-y-auto p-3 overscroll-contain`}
                    >
                        {Empty && messages.length === 0 && !loading ? <Empty ask={(question) => void ask(question)} /> : null}
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
                                data-chat-role={message.role}
                                data-chat-message-index={index}
                                className={`${styles.messageRow} ${message.role === "user" ? "text-right" : "text-left"}`}
                            >
                                <div
                                    className={`${styles.messageBubble} inline-block max-w-[86%] whitespace-pre-line px-3 py-2 ${
                                        message.role === "user" ? styles.userBubble : styles.assistantBubble
                                    }`}
                                >
                                    {message.role === "assistant" ? (
                                        message.streamed ? (
                                            visibleAnswer
                                        ) : (
                                            <ProgressiveRevealText text={visibleAnswer} />
                                        )
                                    ) : (
                                        visibleAnswer
                                    )}
                                </div>
                                {message.role === "assistant" && (
                                    <div className={styles.responseExtras}>
                                        <ChatResponseExtras
                                            medical={message.medical}
                                            generation={message.generation}
                                            generationRequest={message.generationRequest}
                                            accessToken={user?.apiAccessToken}
                                            sources={message.sources}
                                            research={message.research}
                                            ctas={message.ctas}
                                            questionContext={questionContext}
                                            onAsk={ask}
                                            onInternalNavigate={() => setOpen(false)}
                                            compact
                                            followUpsEnabled={
                                                !loading
                                                && index === messages.length - 1
                                                && !isFollowUpBundlePrompt(
                                                    questionContext || ""
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
                                            compact
                                        />
                                    </div>
                                )}
                                {message.role === "assistant" && message.conversation?.continued && (
                                    <div className={`${styles.continuationBadge} mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black`}>
                                        <span aria-hidden="true">↳</span>
                                        앞 대화와 연결한 답변
                                    </div>
                                )}
                                <ChatProductCards products={message.products} externalProducts={message.externalProducts} />
                            </div>
                            );
                        })}
                        {loading && (
                            <div className="text-left">
                                <div className={`${styles.loadingBubble} inline-block max-w-[90%] border-2 px-3 py-3`}>
                                    <ChatThinkingProgress compact hasHistory={messages.length > 1} stage={streamStage} message={streamMessage} />
                                    {streamedAnswer ? (
                                        <p className="mt-3 whitespace-pre-line border-t border-neutral-200 pt-3 text-[12px] font-bold leading-5 text-neutral-800">
                                            {customerVisibleChatAnswer(streamedAnswer, false)}
                                        </p>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={cancelActiveRequest}
                                        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-neutral-600 hover:border-neutral-400 hover:text-neutral-950"
                                    >
                                        <i className="fa-solid fa-stop text-[8px]" aria-hidden="true" />
                                        멈추기
                                    </button>
                                </div>
                            </div>
                        )}
                        {hydrated ? <ChatPendingRecovery key={recoveryScope} scope={recoveryScope} accessToken={user?.apiAccessToken} busy={loading} onPendingChange={setRecovering} /> : null}
                        {!loading && requestNotice ? (
                            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-bold leading-4 text-neutral-600" role="status">
                                {requestNotice}
                            </div>
                        ) : null}
                        <div aria-hidden="true" className="h-px" />
                    </div>
                    <form onSubmit={submit} className={`${styles.composer} flex flex-col p-3`}>
                        {sessionComplete ? (
                            <div role="status" className="mb-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-neutral-900">
                                <p className="font-bold">이번 상담의 답변 5회를 마쳤어요.</p>
                                <p>답변을 확인한 뒤 새 상담을 시작해 주세요. 현재 화면의 대화가 비워지고, 이전 대화는 다음 답변에 이어지지 않아요.</p>
                                <button type="button" onClick={clearChat} className="mt-2 rounded-lg bg-neutral-900 px-4 py-2 font-bold text-white">새 상담 시작</button>
                            </div>
                        ) : <p className="mb-2 text-xs text-neutral-600">답변 {completedExchanges}/5 · 5회 후 안내에 따라 새 상담을 시작해요.</p>}
                        <p className="mb-2 text-[11px] leading-4 text-neutral-500">질문·대화 맥락은 Google Gemini에 전달될 수 있어요. 연락처·주소 등 개인정보는 입력하지 마세요. <a href="/privacy/#overseas" className="underline">처리 안내</a></p>
                        <GenerationReferenceTray controller={generationReferences} compact />
                        <div className="flex gap-2">
                            <GenerationReferencePhotoButton controller={generationReferences} disabled={loading || sessionComplete} compact />
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                className={`${styles.input} h-10 flex-1 px-3`}
                                placeholder={productContext ? "이 상품에 대해 궁금한 내용을 입력" : "메시지를 입력하세요"}
                                aria-label="채팅 질문"
                                disabled={sessionComplete}
                            />
                            {loading ? (
                                <button
                                    type="button"
                                    onClick={cancelActiveRequest}
                                    className={`${styles.sendButton} flex h-10 w-10 shrink-0 items-center justify-center`}
                                    aria-label="답변 생성 멈추기"
                                    title="답변 멈추기"
                                >
                                    <i className="fa-solid fa-stop text-xs" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading || sessionComplete || generationReferences.isUploading || generationReferences.hasUploadErrors}
                                    className={`${styles.sendButton} flex h-10 w-10 shrink-0 items-center justify-center disabled:opacity-50`}
                                    aria-label="전송"
                                >
                                    <i className="fa-solid fa-paper-plane text-xs" />
                                </button>
                            )}
                        </div>
                    </form>
                    {chatWindow.desktop ? CHAT_RESIZE_EDGES.map(edge => (
                        <div key={edge} {...chatWindow.resizeHandlers(edge)} className={styles.resizeHandle}
                            data-resize-edge={edge} role="group" tabIndex={edge === "se" ? 0 : -1}
                            aria-label="채팅 창 크기 조절" title="가장자리를 끌어 크기 조절 · 방향키 사용 가능">
                            {edge === "se" ? <span aria-hidden="true">◢</span> : null}
                        </div>
                    )) : null}
                </section>
            )}

            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                className={`${styles.trigger} flex h-14 w-14 items-center justify-center rounded-full text-white ${
                    hideTrigger ? "invisible pointer-events-none opacity-0" : "visible opacity-100"
                }`}
                data-chat-open={open ? "true" : "false"}
                data-pet-guide-target="chatbot"
                data-mobile-chat-trigger
                aria-expanded={open}
                aria-hidden={hideTrigger ? "true" : undefined}
                tabIndex={hideTrigger ? -1 : undefined}
                aria-label={open ? "채팅 닫기" : "채팅 열기"}
                title={open ? "채팅 닫기" : "채팅 열기"}
            >
                <i className={`fa-solid ${open ? "fa-xmark" : "fa-comments"} text-lg`} />
            </button>
        </div>
    );
}
