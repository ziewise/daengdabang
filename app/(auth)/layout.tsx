/**
 * (auth) 라우트 그룹 layout
 * ---------------------------------------------------------------------
 * 인증 페이지는 헤더/푸터/펫렌즈 FAB 없이 단일 글래스 카드만 풀스크린에 띄움.
 * (shop) 그룹 밖이라 자동으로 헤더 미노출.
 */
import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8 md:py-12">
            {/* 상단 시그니처 로고 (모든 인증 페이지 공통) */}
            <Link href="/main" className="inline-flex items-center gap-2 mb-8 md:mb-10 no-underline">
                <span className="relative w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-white shadow-card">
                    <Image src="/images/logo.png" alt="댕다방" fill sizes="56px" className="object-cover" priority />
                </span>
                <span className="inline-flex items-baseline font-display text-3xl md:text-4xl font-black tracking-tight">
                    <span className="text-aurora-blue">댕</span>
                    <span className="text-aurora-purple">다</span>
                    <span className="text-aurora-pink">방</span>
                </span>
            </Link>

            {children}
        </div>
    );
}
