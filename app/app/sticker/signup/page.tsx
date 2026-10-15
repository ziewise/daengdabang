/**
 * /app/sticker/signup — 스티커북 시안 · 앱 회원가입 화면 (로컬 확인용 임시 페이지, 배포 X)
 * 앱 안의 모든 회원가입 요청이 이 화면으로 모인다(AppShell 이 웹 가입 링크 · 주소를 이리로 보냄).
 */
import StickerSignup from "@/components/pwa/home-concepts/pages/StickerSignup";

export default function StickerSignupPage() {
    return <StickerSignup />;
}
