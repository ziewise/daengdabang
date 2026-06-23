import type { Metadata } from "next";
import Link from "next/link";
import {
    BUSINESS_INFO,
    ESCROW_INFO,
    FTC_BUSINESS_INFO_URL,
    FTC_BUSINESS_SEARCH_URL,
    LEGAL_DOCUMENTS,
    LEGAL_UPDATED_AT,
} from "@/lib/legal";

export const metadata: Metadata = {
    title: "법적고지 | 댕다방",
    description: "댕다방 전자상거래 법적 고지, 사업자 정보, 구매안전서비스 안내",
};

const toc = [
    ["business", "사업자 신원정보"],
    ["ftc", "공정위 사업자정보 직접 확인"],
    ["escrow", "구매안전서비스"],
    ["refund", "청약철회·교환·환불"],
    ["delivery", "배송 및 비용"],
    ["dispute", "분쟁해결 기준"],
    ["copyright", "법적 부인 및 저작권"],
    ["email", "이메일 무단 수집 금지"],
    ["documents", "증빙 문서"],
] as const;

const businessRows = [
    ["상호", BUSINESS_INFO.companyName],
    ["쇼핑몰명", BUSINESS_INFO.mallName],
    ["대표자", BUSINESS_INFO.representative],
    ["사업자등록번호", BUSINESS_INFO.businessNumber],
    ["법인등록번호", BUSINESS_INFO.corporateRegistrationNumber],
    ["통신판매업신고번호", BUSINESS_INFO.mailOrderNumber],
    ["사업장 소재지", BUSINESS_INFO.address],
    ["고객센터", `${BUSINESS_INFO.customerServicePhone} / ${BUSINESS_INFO.customerServiceEmail}`],
    ["개인정보 보호책임자", BUSINESS_INFO.privacyOfficer],
    ["호스팅서비스 제공자", BUSINESS_INFO.hostingProvider],
];

export default function LegalNoticePage() {
    return (
        <main className="mx-auto max-w-[1040px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-indigo-700">Legal Notice</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">법적고지</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                댕다방 이용자가 판매자 정보, 거래 조건, 증빙 문서, 권리 제한 사항을 한 곳에서 확인할 수 있도록
                전자상거래 관련 고지를 제공합니다. 최종 업데이트: {LEGAL_UPDATED_AT}.
            </p>

            <nav
                aria-label="법적고지 목차"
                className="mt-8 grid gap-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm font-bold text-neutral-600 md:grid-cols-3"
            >
                {toc.map(([id, label]) => (
                    <a key={id} href={`#${id}`} className="hover:text-indigo-700">
                        {label}
                    </a>
                ))}
            </nav>

            <section id="business" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">1. 사업자 신원정보</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                        <tbody>
                            {businessRows.map(([label, value]) => (
                                <tr key={label} className="border-b border-neutral-100 align-top">
                                    <th className="w-56 py-4 pr-4 font-black text-neutral-950">{label}</th>
                                    <td className="py-4 font-bold leading-6 text-neutral-600">{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section id="ftc" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">2. 공정위 사업자정보 직접 확인</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    통신판매업 신고 정보는 공정거래위원회 통신판매사업자 조회 페이지에서 사업자등록번호
                    {` ${BUSINESS_INFO.businessNumber}`}로 확인할 수 있습니다. 아래 링크는 댕다방 운영사 정보로
                    바로 이동하도록 연결했습니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
                    <a
                        href={FTC_BUSINESS_INFO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-700 hover:text-indigo-900"
                    >
                        공정위 사업자정보 직접 확인
                    </a>
                    <a
                        href={FTC_BUSINESS_SEARCH_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-neutral-950"
                    >
                        공정위 검색 결과로 확인
                    </a>
                    <Link href="/legal/business" className="text-neutral-600 hover:text-neutral-950">
                        댕다방 사업자정보 상세
                    </Link>
                </div>
            </section>

            <section id="escrow" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">3. 구매안전서비스</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 현금성 결제 이용자를 보호하기 위해 {ESCROW_INFO.provider}의 {ESCROW_INFO.serviceName}
                    서비스에 등록되어 있습니다. 구매안전서비스는 이용자의 결제대금이 정해진 확인 절차를 거쳐 판매자에게
                    지급되도록 하는 매매보호 방식입니다.
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

            <section id="refund" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">4. 청약철회·교환·환불</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    이용자는 관련 법령과 이용약관에 따라 상품을 공급받은 날부터 7일 이내 청약철회를 요청할 수 있습니다.
                    표시·광고 내용과 다르거나 계약 내용과 다르게 이행된 경우에는 공급받은 날부터 3개월 이내, 그 사실을
                    알았거나 알 수 있었던 날부터 30일 이내 청약철회를 요청할 수 있습니다.
                </p>
                <p className="mt-3 text-sm font-bold leading-7 text-neutral-600">
                    이용자의 책임 있는 사유로 상품이 훼손된 경우, 사용 또는 일부 소비로 상품 가치가 현저히 감소한 경우,
                    시간이 지나 재판매가 곤란할 정도로 가치가 감소한 경우, 복제가 가능한 상품의 포장이 훼손된 경우 등
                    법령상 제한 사유가 있으면 청약철회가 제한될 수 있습니다.
                </p>
            </section>

            <section id="delivery" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">5. 배송 및 비용</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    배송 방법, 배송비, 도서산간 추가비, 예상 배송기간은 상품 상세 또는 주문 단계에서 확인할 수 있도록
                    표시합니다. 단순 변심으로 인한 교환·반품 배송비는 이용자가 부담하며, 표시·광고 또는 계약 내용과
                    다르게 이행된 경우의 반품 비용은 댕다방이 부담합니다.
                </p>
            </section>

            <section id="dispute" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">6. 분쟁해결 기준</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 이용자의 불만과 피해구제 요청을 우선적으로 처리합니다. 즉시 처리가 어려운 경우 사유와
                    처리 일정을 안내하며, 전자상거래 분쟁이 발생한 경우 공정거래위원회 또는 관할 소비자분쟁조정기구의
                    조정 절차를 따를 수 있습니다.
                </p>
            </section>

            <section id="copyright" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">7. 법적 부인 및 저작권</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방 사이트의 구조, 화면, 문구, 이미지, 영상, 상품 큐레이션, 추천 로직, 소스코드, 로고와 브랜드
                    요소는 댕다방 또는 정당한 권리자의 지식재산권 보호를 받습니다. 개인적 이용 또는 정상적인 링크 공유를
                    제외하고 사전 동의 없이 복제, 배포, 전송, 수정, 2차적 저작물 작성, 영리적 이용을 할 수 없습니다.
                </p>
                <p className="mt-3 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 사이트의 정보가 정확하도록 관리하지만, 상품 정보는 제조사·공급사 사정, 재고, 가격, 법령,
                    시스템 상태에 따라 변경될 수 있습니다. 구매 결정 전 상품 상세, 주문 단계, 고지사항을 함께 확인해
                    주세요.
                </p>
            </section>

            <section id="email" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">8. 이메일 무단 수집 금지</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    본 사이트에 게시된 이메일 주소는 전자우편 수집 프로그램이나 그 밖의 기술적 장치를 이용하여 무단으로
                    수집할 수 없습니다. 이를 위반하여 수집·판매·유통하거나 광고성 정보를 발송하는 행위는 관련 법령에
                    따라 제한될 수 있습니다.
                </p>
            </section>

            <section id="documents" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">9. 증빙 문서</h2>
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
