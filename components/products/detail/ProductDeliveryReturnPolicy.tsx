"use client";

import DeliveryReturnPolicyDetails from "@/components/policy/DeliveryReturnPolicyDetails";
import { useI18n } from "@/lib/i18n";

export default function ProductDeliveryReturnPolicy() {
    const { locale } = useI18n();

    if (locale === "en") {
        return (
            <section id="delivery-return-policy" className="mx-auto mt-10 max-w-3xl scroll-mt-32 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7">
                <h3 className="text-xl font-black text-neutral-950">Delivery and return policy</h3>
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

    return (
        <section id="delivery-return-policy" className="mx-auto mt-10 max-w-3xl scroll-mt-32 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7">
            <h3 className="text-xl font-black text-neutral-950">배송 및 반품/교환 안내</h3>
            <div className="mt-5">
                <DeliveryReturnPolicyDetails />
            </div>
        </section>
    );
}
