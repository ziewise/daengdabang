"use client";

import { useState } from "react";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { openChatWidget } from "@/lib/chat-widget-events";
import ProductDeliveryReturnPolicy from "@/components/products/detail/ProductDeliveryReturnPolicy";
import { getProductDetailContent } from "@/lib/catalog/product-detail-content";

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
                <ProductDeliveryReturnPolicy />
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
    const content = getProductDetailContent(p.folder);
    const displayName = productName(p);
    const heroImage = p.image ?? details[0] ?? "";
    const specifications = content?.specifications ?? content?.specs ?? [];
    const careItems = typeof content?.care === "string" ? [content.care] : (content?.care ?? []);
    const cautionItems = [...(content?.cautions ?? []), ...(content?.safety ? [content.safety] : [])];

    if (details.length === 0 && !content) {
        return (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-white p-8 text-center text-sm font-bold text-neutral-500">
                {t("noDetailImages")}
            </div>
        );
    }

    if (!heroImage) {
        return (
            <div className="bg-white p-8 text-center text-sm font-bold text-neutral-500">
                {t("noDetailImages")}
            </div>
        );
    }

    if (content) {
        const theme = officialTheme(content.sourceLabel);
        const visualIndices = (content.visualDetailIndices ?? details.map((_, index) => index))
            .filter((index) => index >= 0 && index < details.length)
            .slice(0, 3);
        const featureVisuals = visualIndices.map((index) => details[index]);
        const featurePanelCount = Math.max(1, Math.min(3, featureVisuals.length || 1, content.features.length || 1));
        const featureGroups = Array.from({ length: featurePanelCount }, (_, groupIndex) =>
            content.features.filter((_, featureIndex) => featureIndex % featurePanelCount === groupIndex),
        );
        const usedVisualIndices = new Set(visualIndices.slice(0, featurePanelCount));
        const remainingDetails = details.filter((_, index) => !usedVisualIndices.has(index));

        return (
            <article className="mx-auto max-w-5xl overflow-hidden bg-white" data-product-detail-copy data-visual-story>
                <header className="grid min-h-[520px] md:grid-cols-[1.08fr_0.92fr]">
                    <div className="flex min-h-[360px] items-center justify-center bg-neutral-100 p-6 md:min-h-[520px] md:p-10">
                        <Image
                            src={heroImage}
                            alt={`${displayName} 제품 이미지`}
                            width={1200}
                            height={1000}
                            sizes="(max-width: 768px) 100vw, 55vw"
                            className="h-auto max-h-[500px] w-full object-contain"
                            priority
                        />
                    </div>
                    <div className="flex flex-col justify-center px-6 py-12 text-white md:px-12" style={{ backgroundColor: theme.dark }}>
                        <p className="text-xs font-black tracking-[0.22em]" style={{ color: theme.accent }}>OFFICIAL PRODUCT GUIDE</p>
                        <h3 className="mt-4 break-keep text-3xl font-black leading-tight tracking-tight md:text-5xl">{displayName}</h3>
                        <p className="mt-6 break-keep text-base font-bold leading-8 text-white/80 md:text-lg">{content.summary}</p>
                        <a
                            href={content.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-8 inline-flex w-fit items-center gap-2 border-b border-white/60 pb-1 text-xs font-black text-white transition hover:border-white"
                        >
                            {content.sourceLabel ?? "제조사 공식 상품 정보"} 원문
                            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true" />
                        </a>
                    </div>
                </header>

                <section className="px-5 py-12 text-white md:px-10 md:py-16" style={{ backgroundColor: theme.dark }}>
                    <div className="mx-auto mb-10 flex w-fit items-center gap-1 rounded-full bg-white/80 p-1 text-[11px] font-black text-neutral-700 md:text-sm">
                        <span className="rounded-full bg-white px-4 py-2 shadow-sm">핵심 기능</span>
                        <span className="px-4 py-2">사이즈·소재</span>
                        <span className="px-4 py-2">사용·관리</span>
                    </div>
                    <p className="text-center text-xs font-black tracking-[0.22em]" style={{ color: theme.accent }}>FEATURES</p>
                    <h4 className="mt-3 text-center text-3xl font-black tracking-tight md:text-4xl">사진으로 보는 제품의 핵심</h4>

                    <div className="mt-10 space-y-10 md:mt-14 md:space-y-16">
                        {featureGroups.map((features, index) => (
                            <div key={`${featureVisuals[index] ?? "feature"}-${index}`} className="grid items-center gap-7 md:grid-cols-2 md:gap-12">
                                <div className={`overflow-hidden bg-white/10 ${index % 2 === 1 ? "md:order-2" : ""}`}>
                                    {featureVisuals[index] ? (
                                        <Image
                                            src={featureVisuals[index]}
                                            alt={`${displayName} 특징 이미지 ${index + 1}`}
                                            width={1200}
                                            height={900}
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="h-auto max-h-[560px] w-full object-contain"
                                            priority={index === 0}
                                        />
                                    ) : (
                                        <Image
                                            src={heroImage}
                                            alt={`${displayName} 제품 특징`}
                                            width={1200}
                                            height={900}
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="h-auto max-h-[560px] w-full object-contain p-8"
                                        />
                                    )}
                                </div>
                                <div className={index % 2 === 1 ? "md:order-1" : ""}>
                                    <p className="text-xs font-black tracking-[0.18em]" style={{ color: theme.accent }}>FEATURE {String(index + 1).padStart(2, "0")}</p>
                                    <ul className="mt-4 space-y-5">
                                        {features.map((feature) => (
                                            <li key={feature} className="flex gap-3 break-keep text-base font-black leading-7 md:text-xl md:leading-9">
                                                <span className="mt-3 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: theme.accent }} aria-hidden="true" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="px-6 py-12 md:px-12 md:py-16" style={{ backgroundColor: theme.paper }}>
                    <p className="text-xs font-black tracking-[0.2em]" style={{ color: theme.dark }}>PRODUCT DETAILS</p>
                    <div className="mt-5 grid gap-10 md:grid-cols-2 md:gap-14">
                        {specifications.length > 0 && <EditorialList title="사이즈·사양" items={specifications} accent={theme.accent} />}
                        {content.composition && content.composition.length > 0 && <EditorialList title="소재·성분" items={content.composition} accent={theme.accent} />}
                        {content.usage && content.usage.length > 0 && <EditorialList title="사용·급여 방법" items={content.usage} accent={theme.accent} />}
                        {careItems.length > 0 && <EditorialList title="관리 방법" items={careItems} accent={theme.accent} />}
                    </div>
                </section>

                {remainingDetails.length > 0 && (
                    <section className="grid gap-1 bg-white md:grid-cols-2">
                        {remainingDetails.map((src, index) => (
                            <div key={src} className={remainingDetails.length % 2 === 1 && index === remainingDetails.length - 1 ? "md:col-span-2" : ""}>
                                <Image
                                    src={src}
                                    alt={`${displayName} 상세 이미지 ${featurePanelCount + index + 1}`}
                                    width={1200}
                                    height={1200}
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="h-auto w-full object-contain"
                                />
                            </div>
                        ))}
                    </section>
                )}

                {cautionItems.length > 0 && (
                    <section className="px-6 py-10 text-neutral-950 md:px-12" style={{ backgroundColor: theme.warning }}>
                        <div className="flex items-center gap-3">
                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                            <h4 className="text-lg font-black">사용 전 확인해 주세요</h4>
                        </div>
                        <ul className="mt-4 grid gap-2 pl-5 text-sm font-bold leading-7 md:grid-cols-2 md:gap-x-10">
                            {cautionItems.map((item) => <li key={item} className="list-disc break-keep">{item}</li>)}
                        </ul>
                    </section>
                )}
            </article>
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
                {details.length > 0 && !expanded && (
                    <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
                        style={{ background: "linear-gradient(to top, var(--background) 0%, rgba(255,255,255,0) 100%)" }}
                    />
                )}
            </div>

            {details.length > 0 && <div className="mt-4 flex justify-center">
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-neutral-200 bg-white px-5 text-sm font-black shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                >
                    {expanded ? t("fold") : t("moreDetail")}
                    <i className={`fa-solid ${expanded ? "fa-chevron-up" : "fa-chevron-down"} text-[10px]`} />
                </button>
            </div>}
        </div>
    );
}

function EditorialList({ title, items, accent }: { title: string; items: readonly string[]; accent: string }) {
    return (
        <div>
            <h4 className="border-b border-neutral-900/20 pb-3 text-xl font-black tracking-tight">{title}</h4>
            <ul className="mt-4 space-y-3 text-sm font-bold leading-7 text-neutral-700">
                {items.map((item) => (
                    <li key={item} className="flex gap-3 break-keep">
                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function officialTheme(sourceLabel?: string) {
    const source = (sourceLabel ?? "").toLowerCase();
    if (source.includes("ruffwear")) return { dark: "#002f47", accent: "#f5b51b", paper: "#f3f1e8", warning: "#fff0c2" };
    if (source.includes("yora")) return { dark: "#173f35", accent: "#d9ef5b", paper: "#f0f4e8", warning: "#e9f4bd" };
    if (source.includes("canagan")) return { dark: "#172234", accent: "#d6ad55", paper: "#f5f0e4", warning: "#f5e7bd" };
    if (source.includes("soopa")) return { dark: "#164836", accent: "#f4ca54", paper: "#f0f6ed", warning: "#f7edbd" };
    if (source.includes("rex specs")) return { dark: "#161616", accent: "#c5e52a", paper: "#f2f2ed", warning: "#eff6ba" };
    if (source.includes("onetigris")) return { dark: "#2f3529", accent: "#c9a86a", paper: "#f2efe7", warning: "#efe2bd" };
    if (source.includes("zoo snoods")) return { dark: "#492a52", accent: "#ffd76a", paper: "#fff4e4", warning: "#ffedbd" };
    return { dark: "#222222", accent: "#f79a49", paper: "#f6f2eb", warning: "#fff0c9" };
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
