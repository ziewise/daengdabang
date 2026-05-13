/**
 * /mypage layout — 마이페이지 공통 frame
 * ---------------------------------------------------------------------
 *   - 비로그인 시 차단 카드만 노출
 *   - 로그인 시 상단 헬로 카드 + 좌사이드바 / 우 콘텐츠
 *
 * SSR 단계에선 인증 상태를 알 수 없으므로 일단 본문은 렌더, 클라이언트
 * mount 후 useAuth.hydrated 가 true 가 되면 차단/노출 결정.
 */
"use client";

import { useAuth } from "@/hooks/useAuth";
import MypageGuestGate from "@/components/mypage/MypageGuestGate";
import MypageHello from "@/components/mypage/MypageHello";
import MypageSidebar from "@/components/mypage/MypageSidebar";

export default function MypageShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoggedIn, hydrated } = useAuth();

    // hydrate 전: 깜빡임 방지용 빈 영역 (헤더·푸터는 (shop) layout 에서 이미 노출)
    if (!hydrated) {
        return <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8 md:py-10 min-h-[60vh]" />;
    }

    if (!isLoggedIn) {
        return (
            <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 md:py-10">
                <MypageGuestGate />
            </div>
        );
    }

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 md:py-10">
            <MypageHello />
            <div className="grid md:grid-cols-[240px_1fr] gap-4 md:gap-6 items-start">
                <MypageSidebar />
                <section className="glass-card rounded-2xl p-5 md:p-7 min-h-[400px] md:min-h-[500px]">
                    {children}
                </section>
            </div>
        </div>
    );
}
