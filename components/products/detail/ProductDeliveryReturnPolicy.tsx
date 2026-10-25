"use client";

/**
 * ProductDeliveryReturnPolicy — 상품 상세 배송 · 반품/교환 안내
 * 웹(2026-10-25 고도화): 띠 아래 "한눈에 보기" 네 칸(배송비 · 출고 · 택배사 · 반품/교환, 3D 그림)을 먼저 보여 주고,
 * 전체 안내는 "전체 안내 펼치기"로 열고 닫음. 네 칸 · 펼치기 단추는 기본 hidden 이라 앱은 지금처럼 전체 안내만 보임
 * (웹에서만 app/product-detail-web.css 가 보이게 · 접히게 함). 문구 수치는 lib/commerce-policy 의 같은 값.
 */
import { useState } from "react";
import DeliveryReturnPolicyDetails from "@/components/policy/DeliveryReturnPolicyDetails";
import { DELIVERY_POLICY, RETURN_POLICY } from "@/lib/commerce-policy";
import { useI18n } from "@/lib/i18n";

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const FACTS = [
    { art: "goods-pay-ready-256.webp", label: "배송비", value: won(DELIVERY_POLICY.baseFeeKrw), note: `${(DELIVERY_POLICY.freeThresholdKrw / 10_000).toLocaleString("ko-KR")}만원 이상 무료` },
    { art: "web-cs-orders-160.webp", label: "출고", value: "1~2영업일", note: "결제 확인 후 · 7일 안에 도착" },
    { art: "web-cs-step-inspect-256.webp", label: "택배사", value: "한진 · CJ대한통운", note: "제주 · 도서 지역 추가비 있음" },
    { art: "web-cs-return-160.webp", label: "반품 · 교환", value: "수령 후 7일", note: `반품 편도 ${won(RETURN_POLICY.oneWayFeeKrw)}` },
];

export default function ProductDeliveryReturnPolicy() {
    const { locale } = useI18n();

    if (locale === "en") {
        return (
            <section id="delivery-return-policy" className="mx-auto mt-10 max-w-3xl scroll-mt-32 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7">
                <h3 className="text-xl font-black text-neutral-950" data-pd-band="mint" data-pd-art="return" data-pd-kicker="DELIVERY · RETURN">Delivery and return policy</h3>
                <div className="mt-5 grid gap-6 text-sm font-bold leading-7 text-neutral-700">
                    <section>
                        <h4 className="font-black text-neutral-950">Delivery</h4>
                        <p className="mt-2">KRW 3,000; free for orders of KRW 30,000 or more. Jeju +KRW 3,000; other islands +KRW 5,000.</p>
                        <p>Ships in 1–2 business days via Hanjin Express or CJ Logistics and arrives within 7 days of payment.</p>
                    </section>
                    <section className="border-t border-neutral-200 pt-5">
                        <h4 className="font-black text-neutral-950">Return / exchange</h4>
                        <p className="mt-2">Contact the seller before returning an item. Change-of-mind requests are accepted within 7 days after receipt, subject to applicable law and return exclusions.</p>
                        <p>One-way return fee: KRW 3,000; KRW 6,000 if the original shipment was free. Exchange fee: KRW 6,000.</p>
                    </section>
                </div>
            </section>
        );
    }

    return <PolicyKo />;
}

function PolicyKo() {
    const [open, setOpen] = useState(false);
    return (
        <section id="delivery-return-policy" className="mx-auto mt-10 max-w-3xl scroll-mt-32 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7" data-policy-open={open ? "true" : "false"}>
            <h3 className="text-xl font-black text-neutral-950" data-pd-band="mint" data-pd-art="return" data-pd-kicker="DELIVERY · RETURN">배송 및 반품/교환 안내</h3>
            {/* 웹 전용 — 한눈에 보기 네 칸(앱은 hidden 그대로) */}
            <ul className="pd-policy-facts hidden" aria-label="배송 · 반품 한눈에 보기">
                {FACTS.map((fact) => (
                    <li key={fact.label}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/images/ui/${fact.art}`} alt="" width={52} height={52} loading="lazy" />
                        <span>{fact.label}</span>
                        <b>{fact.value}</b>
                        <small>{fact.note}</small>
                    </li>
                ))}
            </ul>
            <div className="pd-policy-full mt-5" id="delivery-return-policy-full">
                <DeliveryReturnPolicyDetails />
            </div>
            {/* 웹 전용 — 전체 안내 펼치기/접기 */}
            <button
                type="button"
                className="pd-policy-toggle hidden"
                aria-expanded={open}
                aria-controls="delivery-return-policy-full"
                onClick={() => setOpen((value) => !value)}
            >
                {open ? "전체 안내 접기" : "반품 · 교환 전체 안내 펼치기"}
                <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
            </button>
        </section>
    );
}
