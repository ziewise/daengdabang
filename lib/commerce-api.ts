import { ddbApiBase } from "@/lib/ddb-api-base";
import { getCustomerToken } from "@/lib/customer-api";

export function commerceUrl(path: string) { return `${ddbApiBase().replace(/\/$/, "")}${path}`; }
export async function commerceApi<T>(path: string, options: RequestInit = {}, guestToken?: string): Promise<T> {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (guestToken) headers.set("X-Guest-Order-Token", guestToken);
    else { const token = getCustomerToken(); if (token) headers.set("Authorization", `Bearer ${token}`); }
    const response = await fetch(commerceUrl(path), { ...options, headers, cache: "no-store" });
    if (!response.ok) {
        const body = await response.json().catch(() => null);
        const detail = body?.detail;
        throw new Error(typeof detail === "string" && /[가-힣]/.test(detail) ? detail : response.status === 401 ? "로그인 또는 주문 조회를 다시 진행해 주세요." : "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    return response.status === 204 ? undefined as T : response.json();
}
export type Review = {
    id: string; product_id: string; order_line_id?: string; type: "text" | "photo"; rating: number; body: string;
    fit?: "small" | "good" | "big"; option: string; masked_name: string; created_at: string;
    media: { id: string; url: string; width: number; height: number }[];
    helpful_count: number; helpful_by_me: boolean; seller_reply?: { body: string }; reward_points: number;
    reward_disclosure?: string; status: string;
};
export type CommerceLine = { lineId: string; productId: string; name: string; color?: string; size?: string; qty: number;
    returnable: boolean; return?: { status: string; adminNote?: string }; review: { status: string; reviewId?: string; deadline?: string } };
export type CommerceOrder = { orderId: string; fulfillmentStatus: string; deliveredAt?: string; purchaseConfirmedAt?: string;
    purchaseConfirmable: boolean; cancelable: boolean; cancel?: { status: string }; lines: CommerceLine[] };
export const requestStatus: Record<string, string> = { requested: "신청 접수", approved: "승인", pickup: "수거 중", inspected: "검수 완료", rejected: "신청 반려", refunded: "환불 완료" };
