"use client";

import { useState } from "react";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import { productHref } from "@/lib/shop";
import { chatProductImage, type ChatExternalProduct } from "@/lib/chat-products";

function ProductPhoto({ src, name }: { src: string; name: string }) {
    const [failedSrc, setFailedSrc] = useState("");
    return (
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-100 bg-white sm:h-24 sm:w-24">
            {src && failedSrc !== src ? (
                // Real catalog/merchant images are served directly in this static export.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={name} width={96} height={96} loading="lazy" decoding="async" referrerPolicy="no-referrer"
                    className="h-full w-full object-contain p-1" onError={() => setFailedSrc(src)} />
            ) : <span className="px-2 text-center text-xs font-medium text-neutral-500">사진 준비 중</span>}
        </span>
    );
}

export default function ChatProductCards({ products = [], externalProducts = [] }: {
    products?: CatalogProduct[];
    externalProducts?: ChatExternalProduct[];
}) {
    const own = products.slice(0, 3).map((product) => ({
        id: product.id, title: product.name, thumbnail: chatProductImage(product.image),
        priceText: product.priceText || (product.price > 0 ? `${product.price.toLocaleString("ko-KR")}원` : "가격 확인 필요"),
        href: productHref(product), sourceName: "댕다방", external: false,
    }));
    const cards = [...own, ...externalProducts.slice(0, 3).map((product) => ({ ...product, external: true }))];
    if (!cards.length) return null;
    return (
        <section data-chat-product-suggestions className="mt-3 min-w-0 text-left" aria-label="함께 살펴볼 상품">
            <p className="mb-2 text-xs font-bold text-neutral-600">함께 살펴볼 상품</p>
            <div className="grid gap-2">
                {cards.map((product) => (
                    <Link key={`${product.external ? "external" : "store"}:${product.id}`} href={product.href}
                        data-chat-product-card={product.external ? "external" : "store"}
                        rel={product.external ? "sponsored" : undefined}
                        className="flex min-w-0 items-center gap-3 rounded-2xl border-2 border-[#b5e5d6] bg-white p-3 text-neutral-900 shadow-sm transition hover:border-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
                        <ProductPhoto src={product.thumbnail} name={product.title} />
                        <span className="min-w-0 flex-1">
                            <span className="mb-1 block text-xs font-semibold text-teal-800">{product.external ? `외부 판매처 · ${product.sourceName}` : "댕다방 상품"}</span>
                            <span className="block break-words text-sm font-extrabold leading-snug">{product.title}</span>
                            <span className="mt-1.5 block text-sm font-black">{product.priceText}</span>
                            <span className="mt-1 block text-xs font-medium text-neutral-500">{product.external ? "판매처에서 보기 ↗" : "상품 자세히 보기 →"}</span>
                        </span>
                    </Link>
                ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">표시 가격의 판매 단위·묶음 수량·배송비는 상품 상세페이지에서 확인해 주세요.</p>
            {externalProducts.length > 0 ? <p className="mt-1 text-xs leading-relaxed text-neutral-500">일부 링크를 통한 구매 시 댕다방이 수수료를 받을 수 있습니다.</p> : null}
        </section>
    );
}
