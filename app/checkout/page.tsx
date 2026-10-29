"use client";

/*
 * CheckoutPage — 주문서(/checkout): 배송지 · 배송 요청 · 예상 도착일 · 결제수단 · 주문 상품 요약 → 토스 결제창(테스트 · 실결제는 서버가 정함)
 * 2026-10-24 웹 크레파스 결(app/checkout-web.css, 웹 html:not(.ddb-app-mode) 에서만):
 *  영문 손글씨 · 주아 제목 + 세 색 밑줄 · 주문 단계(장바구니 → 주문서 → 결제 완료, 지금 = 주문서) · 흰 쿠션 칸 · 파스텔 동그라미 아이콘 ·
 *  크림 입력칸 · 결제수단 쿠션 카드(고른 것 분홍 테) · 주문 상품 요약에 상품 사진(웹 전용) · 크레파스 총 결제금액 · 분홍 결제 알약.
 *  2026-10-24 사용자 선택 K5 "색 띠 머리": 칸마다 파스텔 띠 머리(번호 · STEP 손글씨 · 주아 제목 · 설명 · 3D 그림), 칸 사이 발자국.
 *  결제수단 칸 머리(co-pay-head)와 주문 요약 머리(co-sum-head)는 웹 전용 요소(hidden → CSS).
 * 앱은 appShopSkin 이 section.surface · data-* · 순서로 꾸미므로 구조는 그대로, 이름표 · hidden 웹 요소만 더함.
 * 결제 · 주문 생성 · 배송 검증 · 토스 결제창 동작과 안내 문구는 그대로.
 * 2026-10-25 웹 비회원 주문(components/guest/GuestCheckoutPanel · lib/guest-order): 로그인 안 했으면 회원/비회원 고르기 →
 *  비회원 주문자 정보 · 주문 조회 비밀번호 · 필수 동의, 주문 요약 옆 결제 안내. 비회원 결제는 서버가 연결(NEXT_PUBLIC_GUEST_ORDER)될 때만
 *  열리고, 그 전에는 지금처럼 로그인해야 결제됨. 앱에서는 hidden(꾸밈 app/guest-web.css).
 * 2026-10-26 웹 점검: 서버 · 개발 말투 안내(예상일 · 검증 안내)와 날것의 서버 오류 글은 웹에서만 쉬운 해요체로(useWebScreen),
 *  구매할 수 없는 옵션 안내는 웹에서 3D 그림 쿠션 카드, 남은 인디고 글자 · 돌림표는 웹 CSS(co-addr-link · co-terms-link · co-spin)로 분홍.
 *  앱 화면 · 테스트 결제 안내 · 결제 동작은 그대로.
 * 2026-10-28 실결제 전환 준비: 결제 모드(test · live)는 서버가 정함 — 배송 견적이 먼저 알려 주고 주문 응답이 확정.
 *  키 · 주문번호 · 배송 견적이 한 모드로 짝이 맞을 때만 결제창을 엶(lib/toss-payment-mode). 견적의 모드와 주문 모드가
 *  다르면 열지 않고 견적부터 다시 받음. 화면 문구는 두 모드 모두 보통 "결제" 문구(사장님 결정 — 테스트 안내 없음).
 *  정식 오픈 전 잠금: 결제 단추를 누르면 서버 확인(availability) 뒤 잠겨 있으면 주문 없이 안내 창(PrelaunchNoticeModal),
 *  주문 만들기 403 PAYMENT_PRELAUNCH_LOCKED 도 같은 창. 회원 · 비회원 모두.
 */
import { FormEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import "../checkout-web.css";
import "../guest-web.css";
import { GuestBuyerForm, GuestChooser, GuestPayBox } from "@/components/guest/GuestCheckoutPanel";
import {
    createGuestTossOrder,
    emptyGuestBuyer,
    guestOrderEnabled,
    maskPhone,
    readGuestMode,
    saveGuestPending,
    subscribeGuestMode,
    validateGuestBuyer,
    type GuestBuyer,
    type GuestBuyerErrors,
} from "@/lib/guest-order";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import ShippingDetailsSection from "@/components/checkout/ShippingDetailsSection";
// 2026-10-28 정식 오픈 전 결제 잠금 안내 창(주문 · 토스 결제창 없이)
import PrelaunchNoticeModal from "@/components/checkout/PrelaunchNoticeModal";
import { cartProducts } from "@/lib/shop";
import { useLiveInventorySnapshot } from "@/lib/catalog/live-inventory";
import { useAuth, useCart } from "@/lib/store";
// 웹 화면인가 — 웹 전용 문구(쉬운 말)만 고를 때 씀, 결제 동작과는 무관
import { useWebScreen } from "@/hooks/useWebScreen";
import { useI18n } from "@/lib/i18n";
import {
    cancelTossTestOrder,
    createTossTestOrder,
    DdbApiError,
    getCustomerToken,
    loadCustomerAddresses,
    loadTossTestDeliveryQuote,
    type CustomerAddress,
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
import { loadTossCheckoutAvailability } from "@/lib/toss-checkout-availability";
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
    isTossPrelaunchLockedError,
    savePendingTossTestPayment,
    tossCallbackUrl,
    tossOrderMode,
    tossQuoteMode,
    type TossPaymentMode,
} from "@/lib/toss-test-payment";

const PAYMENT_OPTION_COPY: Record<CheckoutPaymentMethod, {
    ko: string;
    en: string;
    detailKo: string;
    detailEn: string;
    icon: string;
}> = {
    card: { ko: "신용·체크카드", en: "Credit / debit card", detailKo: "토스 보안창에서 카드사 선택·인증", detailEn: "Choose and authenticate your card issuer in Toss", icon: "fa-credit-card" },
    transfer: { ko: "계좌이체", en: "Bank transfer", detailKo: "퀵계좌이체", detailEn: "Quick bank transfer", icon: "fa-building-columns" },
    virtual_account: { ko: "가상계좌", en: "Virtual account", detailKo: "입금통지 연동 후 활성화", detailEn: "Available after deposit webhook setup", icon: "fa-receipt" },
    toss_pay: { ko: "토스페이", en: "Toss Pay", detailKo: "토스페이 결제창 바로 열기", detailEn: "Opens Toss Pay directly", icon: "fa-bolt" },
    phone: { ko: "휴대폰 결제", en: "Mobile", detailKo: "통신사 휴대폰 결제", detailEn: "Carrier billing", icon: "fa-mobile-screen-button" },
    naver_pay: { ko: "네이버페이", en: "Naver Pay", detailKo: "네이버페이 결제창 바로 열기", detailEn: "Opens Naver Pay directly", icon: "fa-n" },
    kakao_pay: { ko: "카카오페이", en: "Kakao Pay", detailKo: "심사 후 활성화", detailEn: "Available after review", icon: "fa-comment" },
};

const PAYMENT_BUTTON_COPY: Record<CheckoutPaymentMethod, { ko: string; en: string }> = {
    card: { ko: "카드로 결제하기", en: "Pay by card" },
    transfer: { ko: "계좌이체로 결제하기", en: "Pay by bank transfer" },
    virtual_account: { ko: "가상계좌 준비 중", en: "Virtual account setup in progress" },
    toss_pay: { ko: "토스페이로 결제하기", en: "Pay with Toss Pay" },
    phone: { ko: "휴대폰으로 결제하기", en: "Pay by mobile" },
    naver_pay: { ko: "네이버페이로 결제하기", en: "Pay with Naver Pay" },
    kakao_pay: { ko: "카카오페이 심사 중", en: "Kakao Pay under review" },
};

// 배송 견적의 모드와 서버가 만든 주문의 모드가 다를 때 — 결제창을 열지 않고 견적을 다시 받음
const TOSS_MODE_CHANGED = "Toss payment mode changed";

// 서버가 보낸 날것의 오류 글인가(아래 safePaymentError 가 그대로 돌려주는 경우) — 웹은 이때 쉬운 고정 문장 + 작은 원문 한 줄
function isRawServerPaymentError(error: unknown) {
    return error instanceof DdbApiError
        && error.apiCode !== "OPEN_ORDER_LIMIT"
        && error.apiCode !== "ORDER_CREATE_RATE_LIMIT";
}

function safePaymentError(error: unknown, locale: "ko" | "en") {
    if (error instanceof Error && error.message === TOSS_MODE_CHANGED) {
        return locale === "en"
            ? "Payment settings changed, so the payment window was not opened. Please try again in a moment."
            : "결제 설정이 바뀌어 결제창을 열지 않았습니다. 잠시 후 다시 결제해 주세요.";
    }
    if (error instanceof DdbApiError) {
        if (error.apiCode === "OPEN_ORDER_LIMIT") {
            return locale === "en"
                ? "Earlier payment windows are still being closed. Please wait a moment and try again."
                : "이전에 열었던 결제창의 주문을 정리하고 있습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (error.apiCode === "ORDER_CREATE_RATE_LIMIT") {
            return locale === "en"
                ? "Several payment windows were opened in a short time. Please try again in one minute."
                : "짧은 시간에 결제창을 여러 번 열어 잠시 보호 중입니다. 1분 뒤 다시 시도해 주세요.";
        }
        return error.message;
    }
    const code = typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";
    if (code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED") {
        return locale === "en" ? "The payment was canceled." : "결제가 취소되었습니다.";
    }
    return locale === "en"
        ? "The payment window could not be opened. Please try again."
        : "결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function CheckoutPage() {
    const cart = useCart();
    const { user } = useAuth();
    const { t, locale, formatPrice, productName } = useI18n();
    const liveInventory = useLiveInventorySnapshot();
    const webScreen = useWebScreen();
    const evaluatedCartLines = cartProducts(cart.lines, liveInventory);
    const inventoryBlocked = evaluatedCartLines.some(line => line.selectionBlocked);
    const lines = evaluatedCartLines.filter((line) => line.selected);
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const [deliveryDraft, setDeliveryDraft] = useState<CheckoutDeliveryDraft>(() => createCheckoutDeliveryDraft());
    const [deliveryErrors, setDeliveryErrors] = useState<CheckoutDeliveryErrors>({});
    const [quoteResult, setQuoteResult] = useState<{
        requestKey: string;
        quote: CheckoutDeliveryQuote | null;
        error: string;
    } | null>(null);
    // 결제 모드가 바뀐 것을 알았을 때 배송 견적(= 화면 안내 모드)을 다시 받는 순번
    const [quoteRefresh, setQuoteRefresh] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("card");
    const [submitting, setSubmitting] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    // 마지막 결제 시도에서 받은 서버 원문 오류 — paymentError 와 같을 때만 웹이 쉬운 문장으로 바꿔 보여 줌(보이는 글만, 동작 무관)
    const [rawServerError, setRawServerError] = useState("");
    const [directTermsAccepted, setDirectTermsAccepted] = useState(false);
    // 정식 오픈 전 잠금 안내 창 — 서버가 이 계정에 결제를 열지 않았을 때만. 닫으면 결제 단추로 초점
    // (확인 중에 단추가 잠깐 비활성이라 브라우저가 초점을 놓치므로 창이 아니라 여기서 돌려줌)
    const [prelaunchOpen, setPrelaunchOpen] = useState(false);
    const payButtonRef = useRef<HTMLButtonElement>(null);
    const closePrelaunch = useCallback(() => {
        setPrelaunchOpen(false);
        payButtonRef.current?.focus();
    }, []);
    const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState("");
    const prefilledMemberRef = useRef("");
    const prefilledAddressRef = useRef("");
    // 웹 비회원 주문 — "비회원으로 주문 중" 표시(이 탭) · 주문자 정보 · 서버 연결 여부(꺼져 있으면 결제는 지금처럼 로그인 뒤)
    const guestMode = useSyncExternalStore(subscribeGuestMode, readGuestMode, () => false);
    const guestFeature = useSyncExternalStore(subscribeGuestMode, guestOrderEnabled, () => process.env.NEXT_PUBLIC_GUEST_ORDER === "1");
    const [guestBuyer, setGuestBuyer] = useState<GuestBuyer>(emptyGuestBuyer);
    const [guestErrors, setGuestErrors] = useState<GuestBuyerErrors>({});

    // 개발 서버 전용 미리보기 — ?prelaunchpreview 이면 정식 오픈 전 안내 창을 바로 띄움(배포 빌드에서는 늘 꺼짐, 서버 요청 없음)
    useEffect(() => {
        if (process.env.NODE_ENV !== "development") return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- dev-only preview flag is read from the URL after hydration.
        if (new URLSearchParams(window.location.search).has("prelaunchpreview")) setPrelaunchOpen(true);
    }, []);

    useEffect(() => {
        const requestedMethod = new URLSearchParams(window.location.search).get("payment");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL handoff is applied after hydration to avoid a server/client mismatch.
        setPaymentMethod(checkoutPaymentMethodFromQuery(requestedMethod));
    }, []);

    const accessToken = user?.apiAccessToken || getCustomerToken();
    const signedInForPayment = Boolean(user && accessToken);
    const loginHref = `/auth/login?redirect=${encodeURIComponent(checkoutHref(paymentMethod))}`;
    const signupHref = `/auth/signup?redirect=${encodeURIComponent(checkoutHref(paymentMethod))}`;
    // 비회원 결제 — 로그인 안 했고 · 비회원을 골랐고 · 서버가 연결됐을 때만
    const guestCheckout = !signedInForPayment && guestMode && guestFeature;
    const directEasyPay = paymentMethod === "toss_pay" || paymentMethod === "naver_pay";
    const quoteRequestKey = accessToken
        ? `${accessToken}:${total}:${deliveryDraft.deliveryZone}:${quoteRefresh}`
        : "";

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
        loadCustomerAddresses(accessToken)
            .then((addresses) => {
                if (cancelled) return;
                setSavedAddresses(addresses);
                const preferred = addresses.find((address) => address.isDefault) || addresses[0];
                if (!preferred || prefilledAddressRef.current) return;
                prefilledAddressRef.current = preferred.id;
                setSelectedAddressId(preferred.id);
                setDeliveryDraft((current) => ({
                    ...current,
                    recipientName: current.recipientName || preferred.recipientName,
                    phone: current.phone || preferred.phone,
                    postalCode: current.postalCode || preferred.postalCode,
                    addressLine1: current.addressLine1 || preferred.addressLine1,
                    addressLine2: current.addressLine2 || preferred.addressLine2,
                }));
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [accessToken]);

    const applySavedAddress = (addressId: string) => {
        const selected = savedAddresses.find((address) => address.id === addressId);
        if (!selected) return;
        prefilledAddressRef.current = selected.id;
        setSelectedAddressId(selected.id);
        changeDelivery({
            ...deliveryDraft,
            recipientName: selected.recipientName,
            phone: selected.phone,
            postalCode: selected.postalCode,
            addressLine1: selected.addressLine1,
            addressLine2: selected.addressLine2,
        });
    };

    useEffect(() => {
        if (!accessToken || !quoteRequestKey) return;
        let cancelled = false;
        loadTossTestDeliveryQuote({
            subtotal: total,
            deliveryZone: deliveryDraft.deliveryZone,
        }, accessToken)
            .then((quote) => {
                if (cancelled) return;
                if (!isCheckoutDeliveryQuote(quote) || tossQuoteMode(quote) === null) {
                    throw new Error("Unsafe delivery quote response");
                }
                setQuoteResult({ requestKey: quoteRequestKey, quote, error: "" });
            })
            .catch(() => {
                if (!cancelled) {
                    setQuoteResult({
                        requestKey: quoteRequestKey,
                        quote: null,
                        error: locale === "en"
                            ? "The server will calculate the estimate when you continue."
                            : "예상일을 미리 불러오지 못했습니다. 결제 진행 시 서버가 다시 계산합니다.",
                    });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [accessToken, deliveryDraft.deliveryZone, locale, quoteRequestKey, total]);

    const deliveryQuote = quoteResult?.requestKey === quoteRequestKey ? quoteResult.quote : null;
    const quoteError = quoteResult?.requestKey === quoteRequestKey ? quoteResult.error : "";
    const quoteLoading = Boolean(accessToken && quoteResult?.requestKey !== quoteRequestKey);
    // 서버가 배송 견적으로 알려 준 결제 모드 — 견적 전(로그인 전 · 불러오기 실패)은 null. 문구가 아니라 주문 모드 짝 검사에만 씀
    const paymentMode: TossPaymentMode | null = deliveryQuote ? tossQuoteMode(deliveryQuote) : null;

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
        if (lines.length === 0 || submitting || inventoryBlocked) return;
        if (!isCheckoutPaymentMethodEnabled(paymentMethod)) {
            setPaymentMethod("card");
            setDirectTermsAccepted(false);
            setPaymentError(locale === "en"
                ? "That payment method is not ready yet. Credit/debit card payment was selected instead."
                : "해당 결제수단은 아직 준비 중입니다. 신용·체크카드로 다시 선택했습니다.");
            return;
        }
        if ((!user || !accessToken) && !guestCheckout) {
            setPaymentError(locale === "en"
                ? "Sign in again before starting a payment."
                : "결제를 시작하려면 먼저 로그인해 주세요.");
            return;
        }
        // 정식 오픈 전 잠금(2026-10-28) — 서버가 이 계정(비회원은 토큰 없이)에 결제를 열지 않았으면 주문을 만들지 않고 안내 창만.
        // 배송지 입력 전이라도 먼저 알림. 확인 주소가 없거나(옛 서버) 실패하면 그대로 진행하고 주문 만들기에서 서버가 403 으로 다시 막음.
        setSubmitting(true);
        const availability = await loadTossCheckoutAvailability(accessToken || undefined);
        setSubmitting(false);
        if (availability === "locked") {
            setPaymentError("");
            setPrelaunchOpen(true);
            return;
        }
        if (guestCheckout) {
            const guestValidation = validateGuestBuyer(guestBuyer);
            setGuestErrors(guestValidation.errors);
            if (!guestValidation.ok) {
                setPaymentError("주문하는 분 정보를 확인해 주세요.");
                window.requestAnimationFrame(() => document.getElementById(`guest-buyer-${guestValidation.first}`)?.focus());
                return;
            }
        }
        if (directEasyPay && !directTermsAccepted) {
            setPaymentError(locale === "en"
                ? "Agree to the Toss Payments terms before opening a direct wallet window."
                : "간편결제 창을 열려면 토스페이먼츠 약관에 동의해 주세요.");
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
            const orderPayload = {
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
            };
            // 회원은 기존 주문 만들기 그대로, 비회원은 연동 자리(lib/guest-order — 서버가 연결됐을 때만 여기까지 옴)
            const guestOrder = guestCheckout ? await createGuestTossOrder(orderPayload, guestBuyer) : null;
            const order = guestOrder ?? await createTossTestOrder(orderPayload, accessToken as string);
            if (guestOrder) {
                saveGuestPending({
                    orderId: guestOrder.orderId,
                    guestToken: guestOrder.guestToken,
                    buyerName: guestBuyer.name.trim(),
                    maskedPhone: maskPhone(guestBuyer.phone),
                    email: guestBuyer.email.trim(),
                });
            }

            // 서버가 만든 주문은 아래 검사에서 막혀도 정리 — 결제 키가 생기기 전이라 서버가 취소를 받아 줌
            if (isTossOrderId(order.orderId)) pendingOrderId = order.orderId;
            // 서버가 정한 모드를 따르되 mode · 키(test_ck_ / live_ck_) · 주문번호(TEST- / LIVE-) · 배송 견적
            // (test_no_shipment / live_pending)이 한 모드로 짝이 맞을 때만. 하나라도 섞이면 null → 결제창을 열지 않음.
            const orderMode = tossOrderMode(order);
            if (orderMode !== null && paymentMode !== null && orderMode !== paymentMode) {
                // 견적을 받은 뒤 서버 모드가 바뀜(테스트 ↔ 실결제) — 이 화면 그대로 결제창을 열지 않음
                throw new Error(TOSS_MODE_CHANGED);
            }
            if (
                orderMode === null
                || !isTossOrderId(order.orderId)
                || order.currency !== "KRW"
                || !Number.isSafeInteger(order.amount)
                || order.amount <= 0
                || !Array.isArray(order.lines)
                || order.lines.length === 0
                || !isCheckoutDeliveryServerContract(order)
                || order.amount !== total + order.quote.shippingFee
            ) {
                throw new Error("Unsafe Toss order response");
            }

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
                customerEmail: guestCheckout ? guestBuyer.email.trim() : user?.email,
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
                try {
                    // 비회원 주문 정리는 서버가 맡음(회원 토큰이 없음)
                    if (!guestCheckout) await cancelTossTestOrder(pendingOrderId, accessToken);
                } catch {
                    // A submitted/confirmed order must never be forced back to cancelled.
                    // The API accepts this cleanup only while no provider payment key exists.
                }
                clearPendingTossTestPayment(pendingOrderId);
            }
            if (isTossPrelaunchLockedError(error)) {
                // 주문 만들기에서 서버가 정식 오픈 전 잠금으로 막음(주문 없음) — 오류 글 대신 같은 안내 창
                setRawServerError("");
                setPaymentError("");
                setPrelaunchOpen(true);
                setSubmitting(false);
                return;
            }
            if (error instanceof Error && error.message === TOSS_MODE_CHANGED) setQuoteRefresh((value) => value + 1);
            const message = safePaymentError(error, locale);
            setRawServerError(isRawServerPaymentError(error) ? message : "");
            setPaymentError(message);
            setSubmitting(false);
        }
    };

    if (inventoryBlocked) {
        return (
            <main className="mx-auto max-w-[720px] px-4 py-14 text-center" data-checkout-web="notice" data-co-notice="blocked">
                {/* 웹 전용 — 3D 그림 동그라미(빈 주문서 안내와 같은 co-notice-art) */}
                <span className="hidden co-notice-art" aria-hidden="true">
                    <Image src="/images/ui/goods-pay-none-256.webp" alt="" width={104} height={104} />
                </span>
                <h1 className="co-notice-title text-xl font-black">
                    {webScreen
                        // 웹 — 쉬운 해요체(앱은 아래 기존 문구 그대로)
                        ? (locale === "en" ? "Some options can’t be purchased right now" : "지금 살 수 없는 옵션이 있어요")
                        : (locale === "en" ? "Review unavailable cart options before checkout." : "구매할 수 없는 옵션이 있어 장바구니 확인이 필요합니다.")}
                </h1>
                {webScreen && (
                    <p className="co-notice-desc">
                        {locale === "en"
                            ? "An item in your cart sold out or changed. Check it in your cart, then come back to checkout."
                            : "장바구니에 품절되었거나 바뀐 옵션이 있어요. 장바구니에서 확인한 뒤 다시 주문해 주세요."}
                    </p>
                )}
                <Link href="/cart" className="btn btn-primary mt-6">{locale === "en" ? "Review cart" : "장바구니 확인"}</Link>
            </main>
        );
    }
    if (lines.length === 0) {
        return (
            <main className="mx-auto max-w-[720px] px-4 py-14 text-center" data-checkout-web="notice">
                {/* 웹 전용 — 무지개 고리 3D 장바구니 */}
                <span className="hidden co-notice-art" aria-hidden="true">
                    <Image src="/images/ui/header-cart-128.webp" alt="" width={96} height={96} />
                </span>
                <h1 className="co-notice-title text-2xl font-black text-neutral-950">{t("noCheckoutItems")}</h1>
                <Link href="/products" className="btn btn-primary mt-6">{t("shopNow")}</Link>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1080px] px-4 py-8 md:px-6" data-checkout-web="form">
            {/* 웹 전용 — 영문 손글씨 꼬리표 */}
            <p className="hidden co-kicker">CHECKOUT</p>
            <h1 className="co-title text-3xl font-black tracking-tight text-neutral-950">{t("checkoutTitle")}</h1>
            {/* 웹 전용 — 주문 단계(지금 = 주문서) */}
            <ol className="hidden co-steps" aria-label={locale === "en" ? "Order steps" : "주문 단계"}>
                <li className="is-done"><b><i className="fa-solid fa-check" aria-hidden="true" /></b>{t("cart")}</li>
                <li className="is-on" aria-current="step"><b>2</b>{locale === "en" ? "Checkout" : "주문서"}</li>
                <li><b>3</b>{locale === "en" ? "Done" : "결제 완료"}</li>
            </ol>
            <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <section className="grid min-w-0 gap-4">
                    {/* 웹 전용 — 로그인 안 했으면 회원/비회원 고르기 · 비회원 주문자 정보(앱은 hidden) */}
                    {!signedInForPayment && (
                        <div className="hidden" data-guest-web="checkout">
                            {guestMode ? (
                                <GuestBuyerForm
                                    buyer={guestBuyer}
                                    onChange={(next) => {
                                        setGuestBuyer(next);
                                        setGuestErrors({});
                                        if (paymentError) setPaymentError("");
                                    }}
                                    errors={guestErrors}
                                    loginHref={loginHref}
                                    disabled={submitting}
                                    onCopyToDelivery={() => changeDelivery({ ...deliveryDraft, recipientName: guestBuyer.name.trim(), phone: guestBuyer.phone.trim() })}
                                />
                            ) : (
                                <GuestChooser loginHref={loginHref} />
                            )}
                        </div>
                    )}
                    {savedAddresses.length > 0 && (
                        <section className="surface flex flex-wrap items-center gap-3 p-4" aria-label="저장된 배송지 선택">
                            <label htmlFor="checkout-saved-address" className="text-xs font-black text-neutral-600">
                                저장된 배송지
                            </label>
                            <select
                                id="checkout-saved-address"
                                value={selectedAddressId}
                                onChange={(event) => applySavedAddress(event.target.value)}
                                disabled={submitting}
                                className="min-h-10 min-w-[220px] flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-black text-neutral-900"
                            >
                                {savedAddresses.map((address) => (
                                    <option key={address.id} value={address.id}>
                                        {address.label}{address.isDefault ? " · 기본" : ""} — {address.recipientName}
                                    </option>
                                ))}
                            </select>
                            <Link href="/mypage/address/" className="co-addr-link text-xs font-black text-indigo-700 hover:underline">배송지 관리</Link>
                        </section>
                    )}
                    <ShippingDetailsSection
                        value={deliveryDraft}
                        onChange={changeDelivery}
                        errors={deliveryErrors}
                        onBlur={validateDeliveryField}
                        locale={locale}
                        disabled={submitting}
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
                                        {webScreen
                                            // 웹 — 쉬운 말(앱은 기존 문구)
                                            ? (locale === "en" ? "Based on Korean business days, excluding weekends and holidays." : "주말 · 공휴일을 빼고 영업일 기준으로 알려 드려요.")
                                            : (locale === "en" ? "Calculated by the server in Korea time." : "한국 시간과 영업일 기준으로 서버가 계산합니다.")}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-5" aria-live="polite">
                            {quoteLoading ? (
                                <p className="text-sm font-black text-neutral-600">
                                    <i className="co-spin fa-solid fa-spinner fa-spin mr-2 text-indigo-600" aria-hidden="true" />
                                    {locale === "en" ? "Calculating estimate…" : "예상일 계산 중…"}
                                </p>
                            ) : deliveryQuote ? (
                                <>
                                    <p className="text-lg font-black text-emerald-700">
                                        {formatCheckoutDeliveryEstimate(deliveryQuote, locale)}
                                    </p>
                                    <p className="mt-2 text-xs font-bold leading-5 text-neutral-500">
                                        {locale === "en"
                                            ? "Actual arrival may vary slightly depending on the carrier."
                                            : "택배사 사정에 따라 도착일이 조금 달라질 수 있습니다."}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-bold leading-6 text-neutral-600">
                                    {webScreen
                                        // 웹 — 쉬운 말(앱은 기존 문구)
                                        ? (quoteError
                                            ? (locale === "en" ? "We couldn’t load the estimate yet. We’ll check it again when you pay." : "지금은 예상일을 불러오지 못했어요. 결제할 때 다시 확인해 드려요.")
                                            : (locale === "en" ? "Sign in to see your estimated arrival date." : "로그인하면 예상 도착일을 알려 드려요."))
                                        : quoteError || (locale === "en"
                                            ? "Sign in to see the server estimate."
                                            : "로그인하면 서버 예상일을 확인할 수 있습니다.")}
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="surface p-5" aria-labelledby="checkout-payment-method-title">
                        {/* 웹 전용 — 다른 칸과 같은 색 띠 머리(제목은 아래 legend 가 화면 읽기용으로 그대로 맡음) */}
                        <div className="hidden co-pay-head" aria-hidden="true">
                            <span className="co-pay-ico"><i className="fa-solid fa-credit-card" /></span>
                            <div>
                                <p className="co-pay-title">{t("paymentMethod")}</p>
                                <p className="co-pay-desc">
                                    {locale === "en" ? "Payment continues in the Toss Payments secure window." : "결제는 토스페이먼츠 보안 결제창에서 이어져요."}
                                </p>
                            </div>
                        </div>
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
                                        ? "Choose a supported issuer, including KB Kookmin, in the Toss window. Depending on the issuer and device, an app-card or issuer authentication screen may open instead of direct card-number entry. Daengdabang does not directly collect or store card details."
                                        : "토스 결제창에서 KB국민카드(국민)를 포함한 카드사를 선택해 인증합니다. 카드사와 기기에 따라 앱카드·ISP/안심클릭 등이 열리며 카드번호 직접 입력 화면이 항상 나오지는 않습니다. 댕다방은 카드정보를 직접 수집하거나 저장하지 않습니다."}
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
                                    {locale === "en" ? "I agree to the required Toss Payments terms for direct wallet payment: " : "간편결제에 필요한 토스페이먼츠 약관에 동의합니다: "}
                                    <a href="https://pages.tosspayments.com/terms/user" target="_blank" rel="noreferrer" className="co-terms-link font-black text-indigo-700 underline">전자금융거래 약관</a>
                                    {" · "}
                                    <a href="https://pages.tosspayments.com/terms/privacy/consent1" target="_blank" rel="noreferrer" className="co-terms-link font-black text-indigo-700 underline">개인정보 수집·이용</a>
                                    {" · "}
                                    <a href="https://pages.tosspayments.com/terms/privacy/consent2" target="_blank" rel="noreferrer" className="co-terms-link font-black text-indigo-700 underline">제3자 제공</a>
                                </span>
                            </label>
                        )}
                        </fieldset>
                    </section>
                </section>
                <aside className="surface h-fit p-5 lg:sticky lg:top-24">
                    {/* 웹 전용 — 주문 요약 머리(무지개 고리 장바구니 · MY ORDER · 담은 상품 수) */}
                    <div className="hidden co-sum-head" aria-hidden="true">
                        <span className="co-sum-ring"><span><Image src="/images/ui/header-cart-128.webp" alt="" width={48} height={48} /></span></span>
                        <div>
                            <p className="co-sum-kicker">MY ORDER</p>
                            <p className="co-sum-title">{locale === "en" ? <>Items <b>{lines.length}</b></> : <>담은 상품 <b>{lines.length}</b>개</>}</p>
                        </div>
                    </div>
                    <h2 className="text-lg font-black text-neutral-950">{t("orderedProducts")}</h2>
                    <div className="mt-4 grid gap-3">
                        {lines.map(({ product, qty, color, size, subtotal, image }) => (
                            <div key={`${product.id}-${color ?? ""}-${size ?? ""}`} className="co-line flex items-start justify-between gap-3 text-sm">
                                {/* 웹 전용 — 상품 사진 */}
                                <span className="hidden co-line-thumb" aria-hidden="true">
                                    {image ? <Image src={image} alt="" fill sizes="56px" className="object-cover" /> : <i className={`fa-solid ${product.icon}`} />}
                                </span>
                                <span className="co-line-name font-bold leading-5 text-neutral-700">
                                    {productName(product)}
                                    {color && <span className="text-neutral-400"> · {color}</span>}
                                    {size && <span className="text-neutral-400"> · {size}</span>} x {qty}
                                </span>
                                <b className="co-line-price shrink-0 text-neutral-950">{formatPrice(subtotal)}</b>
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
                    <div className="co-total mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
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
                        <div className="hidden" data-guest-web="paybox-wrap">
                            <GuestPayBox ready={guestFeature} guestMode={guestMode} loginHref={loginHref} signupHref={signupHref} />
                        </div>
                    )}
                    {!signedInForPayment && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3" role="alert" data-co-guest-legacy>
                            <p className="text-xs font-bold leading-5 text-amber-900">
                                {/* 로그인 전이라 서버 결제 모드를 아직 모름 — 두 모드 모두 맞는 보통 문구 */}
                                {locale === "en"
                                    ? "Sign in to open the Toss Payments window. Guest users can preview the order form only."
                                    : "토스페이먼츠 결제창은 로그인한 뒤 열립니다. 비회원은 주문서 화면만 미리 볼 수 있습니다."}
                            </p>
                            <Link href={loginHref} className="mt-2 inline-flex text-xs font-black text-indigo-700 underline">
                                {locale === "en" ? "Sign in" : "로그인하기"}
                            </Link>
                        </div>
                    )}
                    {paymentError && (
                        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-bold leading-5 text-red-800" role="alert">
                            {webScreen && paymentError === rawServerError ? (
                                // 웹 — 서버 원문 대신 쉬운 문장, 원문은 작은 흐린 줄로(문의할 때 쓰도록)
                                <>
                                    {locale === "en"
                                        ? "Something went wrong while opening the payment window. Please try again in a moment."
                                        : "결제창을 여는 중에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요."}
                                    <small className="co-error-raw">{paymentError}</small>
                                </>
                            ) : paymentError}
                        </p>
                    )}
                    <button
                        ref={payButtonRef}
                        type="submit"
                        className="co-pay btn btn-primary mt-5 w-full"
                        disabled={submitting || (!signedInForPayment && !guestCheckout) || (directEasyPay && !directTermsAccepted)}
                        data-payment-status={paymentMode ? `${paymentMode}_ready` : "ready"}
                    >
                        {submitting
                            ? (locale === "en" ? "Opening payment…" : "결제창 여는 중…")
                            : (locale === "en" ? PAYMENT_BUTTON_COPY[paymentMethod].en : PAYMENT_BUTTON_COPY[paymentMethod].ko)}
                    </button>
                    <p className="mt-2 text-center text-[10px] font-bold leading-4 text-neutral-500">
                        {webScreen
                            // 웹 — 쉬운 말(앱은 기존 문구)
                            ? (locale === "en" ? "We double-check your order amount and delivery details before the payment window opens." : "주문 금액과 배송 정보를 한 번 더 확인한 뒤 결제창이 열려요.")
                            : (locale === "en"
                                ? "The server verifies the order, amount, and encrypted delivery snapshot."
                                : "주문번호·금액·암호화 배송정보는 서버가 생성하고 검증합니다.")}
                    </p>
                </aside>
            </form>
            {prelaunchOpen && <PrelaunchNoticeModal onClose={closePrelaunch} />}
        </main>
    );
}
