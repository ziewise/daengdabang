"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { cartProducts } from "@/lib/shop";
import { useAuth, useCart } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import {
    createTossTestOrder,
    DdbApiError,
    getCustomerToken,
} from "@/lib/customer-api";
import {
    CHECKOUT_PAYMENT_METHODS,
    checkoutPaymentMethodFromQuery,
    checkoutHref,
    isCheckoutPaymentMethodEnabled,
    tossCardOptions,
    tossSdkPaymentMethod,
    type CheckoutPaymentMethod,
} from "@/lib/payment-methods";
import {
    clearPendingTossTestPayment,
    isTossOrderId,
    savePendingTossTestPayment,
    tossCallbackUrl,
} from "@/lib/toss-test-payment";

const PAYMENT_OPTION_COPY: Record<CheckoutPaymentMethod, {
    ko: string;
    en: string;
    detailKo: string;
    detailEn: string;
    icon: string;
}> = {
    card: { ko: "일반결제", en: "Standard", detailKo: "신용·체크카드·간편결제 통합창", detailEn: "Card and easy-pay window", icon: "fa-credit-card" },
    transfer: { ko: "계좌이체", en: "Bank transfer", detailKo: "퀵계좌이체 테스트", detailEn: "Test bank transfer", icon: "fa-building-columns" },
    toss_pay: { ko: "토스페이", en: "Toss Pay", detailKo: "토스페이 직접 테스트창", detailEn: "Direct Toss Pay test window", icon: "fa-bolt" },
    phone: { ko: "휴대폰 결제", en: "Mobile", detailKo: "휴대폰 결제 테스트창", detailEn: "Test carrier billing", icon: "fa-mobile-screen-button" },
    naver_pay: { ko: "네이버페이", en: "Naver Pay", detailKo: "네이버페이 직접 테스트창", detailEn: "Direct Naver Pay test window", icon: "fa-n" },
    kakao_pay: { ko: "카카오페이", en: "Kakao Pay", detailKo: "심사 후 활성화", detailEn: "Available after review", icon: "fa-comment" },
};

function safePaymentError(error: unknown, locale: "ko" | "en") {
    if (error instanceof DdbApiError) return error.message;
    const code = typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";
    if (code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED") {
        return locale === "en" ? "The test payment was canceled." : "테스트 결제가 취소되었습니다.";
    }
    return locale === "en"
        ? "The test payment window could not be opened. Please try again."
        : "테스트 결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function CheckoutPage() {
    const cart = useCart();
    const { user } = useAuth();
    const { t, locale, formatPrice, productName } = useI18n();
    const lines = cartProducts(cart.lines).filter((line) => line.selected);
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const [receiver, setReceiver] = useState(user?.name ?? "");
    const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("card");
    const [submitting, setSubmitting] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [directTermsAccepted, setDirectTermsAccepted] = useState(false);

    useEffect(() => {
        const requestedMethod = new URLSearchParams(window.location.search).get("payment");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL handoff is applied after hydration to avoid a server/client mismatch.
        setPaymentMethod(checkoutPaymentMethodFromQuery(requestedMethod));
    }, []);

    const accessToken = user?.apiAccessToken || getCustomerToken();
    const signedInForPayment = Boolean(user && accessToken);
    const loginHref = `/auth/login?redirect=${encodeURIComponent(checkoutHref(paymentMethod))}`;
    const directEasyPay = paymentMethod === "toss_pay" || paymentMethod === "naver_pay";

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (lines.length === 0 || submitting) return;
        if (!isCheckoutPaymentMethodEnabled(paymentMethod)) {
            setPaymentMethod("card");
            setDirectTermsAccepted(false);
            setPaymentError(locale === "en"
                ? "Kakao Pay becomes available after merchant review. Standard card payment was selected instead."
                : "카카오페이는 가맹점 심사 후 활성화됩니다. 일반결제로 다시 선택했습니다.");
            return;
        }
        if (!user || !accessToken) {
            setPaymentError(locale === "en"
                ? "Sign in again before starting a test payment."
                : "테스트 결제를 시작하려면 먼저 로그인해 주세요.");
            return;
        }
        if (directEasyPay && !directTermsAccepted) {
            setPaymentError(locale === "en"
                ? "Agree to the Toss Payments terms before opening a direct wallet test window."
                : "간편결제 직접 테스트창을 열려면 토스페이먼츠 약관에 동의해 주세요.");
            return;
        }

        setPaymentError("");
        setSubmitting(true);
        let pendingOrderId = "";
        try {
            const order = await createTossTestOrder({
                lines: lines.map(({ product, qty, color, size }) => ({
                    productId: product.id,
                    qty,
                    ...(color ? { color } : {}),
                    ...(size ? { size } : {}),
                })),
                paymentMethod,
            }, accessToken);

            if (
                order.mode !== "test"
                || !order.clientKey.startsWith("test_ck_")
                || !isTossOrderId(order.orderId)
                || order.currency !== "KRW"
                || !Number.isSafeInteger(order.amount)
                || order.amount <= 0
                || order.amount !== total
                || !Array.isArray(order.lines)
                || order.lines.length === 0
            ) {
                throw new Error("Unsafe Toss order response");
            }

            pendingOrderId = order.orderId;
            savePendingTossTestPayment({
                version: 1,
                orderId: order.orderId,
                amount: order.amount,
                lines: order.lines.map(({ productId, qty, color, size }) => ({
                    productId,
                    qty,
                    ...(color ? { color } : {}),
                    ...(size ? { size } : {}),
                })),
                paymentMethod,
            });

            const tossPayments = await loadTossPayments(order.clientKey);
            const payment = tossPayments.payment({ customerKey: order.customerKey });
            const commonRequest = {
                amount: { currency: order.currency, value: order.amount },
                orderId: order.orderId,
                orderName: order.orderName,
                successUrl: tossCallbackUrl("/checkout/toss/success/"),
                failUrl: tossCallbackUrl("/checkout/toss/fail/"),
                customerName: receiver,
                customerEmail: user.email,
                customerMobilePhone: user.phone?.replace(/\D/g, "") || undefined,
            };

            const sdkMethod = tossSdkPaymentMethod(paymentMethod);
            if (sdkMethod === "TRANSFER") {
                await payment.requestPayment({
                    ...commonRequest,
                    method: "TRANSFER",
                    transfer: { useEscrow: false },
                });
            } else if (sdkMethod === "MOBILE_PHONE") {
                await payment.requestPayment({ ...commonRequest, method: "MOBILE_PHONE" });
            } else {
                await payment.requestPayment({
                    ...commonRequest,
                    method: "CARD",
                    card: tossCardOptions(paymentMethod),
                });
            }
        } catch (error) {
            if (pendingOrderId) {
                clearPendingTossTestPayment(pendingOrderId);
            }
            setPaymentError(safePaymentError(error, locale));
            setSubmitting(false);
        }
    };

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
            <div className="mt-4 rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3" data-payment-mode="test">
                <p className="text-sm font-black text-sky-950">
                    <i className="fa-solid fa-flask mr-2" />
                    {locale === "en" ? "Toss Payments test mode" : "토스페이먼츠 테스트 모드"}
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-sky-800">
                    {locale === "en"
                        ? "Test keys are active. No real withdrawal, shipment, purchase analytics, or rewards will be created."
                        : "테스트 키로만 진행됩니다. 실제 출금·배송·구매 분석·코인 및 적립금 지급은 발생하지 않습니다."}
                </p>
            </div>
            <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <section className="surface grid gap-4 p-5">
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">{t("receiver")}</span>
                        <input value={receiver} onChange={(event) => setReceiver(event.target.value)} className="input" required />
                    </label>
                    <fieldset>
                        <legend className="mb-2 block text-xs font-black text-neutral-500">{t("paymentMethod")}</legend>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("paymentMethod")}>
                            {CHECKOUT_PAYMENT_METHODS.map((method) => {
                                const copy = PAYMENT_OPTION_COPY[method];
                                const enabled = isCheckoutPaymentMethodEnabled(method);
                                const selected = enabled && paymentMethod === method;
                                return (
                                    <button
                                        key={method}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        aria-disabled={!enabled}
                                        disabled={!enabled}
                                        data-payment-method={method}
                                        data-payment-availability={enabled ? "enabled" : "review_required"}
                                        onClick={() => {
                                            if (!enabled) return;
                                            setPaymentMethod(method);
                                            setDirectTermsAccepted(false);
                                        }}
                                        className={`min-w-0 rounded-xl border-2 px-2 py-3 text-left transition sm:px-3 ${
                                            !enabled
                                                ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 opacity-70"
                                                : selected
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
                        {directEasyPay && (
                            <label className="mt-3 flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                                <input
                                    type="checkbox"
                                    checked={directTermsAccepted}
                                    onChange={(event) => setDirectTermsAccepted(event.target.checked)}
                                    className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
                                    required
                                />
                                <span className="text-[11px] font-bold leading-5 text-neutral-700">
                                    {locale === "en" ? "I agree to the required Toss Payments terms for direct wallet testing: " : "간편결제 직접 테스트에 필요한 토스페이먼츠 약관에 동의합니다: "}
                                    <a href="https://pages.tosspayments.com/terms/user" target="_blank" rel="noreferrer" className="font-black text-indigo-700 underline">전자금융거래 약관</a>
                                    {" · "}
                                    <a href="https://pages.tosspayments.com/terms/privacy/consent1" target="_blank" rel="noreferrer" className="font-black text-indigo-700 underline">개인정보 수집·이용</a>
                                    {" · "}
                                    <a href="https://pages.tosspayments.com/terms/privacy/consent2" target="_blank" rel="noreferrer" className="font-black text-indigo-700 underline">제3자 제공</a>
                                </span>
                            </label>
                        )}
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
                    <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
                        <span className="font-black">{t("totalPayment")}</span>
                        <b className="text-2xl font-black text-indigo-700">{formatPrice(total)}</b>
                    </div>
                    {!signedInForPayment && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3" role="alert">
                            <p className="text-xs font-bold leading-5 text-amber-900">
                                {locale === "en"
                                    ? "A signed-in API session is required for test payment."
                                    : "테스트 결제를 시작하려면 로그인된 API 세션이 필요합니다."}
                            </p>
                            <Link href={loginHref} className="mt-2 inline-flex text-xs font-black text-indigo-700 underline">
                                {locale === "en" ? "Sign in" : "로그인하기"}
                            </Link>
                        </div>
                    )}
                    {paymentError && (
                        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-bold leading-5 text-red-800" role="alert">
                            {paymentError}
                        </p>
                    )}
                    <button
                        type="submit"
                        className="btn btn-primary mt-5 w-full"
                        disabled={submitting || !signedInForPayment || (directEasyPay && !directTermsAccepted)}
                        data-payment-status="test_ready"
                    >
                        {submitting
                            ? (locale === "en" ? "Opening test payment…" : "테스트 결제창 여는 중…")
                            : (locale === "en" ? "Open test payment" : "테스트 결제창 열기")}
                    </button>
                    <p className="mt-2 text-center text-[10px] font-bold leading-4 text-neutral-500">
                        {locale === "en"
                            ? "The server creates and verifies the order ID and amount."
                            : "주문번호와 금액은 서버가 생성하고 검증합니다."}
                    </p>
                </aside>
            </form>
        </main>
    );
}
