/**
 * BrandLogo — "댕다방" 로고 (이미지 + 텍스트 워드마크)
 * ---------------------------------------------------------------------
 * 헤더·모바일 패널·푸터에서 공통 사용.
 *
 * 워드마크 폰트: Gaegu (Google Fonts, 거친 손글씨)
 *   로고의 크레파스 손글씨 분위기 매칭.
 * 색상: 로고와 동일 — 댕(노랑) · 다(파랑) · 방(핑크)
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
            {/* 워드마크 — Gaegu 손글씨 폰트 + 로고와 같은 글자별 색상 */}
            <span
                className="flex items-baseline gap-0.5 tracking-tight leading-none"
                style={{ fontFamily: "var(--font-crayon)" }}
                aria-label="댕다방"
            >
                <span className="text-[28px] md:text-[30px] font-bold text-[#F5A623]">댕</span>
                <span className="text-[28px] md:text-[30px] font-bold text-[#4FB3F6]">다</span>
                <span className="text-[28px] md:text-[30px] font-bold text-[#F058A6]">방</span>
            </span>
        </Link>
    );
}
