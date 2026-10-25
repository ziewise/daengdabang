/**
 * app/faq/page.tsx — 자주 묻는 질문
 * ---------------------------------------------------------------------
 * 고객센터 > 자주 묻는 질문. 카테고리별 Q&A 아코디언(FaqClient).
 * 레이아웃은 약관/공지 페이지와 동일 톤.
 * 2026-10-23 웹 크레파스 결: 고객센터 탭 · 하늘 쿠션 머리 판(SupportTop, "1:1 문의 바로 작성"은 판 안 분홍 알약) → 발자국 →
 * Q · A 쿠션 목록 → 끝에 "찾는 답이 없나요?" 한 줄(웹 전용, 같은 1:1 문의 주소). 앱은 기존 앱 꾸밈 그대로.
 */
import type { Metadata } from "next";
// "1:1 문의 바로 작성" — 웹은 페이지 이동 없이 문의 창(마이페이지와 같은 창 · 같은 양식), 앱 · 새 탭은 원래대로 이동(2026-10-25)
import MypageInquiryLink from "@/components/mypage/MypageInquiryLink";
import { SupportPaws } from "@/components/support/SupportTop";
// 머리 판 설명만 웹(해요체) · 앱(원래 문구)으로 나눔(2026-10-26)
import SupportTopCopy from "@/components/contact/SupportTopCopy";
import FaqClient from "./FaqClient";
import "../daily-web.css";
import "../support-web.css";

export const metadata: Metadata = {
    title: "자주 묻는 질문 | 댕다방",
    description: "댕다방 자주 묻는 질문(FAQ)",
};

/** 자주 묻는 질문에서 여는 1:1 문의 창 머리(문의 유형은 "기타", 내용은 고객이 직접) */
const FAQ_INQUIRY = {
    kicker: "1:1 INQUIRY",
    title: "1:1 문의하기",
    sub: "찾는 답이 없으셨나요? 궁금한 점을 남겨 주시면 확인 후 이메일로 답변드려요.",
    art: "/images/ui/web-cs-inquiry-160.webp",
    category: "other" as const,
};

export default function FaqPage() {
    return (
        <main className="mx-auto max-w-[960px] px-4 py-10 md:px-6" data-daily-web data-support-web="faq">
            <SupportTopCopy
                current="faq"
                kicker="FAQ"
                title="자주 묻는 질문"
                lead="궁금한 점을 빠르게 확인하세요. 더 필요한 내용은 1:1 문의로 바로 접수해 주시면 도와드리겠습니다."
                webLead="궁금한 점을 빠르게 확인해 보세요. 더 궁금한 건 1:1 문의로 남겨 주시면 도와드릴게요."
            >
            <MypageInquiryLink
                href="/inquiry#inquiry-form"
                preset={FAQ_INQUIRY}
                className="cs-cta mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-aurora-indigo/20 bg-white/85 px-4 py-2 text-sm font-extrabold text-aurora-indigo shadow-sm transition hover:-translate-y-0.5 hover:border-aurora-indigo/40 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo"
            >
                <i className="fa-solid fa-envelope" aria-hidden="true" /> 1:1 문의 바로 작성 <i className="fa-solid fa-chevron-right text-[9px]" aria-hidden="true" />
            </MypageInquiryLink>
            </SupportTopCopy>
            <SupportPaws />

            <FaqClient />

            {/* 웹 전용 — 목록 끝 안내 한 줄(같은 1:1 문의 주소) */}
            <p className="hidden cs-more">
                <span>찾는 답이 없나요? 1:1 문의로 남겨 주시면 확인 후 답변드려요.</span>
                <MypageInquiryLink href="/inquiry#inquiry-form" preset={FAQ_INQUIRY}>1:1 문의하기 <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" /></MypageInquiryLink>
            </p>
        </main>
    );
}
