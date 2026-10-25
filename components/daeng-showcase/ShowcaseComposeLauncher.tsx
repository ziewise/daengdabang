/**
 * ShowcaseComposeLauncher — 댕자랑 페이지의 "사진 올리기" 카드 · 2026-10-25(웹 전용)
 * ---------------------------------------------------------------------
 * 사용자 "작성은 모달로 · 페이지의 사진 올리기 버튼도 디테일 신경써서".
 * 왼쪽 카메라 그림(둥근 무지개 크레파스 테 · 분홍 + 표시) · 가운데 꼬리표 · 주아 제목 · 한 줄(진행 중인 댕주제가 있으면 노랑 알약)
 * · 오른쪽 분홍 알약 단추(흰 동그라미 속 카메라 · 누르면 살짝 눌림). 누르면 onOpen(작성 창 열기)만 부름.
 * id="showcase-compose-open" — 작성 창이 닫히면 이 단추로 초점이 돌아옴. 꾸밈: app/showcase-compose-web.css(.scl-*)
 */
"use client";

export default function ShowcaseComposeLauncher({ topicTitle, onOpen }: { topicTitle?: string; onOpen: () => void }) {
    return (
        <div className="scl">
            <span className="scl-art" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src="/images/ui/mypet-shutter-384.webp" alt="" width={72} height={72} />
                <i className="fa-solid fa-plus" />
            </span>
            <div className="scl-text">
                <p className="ddb-crayon-kicker scl-kicker">SHARE TODAY</p>
                <h2 className="scl-title">오늘의 <em>한 장</em>, 자랑해 볼까요?</h2>
                <p className="scl-sub">
                    사진 한 장과 짧은 이야기면 충분해요.
                    {topicTitle ? <span className="scl-topic"><i className="fa-solid fa-hashtag" aria-hidden="true" />{topicTitle} 참여 중</span> : null}
                </p>
            </div>
            <button id="showcase-compose-open" type="button" className="scl-btn" onClick={onOpen} aria-haspopup="dialog">
                <span className="scl-btn-icon" aria-hidden="true"><i className="fa-solid fa-camera" /></span>
                사진 올리기
                <i className="fa-solid fa-arrow-right scl-btn-arrow" aria-hidden="true" />
            </button>
        </div>
    );
}
