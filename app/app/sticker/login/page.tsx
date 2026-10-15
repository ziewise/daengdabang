/**
 * /app/sticker/login — 스티커북 시안 · 앱 로그인 화면 (로컬 확인용 임시 페이지, 배포 X)
 * 앱 안의 모든 로그인 요청이 이 화면으로 모인다(AppShell 이 웹 로그인 링크 · 회원 전용 화면을 이리로 보냄).
 */
import StickerLogin from "@/components/pwa/home-concepts/pages/StickerLogin";

export default function StickerLoginPage() {
    return <StickerLogin />;
}
