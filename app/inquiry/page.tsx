/**
 * app/inquiry/page.tsx — 1:1 문의
 * ---------------------------------------------------------------------
 * 고객센터 > 1:1 문의. 정적 화면 안의 client form에서 고객지원 API로
 * 접수하고, 전화 연결을 보조 수단으로 제공합니다.
 * 연락처는 lib/legal 의 BUSINESS_INFO 단일 출처 사용.
 */
import type { Metadata } from "next";
import Link from "next/link";
import CustomerInquiryPanel from "@/components/contact/CustomerInquiryPanel";
import { BUSINESS_INFO } from "@/lib/legal";

export const metadata: Metadata = {
    title: "1:1 문의 | 댕다방",
    description: "댕다방 고객센터 1:1 문의 안내",
};

// 고객센터 이메일 — 환경변수 미설정 시 기본값
const CS_EMAIL = BUSINESS_INFO.customerServiceEmail || "support@daengdabang.com";
const CS_PHONE = BUSINESS_INFO.customerServicePhone;

export default function InquiryPage() {
    return (
        <main className="mx-auto max-w-[960px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-aurora-indigo">CONTACT</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">1:1 문의</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-500">
                궁금하신 점이나 도움이 필요하시면 아래 방법으로 연락 주세요. 빠르게 답변드리겠습니다.
            </p>

            <CustomerInquiryPanel email={CS_EMAIL} phone={CS_PHONE} />

            {/* 안내 */}
            <nav aria-label="문의 전 확인할 안내" className="mt-5 grid gap-2.5 rounded-2xl border border-dashed border-neutral-300 bg-white/40 p-4 sm:grid-cols-3">
                <Link href="/faq" className="group flex min-h-16 items-center gap-3 rounded-xl border border-sky-100 bg-white/85 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700"><i className="fa-solid fa-circle-question" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1"><b className="block text-sm font-black text-neutral-900">자주 묻는 질문</b><span className="mt-0.5 block text-xs font-bold leading-5 text-neutral-500">빠른 해결 방법 보기</span></span>
                    <i className="fa-solid fa-chevron-right text-xs text-sky-600 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
                <Link href="/mypage" className="group flex min-h-16 items-center gap-3 rounded-xl border border-indigo-100 bg-white/85 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"><i className="fa-solid fa-box" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1"><b className="block text-sm font-black text-neutral-900">주문·배송 조회</b><span className="mt-0.5 block text-xs font-bold leading-5 text-neutral-500">마이페이지 주문 내역</span></span>
                    <i className="fa-solid fa-chevron-right text-xs text-indigo-600 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
                <Link href="/return" className="group flex min-h-16 items-center gap-3 rounded-xl border border-orange-100 bg-white/85 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700"><i className="fa-solid fa-rotate-left" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1"><b className="block text-sm font-black text-neutral-900">교환·반품 안내</b><span className="mt-0.5 block text-xs font-bold leading-5 text-neutral-500">신청 기준 확인하기</span></span>
                    <i className="fa-solid fa-chevron-right text-xs text-orange-600 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
            </nav>
        </main>
    );
}
