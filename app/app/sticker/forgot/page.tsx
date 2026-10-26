/**
 * /app/sticker/forgot — 앱 비밀번호 찾기(재설정) 화면 (2026-10-26)
 * 웹 /forgot-password 와 같은 부품(ForgotForm — 상태 · 서버 요청 · 검사 그대로)을 앱 주소에서 씀.
 * 앱 묶음(app 경로) 안이라 APK 에서도 바깥 브라우저로 나가지 않고 앱 안에서 열림. 앱 화면 모양은 StickerForgot.
 */
import type { Metadata } from "next";
import ForgotForm from "@/app/(auth)/forgot-password/ForgotForm";

export const metadata: Metadata = {
    title: "비밀번호 재설정 | 댕다방",
    robots: { index: false, follow: false },
};

export default function AppForgotPage() {
    return <ForgotForm />;
}
