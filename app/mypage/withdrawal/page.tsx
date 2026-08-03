"use client";

import Link from "next/link";
import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import { memberAccountDisplay } from "@/lib/member-account-display";
import { useAuth } from "@/lib/store";

export default function MypageWithdrawalPage() {
    const { user } = useAuth();
    if (!user) return <MypageLoginGate redirect="/mypage/withdrawal/" />;

    return (
        <MypageSectionLayout
            eyebrow="MY 정보"
            title="회원 탈퇴"
            description="계정 삭제 요청 전 본인 확인과 보존 대상 정보 확인이 필요합니다."
        >
            <section className="surface overflow-hidden" aria-labelledby="withdrawal-heading">
                <div className="border-b border-red-100 bg-red-50/70 px-5 py-5 sm:px-6">
                    <h2 id="withdrawal-heading" className="text-xl font-black text-red-950">즉시 탈퇴 기능은 제공하지 않습니다.</h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-red-900">
                        타인의 계정 삭제와 주문 분쟁을 막기 위해 1:1 문의 접수 후 본인 확인 절차를 거쳐 처리합니다.
                    </p>
                </div>
                <div className="grid gap-5 p-5 sm:p-6">
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        <span className="text-xs font-black text-neutral-500">탈퇴 요청 계정</span>
                        <p className="mt-1 break-all text-sm font-black text-neutral-950">
                            {user.name} · {memberAccountDisplay(user.email, user.authProvider)}
                        </p>
                    </div>

                    <ol className="grid gap-3 text-sm font-bold leading-6 text-neutral-700 sm:grid-cols-3">
                        {[
                            ["1", "1:1 문의에서 회원 탈퇴 요청을 접수합니다."],
                            ["2", "계정 소유자 본인 확인과 처리 가능 상태를 확인합니다."],
                            ["3", "처리 결과와 별도 보존 대상 정보를 안내합니다."],
                        ].map(([step, text]) => (
                            <li key={step} className="rounded-xl border border-neutral-200 p-4">
                                <span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-neutral-900 text-xs font-black text-white" aria-hidden="true">{step}</span>
                                {text}
                            </li>
                        ))}
                    </ol>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
                        <i className="fa-solid fa-scale-balanced mr-2" aria-hidden="true" />
                        탈퇴 처리가 완료되어도 관계 법령상 보존 의무가 있는 결제·계약·분쟁 기록은 정해진 기간 동안 다른 정보와 분리해 보관한 뒤 파기합니다. 자세한 기준은 개인정보처리방침에서 확인해 주세요.
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link href="/inquiry?category=other#inquiry-form" className="btn btn-primary">
                            1:1 탈퇴 문의 접수
                        </Link>
                        <Link href="/privacy" className="btn btn-secondary">개인정보처리방침</Link>
                    </div>
                </div>
            </section>
        </MypageSectionLayout>
    );
}
