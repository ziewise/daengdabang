import type { Metadata } from "next";
import { BUSINESS_INFO, LEGAL_UPDATED_AT } from "@/lib/legal";

export const metadata: Metadata = {
    title: "사업자 정보 확인 | 댕다방",
    description: "댕다방 사업자등록 및 통신판매업 신고 정보",
};

const rows = [
    ["상호", BUSINESS_INFO.companyName],
    ["쇼핑몰명", BUSINESS_INFO.mallName],
    ["대표자", BUSINESS_INFO.representative],
    ["사업자등록번호", BUSINESS_INFO.businessNumber],
    ["법인등록번호", BUSINESS_INFO.corporateRegistrationNumber],
    ["개업연월일", BUSINESS_INFO.openedAt],
    ["사업장 소재지", BUSINESS_INFO.address],
    ["본점 소재지", BUSINESS_INFO.address],
    ["사업의 종류", `${BUSINESS_INFO.businessType} / ${BUSINESS_INFO.businessItem}`],
    ["통신판매업신고번호", BUSINESS_INFO.mailOrderNumber],
    ["통신판매업 신고일", BUSINESS_INFO.mailOrderReportedAt],
    ["고객센터", `${BUSINESS_INFO.customerServicePhone} / ${BUSINESS_INFO.customerServiceEmail}`],
    ["개인정보 관리책임자", BUSINESS_INFO.privacyOfficer],
    ["호스팅서비스 제공자", BUSINESS_INFO.hostingProvider],
];

export default function BusinessInfoPage() {
    return (
        <main className="mx-auto max-w-[1040px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-indigo-700">Business Information</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">사업자 정보 확인</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                최종 업데이트: {LEGAL_UPDATED_AT}. 아래 정보는 댕다방 전자상거래 운영을 위해 공개하는 사업자 및 통신판매업 신고 정보입니다.
            </p>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">사업자 등록 및 신고 정보</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                        <tbody>
                            {rows.map(([label, value]) => (
                                <tr key={label} className="border-b border-neutral-100 align-top">
                                    <th className="w-56 py-4 pr-4 font-black text-neutral-950">{label}</th>
                                    <td className="py-4 font-bold leading-6 text-neutral-600">{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">공식 확인 경로</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    통신판매업 신고 정보는 공정거래위원회 사업자정보 공개 페이지에서 상호, 대표자, 사업자등록번호, 통신판매업 신고번호 등으로 확인할 수 있습니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
                    <a
                        href="https://www.ftc.go.kr/www/selectBizCommList.do?key=254"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-700 hover:text-indigo-900"
                    >
                        공정거래위원회 사업자정보 공개
                    </a>
                    <a
                        href="/docs/legal/business-registration.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-neutral-950"
                    >
                        사업자등록증 PDF
                    </a>
                    <a
                        href="/docs/legal/mail-order-registration.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-neutral-950"
                    >
                        통신판매업신고증 PDF
                    </a>
                </div>
            </section>
        </main>
    );
}
