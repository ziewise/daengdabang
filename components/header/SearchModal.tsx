/**
 * SearchModal — 풀스크린 검색 모달
 * ---------------------------------------------------------------------
 * 검색 input + 인기 검색어 + 최근 검색어 (localStorage) + 빠른 이동 카드.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { POPULAR_KEYWORDS } from "@/lib/menu-data";
import { searchRecent } from "@/lib/storage";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function SearchModal({ open, onClose }: Props) {
    const [recent, setRecent] = useState<string[]>([]);
    const [term, setTerm] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // 열림 → body 스크롤 잠금 + Escape 닫기 + autofocus + 최근 검색어 reload
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = "hidden";
        setRecent(searchRecent.list());
        setTimeout(() => inputRef.current?.focus(), 50);
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    /** 검색 submit — 최근 검색어 추가 후 결과 페이지로 (mock) */
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const t = term.trim();
        if (!t) return;
        searchRecent.add(t);
        setRecent(searchRecent.list());
        // TODO: 실제 검색 페이지로 이동 — 일단 모달만 닫음
        onClose();
    };

    const clickKeyword = (k: string) => {
        searchRecent.add(k);
        setRecent(searchRecent.list());
        setTerm(k);
        // TODO: 결과 페이지로 이동
        onClose();
    };

    const removeRecent = (e: React.MouseEvent, k: string) => {
        e.stopPropagation();
        searchRecent.remove(k);
        setRecent(searchRecent.list());
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[2000] bg-white/95 backdrop-blur-xl animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
        >
            {/* 헤더 */}
            <div className="max-w-3xl mx-auto px-6 pt-12 pb-6">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black">검색</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100"
                        aria-label="닫기"
                    >
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>
                </div>

                <form onSubmit={submit} className="relative mb-10">
                    <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-aurora-indigo text-lg" />
                    <input
                        ref={inputRef}
                        type="search"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="어떤 상품을 찾으세요?"
                        className="w-full pl-14 pr-6 h-16 bg-white border-2 border-neutral-200 rounded-2xl text-base font-medium focus:outline-none focus:border-aurora-indigo focus:shadow-card transition"
                    />
                </form>

                {/* 인기 검색어 */}
                <section className="mb-8">
                    <h3 className="text-xs font-black text-neutral-400 mb-3 tracking-[0.2em]">
                        인기 검색어
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {POPULAR_KEYWORDS.map((k, i) => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => clickKeyword(k)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 hover:bg-aurora-indigo hover:text-white text-sm font-medium transition"
                            >
                                <span className="text-aurora-indigo group-hover:text-white text-[11px] font-bold">
                                    {i + 1}
                                </span>
                                <span>{k}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* 최근 검색어 */}
                {recent.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black text-neutral-400 tracking-[0.2em]">
                                최근 검색어
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    searchRecent.clear();
                                    setRecent([]);
                                }}
                                className="text-xs text-neutral-400 hover:text-danger"
                            >
                                전체 삭제
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {recent.map((k) => (
                                <span
                                    key={k}
                                    className="group inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 text-sm cursor-pointer hover:bg-neutral-200"
                                    onClick={() => clickKeyword(k)}
                                >
                                    <span>{k}</span>
                                    <button
                                        type="button"
                                        onClick={(e) => removeRecent(e, k)}
                                        className="text-neutral-400 hover:text-danger ml-0.5"
                                        aria-label={`${k} 삭제`}
                                    >
                                        <i className="fa-solid fa-xmark text-[10px]" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
