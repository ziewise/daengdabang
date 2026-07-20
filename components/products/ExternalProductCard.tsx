"use client";

import Link from "next/link";
import { useState } from "react";
import { type ExternalProductResult } from "@/lib/external-products";
import {
    comparisonStatus,
    displayProductPrice,
    externalProductHref,
    isMarketEstimate,
    statusLabel,
    unitPrice,
    unitSummary,
} from "@/lib/external-products/comparison";
import { useI18n } from "@/lib/i18n";
import { trackDirectExternalProductClick } from "@/lib/storefront-analytics";

type Props = {
    product: ExternalProductResult;
    query?: string;
};

export default function ExternalProductCard({ product, query = "" }: Props) {
    const { locale, formatPrice } = useI18n();
    const [imageUnavailable, setImageUnavailable] = useState(false);
    const status = comparisonStatus(product);
    const estimate = isMarketEstimate(product);
    const productPrice = estimate ? null : displayProductPrice(product);
    const payableTotal = !estimate && typeof product.totalPrice === "number" ? product.totalPrice : null;
    const perUnit = unitPrice(product);
    const quantitySummary = unitSummary(product, locale);
    const href = externalProductHref(product, query, "card");
    const trackDirectClick = () => trackDirectExternalProductClick({ product, query, targetUrl: href, surface: "card" });
    const badgeTone = status === "variant_mismatch" || status === "unit_match"
        ? "bg-sky-50 text-sky-800"
        : status === "reference_only" || status === "unverified"
            ? "bg-amber-50 text-amber-800"
            : "bg-neutral-100 text-neutral-700";
    const priceNote = [
        product.shippingFeeKnown === false
            ? (locale === "en" ? "Shipping shown by seller" : "배송비는 판매처에서 확인")
            : typeof product.shippingFee === "number" && product.shippingFee > 0
            ? `${locale === "en" ? "Shipping" : "배송"} ${formatPrice(product.shippingFee)}`
            : "",
        product.couponDiscount ? `${locale === "en" ? "Coupon" : "쿠폰"} -${formatPrice(product.couponDiscount)}` : "",
        product.optionName ? `${product.optionName} ${product.optionPriceDelta && product.optionPriceDelta > 0 ? "+" : ""}${formatPrice(product.optionPriceDelta ?? 0)}` : "",
    ].filter(Boolean).join(" · ");

    return (
        <article className="group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Link
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#f7f2e8]"
                aria-label={`${product.title} ${locale === "en" ? "open seller" : "판매처 보기"}`}
                onClick={trackDirectClick}
            >
                {imageUnavailable ? (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-neutral-100 px-4 text-center text-xs font-bold text-neutral-500">
                        <i className="fa-regular fa-image text-2xl" aria-hidden="true" />
                        {locale === "en" ? "Product photo unavailable" : "상품 사진을 불러오지 못했어요"}
                    </span>
                ) : (
                    <img
                        src={product.thumbnail}
                        alt={product.title}
                        loading="lazy"
                        onError={(event) => {
                            const image = event.currentTarget;
                            if (!image.dataset.fallbackApplied && image.src.includes(".webp")) {
                                image.dataset.fallbackApplied = "1";
                                image.src = image.src.replace(/\.webp($|\?)/, ".png$1");
                                return;
                            }
                            setImageUnavailable(true);
                        }}
                        className="h-full w-full object-cover transition duration-150 group-hover:scale-[1.03]"
                    />
                )}
                <div className="absolute bottom-2 right-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black text-neutral-700 shadow-sm">
                    {product.sellerName || product.sourceName}
                </div>
            </Link>

            <div className="p-3">
                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${badgeTone}`}>
                    {statusLabel(product, locale)}
                </span>
                <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-black">
                    <span className="truncate uppercase text-emerald-700">{product.brand}</span>
                    <span className="h-1 w-1 shrink-0 rounded-full bg-neutral-300" />
                    <span className="truncate text-neutral-500">{product.sourceName}</span>
                </div>
                <h3 className="mt-2 min-h-[2.5rem] text-sm font-extrabold leading-5 text-neutral-950 line-clamp-2">
                    {product.title}
                </h3>
                <div className="mt-2">
                    <p className={`${productPrice !== null ? "text-xl text-neutral-950" : "text-base text-neutral-700"} font-black leading-tight line-clamp-2`}>
                        {productPrice !== null ? formatPrice(productPrice) : product.priceText}
                    </p>
                    {quantitySummary && (
                        <p className="mt-1 text-[11px] font-black text-neutral-600">{quantitySummary}</p>
                    )}
                    {perUnit !== null && product.unitLabel && (
                        <p className="mt-1 text-[11px] font-black text-sky-700">
                            {locale === "en" ? "Unit price" : `1${product.unitLabel}당`} {formatPrice(Math.round(perUnit))}
                        </p>
                    )}
                    {priceNote && (
                        <p className="mt-1 truncate text-[11px] font-bold text-neutral-500">{priceNote}</p>
                    )}
                    {productPrice !== null && payableTotal !== null && payableTotal !== productPrice && (
                        <p className="mt-1 text-[11px] font-black text-emerald-700">
                            {locale === "en" ? "Estimated checkout" : "예상 결제금액"} {formatPrice(payableTotal)}
                        </p>
                    )}
                </div>
                {estimate ? (
                    <p className="mt-1 text-[11px] font-bold leading-4 text-amber-700">
                        {locale === "en" ? "Market range only · excluded from lowest-price ranking" : "시장 추정 범위 · 최저가 비교에서 제외"}
                    </p>
                ) : productPrice === null && (
                    <p className="mt-1 text-[11px] font-bold text-neutral-400">
                        {locale === "en" ? "Check final price at the seller" : "판매처에서 최종 가격 확인"}
                    </p>
                )}
                <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 text-sm font-black text-white transition hover:bg-emerald-700"
                    onClick={trackDirectClick}
                >
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                    {locale === "en" ? "View at seller" : "판매처에서 보기"}
                </Link>
            </div>
        </article>
    );
}
