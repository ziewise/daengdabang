"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    clearPendingTossTestPayment,
    isTossOrderId,
} from "@/lib/toss-test-payment";

type FailureDetail = { code: string; message: string; orderId: string };

export default function TossTestFailPage() {
    const [detail, setDetail] = useState<FailureDetail>({
        code: "PAYMENT_FAILED",
        message: "테스트 결제가 완료되지 않았습니다.",
        orderId: "",
    });

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const orderId = query.get("orderId") || "";
        if (isTossOrderId(orderId)) clearPendingTossTestPayment(orderId);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- redirect query parameters exist only after client hydration.
        setDetail({
            code: (query.get("code") || "PAYMENT_FAILED").slice(0, 80),
            message: (query.get("message") || "테스트 결제가 완료되지 않았습니다.").slice(0, 240),
            orderId: isTossOrderId(orderId) ? orderId : "",
        });
    }, []);

    return (
        <main className="mx-auto max-w-[680px] px-4 py-14 text-center" data-payment-status="test_failed">
            <i className="fa-solid fa-circle-xmark text-5xl text-red-600" />
            <h1 className="mt-4 text-3xl font-black text-neutral-950">테스트 결제가 완료되지 않았습니다.</h1>
            <div className="mx-auto mt-5 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-left">
                <p className="text-sm font-black text-red-900">{detail.message}</p>
                <p className="mt-2 break-all text-xs font-bold text-red-700">오류 코드: {detail.code}</p>
                {detail.orderId && <p className="mt-1 break-all text-xs font-bold text-red-700">주문번호: {detail.orderId}</p>}
            </div>
            <p className="mt-4 text-sm font-bold leading-6 text-neutral-600">
                실제 출금·배송은 발생하지 않았으며 장바구니 상품은 그대로 유지됩니다.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link href="/checkout" className="btn btn-primary">테스트 결제 다시 시도</Link>
                <Link href="/cart" className="btn btn-secondary">장바구니 확인</Link>
            </div>
        </main>
    );
}
