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

type BrandLogoProps = {
    className?: string;
    mobileEmphasis?: boolean;
};

export default function BrandLogo({ className = "", mobileEmphasis = false }: BrandLogoProps) {
    const symbolSize = mobileEmphasis
        ? "h-12 w-12 min-[360px]:h-[60px] min-[360px]:w-[60px] md:h-14 md:w-14"
        : "h-12 w-12 md:h-14 md:w-14";
    const wordmarkSize = mobileEmphasis
        ? "h-9 min-[360px]:h-11 md:h-10"
        : "h-9 md:h-10";

    return (
        <Link
            href="/main"
            className={`inline-flex shrink-0 flex-nowrap items-center whitespace-nowrap no-underline ${
                mobileEmphasis ? "gap-1.5 min-[360px]:gap-2 md:gap-2.5" : "gap-2.5"
            } ${className}`}
            aria-label="댕다방 홈"
        >
            {/* 강아지 로고 — 배경 없이(투명) 헤더 색이 비치게, 좀 더 크게 */}
            <span className={`relative inline-flex shrink-0 ${symbolSize}`}>
                <Image
                    src="/images/logo.png"
                    alt=""
                    fill
                    sizes={mobileEmphasis
                        ? "(max-width: 359px) 48px, (max-width: 767px) 60px, 56px"
                        : "56px"}
                    className="object-contain"
                    priority
                />
            </span>
            {/* 댕다방 워드마크 — 디자이너 제작 크레파스 이미지 */}
            <span className={`relative inline-block shrink-0 ${wordmarkSize}`} aria-hidden="true">
                <Image
                    src="/images/wordmark.png"
                    alt=""
                    width={200}
                    height={79}
                    sizes={mobileEmphasis
                        ? "(max-width: 359px) 92px, (max-width: 767px) 112px, 102px"
                        : "(max-width: 768px) 92px, 102px"}
                    className="h-full w-auto object-contain"
                    priority
                />
            </span>
        </Link>
    );
}
