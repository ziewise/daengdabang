"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { cartProducts } from "@/lib/shop";
import { useAuth, useCart } from "@/lib/store";
import { trackTwinOrderAttribution } from "@/lib/storefront-analytics";
import { useI18n } from "@/lib/i18n";

export default function CheckoutPage() {
    const cart = useCart();
    const { user } = useAuth();
    const { t, formatPrice, productName } = useI18n();
    // 장바구니에서 "선택된" 라인만 결제 대상(체크 해제 상품은 장바구니에 남는다)
    const lines = cartProducts(cart.lines).filter((line) => line.selected);
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const [receiver, setReceiver] = useState(user?.name ?? "");
    const [address, setAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("card");
    const [orderId, setOrderId] = useState<string | null>(null);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (lines.length === 0) return;
        const id = `DDB-${Date.now().toString(36).toUpperCase()}`;
        const ordered = cart.lines.filter((line) => line.selected !== false);
        const orderedLines = cartProducts(ordered);
        cart.addOrder({
            id,
            createdAt: new Date().toISOString(),
            lines: ordered,
            total,
            receiver: receiver.trim(),
            address: address.trim(),
            paymentMethod,
            status: "paid",
        });
        trackTwinOrderAttribution({
            orderId: id,
            customerName: user?.name || receiver.trim(),
            customerEmail: user?.email || "",
            total,
            paymentMethod,
            lines: orderedLines.map((line) => ({
                lineId: `${line.product.id}-${line.color ?? ""}-${line.size ?? ""}`,
                productId: line.product.id,
                productName: line.product.name,
                qty: line.qty,
                unitPrice: line.unitPrice,
                subtotal: line.subtotal,
                petAssignment: line.petAssignment,
            })),
        });
        // 주문된(선택된) 상품만 장바구니에서 제거 — 미선택 상품은 남긴다
        ordered.forEach((line) => cart.removeFromCart(line.productId, line.color, line.size));
        setOrderId(id);
    };

    if (orderId) {
        return (
            <main className="mx-auto max-w-[720px] px-4 py-14 text-center">
                <i className="fa-regular fa-circle-check text-5xl text-indigo-600" />
                <h1 className="mt-4 text-3xl font-black text-neutral-950">{t("orderComplete")}</h1>
                <p className="mt-2 text-sm font-bold text-neutral-600">{t("orderNumber")} {orderId}</p>
                <div className="mt-6 flex justify-center gap-2">
                    <Link href="/mypage" className="btn btn-primary">{t("mypage")}</Link>
                    <Link href="/products" className="btn btn-secondary">{t("keepShopping")}</Link>
                </div>
            </main>
        );
    }

    if (lines.length === 0) {
        return (
            <main className="mx-auto max-w-[720px] px-4 py-14 text-center">
                <h1 className="text-2xl font-black text-neutral-950">{t("noCheckoutItems")}</h1>
                <Link href="/products" className="btn btn-primary mt-6">{t("shopNow")}</Link>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1080px] px-4 py-8 md:px-6">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">{t("checkoutTitle")}</h1>
            <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <section className="surface grid gap-4 p-5">
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">{t("receiver")}</span>
                        <input value={receiver} onChange={(event) => setReceiver(event.target.value)} className="input" required />
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">{t("address")}</span>
                        <input value={address} onChange={(event) => setAddress(event.target.value)} className="input" required />
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">{t("paymentMethod")}</span>
                        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="input">
                            <option value="card">{t("card")}</option>
                            <option value="transfer">{t("transfer")}</option>
                            <option value="phone">{t("phone")}</option>
                        </select>
                    </label>
                </section>
                <aside className="surface h-fit p-5">
                    <h2 className="text-lg font-black text-neutral-950">{t("orderedProducts")}</h2>
                    <div className="mt-4 grid gap-3">
                        {lines.map(({ product, qty, color, size, subtotal }) => (
                            <div key={`${product.id}-${color ?? ""}-${size ?? ""}`} className="flex items-start justify-between gap-3 text-sm">
                                <span className="font-bold leading-5 text-neutral-700">
                                    {productName(product)}
                                    {color && <span className="text-neutral-400"> · {color}</span>}
                                    {size && <span className="text-neutral-400"> · {size}</span>} x {qty}
                                </span>
                                <b className="shrink-0 text-neutral-950">{formatPrice(subtotal)}</b>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 border-t border-neutral-200 pt-4 flex items-center justify-between">
                        <span className="font-black">{t("totalPayment")}</span>
                        <b className="text-2xl font-black text-indigo-700">{formatPrice(total)}</b>
                    </div>
                    <button type="submit" className="btn btn-primary mt-5 w-full">{t("placeOrder")}</button>
                </aside>
            </form>
        </main>
    );
}
