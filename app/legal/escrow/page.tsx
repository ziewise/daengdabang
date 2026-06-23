import type { Metadata } from "next";
import { BUSINESS_INFO, ESCROW_INFO, LEGAL_UPDATED_AT } from "@/lib/legal";

export const metadata: Metadata = {
    title: "구매안전서비스 | 댕다방",
    description: "댕다방 KB에스크로 이체 구매안전서비스 안내",
};

const toc = [
    ["summary", "구매안전서비스 안내"],
    ["details", "KB에스크로 등록 정보"],
    ["how-to-check", "이용 확인 방법"],
    ["documents", "증빙 문서"],
] as const;

const rows = [
    ["서비스 제공자", ESCROW_INFO.provider],
    ["서비스명", ESCROW_INFO.serviceName],
    ["판매자 등록일", ESCROW_INFO.sellerRegisteredAt],
    ["업체명", BUSINESS_INFO.companyName],
    ["인터넷 쇼핑몰 명칭", BUSINESS_INFO.mallName],
    ["쇼핑몰 홈페이지", ESCROW_INFO.mallUrl],
    ["판매자 예금주명", ESCROW_INFO.sellerName],
    ["서비스 이용기간", "등록 유지 시까지"],
    ["서비스 제공조건", "KB에스크로 이체 판매자 인증마크 등록"],
    ["서비스 등록번호", ESCROW_INFO.serviceRegistrationNumber],
    ["서비스 이용 확인 연락처", ESCROW_INFO.servicePhone],
    ["확인증 발급일", ESCROW_INFO.certificateIssuedAt],
];

export default function EscrowPage() {
    return (
        <main className="mx-auto max-w-[1040px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-indigo-700">Purchase Safety Service</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">구매안전서비스</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                댕다방은 현금성 결제 이용자를 보호하기 위해 KB국민은행 구매안전서비스 등록 정보를 공개합니다.
                최종 업데이트: {LEGAL_UPDATED_AT}.
            </p>

            <nav
                aria-label="구매안전서비스 목차"
                className="mt-8 grid gap-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm font-bold text-neutral-600 md:grid-cols-2"
            >
                {toc.map(([id, label]) => (
                    <a key={id} href={`#${id}`} className="hover:text-indigo-700">
                        {label}
                    </a>
                ))}
            </nav>

            <section id="summary" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">1. 구매안전서비스 안내</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    {ESCROW_INFO.serviceName}는 구매자가 결제한 대금이 구매 확인 절차를 거쳐 판매자에게 지급되도록
                    하는 매매보호 서비스입니다. 댕다방은 이용자가 안전하게 거래할 수 있도록 구매안전서비스 이용확인증과
                    판매자 확인정보를 함께 공개합니다.
                </p>
            </section>

            <section id="details" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">2. KB에스크로 등록 정보</h2>
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

            <section id="how-to-check" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">3. 이용 확인 방법</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    구매안전서비스 이용 여부는 첨부된 이용확인증과 KB에스크로 판매자 확인정보에서 확인할 수 있습니다.
                    문의가 필요한 경우 KB국민은행 고객센터 {ESCROW_INFO.domesticCallCenter}, 국내
                    {` ${ESCROW_INFO.servicePhone}`}, 해외 {ESCROW_INFO.overseasCallCenter}로 확인할 수 있습니다.
                </p>
            </section>

            <section id="documents" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">4. 증빙 문서</h2>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
                    <a
                        href="/docs/legal/purchase-safety-confirmation.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-700 hover:text-indigo-900"
                    >
                        구매안전서비스 이용확인증 PDF
                    </a>
                    <a
                        href="/docs/legal/kb-escrow-seller-info.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-neutral-950"
                    >
                        KB에스크로 이체 판매자 확인정보 PDF
                    </a>
                </div>
            </section>
        </main>
    );
}
