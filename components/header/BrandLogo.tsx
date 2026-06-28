/**
 * BrandLogo — "댕다방" 로고 (로고 아이콘 + 워드마크 이미지)
 * ---------------------------------------------------------------------
 * 헤더·모바일 패널·푸터에서 공통 사용.
 *
 * 워드마크: 디자이너가 제작한 크레파스 손글씨 PNG (투명 배경)
 *   /images/wordmark.png — 1999×787 RGBA
 *   글자별 색상 (댕 청록 · 다 빨강 · 방 주황) 그대로 표시.
 */
import Image from "next/image";
import Link from "next/link";

export default function BrandLogo({ className = "" }: { className?: string }) {
    return (
        <Link
            href="/main"
            className={`inline-flex items-center gap-2.5 no-underline ${className}`}
            aria-label="댕다방 홈"
        >
            {/* 강아지 로고 — 배경 없이(투명) 헤더 색이 비치게, 좀 더 크게 */}
            <span className="relative inline-flex w-12 h-12 shrink-0 md:w-14 md:h-14">
                <Image
                    src="/images/logo.png"
                    alt=""
                    fill
                    sizes="56px"
                    className="object-contain"
                    priority
                />
            </span>
            {/* 댕다방 워드마크 — 디자이너 제작 크레파스 이미지 */}
            <span className="relative inline-block h-9 md:h-10" aria-hidden="true">
                <Image
                    src="/images/wordmark.png"
                    alt=""
                    width={200}
                    height={79}
                    sizes="(max-width: 768px) 92px, 102px"
                    className="h-full w-auto object-contain"
                    priority
                />
            </span>
        </Link>
    );
}
