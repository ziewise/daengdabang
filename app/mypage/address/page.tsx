"use client";

import Link from "next/link";
import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import { useAuth } from "@/lib/store";

export default function MypageAddressPage() {
    const { user } = useAuth();
    if (!user) return <MypageLoginGate redirect="/mypage/address/" />;

    return (
        <MypageSectionLayout
            eyebrow="MY 정보"
            title="배송지 관리"
            description="배송정보가 저장되고 확인되는 기준을 안내합니다."
        >
            <section className="surface p-5 sm:p-7" aria-labelledby="address-policy-heading">
                <div className="grid gap-5 sm:grid-cols-[72px_1fr] sm:items-start">
                    <span className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-sky-50 text-2xl text-sky-700" aria-hidden="true">
                        <i className="fa-solid fa-location-dot" />
                    </span>
                    <div>
                        <h2 id="address-policy-heading" className="text-xl font-black text-neutral-950">별도 배송지 목록은 아직 제공하지 않습니다.</h2>
                        <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                            배송지는 주문서에서 주문별로 입력하며, 서버에서 해당 주문의 배송 스냅샷으로 보호·보관하는 방식을 사용합니다.
                        </p>
                        <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                            저장된 주소가 있는 것처럼 가짜 목록이나 추가·수정 버튼을 표시하지 않습니다. 주문에 연결된 배송정보는 본인 확인 후 주문 내역에서 확인할 수 있습니다.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link href="/mypage/orders" className="btn btn-primary">주문별 배송정보 보기</Link>
                            <Link href="/checkout" className="btn btn-secondary">주문서로 이동</Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="surface mt-4 p-5 sm:p-6" aria-labelledby="address-security-heading">
                <h2 id="address-security-heading" className="text-lg font-black text-neutral-950">배송정보 보호 원칙</h2>
                <ul className="mt-4 grid gap-3 text-sm font-bold leading-6 text-neutral-600">
                    <li className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        <i className="fa-solid fa-lock mt-1 text-indigo-600" aria-hidden="true" />
                        <span>주문별 배송정보는 인증된 서버 주문에 저장하며 브라우저 주문 저장소에는 남기지 않습니다.</span>
                    </li>
                    <li className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        <i className="fa-solid fa-eye-slash mt-1 text-indigo-600" aria-hidden="true" />
                        <span>목록에서는 연락처와 주소를 마스킹하고, 공동현관 비밀번호 같은 민감정보 입력을 권장하지 않습니다.</span>
                    </li>
                    <li className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
                        <i className="fa-solid fa-flask mt-1 text-sky-700" aria-hidden="true" />
                        <span>테스트 결제의 배송정보는 확인용이며 실제 출고나 배송으로 이어지지 않습니다.</span>
                    </li>
                </ul>
            </section>
        </MypageSectionLayout>
    );
}
