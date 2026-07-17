"use client";

import { useState } from "react";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { openChatWidget } from "@/lib/chat-widget-events";

type SectionKey = "detail" | "review" | "qna";

interface Props {
    product: CatalogProduct;
}

export default function ProductTabs({ product: p }: Props) {
    const [active, setActive] = useState<SectionKey>("detail");
    const { t, locale } = useI18n();
    const reviewBadge = p.externalReviewCount
        ? p.externalReviewCount.toLocaleString(locale === "en" ? "en-US" : "ko-KR")
        : undefined;
    const sections: { key: SectionKey; label: string }[] = [
        { key: "detail", label: t("detailInfo") },
        { key: "review", label: t("reviews") },
        { key: "qna", label: t("qna") },
    ];

    return (
        <div className="mt-12 md:mt-16">
            <nav
                className="sticky top-[var(--header-height)] z-20 -mx-4 border-y border-neutral-200 bg-background/95 px-4 backdrop-blur md:-mx-6 md:px-6"
                aria-label={t("detailInfo")}
            >
                <div className="mx-auto flex max-w-[1280px] gap-1">
                    {sections.map((section) => (
                        <a
                            key={section.key}
                            href={`#tab-${section.key}`}
                            onClick={() => setActive(section.key)}
                            aria-current={active === section.key}
                            className={`relative px-4 py-4 text-sm font-black transition md:px-6 ${
                                active === section.key ? "text-neutral-950" : "text-neutral-500 hover:text-neutral-800"
                            }`}
                        >
                            {section.label}
                            {section.key === "review" && reviewBadge && (
                                <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                                    {reviewBadge}
                                </span>
                            )}
                            {active === section.key && (
                                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-indigo-600" />
                            )}
                        </a>
                    ))}
                </div>
            </nav>

            <section id="tab-detail" className="scroll-mt-32 pt-10">
                <SectionTitle title={t("detailInfo")} />
                <DetailContent product={p} />
            </section>

            <section id="tab-review" className="scroll-mt-32 pt-14">
                <SectionTitle title={t("reviews")} badge={reviewBadge} />
                <ReviewContent product={p} />
            </section>

            <section id="tab-qna" className="scroll-mt-32 pt-14">
                <SectionTitle title={t("qna")} />
                <QnaContent product={p} />
            </section>
        </div>
    );
}

function SectionTitle({ title, badge }: { title: string; badge?: string }) {
    return (
        <header className="mb-5 flex items-baseline gap-2">
            <h2 className="text-xl font-black tracking-tight text-neutral-950 md:text-2xl">{title}</h2>
            {badge && <span className="text-sm font-bold text-neutral-400">{badge}</span>}
        </header>
    );
}

function DetailContent({ product: p }: { product: CatalogProduct }) {
    const [expanded, setExpanded] = useState(false);
    const { t, productName } = useI18n();
    const details = p.details ?? [];
    const displayName = productName(p);

    if (details.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-white p-8 text-center text-sm font-bold text-neutral-500">
                {t("noDetailImages")}
            </div>
        );
    }

    return (
        <div className="relative mx-auto max-w-3xl">
            <div className={`relative overflow-hidden transition-all ${expanded ? "max-h-none" : "max-h-[820px]"}`}>
                <div className="flex flex-col gap-2">
                    {details.map((src, index) => (
                        <Image
                            key={src}
                            src={src}
                            alt={`${displayName} ${t("detailInfo")} ${index + 1}`}
                            width={1200}
                            height={1600}
                            sizes="(max-width: 768px) 100vw, 768px"
                            className="h-auto w-full"
                            priority={index === 0}
                        />
                    ))}
                </div>
                {!expanded && (
                    <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
                        style={{ background: "linear-gradient(to top, var(--background) 0%, rgba(255,255,255,0) 100%)" }}
                    />
                )}
            </div>

            <div className="mt-4 flex justify-center">
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-neutral-200 bg-white px-5 text-sm font-black shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                >
                    {expanded ? t("fold") : t("moreDetail")}
                    <i className={`fa-solid ${expanded ? "fa-chevron-up" : "fa-chevron-down"} text-[10px]`} />
                </button>
            </div>
        </div>
    );
}

function ReviewContent({ product: p }: { product: CatalogProduct }) {
    const { t, locale } = useI18n();
    const snippets = p.externalReviewSnippets ?? [];
    const themes = p.externalReviewThemes ?? [];
    const count = p.externalReviewCount ?? snippets.length;
    const average = typeof p.externalReviewAverage === "number" ? p.externalReviewAverage : null;

    if (snippets.length > 0) {
        return (
            <div className="mx-auto max-w-3xl space-y-5">
                <div className="rounded-lg border border-neutral-200 bg-white p-5 md:p-7">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-xs font-black text-indigo-600">
                                {locale === "en" ? "Naver Smart Store purchase reviews" : "네이버 스마트스토어 구매 후기"}
                            </p>
                            <h3 className="mt-2 text-lg font-black text-neutral-950">{t("originalReview")}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="rounded-md bg-neutral-50 px-4 py-3">
                                <div className="text-[11px] font-black text-neutral-400">{t("rating")}</div>
                                <div className="mt-1 text-xl font-black">{average !== null ? average.toFixed(1) : "-"}</div>
                            </div>
                            <div className="rounded-md bg-neutral-50 px-4 py-3">
                                <div className="text-[11px] font-black text-neutral-400">{t("reviewCount")}</div>
                                <div className="mt-1 text-xl font-black">
                                    {count.toLocaleString(locale === "en" ? "en-US" : "ko-KR")}
                                </div>
                            </div>
                        </div>
                    </div>

                    {themes.length > 0 && (
                        <div className="mb-5 flex flex-wrap gap-2">
                            {themes.map((theme) => (
                                <span key={theme} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-700">
                                    {theme}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3">
                        {snippets.slice(0, 8).map((snippet, index) => (
                            <div key={`${snippet.text}-${index}`} className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-neutral-500">
                                    <span>{snippet.rating ? `${t("rating")} ${snippet.rating}` : t("reviews")}</span>
                                    {snippet.summary && <span className="truncate">{snippet.summary}</span>}
                                </div>
                                <p className="text-sm font-bold leading-6 text-neutral-800">{snippet.text}</p>
                            </div>
                        ))}
                    </div>

                    {p.externalReviewUrl && (
                        <div className="mt-5 flex justify-end border-t border-neutral-200 pt-4">
                            <a
                                href={p.externalReviewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 px-4 text-xs font-black hover:border-indigo-300 hover:text-indigo-700"
                            >
                                <i className="fa-solid fa-arrow-up-right-from-square" />
                                {t("viewOriginal")}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl rounded-lg border border-dashed border-neutral-200 bg-white p-8 text-center text-sm font-bold text-neutral-500">
            {t("noReviews")}
        </div>
    );
}

function QnaContent({ product: p }: { product: CatalogProduct }) {
    const { t, locale, productName } = useI18n();
    const displayName = productName(p);
    return (
        <div className="mx-auto max-w-2xl rounded-lg border border-neutral-200 bg-white p-7 text-center md:p-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-xl text-indigo-700">
                <i className="fa-regular fa-comment-dots" />
            </div>
            <h3 className="text-lg font-black text-neutral-950">{t("productInquiry")}</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                {locale === "en"
                    ? `Ask about sizing, use cases, and comparison products for ${displayName}.`
                    : `${displayName} 기준으로 사이즈, 용도, 비교 상품을 바로 물어볼 수 있습니다.`}
            </p>
            <button
                type="button"
                onClick={() => openChatWidget({ productName: displayName })}
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-neutral-950 px-5 text-sm font-black text-white transition hover:bg-indigo-700"
            >
                <i className="fa-solid fa-circle-question text-xs" />
                {t("askChatbot")}
            </button>
        </div>
    );
}
