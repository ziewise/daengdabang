"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORY_LABEL, SUBCATEGORY_LABEL } from "@/lib/catalog";
import { type ExternalProductResult } from "@/lib/external-products";
import { outboundHref } from "@/lib/outbound";
import { useI18n } from "@/lib/i18n";

type Props = {
    products: ExternalProductResult[];
    query?: string;
};

type ProductGroup = {
    key: string;
    label: string;
    count: number;
    minTotal: number;
    rows: ExternalProductResult[];
};

function formatMoney(value?: number | null, formatter?: (value: number) => string): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return formatter ? formatter(value) : `${value.toLocaleString("ko-KR")}원`;
}

function formatSignedMoney(value: number, formatter?: (value: number) => string): string {
    return `+${formatter ? formatter(value) : `${value.toLocaleString("ko-KR")}원`}`;
}

function getTotal(product: ExternalProductResult): number {
    return typeof product.totalPrice === "number" ? product.totalPrice : Number.MAX_SAFE_INTEGER;
}

function linkFor(product: ExternalProductResult, query = ""): string {
    return product.purchaseUrl ? outboundHref(product.purchaseUrl, {
        source: product.sourceName,
        product: product.title,
        query,
        productId: product.id,
        offerId: product.offerId,
        seller: product.sellerName,
        kind: product.sourceKind,
        price: product.totalPrice ?? product.basePrice ?? product.priceLow ?? null,
        priceText: product.priceText,
        hasThumbnail: Boolean(product.thumbnail),
        rank: product.rank,
        surface: "comparison",
    }) : product.outboundUrl || "";
}

function groupKeyFor(product: ExternalProductResult): string {
    return [product.category, product.subcategory, product.specGroup || product.category].join(":");
}

function groupLabelFor(
    product: ExternalProductResult,
    categoryLabel: (slug: ExternalProductResult["category"], fallback?: string) => string,
    subcategoryLabel: (slug: ExternalProductResult["subcategory"], fallback?: string) => string,
): string {
    const category = categoryLabel(product.category, CATEGORY_LABEL[product.category] ?? product.category);
    const subcategory = subcategoryLabel(product.subcategory, SUBCATEGORY_LABEL[product.subcategory] ?? product.subcategory);
    return `${category} / ${subcategory}`;
}

function buildGroups(
    products: ExternalProductResult[],
    categoryLabel: (slug: ExternalProductResult["category"], fallback?: string) => string,
    subcategoryLabel: (slug: ExternalProductResult["subcategory"], fallback?: string) => string,
): ProductGroup[] {
    const groupMap = new Map<string, ProductGroup>();
    for (const product of products) {
        const key = groupKeyFor(product);
        const existing = groupMap.get(key);
        if (existing) {
            existing.rows.push(product);
            existing.count += 1;
            existing.minTotal = Math.min(existing.minTotal, getTotal(product));
            continue;
        }
        groupMap.set(key, {
            key,
            label: groupLabelFor(product, categoryLabel, subcategoryLabel),
            count: 1,
            minTotal: getTotal(product),
            rows: [product],
        });
    }

    return Array.from(groupMap.values())
        .map((group) => ({
            ...group,
            rows: [...group.rows].sort((a, b) => getTotal(a) - getTotal(b) || b.rank - a.rank),
        }))
        .sort((a, b) => b.count - a.count || a.minTotal - b.minTotal || a.label.localeCompare(b.label));
}

function totalPriceLabel(product: ExternalProductResult, formatter: (value: number) => string): string {
    if (typeof product.totalPrice === "number") return formatMoney(product.totalPrice, formatter);
    if (typeof product.basePrice === "number") return formatMoney(product.basePrice, formatter);
    return product.priceText || "-";
}

function priceNote(product: ExternalProductResult, formatter: (value: number) => string, locale: "ko" | "en"): string {
    const parts = [
        typeof product.shippingFee === "number" && product.shippingFee > 0 ? `${locale === "en" ? "Shipping" : "배송"} ${formatMoney(product.shippingFee, formatter)}` : "",
        product.couponDiscount ? `${locale === "en" ? "Coupon" : "쿠폰"} -${formatMoney(product.couponDiscount, formatter)}` : "",
        product.optionName || "",
    ].filter(Boolean);
    return parts.join(" · ");
}

function priceDelta(product: ExternalProductResult, minTotal: number, formatter: (value: number) => string, locale: "ko" | "en"): { label: string; detail: string; tone: "best" | "high" | "unknown" } {
    const total = getTotal(product);
    if (total === Number.MAX_SAFE_INTEGER || minTotal === Number.MAX_SAFE_INTEGER) {
        return {
            label: locale === "en" ? "N/A" : "비교불가",
            detail: locale === "en" ? "Check price" : "가격 확인 필요",
            tone: "unknown",
        };
    }
    const diff = total - minTotal;
    if (diff <= 0) {
        return { label: locale === "en" ? "Lowest" : "최저가", detail: locale === "en" ? "Base price" : "기준가", tone: "best" };
    }
    const percent = minTotal > 0 ? Math.round((diff / minTotal) * 100) : null;
    return {
        label: formatSignedMoney(diff, formatter),
        detail: percent !== null ? (locale === "en" ? `${percent}% higher` : `${percent}% 비쌈`) : (locale === "en" ? "Higher" : "더 비쌈"),
        tone: "high",
    };
}

export default function ExternalProductComparisonTable({ products, query = "" }: Props) {
    const { locale, formatPrice, categoryLabel, subcategoryLabel } = useI18n();
    const groups = useMemo(() => buildGroups(products, categoryLabel, subcategoryLabel), [products, categoryLabel, subcategoryLabel]);
    const [activeKey, setActiveKey] = useState("");

    useEffect(() => {
        if (!groups.length) {
            setActiveKey("");
            return;
        }
        if (!groups.some((group) => group.key === activeKey)) {
            setActiveKey(groups[0].key);
        }
    }, [activeKey, groups]);

    const activeGroup = groups.find((group) => group.key === activeKey) ?? groups[0];
    const rows = activeGroup?.rows.slice(0, 8) ?? [];
    const validTotals = rows
        .map((product) => getTotal(product))
        .filter((total) => total !== Number.MAX_SAFE_INTEGER);
    const minVisibleTotal = validTotals.length ? Math.min(...validTotals) : Number.MAX_SAFE_INTEGER;
    const maxVisibleTotal = validTotals.length ? Math.max(...validTotals) : Number.MAX_SAFE_INTEGER;
    const priceSpread = maxVisibleTotal !== Number.MAX_SAFE_INTEGER && minVisibleTotal !== Number.MAX_SAFE_INTEGER
        ? maxVisibleTotal - minVisibleTotal
        : 0;

    if (!activeGroup || rows.length === 0) return null;

    return (
        <div className="mb-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Lowest Table</p>
                    <h3 className="mt-1 text-lg font-black text-neutral-950">
                        {locale === "en" ? "Lowest Price by Product Group" : "상품군 최저가 비교"}
                    </h3>
                    {validTotals.length > 1 && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                            <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                                {locale === "en" ? "Lowest" : "최저"} {formatMoney(minVisibleTotal, formatPrice)}
                            </span>
                            <span className="rounded-md bg-neutral-100 px-2 py-1 text-neutral-700">
                                {locale === "en" ? "Highest" : "최고"} {formatMoney(maxVisibleTotal, formatPrice)}
                            </span>
                            <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-700">
                                {locale === "en" ? "Gap" : "차이"} {formatSignedMoney(priceSpread, formatPrice)}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {groups.slice(0, 5).map((group) => (
                        <button
                            key={group.key}
                            type="button"
                            onClick={() => setActiveKey(group.key)}
                            className={`h-9 rounded-md border px-3 text-xs font-black transition ${
                                group.key === activeGroup.key
                                    ? "border-emerald-700 bg-emerald-700 text-white"
                                    : "border-neutral-200 bg-white text-neutral-700 hover:border-emerald-300 hover:text-emerald-700"
                            }`}
                        >
                            {group.label} {group.count}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto border-y border-neutral-200">
                <table className="min-w-[760px] w-full table-fixed border-collapse text-left">
                    <thead className="bg-neutral-50 text-[11px] font-black uppercase text-neutral-500">
                        <tr>
                            <th className="w-16 px-3 py-3">{locale === "en" ? "Rank" : "순위"}</th>
                            <th className="w-[44%] px-3 py-3">{locale === "en" ? "Product" : "상품"}</th>
                            <th className="w-36 px-3 py-3 text-right">{locale === "en" ? "Price" : "가격"}</th>
                            <th className="w-32 px-3 py-3">{locale === "en" ? "Vs. lowest" : "최저가 대비"}</th>
                            <th className="w-36 px-3 py-3">{locale === "en" ? "Seller" : "판매처"}</th>
                            <th className="w-24 px-3 py-3 text-center">{locale === "en" ? "Open" : "이동"}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                        {rows.map((product, index) => {
                            const delta = priceDelta(product, minVisibleTotal, formatPrice, locale);
                            const note = priceNote(product, formatPrice, locale);
                            return (
                            <tr key={`${product.id}-${product.optionName ?? ""}`} className={`${delta.tone === "best" ? "bg-emerald-50/55" : "bg-white"} align-top hover:bg-emerald-50/45`}>
                                <td className="px-3 py-3">
                                    <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-black ${
                                        index === 0 ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700"
                                    }`}>
                                        {index + 1}
                                    </span>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="flex min-w-0 gap-3">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f7f2e8]">
                                            <img
                                                src={product.thumbnail}
                                                alt={product.title}
                                                loading="lazy"
                                                onError={(event) => {
                                                    const image = event.currentTarget;
                                                    if (image.dataset.fallbackApplied || !image.src.includes(".webp")) return;
                                                    image.dataset.fallbackApplied = "1";
                                                    image.src = image.src.replace(/\.webp($|\?)/, ".png$1");
                                                }}
                                                className={`${/^https?:\/\//.test(product.thumbnail) ? "h-full w-full object-cover" : "h-[72%] w-[72%] object-contain"}`}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="line-clamp-2 font-black leading-5 text-neutral-950">{product.title}</div>
                                            <div className="mt-1 flex min-w-0 flex-wrap gap-1.5 text-[11px] font-black">
                                                <span className="max-w-[8rem] truncate text-emerald-700">{product.brand}</span>
                                                {note && (
                                                    <span className="max-w-[12rem] truncate text-neutral-500">{note}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                    <div className="text-lg font-black leading-tight text-neutral-950">{totalPriceLabel(product, formatPrice)}</div>
                                    {typeof product.basePrice === "number" && typeof product.totalPrice === "number" && product.basePrice !== product.totalPrice && (
                                        <div className="mt-1 text-[11px] font-bold text-neutral-500">
                                            {locale === "en" ? "Item price" : "상품가"} {formatMoney(product.basePrice, formatPrice)}
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-3">
                                    <span className={`inline-flex min-h-7 items-center rounded-md border px-2 text-xs font-black ${
                                        delta.tone === "best"
                                            ? "border-emerald-600 bg-emerald-600 text-white"
                                            : delta.tone === "high"
                                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                                : "border-neutral-200 bg-neutral-50 text-neutral-500"
                                    }`}>
                                        {delta.label}
                                    </span>
                                    <div className={`mt-1 text-[10px] font-black ${
                                        delta.tone === "best"
                                            ? "text-emerald-700"
                                            : delta.tone === "high"
                                                ? "text-rose-600"
                                                : "text-neutral-400"
                                    }`}>
                                        {delta.detail}
                                    </div>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="truncate font-black text-neutral-950">{product.sellerName || product.sourceName}</div>
                                    <div className="mt-1 truncate text-[11px] font-bold text-neutral-500">{product.sourceName}</div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <Link
                                        href={linkFor(product, query)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-neutral-950 text-white transition hover:bg-emerald-700"
                                        aria-label={`${product.title} ${locale === "en" ? "open seller" : "판매처 열기"}`}
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
        </div>
    );
}
