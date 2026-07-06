"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    answerShopQuestionSmart,
    type ShopChatAction,
    type ShopChatMedical,
    type ShopChatSource,
} from "@/lib/daengdabang-llm";
import type { CatalogProduct } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";
import { useAuth } from "@/lib/store";

type Message = {
    role: "user" | "assistant";
    text: string;
    products?: CatalogProduct[];
    medical?: ShopChatMedical;
    sources?: ShopChatSource[];
    actions?: ShopChatAction[];
};

const INITIAL_MESSAGES: Message[] = [
    {
        role: "assistant",
        text: "강아지 건강, 생활 습관, 훈련, 산책, 급여, 상품 비교까지 물어보세요. 먼저 질문 의도를 확인하고 필요한 경우 자료를 찾아 정리해드릴게요.",
    },
];

const QUICK_QUESTIONS = [
    "우리 강아지가 아파요",
    "강아지가 토하고 설사를 해요",
    "자일리톨 껌을 먹었어요",
    "강아지 산책은 하루 몇 번 해야 해?",
    "중형견 하네스 추천",
];

const THINKING_ACTIONS: ShopChatAction[] = [
    { label: "질문 의도 분류", status: "running", detail: "쇼핑/건강/강아지 지식 구분" },
    { label: "댕다방 보유 지식 확인", status: "running", detail: "RAG와 상품 후보 분리" },
    { label: "인터넷 자료 검색", status: "running", detail: "필요한 경우 공식/권위 자료 확인" },
    { label: "답변 정리", status: "running", detail: "근거와 다음 행동 정리" },
];

function triageLabel(medical?: ShopChatMedical) {
    if (!medical?.mode) return "";
    return medical.triage === "emergency" ? "응급 가능성" : "건강 상담";
}

function ActionList({ actions }: { actions?: ShopChatAction[] }) {
    if (!actions?.length) return null;
    return (
        <div className="mt-2 max-w-[82%] space-y-1 rounded-lg border border-neutral-200 bg-white p-3 text-left shadow-sm">
            {actions.slice(0, 6).map((action, index) => (
                <div key={`${action.label}-${index}`} className="flex gap-2 text-xs font-bold leading-5 text-neutral-600">
                    <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            action.status === "warn"
                                ? "bg-amber-500"
                                : action.status === "running"
                                  ? "animate-pulse bg-sky-500"
                                  : "bg-emerald-500"
                        }`}
                    />
                    <span>
                        <b className="text-neutral-900">{action.label}</b>
                        {action.detail ? <span className="block text-[11px] text-neutral-500">{action.detail}</span> : null}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function ChatPageClient() {
    const params = useSearchParams();
    const { user } = useAuth();
    const pets = useMemo(() => user?.pets ?? [], [user]);
    const [selectedPetIndex, setSelectedPetIndex] = useState(0);
    const selectedPet = pets[selectedPetIndex] ?? pets[0] ?? null;
    const initialized = useRef(false);
    const thinkingTimers = useRef<number[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [thinkingActions, setThinkingActions] = useState<ShopChatAction[]>([]);
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);

    const stopThinking = useCallback(() => {
        thinkingTimers.current.forEach((timer) => window.clearTimeout(timer));
        thinkingTimers.current = [];
        setThinkingActions([]);
    }, []);

    const startThinking = useCallback(() => {
        stopThinking();
        setThinkingActions([THINKING_ACTIONS[0]]);
        thinkingTimers.current = THINKING_ACTIONS.slice(1).map((action, index) =>
            window.setTimeout(() => setThinkingActions((prev) => [...prev, action]), 700 * (index + 1))
        );
    }, [stopThinking]);

    const clearChat = () => {
        stopThinking();
        setInput("");
        setLoading(false);
        setMessages(INITIAL_MESSAGES);
    };

    const ask = useCallback(async (question: string) => {
        const trimmed = question.trim();
        if (!trimmed || loading) return;
        setLoading(true);
        startThinking();
        setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
        try {
            const result = await answerShopQuestionSmart(trimmed, { pet: selectedPet });
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: result.answer,
                    products: result.products,
                    medical: result.medical,
                    sources: result.sources,
                    actions: result.actions,
                },
            ]);
        } finally {
            stopThinking();
            setLoading(false);
        }
    }, [loading, selectedPet, startThinking, stopThinking]);

    useEffect(() => {
        if (selectedPetIndex >= pets.length) setSelectedPetIndex(0);
    }, [pets.length, selectedPetIndex]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        const initialQuestion = params.get("q");
        if (initialQuestion) void ask(initialQuestion);
    }, [params, ask]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void ask(input);
        setInput("");
    };

    const latestProducts = [...messages].reverse().find((message) => message.products && message.products.length > 0)?.products ?? [];

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <header className="mb-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-black text-indigo-700">댕다방 케어톡</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">상담</h1>
                    </div>
                    <button
                        type="button"
                        onClick={clearChat}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm font-black text-neutral-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700"
                    >
                        <i className="fa-solid fa-trash-can text-xs" />
                        비우기
                    </button>
                </div>
                {pets.length > 0 && (
                    <label className="mt-4 inline-flex max-w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-black text-neutral-700">
                        <span className="shrink-0 text-neutral-500">개인화 기준</span>
                        <select
                            value={selectedPetIndex}
                            onChange={(event) => setSelectedPetIndex(Number(event.target.value))}
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
                <div className="mt-4 flex flex-wrap gap-2">
                    {QUICK_QUESTIONS.map((question) => (
                        <button
                            key={question}
                            type="button"
                            onClick={() => void ask(question)}
                            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700"
                        >
                            {question}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                <section className="surface flex min-h-[620px] flex-col overflow-hidden">
                    <div className="flex-1 space-y-4 overflow-y-auto bg-neutral-50 p-4">
                        {messages.map((message, index) => (
                            <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                                <div
                                    className={`inline-block max-w-[82%] whitespace-pre-line rounded-lg px-4 py-3 text-sm font-bold leading-6 ${
                                        message.role === "user" ? "bg-neutral-950 text-white" : "bg-white text-neutral-800 shadow-sm"
                                    }`}
                                >
                                    {message.text}
                                </div>
                                {message.role === "assistant" && <ActionList actions={message.actions} />}
                                {message.role === "assistant" && message.medical?.mode && (
                                    <div className="mt-2 max-w-[82%] rounded-lg border border-sky-100 bg-white p-3 text-left shadow-sm">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                                message.medical.triage === "emergency" ? "bg-red-50 text-red-700" : "bg-sky-50 text-sky-800"
                                            }`}>
                                                {triageLabel(message.medical)}
                                            </span>
                                            {message.medical.topicLabel && (
                                                <span className="text-xs font-black text-neutral-700">{message.medical.topicLabel}</span>
                                            )}
                                            {message.medical.knowledgeLevel && (
                                                <span className="text-[11px] font-black text-neutral-400">{message.medical.knowledgeLevel}</span>
                                            )}
                                        </div>
                                        {message.medical.careWindow && (
                                            <p className="mt-2 text-xs font-black leading-5 text-neutral-700">{message.medical.careWindow}</p>
                                        )}
                                        {message.medical.redFlags && message.medical.redFlags.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-[11px] font-black uppercase text-red-600">바로 병원 신호</p>
                                                <ul className="mt-1 space-y-1 text-xs font-bold leading-5 text-neutral-700">
                                                    {message.medical.redFlags.slice(0, 3).map((item) => (
                                                        <li key={item}>- {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {message.medical.firstSteps && message.medical.firstSteps.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-[11px] font-black uppercase text-sky-700">지금 할 일</p>
                                                <ul className="mt-1 space-y-1 text-xs font-bold leading-5 text-neutral-700">
                                                    {message.medical.firstSteps.slice(0, 3).map((item) => (
                                                        <li key={item}>- {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {message.medical.followUpSlots && message.medical.followUpSlots.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {message.medical.followUpSlots.slice(0, 6).map((slot) => (
                                                    <button
                                                        key={`${slot.key}-${slot.label}`}
                                                        type="button"
                                                        onClick={() => void ask(slot.prompt)}
                                                        className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-left text-[11px] font-black text-neutral-600"
                                                    >
                                                        {slot.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {message.role === "assistant" && message.medical?.followUpQuestions && message.medical.followUpQuestions.length > 0 && (
                                    <div className="mt-2 flex max-w-[82%] flex-wrap gap-2">
                                        {message.medical.followUpQuestions.slice(0, 4).map((question) => (
                                            <button
                                                key={question}
                                                type="button"
                                                onClick={() => void ask(question)}
                                                className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-left text-xs font-black leading-5 text-sky-800"
                                            >
                                                {question}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                                    <div className="mt-2 flex max-w-[82%] flex-wrap gap-2">
                                        {message.sources.slice(0, 4).map((source) => (
                                            <a
                                                key={`${source.name}-${source.url}`}
                                                href={source.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-600 shadow-sm"
                                            >
                                                {source.name}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="text-left">
                                <div className="inline-block max-w-[82%] rounded-lg bg-white px-4 py-3 text-sm font-bold text-neutral-500 shadow-sm">
                                    <div>정보 확인 중입니다.</div>
                                    <ActionList actions={thinkingActions} />
                                </div>
                            </div>
                        )}
                    </div>
                    <form onSubmit={submit} className="flex gap-2 border-t border-neutral-200 bg-white p-4">
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            className="input h-12 flex-1"
                            placeholder="예: 강아지 산책은 얼마나 해야 해? / 중형견 하네스 추천"
                            aria-label="채팅 질문"
                        />
                        <button type="submit" disabled={loading} className="btn btn-primary h-12 disabled:opacity-50">
                            <i className="fa-solid fa-paper-plane text-xs" />
                            전송
                        </button>
                    </form>
                </section>

                <aside>
                    <h2 className="mb-4 text-lg font-black text-neutral-950">필요할 때만 추천 상품</h2>
                    {latestProducts.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                            {latestProducts.slice(0, 4).map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="surface p-6 text-sm font-bold leading-6 text-neutral-600">
                            상품이 필요한 질문일 때만 추천을 표시합니다. 건강/생활 질문에는 제품을 억지로 붙이지 않습니다.
                        </div>
                    )}
                </aside>
            </div>
        </main>
    );
}
