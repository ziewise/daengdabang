import { DELIVERY_POLICY, RETURN_EXCLUSION_REASONS, RETURN_POLICY } from "@/lib/commerce-policy";
import type { ReactNode } from "react";

function won(value: number) {
    return `${value.toLocaleString("ko-KR")}원`;
}

export default function DeliveryReturnPolicyDetails({ includeDelivery = true }: { includeDelivery?: boolean }) {
    return (
        <div className="grid gap-7 text-sm font-bold leading-7 text-neutral-700">
            {includeDelivery && (
                <PolicySection title="배송 안내">
                    <PolicyRows rows={[
                        ["배송비", `${won(DELIVERY_POLICY.baseFeeKrw)} (${won(DELIVERY_POLICY.freeThresholdKrw)} 이상 무료배송)`],
                        ["지역 추가비", `제주도 ${won(DELIVERY_POLICY.jejuSurchargeKrw)} 추가 · 그 외 도서지역 ${won(DELIVERY_POLICY.islandSurchargeKrw)} 추가`],
                        ["배송/출고", `${DELIVERY_POLICY.dispatch} · ${DELIVERY_POLICY.arrival}`],
                        ["택배사", DELIVERY_POLICY.carriers],
                    ]} />
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-neutral-600">
                        <li>주문 폭주 및 공급 사정으로 지연 또는 품절이 발생할 수 있습니다.</li>
                        <li>기본 배송기간 이상 소요되는 상품이거나 품절 상품은 개별 연락을 드립니다.</li>
                    </ul>
                </PolicySection>
            )}

            <PolicySection title="댕다방 반품/교환 안내">
                <p>반품/교환에 관한 일반적인 사항은 판매자 제시사항보다 관계법령이 우선합니다.</p>
                <PolicyRows rows={[
                    ["판매자 지정 택배사", RETURN_POLICY.designatedCarrier],
                    ["반품배송비", `편도 ${won(RETURN_POLICY.oneWayFeeKrw)} (최초 배송비 무료인 경우 ${won(RETURN_POLICY.freeInitialShippingReturnFeeKrw)} 부과)`],
                    ["교환배송비", won(RETURN_POLICY.exchangeFeeKrw)],
                    ["보내실 곳", RETURN_POLICY.address],
                ]} />
            </PolicySection>

            <PolicySection title="반품/교환 사유에 따른 요청 가능 기간">
                <p>
                    반품 시 먼저 판매자와 연락하여 반품사유, 택배사, 배송비, 반품지 주소 등을 협의하신 후
                    반품상품을 발송해 주시기 바랍니다.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">
                    <li>구매자 단순 변심은 상품 수령 후 7일 이내(구매자 반품배송비 부담)</li>
                    <li>
                        표시/광고와 상이하거나 계약 내용과 다르게 이행된 경우 상품 수령 후 3개월 이내 또는
                        표시/광고와 다른 사실을 안 날부터 30일 이내(판매자 반품배송비 부담). 둘 중 하나가
                        경과하면 반품/교환이 불가합니다.
                    </li>
                </ul>
            </PolicySection>

            <PolicySection title="반품/교환 불가능 사유">
                <p className="mb-2">아래와 같은 경우 반품/교환이 불가능합니다.</p>
                <ol className="list-decimal space-y-2 pl-5 text-neutral-600">
                    {RETURN_EXCLUSION_REASONS.map((reason) => <li key={reason}>{reason}</li>)}
                </ol>
            </PolicySection>
        </div>
    );
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="border-t border-neutral-200 pt-5 first:border-t-0 first:pt-0">
            <h3 className="text-base font-black text-neutral-950">{title}</h3>
            <div className="mt-2">{children}</div>
        </section>
    );
}

function PolicyRows({ rows }: { rows: Array<[string, string]> }) {
    return (
        <dl className="mt-3 grid gap-2">
            {rows.map(([label, value]) => (
                <div key={label} className="grid gap-1 sm:grid-cols-[150px_1fr]">
                    <dt className="font-black text-neutral-950">{label}</dt>
                    <dd className="text-neutral-600">{value}</dd>
                </div>
            ))}
        </dl>
    );
}
