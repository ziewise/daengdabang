import { getCustomerToken } from "@/lib/customer-api";
import { ddbApiBase } from "@/lib/ddb-api-base";

export type RestockAlert = { id: number; productFolder: string; productName: string; color: string; size: string; active: boolean; notifiedAt: string | null; emailRequested: boolean; emailStatus: string };
export async function restockRequest<T>(path = "", options?: RequestInit): Promise<T> {
    const token = getCustomerToken();
    if (!token) throw new Error("로그인 후 재입고 알림을 신청해 주세요.");
    const response = await fetch(`${ddbApiBase()}/api/v1/restock-alerts${path}`, {
        ...options, cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(response.status === 401 ? "다시 로그인해 주세요." : typeof data?.detail === "string" ? data.detail : "재입고 알림을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    return response.status === 204 ? undefined as T : response.json();
}
