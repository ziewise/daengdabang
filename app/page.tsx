/**
 * Home — 임시 셋업 검증 페이지
 * ---------------------------------------------------------------------
 * Phase 1 (셋업) 까지 작동하는지 시각적으로 확인하는 임시 페이지.
 * Phase 3 에서 인트로(영상) → 메인 페이지로 교체될 예정.
 */
export default function Home() {
    return (
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
            <div className="glass-card max-w-2xl w-full rounded-2xl p-10 text-center">
                <p className="text-xs font-bold tracking-[0.3em] text-aurora-indigo mb-3">
                    PHASE 1 · SETUP
                </p>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4">
                    🐾 댕다방 마이그레이션 진행 중
                </h1>
                <p className="text-base text-neutral-600 leading-relaxed mb-8">
                    Next.js 16.2 · React 19 · TypeScript 5 · Tailwind v4
                    <br />
                    Geist + Wanted Sans Variable · Turbopack
                </p>

                <div className="grid grid-cols-5 gap-2 mb-8">
                    <div className="aspect-square rounded-xl bg-grade-1 flex items-center justify-center text-2xl">🌱</div>
                    <div className="aspect-square rounded-xl bg-grade-2 flex items-center justify-center text-2xl">🐾</div>
                    <div className="aspect-square rounded-xl bg-grade-3 flex items-center justify-center text-2xl">🦴</div>
                    <div className="aspect-square rounded-xl bg-grade-4 flex items-center justify-center text-2xl">💎</div>
                    <div className="aspect-square rounded-xl bg-grade-5 flex items-center justify-center text-2xl">👑</div>
                </div>

                <p className="text-sm text-neutral-500">
                    회원 등급 컬러 토큰 · 글래스 카드 · 오로라 배경이 모두 작동하면 셋업 성공!
                </p>
            </div>
        </main>
    );
}
