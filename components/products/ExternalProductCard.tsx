"use client";

import Link from "next/link";
import type { ExternalProductResult } from "@/lib/external-products";
import { outboundHref } from "@/lib/outbound";

type Props = {
    product: ExternalProductResult;
};

export default function ExternalProductCard({ product }: Props) {
    const href = product.outboundUrl || outboundHref(product.purchaseUrl, {
        source: product.sourceName,
        product: product.title,
    });

    return (
        <article className="group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Link
                href={href}
                className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#f7f2e8]"
                aria-label={`${product.title} 외부 가격비교 보기`}
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
                    className="h-full w-full object-cover transition duration-150 group-hover:scale-[1.03]"
                />
                <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-neutral-950/85 px-2 py-0.5 text-[10px] font-black text-white">
                    가격비교
                </div>
                <div className="absolute bottom-2 right-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black text-neutral-700 shadow-sm">
                    {product.sourceName}
                </div>
            </Link>

            <div className="p-3">
                <p className="truncate text-[11px] font-black uppercase text-emerald-700">{product.brand}</p>
                <h3 className="mt-1 min-h-[2.5rem] text-sm font-extrabold leading-5 text-neutral-950 line-clamp-2">
                    {product.title}
                </h3>
                <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="text-base font-black text-neutral-950">{product.priceText}</p>
                    {product.updatedAt && (
                        <span className="text-[10px] font-bold text-neutral-400">{product.updatedAt}</span>
                    )}
                </div>
                <Link
                    href={href}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                    제휴 경유로 보기
                </Link>
            </div>
        </article>
    );
}
