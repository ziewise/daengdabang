"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { answerShopQuestion, answerShopQuestionSmart } from "@/lib/daengdabang-llm";
import { productHref } from "@/lib/shop";
import { useAuth } from "@/lib/store";

type Message = {
    role: "user" | "assistant";
    text: string;
    products?: ReturnType<typeof answerShopQuestion>["products"];
};

export default function ChatWidget() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", text: "무엇이 궁금하신가요? 상품 추천도, 아이가 아플 때 확인할 점도 차분히 도와드릴게요." },
    ]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const question = input.trim();
        if (!question || loading) return;
        setInput("");
        setLoading(true);
        setMessages((prev) => [...prev, { role: "user", text: question }]);
        const result = await answerShopQuestionSmart(question, { pet: user?.pets?.[0] ?? null });
        setMessages((prev) => [...prev, { role: "assistant", text: result.answer, products: result.products }]);
        setLoading(false);
    };

    return (
        // 위치/정렬은 상위 FloatingDock 이 관리 — 여기선 버튼 기준 relative 컨테이너만.
        // 채팅창은 토글 버튼 위(bottom-full)에 absolute 로 띄운다.
        <div className="relative">
            {open && (
                // 모바일: 화면 하단 가운데 고정(dock 이 가운데라 우측 기준이면 화면을 벗어남)
                // 데스크탑(sm+): 토글 버튼 위에 우측 정렬로 띄움
                <section className="fixed inset-x-3 bottom-[5.25rem] flex h-[min(520px,calc(100vh-9rem))] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-full sm:mb-3 sm:h-[min(520px,calc(100vh-7rem))] sm:w-[min(360px,calc(100vw-32px))]">
                    <header className="flex h-12 items-center justify-between border-b border-neutral-200 px-4">
                        <b className="text-sm font-black">댕다방 케어톡</b>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                            aria-label="챗봇 닫기"
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </header>
                    <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-3">
                        {messages.map((message, index) => (
                            <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                                <div className={`inline-block max-w-[86%] rounded-lg px-3 py-2 text-sm font-bold leading-6 ${
                                    message.role === "user" ? "bg-neutral-950 text-white" : "bg-white text-neutral-800 shadow-sm"
                                }`}>
                                    {message.text}
                                </div>
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
                                <div className="inline-block rounded-lg bg-white px-3 py-2 text-sm font-bold text-neutral-500 shadow-sm">
                                    답변을 정리하는 중입니다.
                                </div>
                            </div>
                        )}
                    </div>
                    <form onSubmit={submit} className="flex gap-2 border-t border-neutral-200 p-3">
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            className="input h-10 flex-1"
                            placeholder="증상이나 상품 고민 입력"
                            aria-label="챗봇 질문"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600 text-white disabled:opacity-50"
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
                className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl transition hover:bg-indigo-700"
                aria-label={open ? "챗봇 닫기" : "챗봇 열기"}
                title={open ? "챗봇 닫기" : "챗봇 열기"}
            >
                <i className={`fa-solid ${open ? "fa-xmark" : "fa-comments"} text-lg`} />
            </button>
        </div>
    );
}
