/**
 * BrandLogo — "댕다방" 로고 (이미지 + 텍스트 워드마크)
 * ---------------------------------------------------------------------
 * 헤더·모바일 패널·푸터에서 공통 사용.
 */
import Image from "next/image";
import Link from "next/link";

export default function BrandLogo({ className = "" }: { className?: string }) {
    return (
        <Link
            href="/main"
            className={`inline-flex items-center gap-2.5 no-underline ${className}`}
        >
            <span className="relative inline-flex w-10 h-10 rounded-full overflow-hidden bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
                <Image
                    src="/images/logo.png"
                    alt="댕다방"
                    fill
                    sizes="40px"
                    className="object-cover"
                    priority
                />
            </span>
            <span className="flex items-baseline font-display tracking-tight">
                <span className="text-2xl font-black text-aurora-indigo">댕</span>
                <span className="text-2xl font-black text-aurora-purple">다</span>
                <span className="text-2xl font-black text-aurora-pink">방</span>
            </span>
        </Link>
    );
}
