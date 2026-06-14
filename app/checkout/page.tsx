"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { formatKRW } from "@/lib/catalog";
import { cartBundleAdjustments, cartBundleSavings } from "@/lib/bundles";
import { cartProducts, cartSubtotal, cartTotal } from "@/lib/shop";
import { useAuth, useCart } from "@/lib/store";

export default function CheckoutPage() {
    const cart = useCart();
    const { user } = useAuth();
    const lines = cartProducts(cart.lines);
    const subtotal = cartSubtotal(cart.lines);
    const bundleAdjustments = cartBundleAdjustments(cart.lines);
    const bundleSavings = cartBundleSavings(cart.lines);
    const total = cartTotal(cart.lines);
    const [receiver, setReceiver] = useState(user?.name ?? "");
    const [address, setAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("card");
    const [orderId, setOrderId] = useState<string | null>(null);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (lines.length === 0) return;
        const id = `DDB-${Date.now().toString(36).toUpperCase()}`;
        cart.addOrder({
            id,
            createdAt: new Date().toISOString(),
            lines: cart.lines,
            total,
            receiver: receiver.trim(),
            address: address.trim(),
            paymentMethod,
            status: "paid",
        });
        cart.clearCart();
        setOrderId(id);
    };

    if (orderId) {
        return (
            <main className="mx-auto max-w-[720px] px-4 py-14 text-center">
                <i className="fa-regular fa-circle-check text-5xl text-indigo-600" />
                <h1 className="mt-4 text-3xl font-black text-neutral-950">주문이 접수되었습니다.</h1>
                <p className="mt-2 text-sm font-bold text-neutral-600">주문번호 {orderId}</p>
                <div className="mt-6 flex justify-center gap-2">
                    <Link href="/mypage" className="btn btn-primary">마이페이지</Link>
                    <Link href="/products" className="btn btn-secondary">계속 쇼핑</Link>
                </div>
            </main>
        );
    }

    if (lines.length === 0) {
        return (
            <main className="mx-auto max-w-[720px] px-4 py-14 text-center">
                <h1 className="text-2xl font-black text-neutral-950">결제할 상품이 없습니다.</h1>
                <Link href="/products" className="btn btn-primary mt-6">상품 보러가기</Link>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1080px] px-4 py-8 md:px-6">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">주문/결제</h1>
            <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <section className="surface grid gap-4 p-5">
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">받는 분</span>
                        <input value={receiver} onChange={(event) => setReceiver(event.target.value)} className="input" required />
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">주소</span>
                        <input value={address} onChange={(event) => setAddress(event.target.value)} className="input" required />
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">결제수단</span>
                        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="input">
                            <option value="card">카드</option>
                            <option value="transfer">무통장입금</option>
                            <option value="phone">휴대폰</option>
                        </select>
                    </label>
                </section>
                <aside className="surface h-fit p-5">
                    <h2 className="text-lg font-black text-neutral-950">주문 상품</h2>
                    <div className="mt-4 grid gap-3">
                        {lines.map(({ product, qty }) => (
                            <div key={product.id} className="flex items-start justify-between gap-3 text-sm">
                                <span className="font-bold leading-5 text-neutral-700">{product.name} x {qty}</span>
                                <b className="shrink-0 text-neutral-950">{formatKRW(product.price * qty)}원</b>
                            </div>
                        ))}
                    </div>
                    {bundleSavings > 0 && (
                        <div className="mt-4 grid gap-2 border-t border-neutral-200 pt-4">
                            <div className="flex items-center justify-between text-sm font-bold text-neutral-600">
                                <span>상품 금액</span>
                                <b className="text-neutral-950">{formatKRW(subtotal)}원</b>
                            </div>
                            <div className="flex items-center justify-between text-sm font-bold text-rose-600">
                                <span>묶음 배송 할인</span>
                                <b>-{formatKRW(bundleSavings)}원</b>
                            </div>
                            {bundleAdjustments.map((adjustment) => (
                                <p key={adjustment.bundle.slug} className="text-xs font-black text-rose-500">
                                    {adjustment.bundle.title}
                                    {adjustment.sets > 1 ? ` x ${adjustment.sets}` : ""} 적용
                                </p>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 border-t border-neutral-200 pt-4 flex items-center justify-between">
                        <span className="font-black">총 결제</span>
                        <b className="text-2xl font-black text-indigo-700">{formatKRW(total)}원</b>
                    </div>
                    <button type="submit" className="btn btn-primary mt-5 w-full">주문 접수</button>
                </aside>
            </form>
        </main>
    );
}
