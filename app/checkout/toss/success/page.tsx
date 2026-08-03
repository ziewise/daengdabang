"use client";
/* eslint-disable react-hooks/set-state-in-effect -- this static callback page derives its state from redirect URL and hydrated cart state. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    confirmTossTestPayment,
    DdbApiError,
    getCustomerToken,
    type TossTestPaymentConfirmation,
} from "@/lib/customer-api";
import { isCheckoutPaymentMethod } from "@/lib/payment-methods";
import { haveSamePaidLineQuantities } from "@/lib/cart-payment-reconciliation";
import { useAuth, useCart } from "@/lib/store";
import { isTossConfirmationPendingError } from "@/lib/toss-confirmation-state";
import {
    clearPendingTossTestPayment,
    isTossOrderId,
    isTossPaymentKey,
    normalizeTossOrderLines,
    parseTossAmount,
} from "@/lib/toss-test-payment";

type ViewState =
    | { kind: "checking" }
    | { kind: "login_required"; loginHref: string }
    | { kind: "pending"; retryHref: string }
    | { kind: "invalid"; message: string }
    | { kind: "failed"; message: string; retryHref?: string }
    | { kind: "complete"; confirmation: TossTestPaymentConfirmation; orderId: string; amount: number };

export default function TossTestSuccessPage() {
    const { user } = useAuth();
    const cart = useCart();
    const startedRef = useRef(false);
    const [view, setView] = useState<ViewState>({ kind: "checking" });

    useEffect(() => {
        if (!cart.hydrated || startedRef.current) return;

        const query = new URLSearchParams(window.location.search);
        const paymentKey = query.get("paymentKey");
        const orderId = query.get("orderId");
        const amount = parseTossAmount(query.get("amount"));
        if (!isTossPaymentKey(paymentKey) || !isTossOrderId(orderId) || amount === null) {
            startedRef.current = true;
            setView({ kind: "invalid", message: "결제 결과 주소의 필수 값이 올바르지 않습니다." });
            return;
        }

        const callbackPath = `${window.location.pathname}${window.location.search}`;
        const accessToken = user?.apiAccessToken || getCustomerToken();
        if (!user || !accessToken) {
            startedRef.current = true;
            setView({
                kind: "login_required",
                loginHref: `/auth/login?redirect=${encodeURIComponent(callbackPath)}`,
            });
            return;
        }

        startedRef.current = true;
        confirmTossTestPayment({ paymentKey, orderId, amount }, accessToken)
            .then((confirmation) => {
                const paidLines = normalizeTossOrderLines(confirmation.lines);
                if (
                    confirmation.status !== "test_paid"
                    || confirmation.mode !== "test"
                    || confirmation.providerStatus !== "DONE"
                    || confirmation.orderId !== orderId
                    || confirmation.paymentKey !== paymentKey
                    || confirmation.totalAmount !== amount
                    || !isCheckoutPaymentMethod(confirmation.paymentMethod)
                    || paidLines === null
                ) {
                    throw new Error("Unexpected test confirmation response");
                }

                const alreadyReconciled = cart.state.orders.some((order) => (
                    order.id === confirmation.orderId
                    && order.status === "test_paid"
                    && order.total === confirmation.totalAmount
                    && order.paymentMethod === confirmation.paymentMethod
                    && haveSamePaidLineQuantities(order.lines, paidLines)
                ));
                if (!alreadyReconciled) cart.removePaidLines(paidLines);
                cart.addOrder({
                    id: confirmation.orderId,
                    createdAt: confirmation.approvedAt || new Date().toISOString(),
                    lines: paidLines,
                    total: confirmation.totalAmount,
                    receiver: "",
                    address: "테스트 결제 — 실제 배송 없음",
                    paymentMethod: confirmation.paymentMethod,
                    status: "test_paid",
                });
                clearPendingTossTestPayment(orderId);
                setView({ kind: "complete", confirmation, orderId, amount });
            })
            .catch((error: unknown) => {
                if (error instanceof DdbApiError && isTossConfirmationPendingError(error)) {
                    setView({ kind: "pending", retryHref: callbackPath });
                    return;
                }
                setView({
                    kind: "failed",
                    message: error instanceof DdbApiError
                        ? error.message
                        : "서버에서 테스트 결제를 확인하지 못했습니다. 장바구니는 변경하지 않았습니다.",
                    ...(error instanceof DdbApiError ? {} : { retryHref: callbackPath }),
                });
            });
    }, [cart, user]);

    if (view.kind === "checking") {
        return (
            <main className="mx-auto max-w-[680px] px-4 py-16 text-center" aria-live="polite">
                <i className="fa-solid fa-spinner fa-spin text-4xl text-indigo-600" />
                <h1 className="mt-4 text-2xl font-black text-neutral-950">테스트 결제 확인 중</h1>
                <p className="mt-2 text-sm font-bold text-neutral-600">서버가 주문번호와 금액을 다시 검증하고 있습니다.</p>
            </main>
        );
    }

    if (view.kind === "complete") {
        return (
            <main className="mx-auto max-w-[680px] px-4 py-14 text-center" data-payment-status="test_paid">
                <i className="fa-solid fa-circle-check text-5xl text-emerald-600" />
                <h1 className="mt-4 text-3xl font-black text-neutral-950">테스트 결제가 완료되었습니다.</h1>
                <p className="mt-2 text-sm font-bold text-neutral-600">주문번호 {view.orderId}</p>
                <div className="mx-auto mt-5 max-w-md rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-4 text-left">
                    <p className="text-sm font-black text-sky-950">테스트 승인 · {view.amount.toLocaleString("ko-KR")}원</p>
                    <p className="mt-1 text-xs font-bold text-sky-800">Toss 상태: {view.confirmation.providerStatus}</p>
                    <p className="mt-2 text-xs font-bold leading-5 text-sky-800">
                        실제 출금·배송·구매 분석·코인 및 적립금 지급은 발생하지 않습니다.
                    </p>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Link href="/mypage" className="btn btn-primary">테스트 주문 보기</Link>
                    <Link href="/products" className="btn btn-secondary">쇼핑 계속하기</Link>
                </div>
            </main>
        );
    }

    if (view.kind === "login_required") {
        return (
            <main className="mx-auto max-w-[680px] px-4 py-14 text-center">
                <i className="fa-solid fa-lock text-5xl text-amber-600" />
                <h1 className="mt-4 text-2xl font-black text-neutral-950">로그인이 필요합니다.</h1>
                <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                    API 세션이 없어 아직 서버 확인을 요청하지 않았습니다. 로그인하면 이 결제 결과로 돌아옵니다.
                </p>
                <Link href={view.loginHref} className="btn btn-primary mt-6">로그인 후 결제 확인</Link>
            </main>
        );
    }

    if (view.kind === "pending") {
        return (
            <main
                className="mx-auto max-w-[680px] px-4 py-14 text-center"
                data-payment-status="confirmation_pending"
                aria-live="polite"
            >
                <i className="fa-solid fa-clock-rotate-left text-5xl text-amber-600" />
                <h1 className="mt-4 text-2xl font-black text-neutral-950">결제 상태 확인 중</h1>
                <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                    결제사 응답이 아직 확정되지 않았습니다. 새 결제를 시작하지 말고 동일한 결제 결과를 다시 확인해 주세요.
                </p>
                <p className="mt-2 text-xs font-bold text-neutral-500">장바구니와 주문 정보는 변경하지 않았습니다.</p>
                <a href={view.retryHref} className="btn btn-primary mt-6">동일 결제 다시 확인</a>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[680px] px-4 py-14 text-center" data-payment-status={view.kind}>
            <i className="fa-solid fa-triangle-exclamation text-5xl text-red-600" />
            <h1 className="mt-4 text-2xl font-black text-neutral-950">
                {view.kind === "invalid" ? "결제 결과를 확인할 수 없습니다." : "테스트 결제 확인에 실패했습니다."}
            </h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{view.message}</p>
            <p className="mt-2 text-xs font-bold text-neutral-500">
                {view.kind === "failed" && view.retryHref
                    ? "새 결제를 시작하지 말고 동일한 결제 결과를 다시 확인해 주세요."
                    : "선택한 장바구니 상품은 삭제하지 않았습니다."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                {view.kind === "failed" && view.retryHref
                    ? <a href={view.retryHref} className="btn btn-primary">동일 결제 다시 확인</a>
                    : <Link href="/checkout" className="btn btn-primary">결제 다시 시도</Link>}
                <Link href="/cart" className="btn btn-secondary">장바구니 확인</Link>
            </div>
        </main>
    );
}
