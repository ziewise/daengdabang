"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORY_LABEL, SUBCATEGORY_LABEL } from "@/lib/catalog";
import type { ExternalProductResult } from "@/lib/external-products";
import { outboundHref } from "@/lib/outbound";

type Props = {
    products: ExternalProductResult[];
};

type ProductGroup = {
    key: string;
    label: string;
    count: number;
    minTotal: number;
    rows: ExternalProductResult[];
};

const META_SPEC_KEYS = new Set([
    "brand",
    "category",
    "subcategory",
    "type",
    "productNo",
    "categoryPath",
    "catalogNo",
    "catalogName",
    "productStatus",
    "matchScore",
    "reviewCount",
    "sellerManagementCode",
]);

const SPEC_PRIORITY = [
    "size",
    "사이즈",
    "weightRange",
    "권장무게",
    "무게",
    "weight",
    "color",
    "색상",
    "material",
    "소재",
    "원산지",
    "lifeStage",
    "용량",
    "중량",
];

const SPEC_LABELS: Record<string, string> = {
    size: "사이즈",
    weightRange: "권장무게",
    weight: "무게",
    color: "색상",
    material: "소재",
    lifeStage: "연령",
};

function formatKRW(value?: number | null): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return `${value.toLocaleString("ko-KR")}원`;
}

function signedKRW(value?: number): string {
    if (!value) return "0원";
    const sign = value > 0 ? "+" : "-";
    return `${sign}${Math.abs(value).toLocaleString("ko-KR")}원`;
}

function getTotal(product: ExternalProductResult): number {
    return typeof product.totalPrice === "number" ? product.totalPrice : Number.MAX_SAFE_INTEGER;
}

function linkFor(product: ExternalProductResult): string {
    return product.outboundUrl || outboundHref(product.purchaseUrl, {
        source: product.sourceName,
        product: product.title,
    });
}

function groupKeyFor(product: ExternalProductResult): string {
    return [product.category, product.subcategory, product.specGroup || product.category].join(":");
}

function groupLabelFor(product: ExternalProductResult): string {
    const category = CATEGORY_LABEL[product.category] ?? product.category;
    const subcategory = SUBCATEGORY_LABEL[product.subcategory] ?? product.subcategory;
    return `${category} / ${subcategory}`;
}

function buildGroups(products: ExternalProductResult[]): ProductGroup[] {
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
            label: groupLabelFor(product),
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

function isUsefulSpec(key: string, value: string): boolean {
    const cleanValue = value.trim();
    if (!cleanValue || cleanValue === "-") return false;
    if (META_SPEC_KEYS.has(key)) return false;
    if (key.length > 24 || cleanValue.length > 80) return false;
    return true;
}

function specColumnsFor(rows: ExternalProductResult[]): string[] {
    const counts = new Map<string, number>();
    for (const row of rows) {
        for (const [key, value] of Object.entries(row.specs ?? {})) {
            const text = String(value ?? "");
            if (!isUsefulSpec(key, text)) continue;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }

    const columns: string[] = [];
    for (const key of SPEC_PRIORITY) {
        if (counts.has(key) && !columns.includes(key)) columns.push(key);
    }
    for (const [key] of Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
        if (!columns.includes(key)) columns.push(key);
        if (columns.length >= 4) break;
    }
    return columns.slice(0, 4);
}

function specValue(product: ExternalProductResult, key: string): string {
    const value = product.specs?.[key];
    return value ? String(value) : "-";
}

function historyText(product: ExternalProductResult): string {
    const stats = product.historyStats;
    if (stats?.sampleCount && stats.sampleCount > 1) {
        const delta = typeof stats.delta === "number" ? signedKRW(stats.delta) : "0원";
        return `${delta} / 최저 ${formatKRW(stats.lowest)}`;
    }
    if (Array.isArray(product.priceHistory) && product.priceHistory.length > 0) {
        return `${product.priceHistory.length}회 기록`;
    }
    return "신규";
}

function adjustmentText(product: ExternalProductResult): string {
    const parts = [
        `배송 ${formatKRW(product.shippingFee ?? 0)}`,
        product.couponDiscount ? `쿠폰 -${formatKRW(product.couponDiscount)}` : "",
        product.optionName ? `${product.optionName} ${signedKRW(product.optionPriceDelta)}` : "",
    ].filter(Boolean);
    return parts.join(" / ") || "-";
}

export default function ExternalProductComparisonTable({ products }: Props) {
    const groups = useMemo(() => buildGroups(products), [products]);
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
    const specColumns = useMemo(() => specColumnsFor(rows), [rows]);

    if (!activeGroup || rows.length === 0) return null;

    return (
        <div className="mb-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Lowest Table</p>
                    <h3 className="mt-1 text-lg font-black text-neutral-950">상품군 최저가 비교</h3>
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
                <table className="min-w-[980px] w-full table-fixed border-collapse text-left">
                    <thead className="bg-neutral-50 text-[11px] font-black uppercase text-neutral-500">
                        <tr>
                            <th className="w-16 px-3 py-3">순위</th>
                            <th className="w-40 px-3 py-3">판매처</th>
                            <th className="w-64 px-3 py-3">상품</th>
                            <th className="w-28 px-3 py-3 text-right">총액</th>
                            <th className="w-28 px-3 py-3 text-right">상품가</th>
                            <th className="w-44 px-3 py-3">배송/쿠폰/옵션</th>
                            {specColumns.map((key) => (
                                <th key={key} className="w-28 px-3 py-3">{SPEC_LABELS[key] ?? key}</th>
                            ))}
                            <th className="w-36 px-3 py-3">가격기록</th>
                            <th className="w-24 px-3 py-3 text-center">이동</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                        {rows.map((product, index) => (
                            <tr key={`${product.id}-${product.optionName ?? ""}`} className="bg-white align-top hover:bg-emerald-50/45">
                                <td className="px-3 py-3">
                                    <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-black ${
                                        index === 0 ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700"
                                    }`}>
                                        {index + 1}
                                    </span>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="truncate font-black text-neutral-950">{product.sellerName || product.sourceName}</div>
                                    <div className="mt-1 truncate text-xs font-bold text-neutral-500">{product.sourceSite || product.sourceKind}</div>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="line-clamp-2 font-black leading-5 text-neutral-950">{product.title}</div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {product.optionName && (
                                            <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-black text-neutral-600">
                                                {product.optionName}
                                            </span>
                                        )}
                                        {product.offerId && (
                                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                                                {product.offerId}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                    <div className="text-base font-black text-neutral-950">{formatKRW(product.totalPrice)}</div>
                                    {index === 0 && <div className="mt-1 text-[10px] font-black text-rose-600">최저</div>}
                                </td>
                                <td className="px-3 py-3 text-right font-bold text-neutral-700">{formatKRW(product.basePrice)}</td>
                                <td className="px-3 py-3 text-xs font-bold leading-5 text-neutral-600">{adjustmentText(product)}</td>
                                {specColumns.map((key) => (
                                    <td key={key} className="px-3 py-3 text-xs font-bold leading-5 text-neutral-700">
                                        {specValue(product, key)}
                                    </td>
                                ))}
                                <td className="px-3 py-3 text-xs font-bold leading-5 text-neutral-600">{historyText(product)}</td>
                                <td className="px-3 py-3 text-center">
                                    <Link
                                        href={linkFor(product)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-700"
                                        aria-label={`${product.title} 판매처 열기`}
                                    >
                                        <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
