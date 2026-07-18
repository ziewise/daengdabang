"use client";

import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    answerShopQuestion,
    answerShopQuestionSmart,
    type ShopChatCta,
    type ShopChatAction,
    type ShopChatConversation,
    type ShopChatHistoryTurn,
    type ShopChatMedical,
    type ShopChatSource,
} from "@/lib/daengdabang-llm";
import { productHref } from "@/lib/shop";
import { useAuth } from "@/lib/store";
import {
    CHAT_WIDGET_OPEN_EVENT,
    CHAT_WIDGET_VISIBILITY_EVENT,
    type ChatWidgetOpenDetail,
    type ChatWidgetVisibilityDetail,
} from "@/lib/chat-widget-events";
import ChatResponseExtras, { isFollowUpBundlePrompt } from "@/components/site/ChatResponseExtras";
import ChatThinkingProgress from "@/components/site/ChatThinkingProgress";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import styles from "./ChatWidget.module.css";

type Message = {
    role: "user" | "assistant";
    text: string;
    products?: ReturnType<typeof answerShopQuestion>["products"];
    medical?: ShopChatMedical;
    sources?: ShopChatSource[];
    actions?: ShopChatAction[];
    ctas?: ShopChatCta[];
    conversation?: ShopChatConversation;
};

type Props = {
    isMobile?: boolean;
    launcherHidden?: boolean;
    onOpenChange?: (open: boolean) => void;
};

function ActionList({ actions }: { actions?: ShopChatAction[] }) {
    if (!actions?.length) return null;
    return (
        <div className={`${styles.actionList} mt-2 space-y-1 p-2 text-left`}>
            {actions.slice(0, 5).map((action, index) => (
                <div key={`${action.label}-${index}`} className="flex gap-2 text-[11px] font-bold leading-4 text-neutral-600">
                    <span
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                            action.status === "warn"
                                ? "bg-amber-500"
                                : action.status === "running"
                                  ? "animate-pulse bg-sky-500"
                                  : action.status === "done"
                                    ? "bg-emerald-500"
                                    : "bg-neutral-300"
                        }`}
                    />
                    <span>
                        <b className="text-neutral-800">{action.label}</b>
                        {action.detail ? <span className="block text-neutral-500">{action.detail}</span> : null}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function ChatWidget({ isMobile = false, launcherHidden = false, onOpenChange }: Props = {}) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [productContext, setProductContext] = useState("");
    const messagesRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const previouslyOpenRef = useRef(false);
    const inFlightRef = useRef(false);
    const requestSequenceRef = useRef(0);

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
    }, [messages, open]);

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
        const openFromPage = (event: Event) => {
            const detail = (event as CustomEvent<ChatWidgetOpenDetail>).detail;
            setProductContext(typeof detail?.productName === "string" ? detail.productName.trim() : "");
            setInput("");
            setOpen(true);
        };
        window.addEventListener(CHAT_WIDGET_OPEN_EVENT, openFromPage);
        return () => window.removeEventListener(CHAT_WIDGET_OPEN_EVENT, openFromPage);
    }, []);

    const clearChat = () => {
        requestSequenceRef.current += 1;
        inFlightRef.current = false;
        setMessages([]);
        setInput("");
        setLoading(false);
    };

    const ask = async (question: string) => {
        const trimmed = question.trim();
        if (!trimmed || inFlightRef.current) return false;
        inFlightRef.current = true;
        const requestSequence = ++requestSequenceRef.current;
        const questionForAnswer = productContext
            ? `${productContext} 상품 문의: ${trimmed}`
            : trimmed;
        setInput("");
        setLoading(true);
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
        try {
            const result = await answerShopQuestionSmart(questionForAnswer, { pet: user?.pets?.[0] ?? null, history });
            if (requestSequence !== requestSequenceRef.current) return false;
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: result.answer,
                    products: result.products,
                    medical: result.medical,
                    sources: result.sources,
                    actions: result.actions,
                    ctas: result.ctas,
                    conversation: result.conversation,
                },
            ]);
            trackStorefrontEvent("chat_response_succeeded", {
                surface: analyticsSurface,
                hasProducts: Boolean(result.products?.length),
                hasMedicalGuidance: Boolean(result.medical),
            });
            return true;
        } catch {
            if (requestSequence === requestSequenceRef.current) {
                trackStorefrontEvent("chat_response_failed", {
                    surface: analyticsSurface,
                    errorCode: "request_failed",
                });
            }
            return false;
        } finally {
            if (requestSequence === requestSequenceRef.current) {
                inFlightRef.current = false;
                setLoading(false);
            }
        }
    };

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
                    className={`${styles.panel} absolute bottom-[calc(100%+12px)] z-[2201] flex h-[min(520px,calc(100dvh-112px))] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden`}
                >
                    <header className={`${styles.header} flex items-center justify-between px-4`}>
                        <div className={styles.titleGroup}>
                            <span className={styles.noteEyebrow}>CRAYON CARE NOTE</span>
                            <b className={styles.title}>댕다방 케어톡</b>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={clearChat}
                                disabled={loading}
                                className={`${styles.headerIconButton} flex h-10 w-10 items-center justify-center rounded-full`}
                                aria-label="채팅 비우기"
                                title="채팅 비우기"
                            >
                                <i className="fa-solid fa-trash-can text-xs" />
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
                        {messages.length === 0 && !loading ? (
                            <div className={styles.emptyNote}>
                                <span className={styles.emptyPencil} aria-hidden="true">
                                    <i className="fa-solid fa-pencil" />
                                </span>
                                <strong>우리 아이 케어 노트</strong>
                                <p>증상·생활 질문·상품 고민을 편하게 적어 주세요.</p>
                                <span className={styles.emptyPaws} aria-hidden="true">🐾 · 🐾</span>
                            </div>
                        ) : null}
                        {messages.map((message, index) => (
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
                                    {message.text}
                                </div>
                                {message.role === "assistant" && (
                                    <div className={styles.responseExtras}>
                                        <ChatResponseExtras
                                            medical={message.medical}
                                            sources={message.sources}
                                            ctas={message.ctas}
                                            onAsk={ask}
                                            compact
                                            followUpsEnabled={
                                                !loading
                                                && index === messages.length - 1
                                                && !isFollowUpBundlePrompt(
                                                    messages[index - 1]?.role === "user" ? messages[index - 1].text : ""
                                                )
                                            }
                                        />
                                    </div>
                                )}
                                {message.role === "assistant" && <ActionList actions={message.actions} />}
                                {message.role === "assistant" && message.conversation?.continued && (
                                    <div className={`${styles.continuationBadge} mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black`}>
                                        <span aria-hidden="true">↳</span>
                                        앞 대화와 연결한 답변
                                    </div>
                                )}
                                {message.products && message.products.length > 0 && (
                                    <div className="mt-2 grid gap-2">
                                        {message.products.slice(0, 3).map((product) => (
                                            <Link
                                                key={product.id}
                                                href={productHref(product)}
                                                className={`${styles.productLink} block px-3 py-2 text-left text-xs font-extrabold text-neutral-800`}
                                            >
                                                {product.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="text-left">
                                <div className={`${styles.loadingBubble} inline-block max-w-[90%] border-2 px-3 py-3`}>
                                    <ChatThinkingProgress compact hasHistory={messages.length > 1} />
                                </div>
                            </div>
                        )}
                        <div aria-hidden="true" className="h-px" />
                    </div>
                    <form onSubmit={submit} className={`${styles.composer} flex gap-2 p-3`}>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            className={`${styles.input} h-10 flex-1 px-3`}
                            placeholder={productContext ? "이 상품에 대해 궁금한 내용을 입력" : "증상, 생활 질문, 상품 고민을 입력"}
                            aria-label="채팅 질문"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className={`${styles.sendButton} flex h-10 w-10 items-center justify-center disabled:opacity-50`}
                            aria-label="전송"
                        >
                            <i className="fa-solid fa-paper-plane text-xs" />
                        </button>
                    </form>
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
