import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS_INFO, ESCROW_INFO, LEGAL_DOCUMENTS, LEGAL_UPDATED_AT } from "@/lib/legal";

export const metadata: Metadata = {
    title: "법적고지 | 댕다방",
    description: "댕다방 전자상거래 법적 고지, 사업자 정보, 구매안전서비스 안내",
};

const businessRows = [
    ["상호", BUSINESS_INFO.companyName],
    ["대표자", BUSINESS_INFO.representative],
    ["사업자등록번호", BUSINESS_INFO.businessNumber],
    ["통신판매업신고번호", BUSINESS_INFO.mailOrderNumber],
    ["사업장 소재지", BUSINESS_INFO.address],
    ["고객센터", `${BUSINESS_INFO.customerServicePhone} / ${BUSINESS_INFO.customerServiceEmail}`],
    ["개인정보 관리책임자", BUSINESS_INFO.privacyOfficer],
    ["호스팅서비스 제공자", BUSINESS_INFO.hostingProvider],
];

export default function LegalNoticePage() {
    return (
        <main className="mx-auto max-w-[1040px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-indigo-700">Legal Notice</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">법적고지</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                최종 업데이트: {LEGAL_UPDATED_AT}. 댕다방은 전자상거래 이용자가 판매자와 거래 조건을 쉽게 확인할 수 있도록 주요 정보를 공개합니다.
            </p>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">1. 사업자 정보</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                        <tbody>
                            {businessRows.map(([label, value]) => (
                                <tr key={label} className="border-b border-neutral-100 align-top">
                                    <th className="w-52 py-4 pr-4 font-black text-neutral-950">{label}</th>
                                    <td className="py-4 font-bold leading-6 text-neutral-600">{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
                    <Link href="/legal/business" className="text-indigo-700 hover:text-indigo-900">
                        사업자 정보 상세 보기
                    </Link>
                    <a
                        href="https://www.ftc.go.kr/www/selectBizCommList.do?key=254"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-neutral-950"
                    >
                        공정거래위원회 사업자정보 공개
                    </a>
                </div>
            </section>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">2. 구매안전서비스</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 현금성 결제 이용자를 보호하기 위해 {ESCROW_INFO.provider}의 {ESCROW_INFO.serviceName} 서비스에 등록되어 있습니다.
                    구매안전서비스는 구매자의 승인 절차를 거쳐 판매자에게 대금이 이체되도록 돕는 매매보호 방식입니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
                    <Link href="/legal/escrow" className="text-indigo-700 hover:text-indigo-900">
                        구매안전서비스 상세 보기
                    </Link>
                    <a
                        href="/docs/legal/purchase-safety-confirmation.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-neutral-950"
                    >
                        이용확인증 PDF
                    </a>
                </div>
            </section>

            <section id="refund" className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">3. 환불·반품 정책</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    이용자는 관련 법령과 이용약관에 따라 상품을 공급받은 날부터 7일 이내 청약철회를 요청할 수 있습니다.
                    단, 이용자에게 책임 있는 사유로 상품이 훼손되었거나 사용 또는 일부 소비로 상품 가치가 현저히 감소한 경우 등에는 교환·반품이 제한될 수 있습니다.
                    표시·광고 내용과 다르거나 계약 내용과 다르게 이행된 경우에는 상품을 공급받은 날부터 3개월 이내, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회를 요청할 수 있습니다.
                </p>
            </section>

            <section id="dispute" className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">4. 분쟁해결 기준</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 이용자의 불만사항과 의견을 우선 처리하며, 신속한 처리가 어려운 경우 사유와 처리 일정을 안내합니다.
                    전자상거래 분쟁이 발생한 경우 당사자는 원만한 해결을 위해 협의하고, 필요한 경우 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정 절차를 따를 수 있습니다.
                </p>
            </section>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">5. 증빙 문서</h2>
                <div className="mt-3 grid gap-2 text-sm font-bold text-neutral-600">
                    {LEGAL_DOCUMENTS.map((document) => (
                        <a
                            key={document.href}
                            href={document.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-neutral-950"
                        >
                            {document.label}
                        </a>
                    ))}
                </div>
            </section>
        </main>
    );
}
