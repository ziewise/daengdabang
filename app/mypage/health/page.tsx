/**
 * 마이페이지 · 우리 아이 AI · 건강 기록 요약(2026-10-24)
 * 기능 화면에 쌓인 결과를 마이페이지 안에서 정리해 보여 주는 읽기 전용 화면 — 내용은 components/mypage/MypageAiSummary.tsx
 * 웹 사이드 메뉴 "건강 기록" 이 이 화면으로 연결됨(앱 메뉴는 기능 화면 그대로).
 */
"use client";

import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import { HealthSummary } from "@/components/mypage/MypageAiSummary";
import { useAuth } from "@/lib/store";

export default function MypageHealthSummaryPage() {
    const { user } = useAuth();
    if (!user) return <MypageLoginGate redirect="/mypage/health/" />;

    return (
        <MypageSectionLayout
            eyebrow="우리 아이 AI"
            title="건강 기록"
            description="주간 사진 건강 체크 결과와 지난주와 달라진 점, 이번 주 돌봄 할 일을 정리했어요."
        >
            <HealthSummary />
        </MypageSectionLayout>
    );
}
