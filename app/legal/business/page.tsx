import type { Metadata } from "next";
import {
    BUSINESS_INFO,
    FTC_BUSINESS_INFO_URL,
    FTC_BUSINESS_SEARCH_URL,
    LEGAL_UPDATED_AT,
} from "@/lib/legal";

export const metadata: Metadata = {
    title: "사업자 정보 확인 | 댕다방",
    description: "댕다방 사업자등록 및 통신판매업 신고 정보",
};

const toc = [
    ["summary", "사업자 등록 및 신고 정보"],
    ["display", "사이트 표시 정보"],
    ["official", "공정위 공식 확인 경로"],
    ["documents", "증빙 문서"],
] as const;

const rows = [
    ["상호", BUSINESS_INFO.companyName],
    ["쇼핑몰명", BUSINESS_INFO.mallName],
    ["대표자", BUSINESS_INFO.representative],
    ["사업자등록번호", BUSINESS_INFO.businessNumber],
    ["법인등록번호", BUSINESS_INFO.corporateRegistrationNumber],
    ["개업연월일", BUSINESS_INFO.openedAt],
    ["사업자등록증 발급일", BUSINESS_INFO.businessCertificateIssuedAt],
    ["사업장 소재지", BUSINESS_INFO.address],
    ["본점 소재지", BUSINESS_INFO.address],
    ["사업의 종류", `${BUSINESS_INFO.businessType} / ${BUSINESS_INFO.businessItem}`],
    ["통신판매업신고번호", BUSINESS_INFO.mailOrderNumber],
    ["통신판매업 신고일", BUSINESS_INFO.mailOrderReportedAt],
    ["운영상태", "통신판매업신고"],
];

const displayRows = [
    ["고객센터", `${BUSINESS_INFO.customerServicePhone} / ${BUSINESS_INFO.customerServiceEmail}`],
    ["개인정보 보호책임자", BUSINESS_INFO.privacyOfficer],
    ["호스팅서비스 제공자", BUSINESS_INFO.hostingProvider],
    ["도메인", BUSINESS_INFO.domain],
    ["입점·제휴 문의", BUSINESS_INFO.partnerEmail],
];

function InfoTable({ rows }: { rows: string[][] }) {
    return (
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
    );
}

export default function BusinessInfoPage() {
    return (
        <main className="mx-auto max-w-[1040px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-indigo-700">Business Information</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">사업자 정보 확인</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                댕다방 운영사 {BUSINESS_INFO.companyName}의 사업자등록, 통신판매업 신고, 공정위 공개 확인 경로를
                안내합니다. 최종 업데이트: {LEGAL_UPDATED_AT}.
            </p>

            <nav
                aria-label="사업자 정보 목차"
                className="mt-8 grid gap-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm font-bold text-neutral-600 md:grid-cols-2"
            >
                {toc.map(([id, label]) => (
                    <a key={id} href={`#${id}`} className="hover:text-indigo-700">
                        {label}
                    </a>
                ))}
            </nav>

            <section id="summary" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">1. 사업자 등록 및 신고 정보</h2>
                <InfoTable rows={rows} />
            </section>

            <section id="display" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">2. 사이트 표시 정보</h2>
                <InfoTable rows={displayRows} />
            </section>

            <section id="official" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">3. 공정위 공식 확인 경로</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    공정거래위원회 통신판매사업자 조회에서 사업자등록번호 {BUSINESS_INFO.businessNumber} 또는 상호
                    {` ${BUSINESS_INFO.companyName}`}로 검색하면 신고 정보를 확인할 수 있습니다. 아래 첫 번째 링크는
                    공정위의 댕다방 운영사 상세 조회 결과로 직접 연결됩니다.
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
                        공정위 사업자번호 검색 결과
                    </a>
                </div>
            </section>

            <section id="documents" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">4. 증빙 문서</h2>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
                    <a
                        href="/docs/legal/business-registration.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-700 hover:text-indigo-900"
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
