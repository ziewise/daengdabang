"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import ShippingDetailsSection from "@/components/checkout/ShippingDetailsSection";
import { cartProducts } from "@/lib/shop";
import { useAuth, useCart } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import {
    createTossTestOrder,
    DdbApiError,
    getCustomerToken,
    loadTossTestDeliveryQuote,
} from "@/lib/customer-api";
import {
    createCheckoutDeliveryDraft,
    formatCheckoutDeliveryEstimate,
    isCheckoutDeliveryQuote,
    isCheckoutDeliveryServerContract,
    validateCheckoutDelivery,
    type CheckoutDeliveryDraft,
    type CheckoutDeliveryErrors,
    type CheckoutDeliveryField,
    type CheckoutDeliveryQuote,
} from "@/lib/checkout-shipping";
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
    card: { ko: "신용·체크카드", en: "Credit / debit card", detailKo: "토스 보안창에서 카드정보 입력", detailEn: "Enter card details in the secure Toss window", icon: "fa-credit-card" },
    transfer: { ko: "계좌이체", en: "Bank transfer", detailKo: "퀵계좌이체 테스트", detailEn: "Test bank transfer", icon: "fa-building-columns" },
    virtual_account: { ko: "가상계좌", en: "Virtual account", detailKo: "입금통지 연동 후 활성화", detailEn: "Available after deposit webhook setup", icon: "fa-receipt" },
    toss_pay: { ko: "토스페이", en: "Toss Pay", detailKo: "토스페이 직접 테스트창", detailEn: "Direct Toss Pay test window", icon: "fa-bolt" },
    phone: { ko: "휴대폰 결제", en: "Mobile", detailKo: "휴대폰 결제 테스트창", detailEn: "Test carrier billing", icon: "fa-mobile-screen-button" },
    naver_pay: { ko: "네이버페이", en: "Naver Pay", detailKo: "네이버페이 직접 테스트창", detailEn: "Direct Naver Pay test window", icon: "fa-n" },
    kakao_pay: { ko: "카카오페이", en: "Kakao Pay", detailKo: "심사 후 활성화", detailEn: "Available after review", icon: "fa-comment" },
};

const PAYMENT_BUTTON_COPY: Record<CheckoutPaymentMethod, { ko: string; en: string }> = {
    card: { ko: "카드 테스트 결제창 열기", en: "Open card test payment" },
    transfer: { ko: "계좌이체 테스트창 열기", en: "Open bank transfer test" },
    virtual_account: { ko: "가상계좌 준비 중", en: "Virtual account setup in progress" },
    toss_pay: { ko: "토스페이 테스트창 열기", en: "Open Toss Pay test" },
    phone: { ko: "휴대폰 결제 테스트창 열기", en: "Open mobile payment test" },
    naver_pay: { ko: "네이버페이 테스트창 열기", en: "Open Naver Pay test" },
    kakao_pay: { ko: "카카오페이 심사 중", en: "Kakao Pay under review" },
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
    const [deliveryDraft, setDeliveryDraft] = useState<CheckoutDeliveryDraft>(() => createCheckoutDeliveryDraft());
    const [deliveryErrors, setDeliveryErrors] = useState<CheckoutDeliveryErrors>({});
    const [quoteResult, setQuoteResult] = useState<{
        token: string;
        quote: CheckoutDeliveryQuote | null;
        error: string;
    } | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("card");
    const [submitting, setSubmitting] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [directTermsAccepted, setDirectTermsAccepted] = useState(false);
    const prefilledMemberRef = useRef("");

    useEffect(() => {
        const requestedMethod = new URLSearchParams(window.location.search).get("payment");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL handoff is applied after hydration to avoid a server/client mismatch.
        setPaymentMethod(checkoutPaymentMethodFromQuery(requestedMethod));
    }, []);

    const accessToken = user?.apiAccessToken || getCustomerToken();
    const signedInForPayment = Boolean(user && accessToken);
    const loginHref = `/auth/login?redirect=${encodeURIComponent(checkoutHref(paymentMethod))}`;
    const directEasyPay = paymentMethod === "toss_pay" || paymentMethod === "naver_pay";

    useEffect(() => {
        if (!user) return;
        const memberIdentity = `${user.email}|${user.name}|${user.phone ?? ""}`;
        if (prefilledMemberRef.current === memberIdentity) return;
        prefilledMemberRef.current = memberIdentity;
        setDeliveryDraft((current) => ({
            ...current,
            recipientName: current.recipientName || user.name,
            phone: current.phone || user.phone || "",
        }));
    }, [user]);

    useEffect(() => {
        if (!accessToken) return;
        let cancelled = false;
        loadTossTestDeliveryQuote(accessToken)
            .then((quote) => {
                if (cancelled) return;
                if (!isCheckoutDeliveryQuote(quote) || quote.fulfillmentMode !== "test_no_shipment") {
                    throw new Error("Unsafe delivery quote response");
                }
                setQuoteResult({ token: accessToken, quote, error: "" });
            })
            .catch(() => {
                if (!cancelled) {
                    setQuoteResult({
                        token: accessToken,
                        quote: null,
                        error: locale === "en"
                            ? "The server will calculate the test estimate when you continue."
                            : "예상일을 미리 불러오지 못했습니다. 결제 진행 시 서버가 다시 계산합니다.",
                    });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [accessToken, locale]);

    const deliveryQuote = quoteResult?.token === accessToken ? quoteResult.quote : null;
    const quoteError = quoteResult?.token === accessToken ? quoteResult.error : "";
    const quoteLoading = Boolean(accessToken && quoteResult?.token !== accessToken);

    const changeDelivery = (next: CheckoutDeliveryDraft) => {
        setDeliveryDraft(next);
        setDeliveryErrors({});
        if (paymentError) setPaymentError("");
    };

    const validateDeliveryField = (field: CheckoutDeliveryField) => {
        const result = validateCheckoutDelivery(deliveryDraft, locale);
        setDeliveryErrors((current) => ({ ...current, [field]: result.errors[field] }));
    };

    const focusDeliveryField = (field: CheckoutDeliveryField) => {
        window.requestAnimationFrame(() => {
            document.getElementById(`checkout-delivery-${field}`)?.focus();
        });
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (lines.length === 0 || submitting) return;
        if (!isCheckoutPaymentMethodEnabled(paymentMethod)) {
            setPaymentMethod("card");
            setDirectTermsAccepted(false);
            setPaymentError(locale === "en"
                ? "That payment method is not ready yet. Credit/debit card payment was selected instead."
                : "해당 결제수단은 아직 준비 중입니다. 신용·체크카드로 다시 선택했습니다.");
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

        const deliveryValidation = validateCheckoutDelivery(deliveryDraft, locale);
        if (!deliveryValidation.ok) {
            setDeliveryErrors(deliveryValidation.errors);
            setPaymentError(locale === "en"
                ? "Check the highlighted delivery details."
                : "표시된 배송지 정보를 확인해 주세요.");
            focusDeliveryField(deliveryValidation.firstInvalidField);
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
                delivery: {
                    ...deliveryValidation.value,
                    addressLine2: deliveryValidation.value.addressLine2 ?? "",
                    requestNote: deliveryValidation.value.requestNote ?? "",
                },
            }, accessToken);

            if (
                order.mode !== "test"
                || !order.clientKey.startsWith("test_ck_")
                || !isTossOrderId(order.orderId)
                || order.currency !== "KRW"
                || !Number.isSafeInteger(order.amount)
                || order.amount <= 0
                || !Array.isArray(order.lines)
                || order.lines.length === 0
                || !isCheckoutDeliveryServerContract(order)
                || order.quote.fulfillmentMode !== "test_no_shipment"
                || order.quote.isSimulation !== true
                || order.amount !== total + order.quote.shippingFee
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
                customerName: order.delivery.recipientName,
                customerEmail: user.email,
                customerMobilePhone: order.delivery.phone,
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
                        ? "Test keys are active. No real withdrawal, shipment, purchase analytics, or rewards will be created. Delivery details are stored only for this test-order review."
                        : "테스트 키로만 진행됩니다. 실제 출금·배송·구매 분석·코인 및 적립금 지급은 발생하지 않습니다. 배송정보는 테스트 주문 확인용으로만 저장됩니다."}
                </p>
            </div>
            <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <section className="grid min-w-0 gap-4">
                    <ShippingDetailsSection
                        value={deliveryDraft}
                        onChange={changeDelivery}
                        errors={deliveryErrors}
                        onBlur={validateDeliveryField}
                        locale={locale}
                        disabled={submitting}
                        testMode
                    />

                    <section className="surface overflow-hidden" aria-labelledby="checkout-delivery-estimate-title">
                        <div className="border-b border-neutral-200 bg-neutral-50/80 px-4 py-4 sm:px-5">
                            <div className="flex items-start gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700" aria-hidden="true">
                                    <i className="fa-solid fa-calendar-check text-sm" />
                                </span>
                                <div>
                                    <h2 id="checkout-delivery-estimate-title" className="text-lg font-black text-neutral-950">
                                        {locale === "en" ? "Estimated arrival" : "예상 도착일"}
                                    </h2>
                                    <p className="mt-0.5 text-xs font-bold leading-5 text-neutral-500">
                                        {locale === "en" ? "Calculated by the server in Korea time." : "한국 시간과 영업일 기준으로 서버가 계산합니다."}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-5" aria-live="polite">
                            {quoteLoading ? (
                                <p className="text-sm font-black text-neutral-600">
                                    <i className="fa-solid fa-spinner fa-spin mr-2 text-indigo-600" aria-hidden="true" />
                                    {locale === "en" ? "Calculating estimate…" : "예상일 계산 중…"}
                                </p>
                            ) : deliveryQuote ? (
                                <>
                                    <p className="text-lg font-black text-emerald-700">
                                        {formatCheckoutDeliveryEstimate(deliveryQuote, locale)}
                                    </p>
                                    <p className="mt-2 text-xs font-bold leading-5 text-sky-800">
                                        <i className="fa-solid fa-flask mr-1.5" aria-hidden="true" />
                                        {locale === "en"
                                            ? "Simulation for test-screen verification; no parcel will actually be shipped."
                                            : "테스트 화면 검증용 모의 예상이며 실제 상품은 발송되지 않습니다."}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-bold leading-6 text-neutral-600">
                                    {quoteError || (locale === "en"
                                        ? "Sign in to see the server estimate."
                                        : "로그인하면 서버 예상일을 확인할 수 있습니다.")}
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="surface p-5" aria-labelledby="checkout-payment-method-title">
                        <fieldset>
                        <legend id="checkout-payment-method-title" className="mb-3 block text-lg font-black text-neutral-950">{t("paymentMethod")}</legend>
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
                        {paymentMethod === "card" && (
                            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs font-bold leading-5 text-sky-900">
                                <p className="font-black">
                                    <i className="fa-solid fa-shield-halved mr-1.5" aria-hidden="true" />
                                    {locale === "en" ? "Card details are entered in the Toss Payments secure window." : "카드정보는 토스페이먼츠 보안 결제창에서 입력합니다."}
                                </p>
                                <p className="mt-1 text-sky-800">
                                    {locale === "en"
                                        ? "After entering delivery details, select the card payment button below. Daengdabang does not directly collect or store card numbers, expiry dates, or CVCs."
                                        : "배송정보 입력 후 아래 카드 결제 버튼을 누르면 카드번호·유효기간·CVC 입력창이 열립니다. 댕다방은 카드정보를 직접 수집하거나 저장하지 않습니다."}
                                </p>
                            </div>
                        )}
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
                </section>
                <aside className="surface h-fit p-5 lg:sticky lg:top-24">
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
                    <div className="mt-4 grid gap-2 border-t border-neutral-200 pt-4 text-sm font-bold text-neutral-600">
                        <div className="flex items-center justify-between gap-3">
                            <span>{locale === "en" ? "Items" : "총 상품금액"}</span>
                            <b className="text-neutral-950">{formatPrice(total)}</b>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span>{locale === "en" ? "Shipping" : "배송비"}</span>
                            <b className="text-emerald-700">
                                {deliveryQuote
                                    ? (deliveryQuote.shippingFee
                                        ? formatPrice(deliveryQuote.shippingFee)
                                        : (locale === "en" ? "Free" : "무료"))
                                    : (quoteLoading
                                        ? (locale === "en" ? "Checking…" : "확인 중")
                                        : (locale === "en" ? "At payment" : "결제 시 확인"))}
                            </b>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
                        <span className="font-black">{t("totalPayment")}</span>
                        <b className="text-2xl font-black text-indigo-700">
                            {formatPrice(total + (deliveryQuote?.shippingFee ?? 0))}
                        </b>
                    </div>
                    {deliveryQuote && (
                        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black leading-5 text-emerald-800">
                            <i className="fa-solid fa-truck-fast mr-1.5" aria-hidden="true" />
                            {formatCheckoutDeliveryEstimate(deliveryQuote, locale)}
                        </p>
                    )}
                    {!signedInForPayment && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3" role="alert">
                            <p className="text-xs font-bold leading-5 text-amber-900">
                                {locale === "en"
                                    ? "Sign in with the review test account to open the Toss Payments test window. Guest users can preview the order form only."
                                    : "토스페이먼츠 테스트 결제창은 심사용 테스트 계정으로 로그인해야 열립니다. 비회원은 주문서 화면만 미리 볼 수 있습니다."}
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
                            : (locale === "en" ? PAYMENT_BUTTON_COPY[paymentMethod].en : PAYMENT_BUTTON_COPY[paymentMethod].ko)}
                    </button>
                    <p className="mt-2 text-center text-[10px] font-bold leading-4 text-neutral-500">
                        {locale === "en"
                            ? "The server verifies the order, amount, and encrypted delivery snapshot."
                            : "주문번호·금액·암호화 배송정보는 서버가 생성하고 검증합니다."}
                    </p>
                </aside>
            </form>
        </main>
    );
}
