/**
 * MypageWebLoading — 웹 마이페이지 "불러오는 중" 자리 · 2026-10-26
 * ---------------------------------------------------------------------
 * 웹에서만 씀(앱은 각 화면의 원래 불러오는 중 모양 그대로 — 부르는 쪽이 useWebScreen 으로 고름).
 * 모양: 기존 결 그대로 — 머리 판(data-mp-hello · 분홍 띠 + 3D 그림) + 흰 쿠션 카드(.surface data-mp-card) 안 크림 줄.
 *   새 카드 모양을 만들지 않고, 크림 줄(mp-web-loading-bar)만 app/mypage-web.css 에서 은은하게 깜박임.
 * 서버 호출 · 상태 변경 없음(보여 주기만).
 */

type Head = { kicker: string; title: string; text: string; art: string };

export default function MypageWebLoading({ head, label, cards = 2 }: { head?: Head; label: string; cards?: number }) {
    return (
        <div className="mp-web-loading" aria-busy="true" aria-live="polite">
            {/* 머리 판 — 화면 이름은 미리 보여 주고, 설명만 "불러오는 중" 안내 */}
            {head && (
                <div data-mp-hello data-mp-art={head.art}>
                    <p className="text-sm font-black text-indigo-700">{head.kicker}</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-950">{head.title}</h1>
                    <p className="mt-2 text-sm font-bold text-neutral-500">{head.text}</p>
                </div>
            )}
            {/* 흰 쿠션 카드 자리 — 안쪽은 크림 줄(높이 고정이라 불러온 뒤 화면이 덜 움직임) */}
            <div className="mp-web-loading-cards">
                {Array.from({ length: cards }, (_, index) => (
                    <div key={index} className="surface" data-mp-card="plain" aria-hidden="true">
                        <span className="mp-web-loading-bar" data-size="lg" />
                        <span className="mp-web-loading-bar" />
                        <span className="mp-web-loading-bar" data-size="sm" />
                    </div>
                ))}
            </div>
            <span className="sr-only">{label}</span>
        </div>
    );
}
