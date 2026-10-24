/**
 * 마이페이지 · 우리 아이 AI · AI 분석 요약(2026-10-24)
 * 기능 화면에 쌓인 결과를 마이페이지 안에서 정리해 보여 주는 읽기 전용 화면 — 내용은 components/mypage/MypageAiSummary.tsx
 * 웹 사이드 메뉴 "AI 분석" 이 이 화면으로 연결됨(앱 메뉴는 기능 화면 그대로).
 */
"use client";

import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import { AiSummary } from "@/components/mypage/MypageAiSummary";
import { useAuth } from "@/lib/store";

export default function MypageAiSummaryPage() {
    const { user } = useAuth();
    if (!user) return <MypageLoginGate redirect="/mypage/ai/" />;

    return (
        <MypageSectionLayout
            eyebrow="우리 아이 AI"
            title="AI 분석"
            description="행동 · 소리 분석 결과와 주의 단계, 지난 분석 기록을 한곳에 모았어요."
        >
            <AiSummary />
        </MypageSectionLayout>
    );
}
