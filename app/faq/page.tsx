/**
 * app/faq/page.tsx — 자주 묻는 질문
 * ---------------------------------------------------------------------
 * 고객센터 > 자주 묻는 질문. 카테고리별 Q&A 아코디언(FaqClient).
 * 레이아웃은 약관/공지 페이지와 동일 톤.
 */
import type { Metadata } from "next";
import Link from "next/link";
import FaqClient from "./FaqClient";

export const metadata: Metadata = {
    title: "자주 묻는 질문 | 댕다방",
    description: "댕다방 자주 묻는 질문(FAQ)",
};

export default function FaqPage() {
    return (
        <main className="mx-auto max-w-[960px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-aurora-indigo">FAQ</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">자주 묻는 질문</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-500">
                궁금한 점을 빠르게 확인하세요. 더 필요한 내용은{" "}
                <Link href="/inquiry" className="text-aurora-indigo hover:underline font-extrabold">1:1 문의</Link>
                로 알려주시면 도와드리겠습니다.
            </p>

            <FaqClient />
        </main>
    );
}
