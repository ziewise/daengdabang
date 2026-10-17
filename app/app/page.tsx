import type { Metadata } from "next";
import MobileAppHome from "@/components/pwa/MobileAppHome";

// 2026-10-18: /app/ 은 브라우저 앱 설치 안내 페이지(설치한 앱은 새 앱 홈으로 감) — 탭 제목 · 설명도 설치 안내로
export const metadata: Metadata = {
    title: "댕다방 앱 설치 안내 | 댕다방",
    description: "홈 화면에 추가하면 댕다방을 앱처럼 바로 열 수 있어요. 휴대폰별 설치 방법을 안내해요.",
    alternates: { canonical: "/app/" },
};

export default function AppHomePage() {
    return <MobileAppHome />;
}
