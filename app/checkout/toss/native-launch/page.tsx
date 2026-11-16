"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { tossCardOptions, tossSdkPaymentMethod } from "@/lib/payment-methods";
import {
    nativePaymentCallbackUrl, nativePaymentReturnLink, parseNativePaymentRequest,
    type NativePaymentRequest,
} from "@/lib/toss-native-payment";

export default function NativePaymentLaunchPage() {
    const initialized = useRef(false);
    const [request, setRequest] = useState<NativePaymentRequest | null | undefined>(undefined);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        const parsed = parseNativePaymentRequest(window.location.hash);
        window.history.replaceState(null, "", window.location.pathname);
        setRequest(parsed);
    }, []);

    const returnLink = request ? nativePaymentReturnLink(new URLSearchParams({
        result: "fail", orderId: request.orderId, code: "PAY_PROCESS_CANCELED", message: "결제를 취소했습니다.",
    }).toString()) : "daengdabang://checkout/";

    const pay = async () => {
        if (!request || busy) return;
        setBusy(true);
        setError("");
        try {
            const payment = (await loadTossPayments(request.clientKey)).payment({ customerKey: request.customerKey });
            const common = {
                orderId: request.orderId, orderName: request.orderName,
                amount: { currency: "KRW" as const, value: request.amount },
                successUrl: nativePaymentCallbackUrl("success"), failUrl: nativePaymentCallbackUrl("fail"),
                windowTarget: "self" as const,
            };
            const method = tossSdkPaymentMethod(request.paymentMethod);
            if (method === "TRANSFER") await payment.requestPayment({ ...common, method, transfer: { useEscrow: false } });
            else if (method === "MOBILE_PHONE") await payment.requestPayment({ ...common, method });
            else await payment.requestPayment({ ...common, method: "CARD", card: tossCardOptions(request.paymentMethod) });
        } catch {
            setError("결제창을 열지 못했어요. 다시 시도하거나 앱으로 돌아가 주세요.");
            setBusy(false);
        }
    };

    return <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-black">결제를 이어갈게요</h1>
        {request && <>
            <p className="mt-5 font-bold">{request.orderName}</p>
            <p className="mt-2 text-2xl font-black">{request.amount.toLocaleString("ko-KR")}원</p>
            <p className="mt-4 text-sm leading-6 text-neutral-600">인증을 마치면 댕다방 앱에서 주문 결과를 확인할 수 있어요.</p>
            <button type="button" onClick={() => void pay()} disabled={busy} className="btn btn-primary mt-7 w-full">
                {busy ? "결제창 여는 중…" : "보안 결제창 열기"}
            </button>
        </>}
        {(error || request === null) && <p role="alert" className="mt-5 text-sm text-red-700">
            {error || "결제 정보를 불러오지 못했어요. 앱의 주문서에서 결제창을 다시 열어 주세요."}
        </p>}
        <a href={returnLink || "daengdabang://checkout/"} className="btn btn-secondary mt-4">앱으로 돌아가기</a>
    </main>;
}
