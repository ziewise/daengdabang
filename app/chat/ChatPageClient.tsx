"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { answerShopQuestionSmart } from "@/lib/daengdabang-llm";
import type { CatalogProduct } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";
import { useAuth } from "@/lib/store";

type Message = {
    role: "user" | "assistant";
    text: string;
    products?: CatalogProduct[];
};

export default function ChatPageClient() {
    const params = useSearchParams();
    const { user } = useAuth();
    const initialized = useRef(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", text: "상품명, 용도, 반려견 고민을 입력해 주세요. LLaMA가 가능하면 먼저 답하고, 아니면 333개 카탈로그 기준으로 답변합니다." },
    ]);

    const ask = useCallback(async (question: string) => {
        const trimmed = question.trim();
        if (!trimmed || loading) return;
        setLoading(true);
        setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
        const result = await answerShopQuestionSmart(trimmed, { pet: user?.pets?.[0] ?? null });
        setMessages((prev) => [
            ...prev,
            { role: "assistant", text: result.answer, products: result.products },
        ]);
        setLoading(false);
    }, [loading, user]);

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
                <p className="text-sm font-black text-indigo-700">댕다방 LLM</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">챗봇</h1>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                <section className="surface flex min-h-[620px] flex-col overflow-hidden">
                    <div className="flex-1 space-y-4 overflow-y-auto bg-neutral-50 p-4">
                        {messages.map((message, index) => (
                            <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                                <div className={`inline-block max-w-[82%] rounded-lg px-4 py-3 text-sm font-bold leading-6 ${
                                    message.role === "user" ? "bg-neutral-950 text-white" : "bg-white text-neutral-800 shadow-sm"
                                }`}>
                                    {message.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="text-left">
                                <div className="inline-block rounded-lg bg-white px-4 py-3 text-sm font-bold text-neutral-500 shadow-sm">
                                    LLaMA와 카탈로그를 함께 확인하는 중입니다.
                                </div>
                            </div>
                        )}
                    </div>
                    <form onSubmit={submit} className="flex gap-2 border-t border-neutral-200 bg-white p-4">
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            className="input h-12 flex-1"
                            placeholder="예: 산책 많이 하는 중형견 하네스 추천"
                            aria-label="챗봇 질문"
                        />
                        <button type="submit" disabled={loading} className="btn btn-primary h-12 disabled:opacity-50">
                            <i className="fa-solid fa-paper-plane text-xs" />
                            전송
                        </button>
                    </form>
                </section>

                <aside>
                    <h2 className="mb-4 text-lg font-black text-neutral-950">추천 상품</h2>
                    {latestProducts.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                            {latestProducts.slice(0, 4).map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="surface p-6 text-sm font-bold leading-6 text-neutral-600">
                            질문을 보내면 관련 상품이 표시됩니다.
                        </div>
                    )}
                </aside>
            </div>
        </main>
    );
}
