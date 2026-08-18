/**
 * app/return/page.tsx — 교환·반품 안내
 * ---------------------------------------------------------------------
 * 고객센터 > 교환·반품 안내. 전자상거래법 기준 교환/반품 정책 안내.
 * 레이아웃은 약관(app/terms) 페이지와 동일한 sections 패턴.
 */
import type { Metadata } from "next";
import Link from "next/link";
import DeliveryReturnPolicyDetails from "@/components/policy/DeliveryReturnPolicyDetails";

export const metadata: Metadata = {
    title: "교환·반품 안내 | 댕다방",
    description: "댕다방 교환·반품 정책 안내",
};

export default function ReturnPage() {
    return (
        <main className="mx-auto max-w-[960px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-aurora-indigo">RETURN &amp; EXCHANGE</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">교환·반품 안내</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-500">
                안심하고 쇼핑하실 수 있도록 교환·반품 기준을 안내드립니다. 아래 버튼에서 바로 신청할 수 있습니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
                <Link
                    href="/inquiry?category=exchange#inquiry-form"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-aurora-indigo/20 bg-white/85 px-4 py-2 text-sm font-extrabold text-aurora-indigo shadow-sm transition hover:-translate-y-0.5 hover:border-aurora-indigo/40 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo"
                >
                    <i className="fa-solid fa-envelope" aria-hidden="true" /> 교환·반품 접수하기 <i className="fa-solid fa-chevron-right text-[9px]" aria-hidden="true" />
                </Link>
                <Link
                    href="/faq"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-4 py-2 text-sm font-extrabold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo"
                >
                    <i className="fa-solid fa-circle-question" aria-hidden="true" /> 자주 묻는 질문
                </Link>
            </div>

            <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7">
                <DeliveryReturnPolicyDetails />
                <section className="mt-7 border-t border-neutral-200 pt-5">
                    <h2 className="text-base font-black text-neutral-950">환불 처리</h2>
                    <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                        반품 상품 회수와 검수가 완료되면 영업일 기준 3일 이내에 환불을 진행합니다.
                        결제 수단에 따라 카드 승인 취소 또는 계좌 환불 등의 처리 방식과 소요 시간이 다를 수 있습니다.
                    </p>
                </section>
            </div>
        </main>
    );
}
