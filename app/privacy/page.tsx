import type { Metadata } from "next";
import { BUSINESS_INFO, LEGAL_UPDATED_AT } from "@/lib/legal";

export const metadata: Metadata = {
    title: "개인정보처리방침 | 댕다방",
    description: "댕다방 개인정보 처리 기준",
};

const rows = [
    {
        category: "회원가입",
        items: "이메일, 이름, 암호화된 비밀번호",
        purpose: "회원 식별, 로그인, 계정 관리",
        retention: "회원 탈퇴 시까지. 단, 관계 법령에 따라 보존이 필요한 기록은 해당 기간 보관",
    },
    {
        category: "간편가입",
        items: "간편인증 제공자, 제공자 회원 식별값, 이메일, 이름 또는 닉네임",
        purpose: "네이버, 카카오, 구글 계정 기반 회원가입과 로그인",
        retention: "회원 탈퇴 또는 간편계정 연결 해제 시까지",
    },
    {
        category: "PetLens 개인화",
        items: "반려견 이름, 나이, 크기, 모질, 활동량, 관심 케어, 업로드한 반려견 사진, 분석 결과",
        purpose: "상품 추천, 챗봇 개인화, 착용 미리보기, 회원별 PetLens 프로필 저장",
        retention: "회원이 삭제하거나 탈퇴할 때까지",
    },
    {
        category: "주문/배송",
        items: "주문 상품, 수량, 결제 금액, 수령인, 배송지, 연락처, 결제수단",
        purpose: "주문 처리, 배송, 결제, 교환·환불, 고객 상담",
        retention: "계약·청약철회 및 대금결제·공급 기록 5년, 소비자 불만·분쟁처리 기록 3년",
    },
];

export default function PrivacyPage() {
    return (
        <main className="mx-auto max-w-[1040px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-indigo-700">Privacy</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">개인정보처리방침</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                시행일: {LEGAL_UPDATED_AT}.
            </p>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">1. 개인정보 처리자</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    {BUSINESS_INFO.companyName}은 회원 서비스와 쇼핑몰 운영을 위해 필요한 범위에서 개인정보를 처리합니다.
                    개인정보 관련 문의는 고객센터 {BUSINESS_INFO.customerServicePhone}으로 접수합니다.
                </p>
            </section>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">2. 수집 항목, 목적, 보유기간</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200 text-xs font-black text-neutral-500">
                                <th className="py-3 pr-4">구분</th>
                                <th className="py-3 pr-4">수집 항목</th>
                                <th className="py-3 pr-4">처리 목적</th>
                                <th className="py-3">보유기간</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.category} className="border-b border-neutral-100 align-top">
                                    <td className="py-4 pr-4 font-black text-neutral-950">{row.category}</td>
                                    <td className="py-4 pr-4 font-bold leading-6 text-neutral-600">{row.items}</td>
                                    <td className="py-4 pr-4 font-bold leading-6 text-neutral-600">{row.purpose}</td>
                                    <td className="py-4 font-bold leading-6 text-neutral-600">{row.retention}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">3. 동의 거부권과 불이익</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    이용자는 개인정보 수집·이용 동의를 거부할 수 있습니다. 다만 회원가입과 PetLens 개인화에 필요한 필수 항목에 동의하지 않으면 해당 기능 이용이 제한됩니다.
                </p>
            </section>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">4. 제3자 제공과 처리위탁</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 법령상 근거가 있거나 이용자가 별도로 동의한 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다. 결제, 배송, 호스팅, 알림 발송 등 처리위탁이 발생하면 수탁자와 업무 내용을 본 방침에 추가합니다.
                </p>
            </section>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">5. 파기와 안전성 확보</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    처리 목적이 달성되거나 보유기간이 지난 개인정보는 지체 없이 파기합니다. 관계 법령에 따라 보존해야 하는 기록은 별도 분리하여 보관하며, 접근권한 관리와 암호화 등 보호조치를 적용합니다.
                </p>
            </section>
        </main>
    );
}
