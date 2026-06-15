"use client";

import Image from "next/image";
import Link from "next/link";
import { formatKRW } from "@/lib/catalog";
import { cartProducts, cartTotal, productHref } from "@/lib/shop";
import { useCart } from "@/lib/store";

export default function CartPage() {
    const cart = useCart();
    const lines = cartProducts(cart.lines);
    const total = cartTotal(cart.lines);

    if (lines.length === 0) {
        return (
            <main className="mx-auto max-w-[760px] px-4 py-14 text-center">
                <i className="fa-solid fa-bag-shopping text-4xl text-neutral-300" />
                <h1 className="mt-4 text-2xl font-black text-neutral-950">장바구니가 비어 있습니다.</h1>
                <Link href="/products" className="btn btn-primary mt-6">
                    상품 보러가기
                </Link>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1080px] px-4 py-8 md:px-6">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">장바구니</h1>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <section className="grid gap-3">
                    {lines.map(({ product, qty, subtotal }) => (
                        <article key={product.id} className="surface grid grid-cols-[88px_1fr] gap-4 p-3 md:grid-cols-[112px_1fr_auto]">
                            <Link href={productHref(product)} className="relative aspect-square overflow-hidden rounded-md bg-[#f7f2e8]">
                                {product.image ? (
                                    <Image src={product.image} alt={product.name} fill sizes="112px" className="object-cover" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-3xl text-white">
                                        <i className={`fa-solid ${product.icon}`} />
                                    </div>
                                )}
                            </Link>
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase text-indigo-600">{product.brandEn || product.brandKo}</p>
                                <Link href={productHref(product)} className="mt-1 block text-sm font-black leading-5 text-neutral-950 md:text-base">
                                    {product.name}
                                </Link>
                                <div className="mt-3 inline-flex h-10 items-center rounded-md border border-neutral-200 bg-white">
                                    <button type="button" onClick={() => cart.setQty(product.id, qty - 1)} className="flex h-full w-10 items-center justify-center" aria-label="수량 감소">
                                        <i className="fa-solid fa-minus text-xs" />
                                    </button>
                                    <span className="w-10 text-center text-sm font-black">{qty}</span>
                                    <button type="button" onClick={() => cart.setQty(product.id, qty + 1)} className="flex h-full w-10 items-center justify-center" aria-label="수량 증가">
                                        <i className="fa-solid fa-plus text-xs" />
                                    </button>
                                </div>
                            </div>
                            <div className="col-span-2 flex items-end justify-between border-t border-neutral-200 pt-3 md:col-span-1 md:block md:border-0 md:pt-0 md:text-right">
                                <b className="text-lg font-black text-neutral-950">{formatKRW(subtotal)}원</b>
                                <button type="button" onClick={() => cart.removeFromCart(product.id)} className="text-xs font-black text-neutral-500 hover:text-rose-600">
                                    삭제
                                </button>
                            </div>
                        </article>
                    ))}
                </section>

                <aside className="surface h-fit p-5">
                    <h2 className="text-lg font-black text-neutral-950">주문 합계</h2>
                    <div className="mt-4 flex items-center justify-between text-sm font-bold text-neutral-600">
                        <span>상품 금액</span>
                        <b className="text-neutral-950">{formatKRW(total)}원</b>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm font-bold text-neutral-600">
                        <span>배송비</span>
                        <b className="text-neutral-950">0원</b>
                    </div>
                    <div className="mt-4 border-t border-neutral-200 pt-4 flex items-center justify-between">
                        <span className="font-black">결제 예정</span>
                        <b className="text-2xl font-black text-indigo-700">{formatKRW(total)}원</b>
                    </div>
                    <Link href="/checkout" className="btn btn-primary mt-5 w-full">
                        결제하기
                    </Link>
                </aside>
            </div>
        </main>
    );
}
