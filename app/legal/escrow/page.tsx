import type { Metadata } from "next";
import { BUSINESS_INFO, ESCROW_INFO, LEGAL_UPDATED_AT } from "@/lib/legal";

export const metadata: Metadata = {
    title: "구매안전서비스 | 댕다방",
    description: "댕다방 KB에스크로 이체 구매안전서비스 안내",
};

const rows = [
    ["서비스 제공자", ESCROW_INFO.provider],
    ["서비스명", ESCROW_INFO.serviceName],
    ["판매자 등록일", ESCROW_INFO.sellerRegisteredAt],
    ["업체명", BUSINESS_INFO.companyName],
    ["인터넷 쇼핑몰 명칭", BUSINESS_INFO.mallName],
    ["쇼핑몰 홈페이지", ESCROW_INFO.mallUrl],
    ["판매자 예금주명", ESCROW_INFO.sellerName],
    ["서비스 이용기간", "등록 후 해지 시까지"],
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
                최종 업데이트: {LEGAL_UPDATED_AT}. 댕다방은 현금성 결제 이용자를 보호하기 위해 KB국민은행 구매안전서비스 정보를 공개합니다.
            </p>

            <section className="mt-8 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">KB에스크로 이체 안내</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    KB에스크로 이체는 구매자가 결제한 대금을 구매자의 승인 절차를 거쳐 최종적으로 판매자에게 이체하는 매매보호 계좌이체 서비스입니다.
                    이 안내는 댕다방이 KB국민은행에서 제공하는 구매안전서비스에 등록된 판매자임을 확인하기 위한 정보입니다.
                </p>
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
                <h2 className="text-lg font-black text-neutral-950">이용 확인</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    서비스 이용 확인은 KB국민은행 콜센터 상담 및 폰뱅킹 {ESCROW_INFO.domesticCallCenter}, 국내 {ESCROW_INFO.servicePhone}, 해외 {ESCROW_INFO.overseasCallCenter}에서 안내받을 수 있습니다.
                    인증마크의 효력은 KB에스크로 이체를 통해 결제한 경우에 유효합니다.
                </p>
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
                        KB에스크로 판매자 확인정보 PDF
                    </a>
                </div>
            </section>
        </main>
    );
}
