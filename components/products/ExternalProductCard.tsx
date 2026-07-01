"use client";

import Link from "next/link";
import { type ExternalProductResult } from "@/lib/external-products";
import { outboundHref } from "@/lib/outbound";

type Props = {
    product: ExternalProductResult;
    query?: string;
};

function formatKRW(value?: number | null): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "";
    return value.toLocaleString("ko-KR");
}

function signedKRW(value?: number): string {
    if (!value) return "0원";
    const sign = value > 0 ? "+" : "-";
    return `${sign}${Math.abs(value).toLocaleString("ko-KR")}원`;
}

export default function ExternalProductCard({ product, query = "" }: Props) {
    const isMarketplaceSearch = product.sourceKind === "marketplace-live-search";
    const hasMarketplacePreview = product.previewStatus === "fetched" && /^https?:\/\//.test(product.thumbnail);
    const totalPrice = typeof product.totalPrice === "number" ? product.totalPrice : null;
    const href = product.purchaseUrl ? outboundHref(product.purchaseUrl, {
        source: product.sourceName,
        product: product.title,
        query,
        productId: product.id,
        offerId: product.offerId,
        seller: product.sellerName,
        kind: product.sourceKind,
        price: totalPrice ?? product.basePrice ?? product.priceLow ?? null,
        priceText: product.priceText,
        hasThumbnail: Boolean(product.thumbnail),
        rank: product.rank,
        surface: "card",
    }) : product.outboundUrl || "";
    const priceNote = [
        typeof product.shippingFee === "number" && product.shippingFee > 0 ? `배송 ${formatKRW(product.shippingFee)}원` : "",
        product.couponDiscount ? `쿠폰 -${formatKRW(product.couponDiscount)}원` : "",
        product.optionName ? `${product.optionName} ${signedKRW(product.optionPriceDelta)}` : "",
    ].filter(Boolean).join(" · ");

    return (
        <article className="group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Link
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#f7f2e8]"
                aria-label={`${product.title} ${isMarketplaceSearch ? "외부 검색" : "외부 가격비교"} 보기`}
            >
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
                    className={`${isMarketplaceSearch && !hasMarketplacePreview ? "h-[72%] w-[72%] object-contain" : "h-full w-full object-cover"} transition duration-150 group-hover:scale-[1.03]`}
                />
                <div className="absolute bottom-2 right-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black text-neutral-700 shadow-sm">
                    {product.sellerName || product.sourceName}
                </div>
            </Link>

            <div className="p-3">
                <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-black">
                    <span className="truncate uppercase text-emerald-700">{product.brand}</span>
                    <span className="h-1 w-1 shrink-0 rounded-full bg-neutral-300" />
                    <span className="truncate text-neutral-500">{product.sourceName}</span>
                </div>
                <h3 className="mt-2 min-h-[2.5rem] text-sm font-extrabold leading-5 text-neutral-950 line-clamp-2">
                    {product.title}
                </h3>
                <div className="mt-2">
                    <p className={`${totalPrice !== null ? "text-xl text-neutral-950" : "text-base text-neutral-700"} font-black leading-tight line-clamp-2`}>
                        {totalPrice !== null ? `${formatKRW(totalPrice)}원` : product.priceText}
                    </p>
                    {priceNote && (
                        <p className="mt-1 truncate text-[11px] font-bold text-neutral-500">{priceNote}</p>
                    )}
                </div>
                {totalPrice === null && (
                    <p className="mt-1 text-[11px] font-bold text-neutral-400">판매처에서 최종 가격 확인</p>
                )}
                <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                    보러가기
                </Link>
            </div>
        </article>
    );
}
