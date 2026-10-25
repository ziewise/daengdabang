/**
 * CrayonStars — 크레파스 결 별점(보기 전용) · 2026-10-25 후기 시안
 * ---------------------------------------------------------------------
 * 둥근 모서리 별 다섯 개. 채운 별은 노랑 크레파스(살짝 결 무늬), 빈 별은 연한 베이지.
 * 소수점 별점(예: 4.6)은 마지막 별을 그만큼만 채움. 읽기 프로그램에는 "5점 만점에 4.6점"으로 읽힘.
 * 꾸밈: app/review-web.css(.rvw-stars)
 */

/** 둥근 별 모양(24×24 칸) */
const STAR = "M12 2.6c.4 0 .8.2 1 .6l2.4 4.9 5.4.8c.9.1 1.2 1.2.6 1.8l-3.9 3.8.9 5.4c.2.9-.8 1.6-1.6 1.1L12 18.6l-4.8 2.5c-.8.4-1.8-.2-1.6-1.1l.9-5.4-3.9-3.8c-.6-.6-.3-1.7.6-1.8l5.4-.8 2.4-4.9c.2-.4.6-.6 1-.6z";

export default function CrayonStars({ value, size = 18 }: { value: number; size?: number }) {
    return (
        <span className="rvw-stars" role="img" aria-label={`5점 만점에 ${Number.isInteger(value) ? value : value.toFixed(1)}점`}>
            {[0, 1, 2, 3, 4].map((index) => {
                const fill = Math.max(0, Math.min(1, value - index));
                return (
                    <svg key={index} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
                        <path d={STAR} className="rvw-star-empty" />
                        {fill > 0 && (
                            <path d={STAR} className="rvw-star-fill" style={fill < 1 ? { clipPath: `inset(0 ${100 - fill * 100}% 0 0)` } : undefined} />
                        )}
                    </svg>
                );
            })}
        </span>
    );
}
