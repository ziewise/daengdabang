"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    const pets = useMemo(() => user?.pets ?? [], [user]);
    const [selectedPetIndex, setSelectedPetIndex] = useState(0);
    const selectedPet = pets[selectedPetIndex] ?? pets[0] ?? null;
    const initialized = useRef(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", text: "상품명, 용도, 반려견 증상이나 고민을 입력해 주세요. 건강 질문은 먼저 안전하게 확인하고, 상품은 필요할 때만 추천합니다." },
    ]);

    const ask = useCallback(async (question: string) => {
        const trimmed = question.trim();
        if (!trimmed || loading) return;
        setLoading(true);
        setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
        const result = await answerShopQuestionSmart(trimmed, { pet: selectedPet });
        setMessages((prev) => [
            ...prev,
            { role: "assistant", text: result.answer, products: result.products },
        ]);
        setLoading(false);
    }, [loading, selectedPet]);

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
                <p className="text-sm font-black text-indigo-700">댕다방 케어톡</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">상담</h1>
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
                                    답변을 차분히 정리하는 중입니다.
                                </div>
                            </div>
                        )}
                    </div>
                    <form onSubmit={submit} className="flex gap-2 border-t border-neutral-200 bg-white p-4">
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            className="input h-12 flex-1"
                            placeholder="예: 우리 강아지가 아파요 / 중형견 하네스 추천"
                            aria-label="챗봇 질문"
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
                            질문을 보내면 관련 상품이 표시됩니다.
                        </div>
                    )}
                </aside>
            </div>
        </main>
    );
}
