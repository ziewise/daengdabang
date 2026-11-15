export const SHOP_CARD_CSS = `
/* 상품 스크랩 카드: 크래프트 종이 + 오려 붙인 사진 */
/* 카드 바탕은 흰색(2026-10-21 사용자 시안 B) — 크림 배경 상품 사진과 섞이지 않게 흰 폴라로이드처럼 */
.sp-card { background: #fff; border-radius: 6px; box-shadow: inset 0 0 0 1.5px #efe4d8, 0 10px 18px -12px rgba(110,80,40,.5); -webkit-tap-highlight-color: transparent; }
.sp-photo { box-shadow: 0 0 0 3px #fff, 0 4px 8px -5px rgba(90,60,50,.4); }
.sp-stamp { font-size: 10px; line-height: 1; padding: 3px 5px 2px; border-radius: 4px; color: var(--c); background: rgba(255,255,255,.88); box-shadow: inset 0 0 0 1.5px var(--c); letter-spacing: .04em; }
/* 영상 안내 도장: 사진 구석에 붙인 작은 흰 라벨 */
.sp-vcap { font-size: 9.5px; line-height: 1; padding: 3px 5px 2px; border-radius: 4px; color: #6b5a52; background: rgba(255,255,255,.92); box-shadow: inset 0 0 0 1px #f1e3da; rotate: -3deg; }
.sp-heart { background: rgba(255,255,255,.95); box-shadow: 0 0 0 1.5px #fff, 0 3px 6px -3px rgba(90,60,50,.45); transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.sp-heart:active { transform: scale(.85); }
/* 가격표: 노란 꼬리표(구멍 뚫린 태그) */
.sp-price { background: #fff3a6; color: #6b4708; border-radius: 3px 6px 6px 3px; clip-path: polygon(9px 0, 100% 0, 100% 100%, 9px 100%, 0 50%); }
.sp-price::before { content: ""; position: absolute; left: 6px; top: 50%; width: 4px; height: 4px; margin-top: -2px; border-radius: 999px; background: #fff; box-shadow: inset 0 0 0 1px rgba(170,120,40,.35); }
`;
