/*
 * CrayonArt — 웹 매일 댕생활 공용 크레파스 꾸밈 그림(2026-10-22 사용자 선택 "기록 결")
 * ---------------------------------------------------------------------
 * CrayonGrainFilter: 크레파스 결 SVG 필터(#dw-crayon-grain) — 낙서 그림과 CSS 의 무지개 테 고리(.dw-rring · .dw-book-ring · .dw-cam-lens)가 같이 씀.
 *   페이지마다 한 번 넣음. 화면에 보이지 않는 0×0 그림.
 * CrayonDoodle: 발바닥 · 뼈다귀 · 하트 · 별 낙서(색은 CSS color).
 * PawTrail: 구역 사이를 잇는 발자국 네 개(지그재그).
 * 모두 꾸밈 전용(aria-hidden) — 기능 없음. 스타일은 app/daily-web.css(.dw-doodle · .dw-paw-trail).
 */

// 크레파스 결 필터 — 가장자리를 살짝 떨리게 + 점점이 빈 결
export function CrayonGrainFilter() {
    return (
        <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
            <filter id="dw-crayon-grain" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" result="wobble" />
                <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.5" result="grain" />
                <feComposite in="wobble" in2="grain" operator="in" />
            </filter>
        </svg>
    );
}

// 크레파스로 그린 낙서(발바닥 · 뼈다귀 · 하트 · 별)
export function CrayonDoodle({ kind, className = "" }: { kind: "paw" | "bone" | "heart" | "star"; className?: string }) {
    return (
        <svg viewBox="0 0 48 48" className={`dw-doodle ${className}`} aria-hidden="true" focusable="false">
            <g filter="url(#dw-crayon-grain)" fill="currentColor">
                {kind === "paw" && (
                    <>
                        <ellipse cx="24" cy="31" rx="9.5" ry="8" />
                        <circle cx="12.5" cy="20" r="4.2" />
                        <circle cx="19.5" cy="12.5" r="4.2" />
                        <circle cx="28.5" cy="12.5" r="4.2" />
                        <circle cx="35.5" cy="20" r="4.2" />
                    </>
                )}
                {kind === "bone" && (
                    <>
                        <rect x="12" y="20" width="24" height="8" rx="4" />
                        <circle cx="12" cy="19" r="5" />
                        <circle cx="12" cy="29" r="5" />
                        <circle cx="36" cy="19" r="5" />
                        <circle cx="36" cy="29" r="5" />
                    </>
                )}
                {kind === "heart" && <path d="M24 40C8 28 6 16 15 12c5-2 8 1 9 4 1-3 4-6 9-4 9 4 7 16-9 28z" />}
                {kind === "star" && <path d="M24 6l5 11 12 1.5-9 8.5 2.5 12L24 33l-10.5 6 2.5-12-9-8.5L19 17z" />}
            </g>
        </svg>
    );
}

// 구역 사이 발자국(지그재그, 기본 네 걸음 · steps={2} 이면 두 걸음짜리 짧은 간격)
export function PawTrail({ steps = 4 }: { steps?: 2 | 4 }) {
    return (
        <div className={`dw-paw-trail ${steps === 2 ? "is-short" : ""}`} aria-hidden="true">
            {Array.from({ length: steps }, (_, step) => <CrayonDoodle key={step} kind="paw" />)}
        </div>
    );
}
