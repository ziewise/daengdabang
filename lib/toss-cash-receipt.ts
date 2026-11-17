export type CashReceipt = {
    type: "소득공제" | "지출증빙";
    amount: number;
    status: "requested" | "issued" | "failed" | "cancelled" | "partially_cancelled";
    receiptUrl?: string | null;
};

export function safeCashReceiptUrl(value: unknown): string | undefined {
    if (typeof value !== "string") return;
    try {
        const url = new URL(value);
        if (url.protocol === "https:" && !url.username && !url.password && !url.port &&
            ["dashboard.tosspayments.com", "receipt.tosspayments.com", "pgweb.tosspayments.com", "pgweb.uplus.co.kr"].includes(url.hostname)) return url.toString();
    } catch { /* Invalid provider URLs are never opened. */ }
}
