"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type ExternalProductResult } from "@/lib/external-products";
import {
    comparableTotal,
    comparisonStatus,
    externalProductHref,
    isDaengdabangOffer,
    unitPrice,
    unitSummary,
} from "@/lib/external-products/comparison";
import { useI18n } from "@/lib/i18n";
import { trackDirectExternalProductClick } from "@/lib/storefront-analytics";

type Props = {
    products: ExternalProductResult[];
    query?: string;
};

function identity(value?: string): string {
    return (value || "").toLocaleLowerCase().replace(/[^0-9a-z가-힣]+/g, "");
}

function isRelatedPack(anchor: ExternalProductResult, product: ExternalProductResult): boolean {
    if (anchor.id === product.id) return false;
    if (!anchor.comparisonModel || !product.comparisonModel) return false;
    if (identity(anchor.comparisonModel) !== identity(product.comparisonModel)) return false;
    if ((anchor.sizeLabel || "") !== (product.sizeLabel || "")) return false;
    if (!anchor.totalUnits || !product.totalUnits || anchor.totalUnits === product.totalUnits) return false;
    return anchor.unitLabel === product.unitLabel && unitPrice(product) !== null;
}

function formatMoney(value: number, formatter: (value: number) => string): string {
    return formatter(Math.round(value));
}

function rowThumbnail(product: ExternalProductResult): string {
    return product.thumbnail;
}

export default function ExternalProductComparisonTable({ products, query = "" }: Props) {
    const { locale, formatPrice } = useI18n();
    const anchors = useMemo(
        () => products.filter((product) => comparisonStatus(product) === "anchor" || isDaengdabangOffer(product)),
        [products],
    );
    const [activeId, setActiveId] = useState("");

    const activeAnchor = anchors.find((product) => product.id === activeId) ?? anchors[0];
    if (!activeAnchor) return null;

    const exactRows = [
        activeAnchor,
        ...products.filter((product) => (
            product.id !== activeAnchor.id
            && product.comparisonAnchorId === activeAnchor.id
            && comparisonStatus(product) === "exact_match"
        )),
    ].sort((a, b) => (comparableTotal(a) ?? Number.MAX_SAFE_INTEGER) - (comparableTotal(b) ?? Number.MAX_SAFE_INTEGER));

    const relatedPackRows = products
        .filter((product) => (
            (product.comparisonAnchorId === activeAnchor.id && comparisonStatus(product) === "unit_match")
            || (comparisonStatus(product) === "anchor" && isRelatedPack(activeAnchor, product))
        ))
        .filter((product, index, list) => list.findIndex((row) => row.id === product.id) === index)
        .sort((a, b) => (unitPrice(a) ?? Number.MAX_SAFE_INTEGER) - (unitPrice(b) ?? Number.MAX_SAFE_INTEGER));

    const comparableRows = exactRows.filter((product) => comparableTotal(product) !== null);
    const hasExactComparison = comparableRows.length >= 2;
    const totals = comparableRows.map((product) => comparableTotal(product) as number);
    const minTotal = hasExactComparison ? Math.min(...totals) : null;
    const maxTotal = hasExactComparison ? Math.max(...totals) : null;

    return (
        <section className="mb-7 min-w-0 max-w-full overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/35">
            <div className="border-b border-emerald-100 bg-white p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Same Product Price Check</p>
                        <h3 className="mt-1 text-xl font-black text-neutral-950">
                            {locale === "en" ? "Compare the same product" : "같은 상품 가격 비교"}
                        </h3>
                        <p className="mt-1 text-xs font-bold leading-5 text-neutral-600">
                            {locale === "en"
                                ? "Only matching brand, model, size and total quantity are compared by total price."
                                : "브랜드·모델·크기·총수량이 모두 일치할 때만 총액을 비교합니다."}
                        </p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-xs font-black ${
                        hasExactComparison ? "bg-emerald-700 text-white" : "bg-amber-100 text-amber-800"
                    }`}>
                        {hasExactComparison
                            ? (locale === "en" ? `${comparableRows.length} matching sellers` : `같은 상품 ${comparableRows.length}곳`)
                            : (locale === "en" ? "Looking for matching sellers" : "같은 상품 판매처 확인 중")}
                    </span>
                </div>

                {anchors.length > 1 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {anchors.map((anchor) => (
                            <button
                                key={anchor.id}
                                type="button"
                                onClick={() => setActiveId(anchor.id)}
                                className={`shrink-0 rounded-md border px-3 py-2 text-xs font-black transition ${
                                    anchor.id === activeAnchor.id
                                        ? "border-neutral-950 bg-neutral-950 text-white"
                                        : "border-neutral-200 bg-white text-neutral-700 hover:border-emerald-400"
                                }`}
                            >
                                {anchor.title}
                            </button>
                        ))}
                    </div>
                )}

                {hasExactComparison && minTotal !== null && maxTotal !== null ? (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                        <span className="rounded-md bg-emerald-100 px-2.5 py-1.5 text-emerald-800">
                            {locale === "en" ? "Lowest found" : "확인된 최저"} {formatPrice(minTotal)}
                        </span>
                        <span className="rounded-md bg-neutral-100 px-2.5 py-1.5 text-neutral-700">
                            {locale === "en" ? "Highest" : "최고"} {formatPrice(maxTotal)}
                        </span>
                        <span className="rounded-md bg-rose-50 px-2.5 py-1.5 text-rose-700">
                            {locale === "en" ? "Gap" : "차이"} {formatPrice(maxTotal - minTotal)}
                        </span>
                    </div>
                ) : (
                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold leading-5 text-amber-900">
                        {locale === "en"
                            ? "The currently confirmed price is the DaengDaBang offer. Matching sellers will appear here when the product name, size and pack are the same."
                            : `현재 확인된 판매가는 댕다방 ${typeof activeAnchor.totalPrice === "number" ? formatPrice(activeAnchor.totalPrice) : "판매 상품"}입니다. 상품명·용량·구성이 같은 판매처가 확인되면 이곳에서 함께 비교해드려요.`}
                    </div>
                )}
            </div>

            <div className="max-w-full overflow-x-auto bg-white">
                <table className="w-full min-w-[780px] table-fixed border-collapse text-left">
                    <thead className="bg-neutral-50 text-[11px] font-black uppercase text-neutral-500">
                        <tr>
                            <th className="w-20 px-4 py-3">{locale === "en" ? "Type" : "구분"}</th>
                            <th className="w-[42%] px-4 py-3">{locale === "en" ? "Product" : "상품"}</th>
                            <th className="w-40 px-4 py-3">{locale === "en" ? "Pack details" : "확인된 구성"}</th>
                            <th className="w-32 px-4 py-3 text-right">{locale === "en" ? "Checkout" : "결제 예상액"}</th>
                            <th className="w-40 px-4 py-3">{locale === "en" ? "Seller" : "판매처"}</th>
                            <th className="w-20 px-4 py-3 text-center">{locale === "en" ? "Open" : "보기"}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                        {exactRows.map((product) => {
                            const total = comparableTotal(product);
                            const isAnchor = product.id === activeAnchor.id;
                            const isBest = hasExactComparison && total === minTotal;
                            return (
                                <tr key={product.id} className={isBest ? "bg-emerald-50/60" : "bg-white"}>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-black ${
                                            isAnchor ? "bg-neutral-950 text-white" : isBest ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-700"
                                        }`}>
                                            {isAnchor
                                                ? (locale === "en" ? "DDB" : "댕다방")
                                                : isBest
                                                    ? (locale === "en" ? "LOW" : "가장 낮음")
                                                    : (locale === "en" ? "SAME" : "같은 상품")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f7f2e8]">
                                                <img src={rowThumbnail(product)} alt="" className="h-full w-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="line-clamp-2 font-black leading-5 text-neutral-950">{product.title}</div>
                                                <div className="mt-1 text-[11px] font-bold text-neutral-500">{product.comparisonModel || product.brand}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs font-black text-neutral-800">{unitSummary(product, locale) || (locale === "en" ? "Check product details" : "상품 상세에서 확인")}</div>
                                        {product.dimensions && <div className="mt-1 text-[11px] font-bold text-neutral-500">{product.dimensions}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="text-lg font-black text-neutral-950">{total !== null ? formatPrice(total) : product.priceText}</div>
                                        {product.shippingFee ? <div className="mt-1 text-[11px] font-bold text-neutral-500">+ {formatPrice(product.shippingFee)}</div> : null}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="truncate font-black text-neutral-950">{product.sellerName || product.sourceName}</div>
                                        <div className="mt-1 truncate text-[11px] font-bold text-neutral-500">{isAnchor ? (locale === "en" ? "DaengDaBang price" : "댕다방 판매가") : product.sourceName}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Link
                                            href={externalProductHref(product, query, "exact-comparison")}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-neutral-950 text-white transition hover:bg-emerald-700"
                                            aria-label={`${product.title} ${locale === "en" ? "open seller" : "판매처 열기"}`}
                                            onClick={() => trackDirectExternalProductClick({
                                                product,
                                                query,
                                                targetUrl: externalProductHref(product, query, "exact-comparison"),
                                                surface: "exact-comparison",
                                            })}
                                        >
                                            <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {relatedPackRows.length > 0 && (
                <div className="border-t border-emerald-100 bg-white p-4 md:p-5">
                    <h4 className="text-sm font-black text-neutral-950">
                        {locale === "en" ? "Same product, different pack" : "같은 상품의 다른 구성"}
                    </h4>
                    <p className="mt-1 text-xs font-bold text-neutral-500">
                        {locale === "en" ? "Different pack sizes are shown separately with a unit price." : "수량이 다른 구성은 한 개당 가격을 따로 계산해 보여드려요."}
                    </p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {relatedPackRows.map((product) => {
                            const perUnit = unitPrice(product);
                            return (
                                <div key={product.id} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-xs font-black text-neutral-900">{product.title}</div>
                                        <div className="mt-1 text-[11px] font-bold text-neutral-500">{unitSummary(product, locale)}</div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <div className="text-sm font-black text-neutral-950">{perUnit !== null ? `${formatMoney(perUnit, formatPrice)}/${product.unitLabel}` : "-"}</div>
                                        <div className="text-[10px] font-bold text-neutral-500">{typeof product.totalPrice === "number" ? formatPrice(product.totalPrice) : product.priceText}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}
