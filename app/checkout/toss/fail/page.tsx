"use client";

/*
 * 토스 결제 실패(/checkout/toss/fail) — 주문 취소 요청 · 기다리던 결제 표시 지우기는 그대로.
 * 2026-10-25 웹은 새 겉모양(components/checkout/PaymentResultWeb 의 PaymentFailWeb), 앱은 아래 기존 화면.
 * 2026-10-26 앱 화면 main 에 data-pay-app-view — 웹에서 화면이 붙기 전 잠깐 비치지 않게 숨김(app/payment-web.css).
 * 2026-10-28 화면 문구는 테스트 · 실결제 모두 보통 "결제" 문구(사장님 결정 — 테스트 안내 없음).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { PaymentFailWeb } from "@/components/checkout/PaymentResultWeb";
import { useWebScreen } from "@/hooks/useWebScreen";
import { cancelTossTestOrder, getCustomerToken } from "@/lib/customer-api";
import {
    clearPendingTossTestPayment,
    isTossOrderId,
} from "@/lib/toss-test-payment";

type FailureDetail = { code: string; message: string; orderId: string };

export default function TossTestFailPage() {
    const [detail, setDetail] = useState<FailureDetail>({
        code: "PAYMENT_FAILED",
        message: "결제가 완료되지 않았습니다.",
        orderId: "",
    });
    const webScreen = useWebScreen();

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const orderId = query.get("orderId") || "";
        if (isTossOrderId(orderId)) {
            clearPendingTossTestPayment(orderId);
            void cancelTossTestOrder(orderId, getCustomerToken()).catch(() => {
                // Provider-submitted or already-finalized orders are intentionally not cancellable.
            });
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- redirect query parameters exist only after client hydration.
        setDetail({
            code: (query.get("code") || "PAYMENT_FAILED").slice(0, 80),
            message: (query.get("message") || "결제가 완료되지 않았습니다.").slice(0, 240),
            orderId: isTossOrderId(orderId) ? orderId : "",
        });
    }, []);

    if (webScreen) return <PaymentFailWeb code={detail.code} message={detail.message} orderId={detail.orderId} />;

    return (
        <main className="mx-auto max-w-[680px] px-4 py-14 text-center" data-payment-status="failed" data-pay-app-view>
            <i className="fa-solid fa-circle-xmark text-5xl text-red-600" />
            <h1 className="mt-4 text-3xl font-black text-neutral-950">결제가 완료되지 않았습니다.</h1>
            <div className="mx-auto mt-5 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-left">
                <p className="text-sm font-black text-red-900">{detail.message}</p>
                <p className="mt-2 break-all text-xs font-bold text-red-700">오류 코드: {detail.code}</p>
                {detail.orderId && <p className="mt-1 break-all text-xs font-bold text-red-700">주문번호: {detail.orderId}</p>}
            </div>
            <p className="mt-4 text-sm font-bold leading-6 text-neutral-600">
                결제가 승인되지 않아 출금되지 않았으며 장바구니 상품은 그대로 유지됩니다.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link href="/checkout" className="btn btn-primary">결제 다시 시도</Link>
                <Link href="/cart" className="btn btn-secondary">장바구니 확인</Link>
            </div>
        </main>
    );
}
