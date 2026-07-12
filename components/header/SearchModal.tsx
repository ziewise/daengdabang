/**
 * SearchModal — 페이지 위 모달 검색 (실시간 결과)
 * ---------------------------------------------------------------------
 * 입력하면 카탈로그에서 즉시 매칭 결과 노출 (top 6).
 * 빈 입력 = 인기 검색어 + 최근 검색어.
 * 검색 결과 항목 클릭 OR submit 시 /products?q=... 로 이동.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { POPULAR_KEYWORDS } from "@/lib/menu-data";
import { searchRecent } from "@/lib/storage";
import { searchCatalog } from "@/lib/catalog";
import { productHref } from "@/lib/shop";
import { PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT } from "@/lib/pet-companion";
import { useI18n } from "@/lib/i18n";
import bestStyles from "@/components/main/best.module.css";

interface Props {
    open: boolean;
    onClose: () => void;
}

const PREVIEW_LIMIT = 6;

export default function SearchModal({ open, onClose }: Props) {
    const router = useRouter();
    const [recent, setRecent] = useState<string[]>([]);
    const [term, setTerm] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const { t, locale, formatPrice, productName, menuLabel } = useI18n();

    // 열림 → body 스크롤 잠금 + Escape 닫기 + autofocus + 최근 검색어 reload
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = "hidden";
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecent(searchRecent.list());
        setTimeout(() => inputRef.current?.focus(), 50);
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    /** 실시간 검색 — term 변화에 따라 매칭 결과 */
    const results = useMemo(() => {
        const q = term.trim();
        if (!q) return [];
        return searchCatalog(q);
    }, [term]);
    const previewResults = results.slice(0, PREVIEW_LIMIT);
    const hasQuery = term.trim().length > 0;

    useEffect(() => {
        if (!open || !hasQuery || previewResults.length === 0) return;
        const timer = window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent(PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT, {
                detail: { source: "search-modal", query: term.trim() },
            }));
        }, 650);
        return () => window.clearTimeout(timer);
    }, [hasQuery, open, previewResults.length, term]);

    /** 검색 결과 페이지로 이동 + 최근 검색어 등록 + 모달 닫기 */
    const goSearch = (q: string) => {
        const t = q.trim();
        if (!t) return;
        searchRecent.add(t);
        onClose();
        router.push(`/products?q=${encodeURIComponent(t)}`);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        goSearch(term);
    };

    const clickKeyword = (k: string) => {
        setTerm(k);
        goSearch(k);
    };

    const removeRecent = (e: React.MouseEvent, k: string) => {
        e.stopPropagation();
        searchRecent.remove(k);
        setRecent(searchRecent.list());
    };

    if (!open) return null;

    return (
        <>
            {/* 오버레이 — 페이지 어둡게 처리 (페이지 보임) */}
            <div
                className="fixed inset-0 z-[2000] bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />
            {/* 모달 — 화면 상단 88px, 가로 중앙 */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t("search")}
                data-pet-companion-allow="search"
                className="fixed left-1/2 top-[88px] -translate-x-1/2 z-[2001] w-[min(640px,calc(100vw-32px))] max-h-[calc(100vh-120px)] overflow-y-auto bg-white rounded-2xl shadow-modal animate-in zoom-in-95 fade-in slide-in-from-top-2 duration-200"
            >
                {/* 검색 input — 모달 헤더 역할 */}
                <div className="px-5 pt-5 pb-3 border-b border-neutral-100 sticky top-0 bg-white z-10">
                    <form onSubmit={submit} className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-aurora-indigo" />
                        <input
                            ref={inputRef}
                            type="search"
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder={locale === "en" ? "Search products (e.g. harness, food, Ruffwear)" : "어떤 상품을 찾으세요? (예: 하네스, 사료, 러프웨어)"}
                            className="w-full pl-12 pr-12 h-12 bg-neutral-50 border-2 border-transparent rounded-xl text-sm font-medium focus:outline-none focus:border-aurora-indigo focus:bg-white transition"
                        />
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-200 text-neutral-500"
                            aria-label={t("close")}
                        >
                            <i className="fa-solid fa-xmark text-sm" />
                        </button>
                    </form>
                </div>

                <div className="px-5 py-5">
                    {/* 입력 있을 때 — 실시간 결과 */}
                    {hasQuery ? (
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black text-neutral-400 tracking-[0.2em]">
                                    {locale === "en" ? "Search Results" : "검색 결과"}
                                </h3>
                                <span className="text-[10px] text-neutral-400 font-bold">
                                    {locale === "en" ? `${results.length} found` : `${results.length}개 발견`}
                                </span>
                            </div>

                            {previewResults.length === 0 ? (
                                <div className="text-center py-8">
                                    <i className="fa-solid fa-circle-question text-2xl text-neutral-300 mb-2" />
                                    <p className="text-xs text-neutral-500">
                                        {locale === "en" ? "No results. Try another keyword." : "결과가 없어요. 다른 키워드를 시도해 보세요."}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <ul className="space-y-1.5 mb-3">
                                        {previewResults.map((p) => (
                                            <li key={p.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => goSearch(p.name)}
                                                    data-pet-product="true"
                                                    data-pet-name={productName(p)}
                                                    data-pet-category={p.category}
                                                    data-pet-subcategory={p.subcategory}
                                                    data-pet-href={productHref(p)}
                                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 text-left transition"
                                                >
                                                    {/* 썸네일 — image 있으면 사진, 없으면 ph + 아이콘 */}
                                                    <div className={`relative w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 ${p.image ? "bg-[#F7F2E8]" : bestStyles[`ph${p.ph}`]}`}>
                                                        {p.image ? (
                                                            <Image
                                                                src={p.image}
                                                                alt={productName(p)}
                                                                fill
                                                                sizes="48px"
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <i className={`fa-solid ${p.icon} text-lg text-white/95 drop-shadow`} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-extrabold tracking-wider text-aurora-indigo uppercase">
                                                            {p.brandEn || p.brandKo}
                                                        </p>
                                                        <p className="text-xs font-bold truncate">{productName(p)}</p>
                                                    </div>
                                                    <span className="text-xs font-black flex-shrink-0">
                                                        {formatPrice(p.price)}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    {results.length > PREVIEW_LIMIT && (
                                        <button
                                            type="button"
                                            onClick={() => goSearch(term)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-aurora-indigo/[0.08] hover:bg-aurora-indigo/[0.12] text-aurora-indigo text-xs font-extrabold transition flex items-center justify-center gap-1.5"
                                        >
                                            {locale === "en" ? `View all ${results.length} results` : `전체 결과 ${results.length}개 모두 보기`}
                                            <i className="fa-solid fa-arrow-right text-[10px]" />
                                        </button>
                                    )}
                                </>
                            )}
                        </section>
                    ) : (
                        // 입력 없을 때 — 인기/최근 검색어
                        <>
                            <section className="mb-5">
                                <h3 className="text-[10px] font-black text-neutral-400 mb-2 tracking-[0.2em]">
                                    {locale === "en" ? "Popular Searches" : "인기 검색어"}
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {POPULAR_KEYWORDS.map((k, i) => (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => clickKeyword(k)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-aurora-indigo hover:text-white text-xs font-medium transition group"
                                        >
                                            <span className="text-aurora-indigo group-hover:text-white text-[10px] font-bold">
                                                {i + 1}
                                            </span>
                                            <span>{menuLabel(k)}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {recent.length > 0 && (
                                <section>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-[10px] font-black text-neutral-400 tracking-[0.2em]">
                                            {locale === "en" ? "Recent Searches" : "최근 검색어"}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                searchRecent.clear();
                                                setRecent([]);
                                            }}
                                            className="text-[10px] text-neutral-400 hover:text-danger font-bold"
                                        >
                                            {locale === "en" ? "Clear all" : "전체 삭제"}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {recent.map((k) => (
                                            <span
                                                key={k}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-xs cursor-pointer hover:bg-neutral-200"
                                                onClick={() => clickKeyword(k)}
                                            >
                                                <span>{k}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => removeRecent(e, k)}
                                                    className="text-neutral-400 hover:text-danger ml-0.5"
                                                    aria-label={`${k} ${t("delete")}`}
                                                >
                                                    <i className="fa-solid fa-xmark text-[9px]" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
