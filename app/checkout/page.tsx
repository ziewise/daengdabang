"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { cartProducts } from "@/lib/shop";
import { useAuth, useCart } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { daengLabCoinsForLines } from "@/lib/daenglab-rewards";
import {
    CHECKOUT_PAYMENT_METHODS,
    isCheckoutPaymentMethod,
    type CheckoutPaymentMethod,
} from "@/lib/payment-methods";

const PAYMENT_OPTION_COPY: Record<CheckoutPaymentMethod, {
    ko: string;
    en: string;
    detailKo: string;
    detailEn: string;
    icon: string;
}> = {
    card: { ko: "일반결제", en: "Standard", detailKo: "신용·체크카드", detailEn: "Credit or debit card", icon: "fa-credit-card" },
    transfer: { ko: "계좌이체", en: "Bank transfer", detailKo: "실시간 계좌이체", detailEn: "Direct bank transfer", icon: "fa-building-columns" },
    toss_pay: { ko: "토스페이", en: "Toss Pay", detailKo: "토스 간편결제", detailEn: "Toss quick pay", icon: "fa-bolt" },
    phone: { ko: "휴대폰 결제", en: "Mobile", detailKo: "통신사 소액결제", detailEn: "Carrier billing", icon: "fa-mobile-screen-button" },
    naver_pay: { ko: "네이버페이", en: "Naver Pay", detailKo: "네이버 간편결제", detailEn: "Naver quick pay", icon: "fa-n" },
    kakao_pay: { ko: "카카오페이", en: "Kakao Pay", detailKo: "카카오 간편결제", detailEn: "Kakao quick pay", icon: "fa-comment" },
};

export default function CheckoutPage() {
    const cart = useCart();
    const { user } = useAuth();
    const { t, locale, formatPrice, productName } = useI18n();
    // 장바구니에서 "선택된" 라인만 결제 대상(체크 해제 상품은 장바구니에 남는다)
    const lines = cartProducts(cart.lines).filter((line) => line.selected);
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const expectedDaengLabCoins = daengLabCoinsForLines(lines);
    const [receiver, setReceiver] = useState(user?.name ?? "");
    const [address, setAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("card");
    const [paymentSelectionId, setPaymentSelectionId] = useState<string | null>(null);
    const [selectionRewardEstimate, setSelectionRewardEstimate] = useState(0);

    useEffect(() => {
        const requestedMethod = new URLSearchParams(window.location.search).get("payment");
        if (!isCheckoutPaymentMethod(requestedMethod)) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL handoff is applied after hydration to avoid a server/client mismatch.
        setPaymentMethod(requestedMethod);
    }, []);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (lines.length === 0) return;
        // PG 계약 키와 승인 콜백이 연결되기 전에는 주문을 생성하거나 장바구니를 비우지 않는다.
        const id = `PAY-SELECT-${window.crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
        setSelectionRewardEstimate(expectedDaengLabCoins);
        setPaymentSelectionId(id);
    };

    if (paymentSelectionId) {
        const selectedPayment = PAYMENT_OPTION_COPY[paymentMethod];
        return (
            <main className="mx-auto max-w-[720px] px-4 py-14 text-center">
                <i className="fa-solid fa-link text-5xl text-indigo-600" />
                <h1 className="mt-4 text-3xl font-black text-neutral-950">
                    {locale === "en" ? "Payment method confirmed" : "결제수단 선택을 확인했습니다."}
                </h1>
                <p className="mt-2 text-sm font-bold text-neutral-600">
                    {locale === "en" ? "Selection reference" : "선택 참조번호"} {paymentSelectionId}
                </p>
                <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left" data-payment-status="not_submitted">
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-black text-amber-900">{locale === "en" ? "Selected method" : "선택 결제수단"}</span>
                        <b className="break-keep text-right text-amber-950">{locale === "en" ? selectedPayment.en : selectedPayment.ko}</b>
                    </div>
                    <p className="mt-2 text-xs font-bold leading-5 text-amber-800">
                        {locale === "en"
                            ? "No order, charge, or approval was created. Your cart is unchanged until the payment provider and approval callback are connected."
                            : "실제 주문·출금·승인은 발생하지 않았고 장바구니 상품도 그대로 보관됩니다. 결제사와 승인 콜백 연동 후 실제 결제가 열립니다."}
                    </p>
                </div>
                {selectionRewardEstimate > 0 && (
                    <p
                        className="mx-auto mt-4 w-fit rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700"
                        data-daenglab-coin-estimate={selectionRewardEstimate}
                    >
                        {locale === "en"
                            ? `Member benefit estimate: ${selectionRewardEstimate}C. Credit is issued only after payment verification and purchase confirmation.`
                            : `회원 혜택 예상 ${selectionRewardEstimate}C · 실제 결제 확인과 구매확정이 완료된 주문에만 적립됩니다.`}
                    </p>
                )}
                <div className="mt-6 flex justify-center gap-2">
                    <Link href="/cart" className="btn btn-primary">{t("cart")}</Link>
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
                    <fieldset>
                        <legend className="mb-2 block text-xs font-black text-neutral-500">{t("paymentMethod")}</legend>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("paymentMethod")}>
                            {CHECKOUT_PAYMENT_METHODS.map((method) => {
                                const copy = PAYMENT_OPTION_COPY[method];
                                const selected = paymentMethod === method;
                                return (
                                    <button
                                        key={method}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        data-payment-method={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={`min-w-0 rounded-xl border-2 px-2 py-3 text-left transition sm:px-3 ${
                                            selected
                                                ? "border-indigo-600 bg-indigo-50 text-indigo-950 shadow-sm"
                                                : "border-neutral-200 bg-white text-neutral-700 hover:border-indigo-300"
                                        }`}
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <i className={`fa-solid ${copy.icon} shrink-0 text-sm ${selected ? "text-indigo-600" : "text-neutral-400"}`} />
                                            <span className="break-keep text-[13px] font-black leading-tight sm:text-sm">{locale === "en" ? copy.en : copy.ko}</span>
                                        </span>
                                        <span className="mt-1 block break-keep text-[10px] font-bold leading-4 text-neutral-500">
                                            {locale === "en" ? copy.detailEn : copy.detailKo}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800">
                            <i className="fa-solid fa-circle-info mr-1.5" />
                            {locale === "en"
                                ? "Payment provider setup is in progress. This screen only confirms your selection; it creates no order, charge, or approval."
                                : "결제사 연동 준비 단계입니다. 현재는 결제수단 선택 화면만 제공하며 실제 주문 생성·출금·승인은 진행되지 않습니다."}
                        </p>
                    </fieldset>
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
                    <div
                        className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3.5 py-3"
                        data-daenglab-coin-estimate={expectedDaengLabCoins}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-black text-indigo-700">
                                {locale === "en" ? "Member DaengLab coin estimate" : "회원 댕랩코인 적립 예상"}
                            </span>
                            <b className="text-base font-black text-indigo-800">{expectedDaengLabCoins}C</b>
                        </div>
                        <p className="mt-1.5 text-[11px] font-bold leading-4 text-indigo-500">
                            {locale === "en"
                                ? "Payment verification + purchase confirmation required · 10C per analysis"
                                : "결제 확인 + 구매확정 후 적립 · 행동·소리 분석 1회당 10C"}
                        </p>
                    </div>
                    <button type="submit" className="btn btn-primary mt-5 w-full">
                        {locale === "en" ? "Confirm selected method" : "선택한 결제수단 확인"}
                    </button>
                </aside>
            </form>
        </main>
    );
}
