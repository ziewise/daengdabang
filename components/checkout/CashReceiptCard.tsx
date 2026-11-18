import LocalizedMenuLabel from "@/components/i18n/LocalizedMenuLabel";
import { safeCashReceiptUrl, type CashReceipt } from "@/lib/toss-cash-receipt";

const STATUS = { requested: "발급 요청됨", issued: "발급 완료", failed: "발급 확인 필요", cancelled: "전액 취소됨", partially_cancelled: "부분 취소 반영" };

export default function CashReceiptCard({ receipt }: { receipt?: CashReceipt | null }) {
    if (!receipt) return null;
    const url = safeCashReceiptUrl(receipt.receiptUrl);
    return <section className="mt-4 rounded-xl border border-pink-100 bg-pink-50 p-4 text-left" aria-label="현금영수증">
        <h3 className="font-bold"><LocalizedMenuLabel label={"현금영수증"} /></h3>
        <p className="mt-1 text-sm">{receipt.type} · {STATUS[receipt.status]} · {receipt.amount.toLocaleString("ko-KR")}<LocalizedMenuLabel label={"원"} /></p>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-white px-4 font-bold text-pink-800"><LocalizedMenuLabel label={"현금영수증 보기"} /></a>}
        {receipt.status === "requested" && <p className="mt-2 text-xs text-neutral-600"><LocalizedMenuLabel label={"국세청 처리 결과가 반영되기까지 시간이 걸릴 수 있어요."} /></p>}
    </section>;
}
