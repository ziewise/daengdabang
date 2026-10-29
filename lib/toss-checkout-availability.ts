/**
 * toss-checkout-availability.ts — 정식 오픈 전 잠금 확인(2026-10-28)
 * GET /api/v1/payments/toss/availability(로그인 선택) — 이 계정에 결제창이 열려 있는가.
 * 응답 읽기 규칙은 lib/toss-payment-mode 의 parseTossCheckoutAvailability. 옛 서버라 주소가 없거나(404) 실패 · 모양이 다르면
 * "unknown" → 주문서는 그대로 진행하고 주문 만들기에서 서버가 403 PAYMENT_PRELAUNCH_LOCKED 로 다시 막음(서버가 진짜 관문).
 * customer-api 의 테스트 격리(정해 둔 런타임 import 만 허용)를 깨지 않도록 따로 둔 파일.
 */
import { ddbApiBase } from "@/lib/ddb-api-base";
import { parseTossCheckoutAvailability, type TossCheckoutAvailability } from "@/lib/toss-payment-mode";

export async function loadTossCheckoutAvailability(token?: string | null): Promise<TossCheckoutAvailability> {
    const base = ddbApiBase().replace(/\/$/, "");
    if (!base) return "unknown";
    try {
        const response = await fetch(`${base}/api/v1/payments/toss/availability`, {
            method: "GET",
            cache: "no-store",
            headers: {
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        if (!response.ok) return parseTossCheckoutAvailability(response.status, null);
        return parseTossCheckoutAvailability(response.status, await response.json().catch(() => null));
    } catch {
        return "unknown";
    }
}
