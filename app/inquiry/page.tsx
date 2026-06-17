/**
 * app/inquiry/page.tsx — 1:1 문의
 * ---------------------------------------------------------------------
 * 고객센터 > 1:1 문의. 정적 사이트라 폼 제출 백엔드가 없으므로
 * 이메일(mailto)·전화로 직접 연결하는 방식.
 * 연락처는 lib/legal 의 BUSINESS_INFO 단일 출처 사용.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS_INFO } from "@/lib/legal";

export const metadata: Metadata = {
    title: "1:1 문의 | 댕다방",
    description: "댕다방 고객센터 1:1 문의 안내",
};

// 고객센터 이메일 — 환경변수 미설정 시 기본값
const CS_EMAIL = BUSINESS_INFO.customerServiceEmail || "help@daengdabang.com";
const CS_PHONE = BUSINESS_INFO.customerServicePhone;

export default function InquiryPage() {
    const mailto = `mailto:${CS_EMAIL}?subject=${encodeURIComponent("[댕다방 문의]")}`;

    return (
        <main className="mx-auto max-w-[960px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-aurora-indigo">CONTACT</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">1:1 문의</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-500">
                궁금하신 점이나 도움이 필요하시면 아래 방법으로 연락 주세요. 빠르게 답변드리겠습니다.
            </p>

            {/* 연락 방법 — 이메일 / 전화 2카드 */}
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {/* 이메일 */}
                <a
                    href={mailto}
                    className="rounded-2xl bg-white/70 backdrop-blur border border-white/60 shadow-card p-6 hover:shadow-hover hover:-translate-y-0.5 transition group"
                >
                    <span className="w-11 h-11 rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo text-white flex items-center justify-center mb-3">
                        <i className="fa-solid fa-envelope" />
                    </span>
                    <h2 className="text-base font-black text-foreground">이메일 문의</h2>
                    <p className="mt-1 text-sm font-bold text-neutral-500">
                        버튼을 누르면 메일 작성 창이 열립니다.
                    </p>
                    <p className="mt-3 text-sm font-extrabold text-aurora-indigo group-hover:underline">
                        {CS_EMAIL}
                    </p>
                </a>

                {/* 전화 */}
                <a
                    href={`tel:${CS_PHONE}`}
                    className="rounded-2xl bg-white/70 backdrop-blur border border-white/60 shadow-card p-6 hover:shadow-hover hover:-translate-y-0.5 transition group"
                >
                    <span className="w-11 h-11 rounded-full bg-gradient-to-br from-aurora-indigo to-aurora-pink text-white flex items-center justify-center mb-3">
                        <i className="fa-solid fa-headset" />
                    </span>
                    <h2 className="text-base font-black text-foreground">전화 문의</h2>
                    <p className="mt-1 text-sm font-bold text-neutral-500">
                        평일 10:00 ~ 18:00 (주말·공휴일 휴무)
                    </p>
                    <p className="mt-3 text-sm font-extrabold text-aurora-indigo group-hover:underline">
                        {CS_PHONE}
                    </p>
                </a>
            </div>

            {/* 안내 */}
            <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-white/40 p-5 text-sm font-bold leading-7 text-neutral-600">
                <p>· 문의 전 <Link href="/faq" className="text-aurora-indigo hover:underline font-extrabold">자주 묻는 질문</Link>을 먼저 확인하시면 더 빠르게 해결됩니다.</p>
                <p>· 주문·배송 관련 문의는 <Link href="/mypage" className="text-aurora-indigo hover:underline font-extrabold">마이페이지 &gt; 주문 내역</Link>에서 확인 후 연락 주세요.</p>
                <p>· 교환·반품은 <Link href="/return" className="text-aurora-indigo hover:underline font-extrabold">교환·반품 안내</Link>를 참고해 주세요.</p>
            </div>
        </main>
    );
}
