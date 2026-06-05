/**
 * PaneHead — 마이페이지 공용 페인 헤더
 * ---------------------------------------------------------------------
 * /mypage 및 하위 페이지(/mypage/orders, /mypage/pets, ...) 가 공통으로 사용.
 *
 * 위치: app/(shop)/mypage/_components/  (언더스코어 prefix = 라우트 미생성)
 * 분리 이유: Next.js 의 page.tsx 는 default + 허용된 page-only export 만 가능.
 *           일반 컴포넌트 export 하면 webpack 빌드 시 타입 에러.
 */
"use client";

export function PaneHead({ title, sub }: { title: string; sub?: string }) {
    return (
        <header className="flex items-end justify-between border-b border-neutral-200/70 pb-4 mb-5 md:mb-6">
            <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">{title}</h2>
                {sub && <p className="text-xs md:text-sm text-neutral-500 mt-0.5">{sub}</p>}
            </div>
        </header>
    );
}
