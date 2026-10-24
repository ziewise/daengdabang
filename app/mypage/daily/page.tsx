/**
 * 마이페이지 · 우리 아이 AI · 매일댕생활 요약(2026-10-24)
 * 기능 화면에 쌓인 결과를 마이페이지 안에서 정리해 보여 주는 읽기 전용 화면 — 내용은 components/mypage/MypageAiSummary.tsx
 * 웹 사이드 메뉴 "매일댕생활" 이 이 화면으로 연결됨(앱 메뉴는 기능 화면 그대로).
 */
"use client";

import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import { DailySummary } from "@/components/mypage/MypageAiSummary";
import { useAuth } from "@/lib/store";

export default function MypageDailySummaryPage() {
    const { user } = useAuth();
    if (!user) return <MypageLoginGate redirect="/mypage/daily/" />;

    return (
        <MypageSectionLayout
            eyebrow="우리 아이 AI"
            title="매일댕생활"
            description="연속 출근 · 이번 주 도장 · 레벨과 오늘 돌봄 할 일을 한눈에 봐요."
        >
            <DailySummary />
        </MypageSectionLayout>
    );
}
