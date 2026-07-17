"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
import ChatResponseExtras from "@/components/site/ChatResponseExtras";
import ChatThinkingProgress from "@/components/site/ChatThinkingProgress";

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

function ActionList({ actions }: { actions?: ShopChatAction[] }) {
    if (!actions?.length) return null;
    return (
        <div className="mt-2 space-y-1 rounded-md border border-neutral-200 bg-white/90 p-2 text-left shadow-sm">
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

export default function ChatWidget() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        const container = messagesRef.current;
        if (!container) return;
        window.requestAnimationFrame(() => {
            container.scrollTo({ top: container.scrollHeight, behavior });
        });
    };

    useEffect(() => {
        if (!open) return;
        scrollToBottom(messages.length <= 1 ? "auto" : "smooth");
    }, [open, messages, loading]);

    const clearChat = () => {
        setMessages([]);
        setInput("");
        setLoading(false);
    };

    const ask = async (question: string) => {
        const trimmed = question.trim();
        if (!trimmed || loading) return;
        setInput("");
        setLoading(true);
        const history: ShopChatHistoryTurn[] = messages.slice(-12).map((item) => ({
            role: item.role,
            content: item.text,
        }));
        setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
        try {
            const result = await answerShopQuestionSmart(trimmed, { pet: user?.pets?.[0] ?? null, history });
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
        } finally {
            setLoading(false);
        }
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void ask(input);
    };

    return (
        <div className="relative z-50">
            {open && (
                <section className="absolute bottom-[calc(100%+12px)] right-0 z-[2201] flex h-[min(520px,calc(100dvh-112px))] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl max-sm:fixed max-sm:inset-x-3 max-sm:bottom-[calc(88px+env(safe-area-inset-bottom))] max-sm:top-[calc(env(safe-area-inset-top)+12px)] max-sm:h-auto max-sm:w-auto">
                    <header className="flex h-12 items-center justify-between border-b border-neutral-200 px-4">
                        <b className="text-sm font-black">댕다방 케어톡</b>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={clearChat}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                                aria-label="채팅 비우기"
                                title="채팅 비우기"
                            >
                                <i className="fa-solid fa-trash-can text-xs" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                                aria-label="채팅 닫기"
                                title="채팅 닫기"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                    </header>
                    <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-3 overscroll-contain scroll-smooth">
                        {messages.map((message, index) => (
                            <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                                <div
                                    className={`inline-block max-w-[86%] whitespace-pre-line rounded-lg px-3 py-2 text-sm font-bold leading-6 ${
                                        message.role === "user" ? "bg-neutral-950 text-white" : "bg-white text-neutral-800 shadow-sm"
                                    }`}
                                >
                                    {message.text}
                                </div>
                                {message.role === "assistant" && (
                                    <ChatResponseExtras
                                        medical={message.medical}
                                        sources={message.sources}
                                        ctas={message.ctas}
                                        onAsk={ask}
                                        compact
                                    />
                                )}
                                {message.role === "assistant" && <ActionList actions={message.actions} />}
                                {message.role === "assistant" && message.conversation?.continued && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">
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
                                                className="block rounded-md border border-neutral-200 bg-white px-3 py-2 text-left text-xs font-extrabold text-neutral-800 hover:border-indigo-300"
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
                                <div className="inline-block max-w-[90%] rounded-lg bg-white px-3 py-3 shadow-sm">
                                    <ChatThinkingProgress compact hasHistory={messages.length > 1} />
                                </div>
                            </div>
                        )}
                        <div aria-hidden="true" className="h-px" />
                    </div>
                    <form onSubmit={submit} className="flex gap-2 border-t border-neutral-200 p-3">
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            className="input h-10 flex-1"
                            placeholder="증상, 생활 질문, 상품 고민을 입력"
                            aria-label="채팅 질문"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-950 text-white disabled:opacity-50"
                            aria-label="전송"
                        >
                            <i className="fa-solid fa-paper-plane text-xs" />
                        </button>
                    </form>
                </section>
            )}

            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-950 text-white shadow-xl transition hover:bg-indigo-700"
                data-pet-guide-target="chatbot"
                aria-expanded={open}
                aria-label={open ? "채팅 닫기" : "채팅 열기"}
                title={open ? "채팅 닫기" : "채팅 열기"}
            >
                <i className={`fa-solid ${open ? "fa-xmark" : "fa-comments"} text-lg`} />
            </button>
        </div>
    );
}
