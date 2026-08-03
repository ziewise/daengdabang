"use client";

import Link from "next/link";
import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import { useAuth } from "@/lib/store";

export default function MypagePaymentsPage() {
    const { user } = useAuth();
    if (!user) return <MypageLoginGate redirect="/mypage/payments/" />;

    return (
        <MypageSectionLayout
            eyebrow="MY 정보"
            title="결제수단 관리"
            description="결제수단 저장 여부와 결제 단계의 이용 방법을 안내합니다."
        >
            <section className="surface p-5 sm:p-7" aria-labelledby="payment-storage-heading">
                <div className="grid gap-5 sm:grid-cols-[72px_1fr] sm:items-start">
                    <span className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-700" aria-hidden="true">
                        <i className="fa-solid fa-credit-card" />
                    </span>
                    <div>
                        <h2 id="payment-storage-heading" className="text-xl font-black text-neutral-950">저장된 결제수단이 없습니다.</h2>
                        <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                            댕다방은 카드번호와 CVC를 회원 계정에 저장하지 않습니다. 결제할 때 Toss Payments 창에서 그 주문에 사용할 수단을 선택합니다.
                        </p>
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-900">
                            <i className="fa-solid fa-shield-halved mr-2" aria-hidden="true" />
                            카드 등록·삭제 기능이 있는 것처럼 표시하지 않으며, 결제정보 입력은 결제사의 보안 화면에서 진행됩니다.
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link href="/cart" className="btn btn-primary">장바구니에서 결제하기</Link>
                            <Link href="/mypage/orders" className="btn btn-secondary">주문 내역 확인</Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="surface mt-4 p-5 sm:p-6" aria-labelledby="payment-flow-heading">
                <h2 id="payment-flow-heading" className="text-lg font-black text-neutral-950">결제수단은 언제 선택하나요?</h2>
                <ol className="mt-4 grid gap-3 text-sm font-bold leading-6 text-neutral-600 sm:grid-cols-3">
                    {[
                        ["1", "장바구니에서 결제할 상품을 선택합니다."],
                        ["2", "주문서에서 이용 가능한 결제수단을 고릅니다."],
                        ["3", "Toss Payments 보안창에서 결제를 진행합니다."],
                    ].map(([step, text]) => (
                        <li key={step} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                            <span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-xs font-black text-white" aria-hidden="true">{step}</span>
                            {text}
                        </li>
                    ))}
                </ol>
            </section>
        </MypageSectionLayout>
    );
}
