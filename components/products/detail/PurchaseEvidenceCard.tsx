"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CatalogProduct } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import {
    interestTrendLabel,
    loadProductPurchaseEvidence,
    productSelectCopy,
    type ProductPurchaseEvidence,
} from "@/lib/purchase-evidence";

interface Props {
    product: CatalogProduct;
}

const FOCUSABLE_SELECTOR = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

function formatUpdatedAt(value: string, locale: "ko" | "en") {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatDate(value: string, locale: "ko" | "en") {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(value));
}

function latestUpdate(evidence: ProductPurchaseEvidence): string | null {
    const dates = [evidence.interest?.updatedAt, evidence.officialSales?.updatedAt]
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => Date.parse(b) - Date.parse(a));
    return dates[0] ?? null;
}

function interestBadgeClass(level: "high" | "steady" | "emerging") {
    if (level === "high") return "bg-rose-50 text-rose-700 ring-rose-100";
    if (level === "emerging") return "bg-amber-50 text-amber-700 ring-amber-100";
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function EvidenceDialog({
    evidence,
    product,
    open,
    onClose,
}: {
    evidence: ProductPurchaseEvidence;
    product: CatalogProduct;
    open: boolean;
    onClose: () => void;
}) {
    const { locale } = useI18n();
    const en = locale === "en";
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);
    const selectCopy = useMemo(() => productSelectCopy(product, locale), [locale, product]);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return;
        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus({ preventScroll: true }), 0);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onCloseRef.current();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])
                .filter((element) => element.getClientRects().length > 0);
            if (focusable.length === 0) {
                event.preventDefault();
                closeButtonRef.current?.focus({ preventScroll: true });
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            window.clearTimeout(focusTimer);
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            openerRef.current?.focus({ preventScroll: true });
        };
    }, [open]);

    if (!open || typeof document === "undefined") return null;
    const interest = evidence.interest;
    const officialSales = evidence.officialSales;
    const updatedAt = latestUpdate(evidence);
    const period = interest?.windowStart && interest.windowEnd
        ? `${formatDate(interest.windowStart, locale)} – ${formatDate(interest.windowEnd, locale)}`
        : interest?.windowDays
          ? (en ? `Most recent ${interest.windowDays} days` : `최근 ${interest.windowDays}일`)
          : (en ? "Trend history is still being collected" : "관심 추이 이력을 수집 중이에요");

    return createPortal(
        <div
            className="fixed inset-0 z-[2500] flex items-end justify-center bg-neutral-950/50 backdrop-blur-[2px] lg:items-center lg:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                id={`${titleId}-dialog`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                data-floating-blocker="true"
                data-purchase-evidence-dialog="open"
                className="flex max-h-[78dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl lg:max-h-[76vh] lg:max-w-[560px] lg:rounded-3xl"
            >
                <div className="shrink-0 px-5 pb-3 pt-2 lg:px-6 lg:pt-5">
                    <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded-full bg-neutral-300 lg:hidden" />
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                            <i className="fa-solid fa-chart-line" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h2 id={titleId} className="text-lg font-black text-neutral-950">
                                {en ? "Purchase reference details" : "구매 참고 정보 자세히 보기"}
                            </h2>
                            <p id={descriptionId} className="mt-0.5 text-xs font-bold text-neutral-500">
                                {en ? "How the interest signal and selection points were prepared" : "관심 신호와 선정 포인트를 만든 기준이에요"}
                            </p>
                        </div>
                        <button
                            ref={closeButtonRef}
                            type="button"
                            onClick={onClose}
                            aria-label={en ? "Close purchase reference details" : "구매 참고 정보 닫기"}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto border-y border-neutral-100 px-5 py-5 lg:px-6">
                    {officialSales && (
                        <section aria-labelledby={`${titleId}-official`}>
                            <h3 id={`${titleId}-official`} className="text-sm font-black text-neutral-950">
                                {en ? "Verified official-channel purchases" : "공식 판매채널 구매수량"}
                            </h3>
                            <dl className="mt-3 grid grid-cols-2 gap-2">
                                {officialSales.last12Months !== null && (
                                    <div className="rounded-2xl bg-indigo-50 px-4 py-3">
                                        <dt className="text-xs font-bold text-indigo-600">{en ? "Last 12 months" : "최근 12개월"}</dt>
                                        <dd className="mt-1 text-xl font-black text-indigo-950">
                                            {officialSales.last12Months.toLocaleString(en ? "en-US" : "ko-KR")}{en ? " sold" : "개"}
                                        </dd>
                                    </div>
                                )}
                                {officialSales.thisMonth !== null && (
                                    <div className="rounded-2xl bg-indigo-50 px-4 py-3">
                                        <dt className="text-xs font-bold text-indigo-600">{en ? "This month" : "이번 달"}</dt>
                                        <dd className="mt-1 text-xl font-black text-indigo-950">
                                            {officialSales.thisMonth.toLocaleString(en ? "en-US" : "ko-KR")}{en ? " sold" : "개"}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                            <p className="mt-2 text-xs font-bold leading-5 text-neutral-500">
                                {en ? "Channels: " : "집계 채널 · "}{officialSales.channels.join(" · ")}
                            </p>
                            <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">
                                {en
                                    ? "Paid, completed orders only; cancelled and refunded quantities are excluded."
                                    : "결제 완료 주문 중 취소·환불된 수량은 제외해요."}
                            </p>
                        </section>
                    )}

                    {interest && (
                        <section aria-labelledby={`${titleId}-interest`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 id={`${titleId}-interest`} className="text-sm font-black text-neutral-950">
                                    {en ? "Product-group interest method" : "제품군 관심도 집계 기준"}
                                </h3>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${interestBadgeClass(interest.level)}`}>
                                    {en ? interest.labelEn : interest.labelKo}
                                </span>
                            </div>
                            <dl className="mt-3 space-y-3 text-sm">
                                <div>
                                    <dt className="font-black text-neutral-800">{en ? "Compared products" : "비교 대상"}</dt>
                                    <dd className="mt-1 font-medium leading-6 text-neutral-600">
                                        {en
                                            ? `${interest.comparableProductCount} public listings for products with similar use and category attributes`
                                            : evidence.methodology.comparisonBasis}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-black text-neutral-800">{en ? "Signals included" : "반영 정보"}</dt>
                                    <dd className="mt-1 font-medium leading-6 text-neutral-600">
                                        {en
                                            ? "Search exposure, public review volume and repeated appearances"
                                            : evidence.methodology.signalBasis}
                                    </dd>
                                    <dd className="mt-1 text-xs font-bold text-neutral-500">
                                        {interest.channels.join(" · ")} · {en ? `${interest.channelCount} channels` : `${interest.channelCount}개 채널`}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-black text-neutral-800">{en ? "Analysis period" : "분석 기간"}</dt>
                                    <dd className="mt-1 font-medium text-neutral-600">{period}</dd>
                                </div>
                            </dl>
                        </section>
                    )}

                    {!interest && !officialSales && (
                        <section aria-labelledby={`${titleId}-collecting`}>
                            <h3 id={`${titleId}-collecting`} className="text-sm font-black text-neutral-950">
                                {en ? "Market-interest data" : "시장 관심 데이터"}
                            </h3>
                            <p className="mt-2 text-sm font-black text-indigo-700">
                                {en ? "Collecting enough data" : "충분한 관심 근거를 수집 중이에요"}
                            </p>
                            <dl className="mt-3 space-y-3 text-sm">
                                <div>
                                    <dt className="font-black text-neutral-800">{en ? "Comparison method" : "비교 기준"}</dt>
                                    <dd className="mt-1 font-medium leading-6 text-neutral-600">
                                        {en
                                            ? "Public listings with similar use and category attributes"
                                            : "용도와 분류가 비슷한 상품의 공개 노출을 비교해요."}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-black text-neutral-800">{en ? "Signals monitored" : "확인하는 정보"}</dt>
                                    <dd className="mt-1 font-medium leading-6 text-neutral-600">
                                        {en
                                            ? "Search exposure, public review volume and repeated appearances"
                                            : "검색 노출, 공개 후기 수, 반복 노출 흐름을 확인해요."}
                                    </dd>
                                </div>
                            </dl>
                        </section>
                    )}

                    <section aria-labelledby={`${titleId}-select`} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-indigo-600">{selectCopy.eyebrow}</p>
                        <h3 id={`${titleId}-select`} className="mt-1 text-base font-black text-neutral-950">{selectCopy.brand}</h3>
                        <ul className="mt-2 space-y-1.5">
                            {selectCopy.points.map((point) => (
                                <li key={point} className="flex gap-2 text-sm font-bold leading-6 text-neutral-700">
                                    <i className="fa-solid fa-check mt-1.5 text-[10px] text-indigo-600" aria-hidden="true" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section aria-labelledby={`${titleId}-notice`}>
                        <h3 id={`${titleId}-notice`} className="text-sm font-black text-neutral-950">{en ? "Please note" : "안내"}</h3>
                        <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">
                            {en
                                ? "This is a product-group reference for shopping decisions. Purchase quantities appear only when verified through official sales channels."
                                : evidence.methodology.disclosure}
                        </p>
                        {updatedAt && (
                            <p className="mt-2 text-xs font-bold text-neutral-500">
                                {en ? "Last updated " : "최근 업데이트 · "}{formatUpdatedAt(updatedAt, locale)}
                            </p>
                        )}
                    </section>
                </div>

                <div className="shrink-0 px-5 py-4 lg:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-black text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                    >
                        {en ? "Done" : "확인"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default function PurchaseEvidenceCard({ product }: Props) {
    const { locale } = useI18n();
    const en = locale === "en";
    const [loaded, setLoaded] = useState<{ productId: string; evidence: ProductPurchaseEvidence | null } | null>(null);
    const [openProductId, setOpenProductId] = useState<string | null>(null);
    const selectCopy = useMemo(() => productSelectCopy(product, locale), [locale, product]);

    useEffect(() => {
        const controller = new AbortController();
        let ignore = false;
        loadProductPurchaseEvidence(product, controller.signal).then((evidence) => {
            if (!ignore) setLoaded({ productId: product.id, evidence });
        });
        return () => {
            ignore = true;
            controller.abort();
        };
    }, [product]);

    const evidence = loaded?.productId === product.id ? loaded.evidence : null;
    if (!evidence) return null;

    const open = openProductId === product.id;
    const interest = evidence.interest;
    const officialSales = evidence.officialSales;
    const updatedAt = latestUpdate(evidence);
    return (
        <>
            <section
                aria-label={en ? "Purchase reference" : "구매 참고 정보"}
                data-purchase-evidence-card={interest || officialSales ? "verified" : "selection-only"}
                className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/45 to-amber-50/50 shadow-[0_12px_32px_-24px_rgba(49,46,129,0.65)]"
            >
                <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-sm font-black text-neutral-950">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100">
                                <i className="fa-solid fa-chart-simple" aria-hidden="true" />
                            </span>
                            {en ? "Purchase reference" : "구매 참고 정보"}
                        </h2>
                        {interest && (
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${interestBadgeClass(interest.level)}`}>
                                {en ? interest.labelEn : interest.labelKo}
                            </span>
                        )}
                    </div>

                    {officialSales && (
                        <div className="mt-3 rounded-xl bg-white/85 px-3.5 py-3 ring-1 ring-indigo-100">
                            <p className="text-xs font-black text-indigo-700">{en ? "Verified official-channel purchases" : "공식 판매채널 구매"}</p>
                            <p className="mt-1 text-sm font-black text-neutral-950">
                                {officialSales.last12Months !== null && (
                                    <span>{en ? "Last 12 months " : "최근 12개월 "}{officialSales.last12Months.toLocaleString(en ? "en-US" : "ko-KR")}{en ? " sold" : "개"}</span>
                                )}
                                {officialSales.last12Months !== null && officialSales.thisMonth !== null && <span className="mx-2 text-neutral-300">|</span>}
                                {officialSales.thisMonth !== null && (
                                    <span>{en ? "This month " : "이번 달 "}{officialSales.thisMonth.toLocaleString(en ? "en-US" : "ko-KR")}{en ? " sold" : "개"}</span>
                                )}
                            </p>
                        </div>
                    )}

                    {interest && (
                        <div className="mt-3">
                            <p className="text-xs font-black text-neutral-500">{en ? "Interest in similar products" : "유사 제품군 관심도"}</p>
                            <p className="mt-1 text-sm font-black leading-6 text-neutral-800">
                                {interestTrendLabel(interest.trend.status, locale)}
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-neutral-500">
                                {en
                                    ? `${interest.channelCount} shopping channels · ${interest.comparableProductCount} public listings for similar products`
                                    : `${interest.channelCount}개 쇼핑 채널 · 유사 상품 공개 노출 표본 ${interest.comparableProductCount}건`}
                            </p>
                        </div>
                    )}

                    {!interest && !officialSales && (
                        <div className="mt-3 rounded-xl bg-white/80 px-3.5 py-3 ring-1 ring-indigo-100">
                            <p className="text-xs font-black text-neutral-500">{en ? "Market-interest data" : "시장 관심 데이터"}</p>
                            <p className="mt-1 text-sm font-black text-indigo-700">
                                {en ? "Collecting enough evidence" : "충분한 관심 근거를 수집 중이에요"}
                            </p>
                            <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">
                                {en ? "An interest level will appear once the evidence threshold is met." : "공개 정보가 충분히 쌓이면 관심 단계를 안내해 드려요."}
                            </p>
                        </div>
                    )}

                    <div className="mt-3 border-t border-indigo-100 pt-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-indigo-600">{selectCopy.eyebrow}</p>
                        <p className="mt-1 text-sm font-black text-neutral-950">{selectCopy.brand}</p>
                        <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-neutral-600">
                            {selectCopy.points.slice(0, 2).join(" · ")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-white/90 bg-white/70 px-4 py-3">
                    <span className="text-[11px] font-bold text-neutral-500">
                        {updatedAt
                            ? `${en ? "Updated " : "업데이트 · "}${formatUpdatedAt(updatedAt, locale)}`
                            : (en ? "We’re continuing to monitor product-group interest" : "상품군 관심 신호를 계속 확인하고 있어요")}
                    </span>
                    <button
                        type="button"
                        onClick={() => setOpenProductId(product.id)}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs font-black text-indigo-700 underline decoration-indigo-200 underline-offset-4 transition hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                    >
                        {en ? "How it is calculated" : "집계 기준 보기"}
                    </button>
                </div>
            </section>

            <EvidenceDialog evidence={evidence} product={product} open={open} onClose={() => setOpenProductId(null)} />
        </>
    );
}
