/*
 * /health-report — 댕다방 연구소 "건강 변화 리포트"(2026-10-23 우리 아이 기록에서 나눔)
 * 매주 찍은 사진 기록을 이어 변화를 읽는 웹 화면. 앱에서는 AppShell 이 앱 리포트 화면으로 보냄.
 */
import type { Metadata } from "next";
import HealthReport from "@/components/my-pet/HealthReport";
// 웹 매일 댕생활 결(쿠션 판 · 발자국 · 안내 판) + 연구소 결(7부 건강 변화 리포트) — 웹에서만 적용
import "../daily-web.css";
import "../lab-web.css";

export const metadata: Metadata = {
    title: "건강 변화 리포트 | 댕다방",
    description: "매주 찍은 우리 아이 사진을 이어서 새로 보인 것 · 계속 보이는 것 · 케어를 정리합니다.",
};

export default function HealthReportPage() {
    return <HealthReport />;
}
