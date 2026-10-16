/**
 * 앱 쇼핑 화면 스티커북 껍데기 — 앱 전용 CSS (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 앱 틀 안에서 여는 웹 쇼핑 화면(상품 상세 · 장바구니 · 결제 · 목록 · 검색)에 "보이는 겉모양"만 입힌다.
 *  - 범위: html.ddb-app-mode.ddb-app-shop-web (= 앱 모드 + 쇼핑 탭의 웹 화면, AppShell이 붙임) · 검색 창은 앱 모드 어디서나
 *    → 일반 브라우저(웹)에는 하나도 적용되지 않는다
 *  - 바꾸는 것: 색(Tailwind 색 변수) · 모서리 둥글기 · 종이 바탕 · 그림자 · 제목 글꼴 · 테이프 같은 꾸밈
 *  - 바꾸지 않는 것: 위치 · 크기 · 순서 · 숨김(꾸밈용 크레파스 배경만 종이 바탕으로 대신) · 버튼 · 링크 · 입력 동작 ·
 *    문구. 결제 수단 고유색(토스 파랑 등) · 경고 · 안내(주황 · 빨강 · 초록 · 하늘색)도 그대로
 *  - 원리: 협업자 화면은 Tailwind 기본 색(neutral · indigo …)을 CSS 변수로 쓰므로, 앱 모드에서만 그 변수를
 *    스티커북 색(크림 종이 · 갈색 잉크 · 딸기 분홍)으로 바꿔 끼운다. 꾸밈 그림(테이프)은 pointer-events: none
 */

/* 공통 색 — 크림 종이 · 갈색 잉크(neutral 계열) + 딸기 분홍(주 색 indigo 자리) */
const PALETTE = `
    /* 무채색 → 따뜻한 종이 · 잉크 */
    --color-neutral-50: #fffaf3; --color-neutral-100: #f8eee4; --color-neutral-200: #efdfd2; --color-neutral-300: #e2cbbd;
    --color-neutral-400: #b9a49a; --color-neutral-500: #9c8a80; --color-neutral-600: #7d6a61; --color-neutral-700: #5c4a42;
    --color-neutral-800: #4a3a33; --color-neutral-900: #3d2f2a; --color-neutral-950: #33261f;
    --color-gray-50: #fffaf3; --color-gray-100: #f8eee4; --color-gray-200: #efdfd2; --color-gray-300: #e2cbbd;
    --color-gray-400: #b9a49a; --color-gray-500: #9c8a80; --color-gray-600: #7d6a61; --color-gray-700: #5c4a42;
    --color-gray-800: #4a3a33; --color-gray-900: #3d2f2a; --color-gray-950: #33261f;
    --color-slate-50: #fffaf3; --color-slate-100: #f8eee4; --color-slate-200: #efdfd2; --color-slate-300: #e2cbbd;
    --color-slate-400: #b9a49a; --color-slate-500: #9c8a80; --color-slate-600: #7d6a61; --color-slate-700: #5c4a42;
    --color-slate-800: #4a3a33; --color-slate-900: #3d2f2a; --color-slate-950: #33261f;
    /* 주 색(indigo · 사이트 파랑) → 딸기 분홍 — 흰 글씨가 또렷하도록 600은 진하게 */
    --color-indigo-50: #fff3f6; --color-indigo-100: #ffe4ec; --color-indigo-200: #fdcbd9; --color-indigo-300: #f9a8c0;
    --color-indigo-400: #f283a3; --color-indigo-500: #e8628e; --color-indigo-600: #d4447a; --color-indigo-700: #b93766;
    --color-indigo-800: #982d53; --color-indigo-900: #772542; --color-indigo-950: #4d1729;
    --color-brand: #d4447a; --color-brand-dark: #b93766; --color-aurora-indigo: #d4447a;
    /* 바탕 · 글자 기본색 */
    --color-background: #fffdf8; --color-foreground: #3d2f2a; --background: #fffdf8; --foreground: #3d2f2a;
    /* 모서리 — 조금 더 둥글게(종이 스티커 느낌) */
    --radius-md: 10px; --radius-lg: 14px; --radius-xl: 18px; --radius-2xl: 22px;
    /* 카드 그림자 — 종이가 살짝 뜬 갈색 그림자 */
    --shadow-card: 0 0 0 1.5px #f3e6d6, 0 10px 18px -12px rgba(110, 80, 40, .5);
    --shadow-hover: 0 0 0 1.5px #f3e6d6, 0 14px 22px -12px rgba(110, 80, 40, .55);
`;

/* 쇼핑 탭 웹 화면 범위(앱 모드에서만) */
/* 앱 겉모양 범위 — 쇼핑 탭 웹 화면 + 마이 탭 웹 화면(AppShell이 html 에 표시) */
const S = "html.ddb-app-mode:is(.ddb-app-shop-web, .ddb-app-my-web)";
/* 산책 친구 설정 창(협업자 PetCompanionLayer) — 앱 모드 어디서나 */
const P = 'html.ddb-app-mode section[aria-labelledby="pet-companion-title"]';
/* 설정 창 안 항목 묶음(이름 · 견종 · 털 색상 · 속도와 체크) */
const PG = `${P} > div > div:nth-child(2)`;
/* 장바구니 화면(AppShell이 html[data-app-page] 표시) · 검색 창 */
const CART = `${S}[data-app-page="cart"]`;
const CHECKOUT = `${S}[data-app-page="checkout"]`;
/* 마이 탭 웹 화면 */
const MYW = "html.ddb-app-mode.ddb-app-my-web";
/* 옵션 고르기 판(장바구니 담기 · 바로 구매) */
const SHEET = `${S} [data-purchase-option-sheet]`;
/* 상품 목록 화면(상품군 · 추천 셀렉트 · 신상품 · 기획전 · 브랜드 · 전체 상품) */
const LIST = `${S}:is([data-app-page="category"], [data-app-page="best"], [data-app-page="new"], [data-app-page="promo"], [data-app-page="brands"], [data-app-page="brand"], [data-app-page="products"])`;
const SEARCH = 'html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"]';
/* 점 무늬 다이어리 속지 — 앱 쇼핑 첫 화면 · 케어톡과 같은 종이(괘선 없음) */
const DOT_PAPER = "background-color: #fffdf8; background-image: radial-gradient(circle, rgba(196,160,140,.24) 1px, transparent 1.3px); background-size: 15px 15px;";
/* 마스킹테이프 한 조각(꾸밈 · 눌리지 않음) */
const TAPE = "content: \"\"; position: absolute; z-index: 3; pointer-events: none; height: 13px; border-radius: 2px; background: repeating-linear-gradient(90deg, rgba(255,200,218,.92) 0 7px, rgba(255,220,232,.92) 7px 14px); box-shadow: 0 2px 3px -2px rgba(110,60,50,.3);";

/* 자수 와펜 — 앱 시안 Patch(sticker-kit)와 같은 색 · 결. 바깥 새틴 실 테두리(사선 결) + 안쪽 천(가로세로 결) + 바느질 땀(안쪽 점선).
   테두리 두께만 쓰고 크기는 그대로(테두리 포함 크기라 버튼 크기 변화 없음) */
const patch = (fill: string, edge: string, edge2: string, stitch: string, ink: string, shadow = true) => `border: 3px solid transparent; border-radius: 999px;
  background: repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 1px, transparent 1px 3px) padding-box,
    repeating-linear-gradient(90deg, rgba(0,0,0,.035) 0 1px, transparent 1px 3px) padding-box, linear-gradient(${fill}, ${fill}) padding-box,
    repeating-linear-gradient(72deg, ${edge} 0 2px, ${edge2} 2px 3.4px) border-box;
  color: ${ink}; outline: 2px dashed ${stitch}; outline-offset: -7px; ${shadow ? "text-shadow: 0 1px 0 rgba(0,0,0,.13);" : ""}
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; letter-spacing: -0.02em;
  box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 7px 9px -6px rgba(110,60,60,.45);
  transition: transform .45s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent;`;
const PATCH_PINK = patch("#f2789d", "#d9547d", "#ea6d93", "rgba(255,255,255,.75)", "#fff");
const PATCH_CREAM = patch("#fff6ee", "#f4a9bf", "#f8c3d2", "rgba(226,107,145,.55)", "#c4456f", false);
const PATCH_LAVENDER = patch("#a68ff0", "#7f66d8", "#957de6", "rgba(255,255,255,.75)", "#fff");
const PATCH_MINT = patch("#7fcfa9", "#4fae84", "#68c299", "rgba(255,255,255,.75)", "#fff");

/* 자수 아이콘(상세 버튼 속 장바구니 · 하트) — 와펜 버튼과 같은 결: 실 결(사선 무늬) + 새틴 테두리 실 + 안쪽 바느질 땀(점선).
   글자 아이콘(Font Awesome) 자리에 배경 그림으로만 바꿔 끼운다(버튼 · 동작 그대로) */
const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
/* 실 결 — 가는 사선 무늬 */
const THREAD = `<pattern id="t" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(55)"><rect width="1" height="2.4" fill="#000" fill-opacity=".1"/></pattern>`;
const BAG_BODY = "M8.5 14 h23 a2 2 0 0 1 2 2.2 l-1.3 15.6 a3.6 3.6 0 0 1 -3.6 3.3 h-17.2 a3.6 3.6 0 0 1 -3.6 -3.3 l-1.3 -15.6 a2 2 0 0 1 2 -2.2 z";
const EMB_BAG = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs>${THREAD}</defs>
<path d="M14 14.5 V11.8 a6 6 0 0 1 12 0 V14.5" fill="none" stroke="#d9547d" stroke-width="3.2" stroke-linecap="round"/>
<path d="${BAG_BODY}" fill="#f2789d" stroke="#d9547d" stroke-width="2.2" stroke-linejoin="round"/>
<path d="${BAG_BODY}" fill="url(#t)"/>
<path d="${BAG_BODY}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.3" stroke-dasharray="2.2 1.6" transform="translate(20 24.5) scale(.78) translate(-20 -24.5)"/>
<g fill="#fff"><ellipse cx="20" cy="27.2" rx="3.4" ry="2.8"/><circle cx="16.2" cy="23.3" r="1.4"/><circle cx="18.8" cy="21.4" r="1.4"/><circle cx="21.2" cy="21.4" r="1.4"/><circle cx="23.8" cy="23.3" r="1.4"/></g>
</svg>`);
const HEART = "M20 34 C 9.5 27.3 4 21.4 4 14.8 C 4 9.9 7.8 6.2 12.4 6.2 C 15.7 6.2 18.4 8 20 10.8 C 21.6 8 24.3 6.2 27.6 6.2 C 32.2 6.2 36 9.9 36 14.8 C 36 21.4 30.5 27.3 20 34 Z";
const STITCH_HEART = (color: string) => `<path d="${HEART}" fill="none" stroke="${color}" stroke-width="1.6" stroke-dasharray="2.2 1.7" transform="translate(20 19.5) scale(.72) translate(-20 -19.5)"/>`;
/* 찜한 상태(분홍 와펜 위) — 흰 실로 꽉 채운 하트 */
const HEART_ON = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs>${THREAD}</defs>
<path d="${HEART}" fill="#fffaf6" stroke="#ffe0ea" stroke-width="2.2" stroke-linejoin="round"/>
<path d="${HEART}" fill="url(#t)"/>${STITCH_HEART("#f2789d")}
</svg>`);
/* 찜 전(크림 와펜 위) — 분홍 새틴 실 테두리만 수놓은 빈 하트 */
const HEART_OFF = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
<path d="${HEART}" fill="none" stroke="#e8628e" stroke-width="3.4" stroke-linejoin="round"/>
<path d="${HEART}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1" stroke-dasharray="1 1.4" stroke-linejoin="round"/>${STITCH_HEART("#f6a9bf")}
</svg>`);
/* 목록 카드의 작은 흰 찜 버튼 위 — 찜한 하트는 분홍 실로 채움(흰 버튼 위라 흰 하트는 안 보임) */
const HEART_ON_CARD = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs>${THREAD}</defs>
<path d="${HEART}" fill="#f2789d" stroke="#d9547d" stroke-width="2.2" stroke-linejoin="round"/>
<path d="${HEART}" fill="url(#t)"/>${STITCH_HEART("#fff")}
</svg>`);

export const APP_SHOP_SKIN_CSS = `
/* 앱 글꼴 — 본문 나눔스퀘어라운드(굵게) · 제목 카페24 써라운드 (우리 사이트 public/fonts, 외부 서버 없이) */
@font-face { font-family: "NanumSquareRound"; font-weight: 400; src: url("/fonts/NanumSquareRoundR.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "NanumSquareRound"; font-weight: 700; src: url("/fonts/NanumSquareRoundB.woff2") format("woff2"); font-display: swap; }

/* ── 1) 색 · 모서리 · 그림자 변수 — 쇼핑 탭 웹 화면 전체 + 검색 창 ── */
${S} { ${PALETTE} }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] { ${PALETTE} }

/* ── 2) 바탕 — 크레파스 배경 대신 점 무늬 속지(꾸밈 배경만 교체, 내용은 그대로) ── */
${S} body { ${DOT_PAPER} background-attachment: fixed; }
${S} .global-aurora { opacity: 0; }
/* 본문 글꼴 — 앱 시안 본문과 같은 둥근 글씨 / 제목은 카페24 */
${S} main { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; color: #3d2f2a; }
${S} main :is(h1, h2, h3) { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; letter-spacing: -0.02em; }
/* 상품 원본 상세(공급사 이미지 · 글)는 원래 글꼴 그대로 */
${S} main [data-supplier-original-detail], ${S} main [data-supplier-original-detail] * { font-family: var(--font-wanted-sans), sans-serif; }

/* ── 3) 버튼 — 스티커북 자수 와펜(Patch와 같은 결: 새틴 실 테두리 + 천 결 + 바느질 땀) · 크기 · 위치는 그대로, 모양만 ── */
/* 분홍 와펜 — 주 버튼(장바구니 · 구매 · 옵션 담기 확정 · 주문서 · 결제창 열기) */
${S} main :is(button, a).bg-indigo-600, ${S} main .btn-primary { ${PATCH_PINK} }
/* 크림 와펜 — 보조 버튼(장바구니 담기 · 옵션 추가 · 찜하기) */
${S} [data-pet-guide-target="product-actions"] > button:not(.bg-indigo-600):not([aria-label="찜 해제"]),
${S} [data-product-detail-content] .fixed.bottom-0 button[class*="border-2"],
${S} [data-purchase-option-sheet] button[data-add-option], ${S} main .btn-secondary { ${PATCH_CREAM} }
/* 찜 해제(찜한 상태) — 분홍 와펜으로 찜한 것이 바로 보이게 */
${S} main button[aria-label="찜 해제"] { ${PATCH_PINK} }
/* 입혀보기 — 보라 와펜(안쪽 그림 칸은 동그란 스티커) */
${S} [data-pet-guide-target="try-on"] { ${PATCH_LAVENDER} }
${S} [data-pet-guide-target="try-on"] > span[class*="h-11"] { border-radius: 999px; }
/* 와펜 공통 — 비활성은 옅게, 누르면 천처럼 폭신하게 꺼짐 */
${S} main :is(.bg-indigo-600, .btn-primary, .btn-secondary, [data-add-option], [data-pet-guide-target="try-on"], [data-pet-guide-target="product-actions"] > button):disabled { opacity: .55; }
${S} main :is(button, a):is(.bg-indigo-600, .btn-primary, .btn-secondary, [data-add-option], [data-pet-guide-target="try-on"], [aria-label="찜하기"], [aria-label="찜 해제"]):not(:disabled):active,
${S} [data-product-detail-content] .fixed.bottom-0 button:not(:disabled):active { transform: scale(.96); transition-duration: .12s; }
/* 버튼 속 장바구니 · 하트 — 글자 아이콘 대신 자수 그림(찜하면 흰 실로 채운 하트, 찜 전은 테두리만 수놓은 하트) */
${S} [data-product-detail-content] button i.fa-bag-shopping, ${S} [data-product-detail-content] button i.fa-heart {
  display: inline-block; width: 1.7rem; height: 1.7rem; vertical-align: middle; background: ${EMB_BAG} center / contain no-repeat;
  filter: drop-shadow(0 1px 1px rgba(120, 60, 60, .22)); }
${S} [data-product-detail-content] button i.fa-heart { width: 1.9rem; height: 1.9rem; background-image: ${HEART_OFF}; }
${S} [data-product-detail-content] button i.fa-heart.fa-solid { background-image: ${HEART_ON}; }
${S} [data-product-detail-content] button :is(i.fa-bag-shopping, i.fa-heart)::before { content: ""; }
/* 같이 보면 좋은 상품 카드의 작은 찜 버튼 — 같은 자수 하트를 작게 */
${S} [data-product-detail-content] article[data-pet-product] button i.fa-heart { width: 1.15rem; height: 1.15rem; }

/* 상품 상세 뒤로 가기(AppShell, 상단바 바로 아래) — 크림 자수 와펜 동그라미 */
html.ddb-app-mode .app-back-patch { ${PATCH_CREAM} display: grid; place-items: center; width: 44px; height: 44px; outline-offset: -6px; }
html.ddb-app-mode .app-back-patch:active { transform: scale(.92); transition-duration: .12s; }
/* 뒤로 가기 줄 바로 다음 화면은 자기 위 여백을 줄여 버튼과 제목 사이가 벌어지지 않게(뒤로 가기 줄이 그 자리를 대신함) */
html.ddb-app-mode .app-backrow + main { padding-top: 6px; }

/* 링크 복사 · 공유 — 흰 칼선 동그라미 스티커 */
${S} main button:is([aria-label="링크 복사"], [aria-label="공유"]) { border-radius: 999px; border-color: #fff; border-width: 2px; background: #fff; color: #c4456f;
  box-shadow: 0 0 0 1.5px #f3e1d6, 0 5px 9px -5px rgba(110, 80, 40, .5); }

/* ── 4) 상품 상세 ── */
/* 맨 위 사진 — 크림 종이 여백 + 흰 폴라로이드 테두리 액자(사진 위에 겹친 꾸밈 테두리 · 눌리지 않음) + 위 테이프.
   사진 · 영상의 위치 · 크기는 그대로, 가장자리만 액자로 덮인다 */
${S} [data-product-gallery] { border-color: transparent; box-shadow: none; }
${S} [data-product-gallery]::before { content: ""; position: absolute; inset: 0; z-index: 2; pointer-events: none; box-shadow: inset 0 0 0 12px #fffdf8; }
${S} [data-product-gallery]::after { content: ""; position: absolute; inset: 12px; z-index: 2; pointer-events: none; border: 7px solid #fff; border-bottom-width: 20px; border-radius: 4px;
  box-shadow: 0 0 0 1px #f0e2d6, 0 10px 16px -9px rgba(110, 80, 40, .5); }
/* 영상 안내 글씨는 액자 위로 */
${S} [data-product-gallery] > span.absolute { z-index: 3; }
${S} div:has(> [data-product-gallery]) { position: relative; }
${S} div:has(> [data-product-gallery])::before { ${TAPE} top: 5px; left: 50%; width: 72px; height: 16px; margin-left: -36px; z-index: 4; rotate: -2deg; }
/* 사진 넘김 작은 사진 — 흰 테두리 미니 폴라로이드(고른 표시 테두리는 그대로) */
${S} [data-product-detail-content] button[aria-label^="상품 이미지"] { border: 3px solid #fff; border-radius: 6px; filter: drop-shadow(0 3px 3px rgba(90, 60, 50, .28)); }
/* 고른 사진 표시 — 바깥 테두리(ring)는 옆으로 넘기는 줄에서 위가 잘려서, 같은 표시를 안쪽 테두리(분홍)로 그린다 */
${S} [data-product-detail-content] button[aria-label^="상품 이미지"][class*="ring-"] { box-shadow: none; }
${S} [data-product-detail-content] button[aria-label^="상품 이미지"][class*="ring-2"] { border-color: #e8628e; }
/* 색상 고르기 칸 — 노란 메모지 + 테이프, 색 동그라미는 흰 칼선 스티커 */
${S} [data-pet-guide-target="color"] { position: relative; border-color: transparent; background: #fffbea; border-radius: 6px 6px 16px 6px; box-shadow: 0 8px 14px -12px rgba(110, 80, 40, .5); }
${S} [data-pet-guide-target="color"]::before { ${TAPE} top: -6px; left: 50%; width: 52px; margin-left: -26px; rotate: -3deg; }
${S} main :is([data-pet-guide-target="color"], [data-purchase-option-sheet]) button.rounded-full { border: 2.5px solid #fff; filter: drop-shadow(0 3px 3px rgba(90, 60, 50, .3)); }
/* 브랜드 이름 · 제목 — 카페24, 제목엔 형광펜 밑칠(줄마다) */
${S} [data-product-detail-content] p.uppercase { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${S} main :is(h1, h2), ${S} #delivery-return-policy :is(h3, h4) { text-decoration: underline; text-decoration-color: rgba(255, 196, 216, .75); text-decoration-thickness: .38em;
  text-underline-offset: -.22em; text-decoration-skip-ink: none; }
${S} #delivery-return-policy h4 { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; text-decoration-color: rgba(255, 232, 150, .8); }
/* 가격 아래 구분선 — 바느질 점선 */
${S} [data-product-detail-content] div.h-px { background: repeating-linear-gradient(90deg, #e8cfc2 0 6px, transparent 6px 11px); }
/* 재고 안내 — 포스트잇 + 테이프 / 미리보기 기간 안내 — 작은 메모 띠 */
${S} [data-product-detail-content] div[data-inventory-state] { position: relative; }
${S} [data-product-detail-content] div[data-inventory-state]::before { ${TAPE} top: -6px; left: 18px; width: 44px; rotate: -4deg; background: repeating-linear-gradient(90deg, rgba(255,214,140,.92) 0 7px, rgba(255,232,180,.92) 7px 14px); }
${S} p[data-checkout-contract] { padding: 6px 10px; background: #fff6c9; color: #7a5a20; border-radius: 4px 4px 12px 4px; box-shadow: 0 6px 10px -8px rgba(110, 80, 40, .5); }
/* 아래 고정 구매 바 — 크림 종이 + 바느질 점선 */
${S} [data-product-detail-content] .fixed.bottom-0.border-t { background: rgba(255, 253, 248, .92); border-top: 2px dashed #f0d9cf; }
/* 상세 탭(상세정보 · 후기 · Q&A) — 카페24 + 마스킹테이프 밑줄 */
${S} nav[aria-label="상세정보"] { background: rgba(255, 253, 248, .94); border-color: #f0dfd2; }
${S} nav[aria-label="상세정보"] a { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${S} nav[aria-label="상세정보"] a > span.absolute { height: 5px; border-radius: 1px; background: repeating-linear-gradient(90deg, #f9a8c0 0 6px, #fdcbd9 6px 12px); }
/* 상품 원본 상세 이미지 — 다이어리에 붙인 사진 종이(흰 여백 + 양쪽 위 테이프) */
${S} [data-supplier-original-detail] { position: relative; border-radius: 3px; box-shadow: 0 0 0 7px #fff, 0 0 0 8px #f0e2d6, 0 16px 24px -16px rgba(110, 80, 40, .55); }
${S} [data-supplier-original-detail]::before { ${TAPE} top: -12px; left: -6px; width: 58px; height: 16px; rotate: -12deg; }
${S} [data-supplier-original-detail]::after { ${TAPE} top: -12px; right: -6px; width: 58px; height: 16px; rotate: 10deg; background: repeating-linear-gradient(90deg, rgba(190,224,255,.92) 0 7px, rgba(215,236,255,.92) 7px 14px); }
/* 상세 안 카드(후기 · 문의) — 종이 카드 */
${S} main section:is([class*="rounded-2xl"], [class*="rounded-xl"])[class*="border"]:not([class*="ring-"]) { border-color: #f3e6d6; box-shadow: 0 10px 18px -14px rgba(110, 80, 40, .5); }
/* 배송 및 반품 안내 — 편지지(줄 없음) + 위 항공우편 줄무늬 + 테이프 */
${S} #delivery-return-policy { position: relative; border-color: #f3e6d6; border-radius: 6px;
  background: repeating-linear-gradient(135deg, #f6a9bf 0 8px, #fff 8px 16px, #a9d3f6 16px 24px, #fff 24px 32px) top / 100% 6px no-repeat, #fffdf6; }
${S} #delivery-return-policy::before { ${TAPE} top: -7px; left: 50%; width: 64px; margin-left: -32px; rotate: 2deg; }
${S} #delivery-return-policy li::marker { color: #f283a3; }
/* 후기 — 후기 한 장 한 장은 메모 카드, 요약 키워드는 동그란 스티커 */
${S} [data-review-panel] article[class*="border"] { border-color: #f3e6d6; background: #fffefb; border-radius: 6px 6px 16px 6px; box-shadow: 0 8px 14px -12px rgba(110, 80, 40, .45); }
${S} [data-review-panel] span[class*="rounded-md"][class*="bg-white"] { border-radius: 999px; box-shadow: 0 0 0 1.5px #f6c9d6, 0 3px 5px -3px rgba(110, 80, 40, .35); }

/* 상세 접기(앱 전용, ProductTabs AppDetailFold) — 공급사 원본 · 편집 상세를 820px에서 접고 아래 흐림 + "상세정보 더보기" 크림 와펜.
   overflow: hidden으로 실제로 잘라 페이지 길이도 줄인다(clip-path만 쓰면 숨은 부분 길이만큼 빈 화면이 계속 내려감).
   위 · 양옆 테이프와 흰 사진 여백이 잘리지 않게 안쪽 여백 + 같은 크기 바깥 음수 여백(위치 변화 없음) */
${S} [data-app-detail-fold="closed"] > [data-app-detail-fold-body] { position: relative; max-height: 836px; overflow: hidden; padding: 16px 12px 0; margin: -16px -12px 0; }
${S} [data-app-detail-fold-fade] { display: block; z-index: 5; }
${S} [data-app-detail-fold-toggle] { display: flex; }
/* 접힌 상태에선 버튼을 상세 이미지 아래 끝(흐림 위)에 걸쳐 놓아 "이어지는 내용"이 있다는 걸 바로 알게 — 펼치면 원래 자리 */
${S} [data-app-detail-fold="closed"] > [data-app-detail-fold-toggle] { position: relative; z-index: 6; margin-top: -38px; }
${S} [data-app-detail-fold-toggle] button { ${PATCH_CREAM} }
${S} [data-app-detail-fold-toggle] button:active { transform: scale(.96); transition-duration: .12s; }

/* 상품 문의(Q&A) — 편지지 카드 + 테이프, "챗봇에 문의"는 분홍 와펜(누르면 케어톡 그대로) */
${S} #tab-qna > div[class*="border"] { position: relative; border-color: #f3e6d6; border-radius: 6px 6px 18px 6px; background: #fffdf6;
  box-shadow: 0 10px 18px -14px rgba(110, 80, 40, .5); }
${S} #tab-qna > div[class*="border"]::before { ${TAPE} top: -7px; left: 50%; width: 60px; margin-left: -30px; rotate: -2deg; }
/* 아이콘 동그라미(말풍선)는 빼기로(사용자 결정 2026-10-16) — 꾸밈 그림만 숨김, 제목 · 설명 · 버튼은 그대로 */
${S} #tab-qna > div > div[class*="rounded-full"] { display: none; }
${S} #tab-qna > div > button { ${PATCH_PINK} }
${S} #tab-qna > div > button:active { transform: scale(.96); transition-duration: .12s; }

/* 같이 보면 좋은 상품(상세 맨 아래) — 작은 카드 한 줄을 옆으로 밀어서 넘기기(사용자 결정 2026-10-16).
   카드 속 색상 미리보기 칩 · "n가지 색상"은 여기서만 숨김(색상은 상세에서 고름 · 앱 쇼핑 카드와 같게) */
${S} main:has([data-product-detail-content]) section:has(> header + div > article[data-pet-product="true"]) > div {
  display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain;
  margin: 0 -16px; padding: 6px 16px 14px; scroll-padding-left: 16px; scrollbar-width: none; }
${S} main:has([data-product-detail-content]) section:has(> header + div > article[data-pet-product="true"]) > div::-webkit-scrollbar { display: none; }
${S} main:has([data-product-detail-content]) section:has(> header + div > article[data-pet-product="true"]) > div > article { flex: 0 0 42%; max-width: 180px; scroll-snap-align: start; }
${S} main:has([data-product-detail-content]) section:has(> header + div > article[data-pet-product="true"]) article > div:has(> [role="group"]) { display: none; }

/* ── 5) 옵션 고르기 판(장바구니 담기 · 바로 구매) — 점 무늬 속지 + 위 테이프 ── */
${S} [data-purchase-option-sheet] { ${DOT_PAPER} border-radius: 24px 24px 0 0; box-shadow: 0 -10px 30px -12px rgba(110, 70, 55, .45); }
${S} [data-purchase-option-sheet="open"]::before { ${TAPE} top: -5px; left: 50%; width: 64px; margin-left: -32px; rotate: -2deg; }
${S} [data-purchase-option-sheet] h2 { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${S} [data-purchase-option-sheet] > div { border-color: #f0dfd2; }
${S} [data-purchase-option-sheet] :is(select, [class*="border-neutral-200"]) { background-color: #fff; }
/* 판 안 상품 사진 — 흰 테두리 폴라로이드 */
${S} [data-purchase-option-sheet] div[class*="h-24"][class*="w-24"] { border: 4px solid #fff; filter: drop-shadow(0 4px 4px rgba(90, 60, 50, .28)); }

/* ── 안내 칸 — 색은 그대로 두고 모양만 메모지(경고 · 결제 · 테스트 안내 문구는 그대로) ── */
${S} main :is(div, p, section):is([class*="bg-amber-50"], [class*="bg-sky-50"], [class*="bg-rose-50"], [class*="bg-red-50"], [class*="bg-emerald-50"], [class*="bg-indigo-50"]):not([class*="rounded-full"]) {
  border-radius: 6px 6px 16px 6px; box-shadow: 0 8px 12px -10px rgba(110, 80, 40, .45); }
${S} main :is(div, p):is([class*="bg-amber-50"]):not([class*="rounded-full"]) { background-color: #fff6c9; border-color: #f7e2a2; }
${S} main p[class*="bg-neutral-50"] { border-radius: 6px 6px 16px 6px; background: #fff8ec; }

/* ── 6) 상품 카드(목록 · 관련 상품 · 베스트 · 신상품 · 카테고리 · 검색 결과) — 크래프트 종이 스크랩 ── */
${S} article[data-pet-product="true"] { position: relative; background: #fffaf2; border-radius: 10px; }
${S} article[data-pet-product="true"]::after { ${TAPE} top: 0; left: 50%; width: 46px; margin-left: -23px; border-radius: 0 0 2px 2px; }

/* ── 7) 장바구니 · 결제 — 종이 카드(색 · 모서리만, 결제 수단 고유색 · 안내 문구는 그대로) ── */
${S} main :is(div, section, li, form)[class*="rounded"][class*="border-neutral-200"][class*="bg-white"]:not([class*="ring-"]) { border-color: #f3e6d6; box-shadow: 0 10px 18px -14px rgba(110, 80, 40, .45); }
${S} main :is(input, select, textarea) { background-color: #fff; }
${S} main :is(input, select, textarea):focus { border-color: #f283a3; }

/* ── 9) 산책 친구 빠른 메뉴(강아지를 누르면 뜨는 창, 협업자 PetCompanionLayer) — 점 무늬 속지 + 테이프 · 카페24 제목 ·
   크림 자수 와펜 카드 버튼 · 우리 3D 그림(집 = companion-house, 설정 = companion-settings). 누르는 동작 · 창 위치는 그대로 ── */
html.ddb-app-mode #pet-companion-quick-actions { ${DOT_PAPER} border: 0; border-radius: 22px; padding-top: 16px;
  box-shadow: 0 0 0 1.5px #f1e3da, 0 22px 44px -20px rgba(110, 70, 55, .55); }
html.ddb-app-mode #pet-companion-quick-actions::before { ${TAPE} top: -6px; left: 50%; width: 58px; margin-left: -29px; rotate: -2deg; }
html.ddb-app-mode #pet-companion-quick-actions > h2 { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; font-size: 15px; color: #3d2f2a; letter-spacing: -0.02em; }
html.ddb-app-mode #pet-companion-quick-actions button[aria-label="빠른 메뉴 닫기"] { color: #b39b90; }
html.ddb-app-mode #pet-companion-quick-actions [data-pet-quick-action] { ${PATCH_CREAM} border-radius: 18px; outline-offset: -6px; min-height: 84px; gap: 4px; padding: 8px 6px 9px; font-size: 13px; }
html.ddb-app-mode #pet-companion-quick-actions [data-pet-quick-action]:active { transform: scale(.95); transition-duration: .12s; }
/* 이모지(🏠 🐾) 자리에 우리 그림 — 글자는 0 크기로 숨기고 그림만 */
html.ddb-app-mode #pet-companion-quick-actions [data-pet-quick-action] > span:first-child { display: block; width: 38px; height: 38px; font-size: 0; line-height: 0;
  background: center / contain no-repeat; filter: drop-shadow(0 3px 3px rgba(120, 70, 50, .25)); }
html.ddb-app-mode #pet-companion-quick-actions [data-pet-quick-action="home"] > span:first-child { background-image: url("/images/ui/stickers/companion-house.webp"); }
html.ddb-app-mode #pet-companion-quick-actions [data-pet-quick-action="settings"] > span:first-child { background-image: url("/images/ui/stickers/companion-settings.webp"); }

/* ── 10) 산책 친구 설정 창(빠른 메뉴 "설정하기") — 점 무늬 속지 · 테이프 · 카페24 제목(영문 꼬리표 숨김) · 흰 둥근 입력칸 ·
   고른 털색은 분홍 스티커 · 아래 버튼은 자수 와펜(취소 = 크림, 저장 = 분홍). 입력 · 저장 동작은 협업자 것 그대로 ── */
/* 창이 산책 친구 층 안에 있어 앱 탭바(z 2150)에 아래 버튼이 가려짐 → 창이 열려 있는 동안만 탭바를 숨김(닫으면 다시 보임) */
html.ddb-app-mode body:has(section[aria-labelledby="pet-companion-title"]) nav[aria-label="앱 메뉴"] { visibility: hidden; }
${P} { ${DOT_PAPER} border: 0; border-radius: 24px; box-shadow: 0 0 0 1.5px #f1e3da, 0 26px 50px -22px rgba(110, 70, 55, .6); }
${P}::before { ${TAPE} top: -6px; left: 50%; width: 64px; margin-left: -32px; rotate: -2deg; }
${P} > header { background: transparent; border-bottom: 2px dashed #f0d9cf; }
${P} > header > div > span:first-child { display: none; }
${P} h2 { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; color: #3d2f2a;
  text-decoration: underline; text-decoration-color: rgba(255, 196, 216, .75); text-decoration-thickness: .38em; text-underline-offset: -.22em; text-decoration-skip-ink: none; }
${P} button[aria-label="설정 닫기"] { border: 0; border-radius: 999px; background: #fff; color: #b39b90; box-shadow: 0 0 0 1.5px #f1e3da, 0 4px 8px -5px rgba(110, 80, 40, .45); }
${P} > div > div:first-child { border-radius: 18px; background-color: #fff6ee; box-shadow: inset 0 0 0 2px #fff, 0 8px 14px -12px rgba(110, 80, 40, .5); }
${P} > div > div:first-child strong { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${P} :is(label, fieldset) > span:first-child, ${P} legend { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; color: #5c4a42; }
${P} :is(input:not([type="checkbox"]):not([type="radio"]), select) { border-radius: 14px; border-color: #efdfd2; background-color: #fff; color: #3d2f2a; }
${P} :is(input:not([type="checkbox"]):not([type="radio"]), select):focus { border-color: #f283a3; outline: none; box-shadow: 0 0 0 3px rgba(242, 131, 163, .18); }
${P} input[type="checkbox"] { accent-color: #e8628e; }
${P} button[data-selected] { border-radius: 999px; border-color: #f1e3da; background: #fff; }
${P} button[data-selected="true"] { border-color: #e8628e; background: #fff3f6; color: #c4456f; box-shadow: 0 0 0 2px #fde3ec; }
${P} label:has(> input[type="checkbox"]) { border-color: #f3e6d6; border-radius: 6px 6px 14px 6px; background: #fffaf2; }
${P} small { color: #9c8a80; }
${P} small a, ${P} [role="status"] b { color: #d4447a; }
${P} > footer { background: rgba(255, 253, 248, .96); border-top: 2px dashed #f0d9cf; }
${P} > footer > button:last-of-type { ${PATCH_PINK} }
${P} > footer > button:nth-last-of-type(2) { ${PATCH_CREAM} }
${P} > footer > button:active { transform: scale(.96); transition-duration: .12s; }
/* 설정 창 2차 — 양식 느낌을 다이어리 느낌으로(사용자 2026-10-16 "아직 컨셉과 안 맞음")
   본문 글꼴 · 미리보기 폴라로이드 + 점선 산책길 · 항목 이름은 색 마스킹테이프 이름표 · 입력칸은 테두리 없는 흰 종이 ·
   털 색상은 흰 칼선 동그라미 스티커 · 체크 두 줄은 노랑 · 민트 포스트잇 */
${P} { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; color: #3d2f2a; }
${P} > header p { color: #8a766c; }
${P} > div > div:first-child { background: radial-gradient(circle, rgba(196,160,140,.22) 1px, transparent 1.3px) 0 0 / 14px 14px, linear-gradient(170deg, #fff8ee, #fdeee6);
  border-radius: 6px; box-shadow: inset 0 0 0 7px #fff, inset 0 0 0 8px #f1e3da, 0 10px 16px -12px rgba(110, 80, 40, .5); }
${P} > div > div:first-child::after { height: 0; background: none; border-top: 2px dashed rgba(196, 150, 130, .45); }
${P} > div > div:first-child span { color: #9c8a80; }
/* 미리보기 스티커 표시 — 위 테이프 · 강아지는 흰 칼선으로 오려 붙인 스티커 · 이름은 테이프 이름표 */
${P} > div > div:first-child::before { ${TAPE} top: 3px; left: 50%; width: 70px; height: 15px; margin-left: -35px; rotate: -2deg; }
${P} > div > div:first-child > :first-child { filter: drop-shadow(2.5px 0 0 #fff) drop-shadow(-2.5px 0 0 #fff) drop-shadow(0 2.5px 0 #fff) drop-shadow(0 -2.5px 0 #fff) drop-shadow(0 6px 6px rgba(120, 70, 60, .28)); }
${P} > div > div:first-child strong { display: inline-block; width: fit-content; justify-self: end; padding: 3px 12px 2px; rotate: -2deg; font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; color: #5c3f36;
  clip-path: polygon(0 0, 100% 0, 95% 25%, 100% 50%, 95% 75%, 100% 100%, 0 100%, 5% 75%, 0 50%, 5% 25%);
  background: repeating-linear-gradient(90deg, rgba(255,200,218,.95) 0 8px, rgba(255,222,232,.95) 8px 16px); }
/* 항목 이름 — 마스킹테이프 이름표(양 끝 지그재그 · 살짝 기울기) */
${PG} > label:nth-child(1) > span:first-child, ${PG} > div:nth-child(2) > label:first-child, ${PG} > fieldset legend, ${PG} > div:nth-child(4) > label > span:first-child {
  display: inline-block; width: fit-content; padding: 3px 12px 2px; rotate: -1deg; font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; font-size: 13px; color: #5c3f36;
  clip-path: polygon(0 0, 100% 0, 96% 25%, 100% 50%, 96% 75%, 100% 100%, 0 100%, 4% 75%, 0 50%, 4% 25%);
  background: repeating-linear-gradient(90deg, rgba(255,200,218,.95) 0 8px, rgba(255,222,232,.95) 8px 16px); }
${PG} > div:nth-child(2) > label:first-child { background: repeating-linear-gradient(90deg, rgba(190,224,255,.95) 0 8px, rgba(214,236,255,.95) 8px 16px); rotate: .8deg; }
${PG} > fieldset legend { background: repeating-linear-gradient(90deg, rgba(255,226,140,.95) 0 8px, rgba(255,239,190,.95) 8px 16px); }
${PG} > div:nth-child(4) > label > span:first-child { background: repeating-linear-gradient(90deg, rgba(186,236,206,.95) 0 8px, rgba(214,245,226,.95) 8px 16px); rotate: .8deg; }
/* 입력칸 — 테두리 대신 종이 그림자 */
${P} :is(input:not([type="checkbox"]):not([type="radio"]), select) { border-color: transparent; box-shadow: 0 0 0 1.5px #f3e6d6, 0 4px 8px -6px rgba(110, 80, 40, .4); }
/* 견종 검색 결과 · 털 색상 — 흰 칼선 동그라미 스티커 */
${P} button[data-selected] { border-color: transparent; box-shadow: 0 0 0 1.5px #f1e3da, 0 4px 7px -5px rgba(110, 80, 40, .45); }
${P} button[data-selected="true"] { box-shadow: 0 0 0 2px #e8628e, 0 0 0 5px #fde3ec, 0 4px 7px -5px rgba(110, 80, 40, .45); }
${P} button[data-selected] > span[style] { box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(110, 80, 40, .15); }
/* 체크 두 줄 — 포스트잇 */
${P} label:has(> input[type="checkbox"]) { border: 0; border-radius: 4px 4px 14px 4px; background: #fff6c9; box-shadow: 0 6px 10px -8px rgba(110, 80, 40, .5); }
${P} label:has(> input[type="checkbox"]) + label:has(> input[type="checkbox"]) { background: #e9f8ef; }
${P} label:has(> input[type="checkbox"]) > span { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${P} > footer > button { font-size: 14px; }

/* 비회원 저장 안내(가입 권유) — 메모지 + 와펜 버튼 */
html.ddb-app-mode [data-pet-companion-guest-save-alert] { ${DOT_PAPER} border: 0; border-radius: 20px; box-shadow: 0 0 0 1.5px #f1e3da, 0 18px 36px -18px rgba(110, 70, 55, .55); }
html.ddb-app-mode [data-pet-companion-guest-save-alert] h3 { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
html.ddb-app-mode [data-pet-companion-guest-save-alert] [data-pet-companion-signup-cta] { ${PATCH_PINK} }
html.ddb-app-mode [data-pet-companion-guest-save-alert] button:not([data-pet-companion-signup-cta]) { ${PATCH_CREAM} }

/* ── 8) 검색 창(앱 모드 어디서나) — 점 무늬 속지 + 테이프 · 검색칸은 흰 둥근 종이 ── */
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] { ${DOT_PAPER} color: #3d2f2a; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif;
  box-shadow: 0 0 0 1.5px #f1e3da, 0 24px 48px -22px rgba(110, 70, 55, .55); }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] > div:first-child { background: rgba(255, 253, 248, .96); border-bottom: 2px dashed #f0d9cf; }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] input { background: #fff; box-shadow: 0 3px 8px -5px rgba(110, 80, 40, .35); }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] h3 { color: #b07f6b; }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] :is(a, button)[class*="rounded-full"][class*="bg-neutral-100"],
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] span[class*="rounded-full"][class*="bg-neutral-100"] { background: #fff; box-shadow: 0 0 0 1.5px #f3e6d6; }
/* ── 11) 장바구니(/cart) — 스크랩 카드 · 폴라로이드 사진 · 스티커 버튼 · 영수증 메모 (버튼 · 링크 · 수량 동작은 그대로) ── */
/* 전체 선택 줄 — 크림 종이 띠 */
${CART} main main > div > section > div:first-child { background: #fffdf6; border-radius: 14px; box-shadow: 0 0 0 1.5px #f3e6d6, 0 6px 10px -8px rgba(110, 80, 40, .45); }
/* 고르기 동그라미(체크) — 와펜 대신 작은 분홍 스티커 동그라미 */
${CART} main button.h-5.w-5 { border-radius: 999px; outline: none; box-shadow: 0 0 0 2px #fff, 0 2px 4px -2px rgba(110, 80, 40, .4); }
${CART} main button.h-5.w-5.bg-indigo-600 { border: 2px solid #e8628e; background: #e8628e; font-family: inherit; text-shadow: none; }
/* 상품 한 줄 — 크래프트 스크랩 카드 + 위 테이프 · 사진은 흰 테두리 폴라로이드 */
${CART} main article.surface { background: #fffaf2; border: 0; border-radius: 10px; box-shadow: 0 0 0 1.5px #f3e6d6, 0 10px 18px -12px rgba(110, 80, 40, .5); }
${CART} main article.surface::before { ${TAPE} top: -6px; left: 50%; width: 52px; margin-left: -26px; rotate: -2deg; }
${CART} main article.surface > a:first-of-type, ${CART} main article.surface > div[class*="h-24"] { border: 4px solid #fff; border-radius: 6px; filter: drop-shadow(0 4px 4px rgba(90, 60, 50, .28)); }
${CART} main article.surface :is(p, a)[class*="font-black"][class*="text-sm"], ${CART} main article.surface p.text-lg { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
/* 삭제 — 크림 동그란 스티커 */
${CART} main article.surface > button[class*="absolute"] { border-color: #fff; border-radius: 999px; background: #fff; color: #b39b90; box-shadow: 0 0 0 1.5px #f1e3da, 0 4px 7px -5px rgba(110, 80, 40, .45); }
/* 수량 — 동그란 알약 스티커 */
${CART} main article.surface div[class*="inline-flex"][class*="h-9"][class*="border"] { border-color: transparent; border-radius: 999px; box-shadow: 0 0 0 1.5px #f1e3da, 0 4px 7px -5px rgba(110, 80, 40, .45); }
${CART} main article.surface div[class*="inline-flex"][class*="h-9"] button { color: #e8628e; }
/* "누구를 위한 상품인가요?" — 분홍 메모, 등록 버튼은 작은 분홍 와펜 */
${CART} main article.surface a[class*="bg-neutral-950"] { ${PATCH_PINK} display: inline-block; border-width: 2px; outline: none; padding: 7px 16px 6px; font-size: 12.5px; line-height: 1; }
/* 작은 글씨라 카페24는 흐려 보여서(사용자 2026-10-16) — 또렷한 둥근 본문 글꼴(굵게) · 그림자 없이 · 한 톤 진한 분홍 바탕 */
${CART} main article.surface a[class*="bg-neutral-950"] { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; font-size: 13px; letter-spacing: 0; text-shadow: none;
  background: linear-gradient(#e0557f, #e0557f) padding-box, repeating-linear-gradient(72deg, #c23d6c 0 2px, #d4447a 2px 3.4px) border-box; }
/* 주문 합계 — 영수증 메모(위 테이프 · 점선 구분선) */
${CART} main aside.surface { position: relative; border: 0; border-radius: 6px 6px 18px 6px; background: #fffdf6; box-shadow: 0 0 0 1.5px #f3e6d6, 0 12px 20px -14px rgba(110, 80, 40, .5); }
${CART} main aside.surface::before { ${TAPE} top: -6px; left: 50%; width: 60px; margin-left: -30px; rotate: 2deg; }
${CART} main aside.surface [class*="border-t"] { border-top: 2px dashed #ecd5c8; }
${CART} main aside.surface b[class*="text-2xl"] { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
/* 빈 장바구니 — 큰 아이콘 대신 같은 자리에 자수 장바구니 */
${CART} main main > i.fa-bag-shopping { display: inline-block; width: 3.5rem; height: 3.5rem; background: ${EMB_BAG} center / contain no-repeat; }
${CART} main main > i.fa-bag-shopping::before { content: ""; }

/* ── 12) 검색 창 2차 — 테이프 이름표 제목 · 파스텔 스티커 키워드 · 폴라로이드 결과 사진 · 와펜 "전체 결과" (검색 · 이동 동작 그대로) ── */
${SEARCH}::before { ${TAPE} top: 4px; left: 50%; width: 64px; margin-left: -32px; rotate: -2deg; z-index: 20; }
${SEARCH} { border-radius: 24px; }
${SEARCH} form i.fa-magnifying-glass { color: #e8628e; }
${SEARCH} form input { border-radius: 999px; border-color: transparent; }
${SEARCH} form input:focus { border-color: #f6a9bf; box-shadow: 0 0 0 3px rgba(242, 131, 163, .15); }
${SEARCH} form button[aria-label] { background: #fff; color: #b39b90; box-shadow: 0 0 0 1.5px #f1e3da; }
/* 칸 제목(검색 결과 · 인기 검색어 · 최근 검색어) — 마스킹테이프 이름표 */
${SEARCH} h3 { display: inline-block; width: fit-content; padding: 3px 11px 2px; rotate: -1deg; letter-spacing: 0; font-size: 12px; color: #5c3f36;
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400;
  clip-path: polygon(0 0, 100% 0, 95% 25%, 100% 50%, 95% 75%, 100% 100%, 0 100%, 5% 75%, 0 50%, 5% 25%);
  background: repeating-linear-gradient(90deg, rgba(255,200,218,.95) 0 8px, rgba(255,222,232,.95) 8px 16px); }
${SEARCH} section + section h3, ${SEARCH} section:nth-of-type(2) h3 { background: repeating-linear-gradient(90deg, rgba(190,224,255,.95) 0 8px, rgba(214,236,255,.95) 8px 16px); }
/* 인기 검색어 — 파스텔 스티커(돌아가며 색) */
${SEARCH} section .flex-wrap > button[class*="rounded-full"] { background: #ffe9f0; box-shadow: 0 0 0 2px #fff, 0 3px 6px -3px rgba(110, 80, 40, .4); font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; }
${SEARCH} section .flex-wrap > button[class*="rounded-full"]:nth-child(4n+2) { background: #e6f3ff; }
${SEARCH} section .flex-wrap > button[class*="rounded-full"]:nth-child(4n+3) { background: #fff4c7; }
${SEARCH} section .flex-wrap > button[class*="rounded-full"]:nth-child(4n+4) { background: #e5f7ec; }
${SEARCH} section .flex-wrap > button[class*="rounded-full"] span { color: #d4447a; }
/* 최근 검색어 — 점선 테두리 흰 스티커 */
${SEARCH} section .flex-wrap > span[class*="rounded-full"] { background: #fff; box-shadow: none; outline: 1.5px dashed #f2b6c8; outline-offset: -1.5px; }
/* 검색 결과 줄 — 사진은 흰 테두리 미니 폴라로이드, 상품명은 둥근 글씨 */
${SEARCH} ul button > div:first-child { border: 3px solid #fff; border-radius: 6px; filter: drop-shadow(0 3px 3px rgba(90, 60, 50, .28)); }
${SEARCH} ul button:active { background: rgba(255, 233, 240, .6); }
/* 전체 결과 보기 — 크림 와펜 */
${SEARCH} ul + button { ${PATCH_CREAM} }
${SEARCH} ul + button:active { transform: scale(.97); }

/* ── 13) 장바구니 2차(사용자 "진행" 2026-10-16) — 제목 테이프 이름표 · 안내 포스트잇 · 전체선택 메모 띠 · 적립 스티커 꼬리표 ·
   빠른 결제 버튼 둥글게(결제 업체 색은 그대로) · 빈 장바구니 메모 카드. 문구 · 버튼 동작은 그대로 ── */
/* 화면 제목(장바구니 · 주문/결제) — 쇼핑 탭 색 마스킹테이프 이름표(양 끝 지그재그 · 살짝 기울기) */
${CART} main main:not(.text-center) > h1, ${CHECKOUT} main main:not(.text-center) > h1 {
  display: inline-block; width: fit-content; padding: 7px 20px 6px; rotate: -1deg; text-decoration: none; font-size: 1.55rem; line-height: 1; color: #a8480f;
  clip-path: polygon(0 0, 100% 0, 97% 20%, 100% 40%, 97% 60%, 100% 80%, 97% 100%, 0 100%, 3% 80%, 0 60%, 3% 40%, 0 20%);
  background: repeating-linear-gradient(90deg, rgba(251,201,162,.9) 0 9px, rgba(253,224,200,.9) 9px 18px);
  filter: drop-shadow(0 6px 5px rgba(110, 60, 50, .18)); }
/* 구매할 수 없는 옵션 안내 — 테이프 붙인 노란 포스트잇 */
${CART} main main > p[role="alert"] { position: relative; border-radius: 4px 4px 16px 4px; background: #fff3b8; box-shadow: 0 8px 12px -9px rgba(110, 80, 40, .5); }
${CART} main main > p[role="alert"]::before { ${TAPE} top: -6px; left: 22px; width: 46px; rotate: -4deg; background: repeating-linear-gradient(90deg, rgba(255,214,140,.92) 0 7px, rgba(255,232,180,.92) 7px 14px); }
/* 전체선택 줄 — 메모지 띠(왼쪽 분홍 테이프) */
${CART} main main > div > section > div:first-child { position: relative; background: #fffbea; border-radius: 4px 4px 14px 4px; box-shadow: 0 6px 10px -8px rgba(110, 80, 40, .45); }
${CART} main main > div > section > div:first-child::before { ${TAPE} top: 50%; left: -7px; width: 16px; height: 26px; margin-top: -13px; rotate: -6deg; }
/* 회원 적립 예상 — 바느질 점선 테두리 스티커 꼬리표 */
${CART} main aside.surface div[class*="border-indigo-100"] { border: 0; border-radius: 14px; background: #fff3f6; outline: 1.5px dashed #f2a3bd; outline-offset: -5px; box-shadow: 0 0 0 2px #fff, 0 6px 10px -8px rgba(110, 80, 40, .45); }
/* 빠른 결제(토스 · 휴대폰 · 네이버페이 · 카카오페이) — 결제 업체 색 그대로, 모양만 둥근 알약 + 종이 그림자 */
${CART} main aside.surface .grid > button { border-radius: 999px; box-shadow: 0 6px 10px -8px rgba(110, 80, 40, .5); }
/* 빈 장바구니 — 테이프 붙인 메모 카드(자수 장바구니 · 와펜 버튼) */
${CART} main main.text-center { position: relative; margin: 10px 16px 0; padding: 34px 18px 30px; border-radius: 6px 6px 20px 6px; background: #fffdf6;
  box-shadow: 0 0 0 1.5px #f3e6d6, 0 14px 22px -16px rgba(110, 80, 40, .55); }
html.ddb-app-mode .app-backrow + main.text-center { padding-top: 34px; }
${CART} main main.text-center::before { ${TAPE} top: -7px; left: 50%; width: 66px; margin-left: -33px; rotate: -2deg; }
${CART} main main.text-center > h1 { font-size: 1.15rem; text-decoration: none; }

/* ── 14) 옵션 고르기 판 2차(장바구니 담기 · 바로 구매, 사용자 2026-10-16 "살짝 부족") — 제목 테이프 이름표 · 닫기 스티커 ·
   바느질 점선 구분선 · 사진 폴라로이드 + 작은 테이프 · 수량 알약 스티커 · 고른 옵션 메모 · 합계 영수증 · 적립 꼬리표. 동작 그대로 ── */
${SHEET} > div:first-child { border-bottom: 2px dashed #f0d9cf; }
${SHEET} > div:first-child h2 { display: inline-block; width: fit-content; padding: 5px 16px 4px; rotate: -1.5deg; text-decoration: none; font-size: 1.15rem; line-height: 1; color: #9c2f54;
  clip-path: polygon(0 0, 100% 0, 96% 25%, 100% 50%, 96% 75%, 100% 100%, 0 100%, 4% 75%, 0 50%, 4% 25%);
  background: repeating-linear-gradient(90deg, rgba(255,200,218,.95) 0 9px, rgba(255,222,232,.95) 9px 18px); filter: drop-shadow(0 5px 4px rgba(110, 60, 50, .16)); }
${SHEET} button[aria-label="닫기"] { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 999px; background: #fff; color: #b39b90;
  box-shadow: 0 0 0 1.5px #f1e3da, 0 4px 8px -5px rgba(110, 80, 40, .45); }
/* 사진 — 폴라로이드 위 작은 테이프 */
${SHEET} div[class*="h-24"][class*="w-24"] { position: relative; overflow: visible; rotate: -1deg; }
${SHEET} div[class*="h-24"][class*="w-24"]::after { ${TAPE} top: -9px; left: 50%; width: 38px; height: 12px; margin-left: -19px; rotate: 4deg; }
${SHEET} div[class*="h-24"][class*="w-24"] > * { border-radius: 2px; overflow: hidden; }
${SHEET} p[class*="line-clamp-2"] { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; font-size: 15px; color: #3d2f2a; }
/* 옵션 이름표(필수) · 고른 옵션 줄 — 메모 */
${SHEET} :is(label, p)[class*="text-xs"][class*="font-black"] { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; color: #5c4a42; }
${SHEET} ul > li[class*="bg-neutral-50"] { background: #fffbea; border-radius: 4px 4px 12px 4px; box-shadow: 0 5px 8px -7px rgba(110, 80, 40, .5); }
/* 수량 — 알약 스티커 */
${SHEET} div[class*="inline-flex"][class*="h-11"][class*="border"] { border-color: transparent; border-radius: 999px; background: #fff; box-shadow: 0 0 0 1.5px #f1e3da, 0 4px 7px -5px rgba(110, 80, 40, .45); }
${SHEET} div[class*="inline-flex"][class*="h-11"] button { color: #e8628e; }
/* 아래 합계 — 크림 영수증(점선 위 줄) · 금액 카페24 · 적립 예상은 바느질 꼬리표 */
${SHEET} > div:last-child { background: rgba(255, 252, 245, .97); border-top: 2px dashed #f0d9cf; }
${SHEET} > div:last-child > div:first-child > span { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${SHEET} > div:last-child b[class*="text-2xl"] { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${SHEET} [data-daenglab-coin-estimate] { border-radius: 14px; background: #fff3f6; outline: 1.5px dashed #f2a3bd; outline-offset: -5px; box-shadow: 0 0 0 2px #fff, 0 6px 10px -8px rgba(110, 80, 40, .45); }

/* ── 15) 주문/결제(/checkout) — 테이프 붙인 종이 카드 · 흰 칼선 아이콘 스티커 · 테이프 이름표 칸 제목 · 종이 입력칸 ·
   결제수단은 스티커 카드(고른 것 분홍) · 주문 상품은 영수증. 결제 · 테스트 · 개인정보 안내 문구와 색, 토스 결제창, 입력 오류 표시는 그대로 ── */
/* 칸(배송지 · 배송 요청사항 · 예상 도착일 · 결제수단 · 저장된 배송지) — 테이프 붙인 종이 카드 */
${CHECKOUT} main section.surface, ${CHECKOUT} main aside.surface { position: relative; overflow: visible; border: 0; border-radius: 8px 8px 20px 8px; background: #fffdf6;
  box-shadow: 0 0 0 1.5px #f3e6d6, 0 12px 20px -14px rgba(110, 80, 40, .5); }
${CHECKOUT} main section.surface::before, ${CHECKOUT} main aside.surface::before { ${TAPE} top: -7px; left: 50%; width: 56px; margin-left: -28px; rotate: -2deg; }
${CHECKOUT} main [data-checkout-delivery-section] > section.surface:nth-of-type(2)::before { background: repeating-linear-gradient(90deg, rgba(190,224,255,.92) 0 7px, rgba(215,236,255,.92) 7px 14px); rotate: 2deg; }
${CHECKOUT} main section.surface[aria-labelledby="checkout-delivery-estimate-title"]::before { background: repeating-linear-gradient(90deg, rgba(186,236,206,.92) 0 7px, rgba(214,245,226,.92) 7px 14px); }
${CHECKOUT} main section.surface[aria-labelledby="checkout-payment-method-title"]::before { background: repeating-linear-gradient(90deg, rgba(255,226,140,.95) 0 7px, rgba(255,239,190,.95) 7px 14px); rotate: 1.5deg; }
/* 칸 머리 — 회색 띠 대신 투명 + 바느질 점선 · 아이콘 동그라미는 흰 칼선 스티커 */
${CHECKOUT} main section.surface > div[class*="border-b"] { background: transparent; border-bottom: 2px dashed #f0d9cf; border-radius: 8px 8px 0 0; }
${CHECKOUT} main section.surface span[class*="h-9"][class*="w-9"][class*="rounded-full"] { box-shadow: 0 0 0 2.5px #fff, 0 4px 7px -4px rgba(110, 80, 40, .45); }
${CHECKOUT} main :is(section.surface h2, legend#checkout-payment-method-title) { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400;
  text-decoration: underline; text-decoration-color: rgba(255, 196, 216, .75); text-decoration-thickness: .38em; text-underline-offset: -.22em; text-decoration-skip-ink: none; }
/* 입력칸 이름 · 입력칸 — 둥근 글씨 이름 + 테두리 없는 흰 종이(입력 오류 빨간 테두리는 그대로 보이게 제외) */
${CHECKOUT} main label[class*="text-xs"][class*="font-black"] { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; color: #5c4a42; }
${CHECKOUT} main :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea):not([aria-invalid="true"]):not([class*="border-red"]) {
  border-color: transparent; background-color: #fff; border-radius: 14px; box-shadow: 0 0 0 1.5px #f3e6d6, 0 4px 8px -6px rgba(110, 80, 40, .4); }
${CHECKOUT} main :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea):not([aria-invalid="true"]):not([class*="border-red"]):focus { box-shadow: 0 0 0 2px #f283a3, 0 0 0 5px rgba(242, 131, 163, .15); }
${CHECKOUT} main input[type="checkbox"] { accent-color: #e8628e; }
/* 우편번호 찾기 — 크림 와펜 */
${CHECKOUT} main button[class*="border-indigo-200"] { ${PATCH_CREAM} }
${CHECKOUT} main button[class*="border-indigo-200"]:active { transform: scale(.96); }
/* 결제수단 — 스티커 카드(고른 것은 분홍 테두리 + 분홍 종이 · 쓸 수 없는 것은 그대로 흐리게) */
${CHECKOUT} main button[data-payment-method] { border-radius: 16px; border-color: transparent; background: #fff; box-shadow: 0 0 0 1.5px #f1e3da, 0 5px 9px -7px rgba(110, 80, 40, .45); }
${CHECKOUT} main button[data-payment-method][aria-checked="true"] { background: #fff3f6; box-shadow: 0 0 0 2px #e8628e, 0 0 0 5px #fde3ec, 0 5px 9px -7px rgba(110, 80, 40, .45); }
${CHECKOUT} main button[data-payment-method]:disabled { background: #f7f0ea; box-shadow: 0 0 0 1.5px #efe4da; }
${CHECKOUT} main button[data-payment-method] > span:first-child > span { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${CHECKOUT} main button[data-payment-method]:not(:disabled):active { transform: scale(.97); }
/* 간편결제 약관 동의 — 노란 메모(문구 그대로) */
${CHECKOUT} main label:has(> input[type="checkbox"])[class*="bg-neutral-50"] { border: 0; border-radius: 4px 4px 14px 4px; background: #fffbea; box-shadow: 0 6px 10px -8px rgba(110, 80, 40, .45); }
/* 테스트 모드 안내 — 하늘 메모 + 핀 테이프(문구 · 색 그대로) */
${CHECKOUT} main [data-payment-mode="test"] { position: relative; border-width: 0; border-radius: 6px 6px 18px 6px; box-shadow: 0 0 0 1.5px #bfe0f7, 0 10px 16px -12px rgba(60, 110, 150, .45); }
${CHECKOUT} main [data-payment-mode="test"]::before { ${TAPE} top: -6px; left: 24px; width: 44px; rotate: -4deg; background: repeating-linear-gradient(90deg, rgba(190,224,255,.95) 0 7px, rgba(215,236,255,.95) 7px 14px); }
/* 주문 상품 — 영수증(점선 구분선 · 총 결제 카페24) */
${CHECKOUT} main aside.surface [class*="border-t"] { border-top: 2px dashed #ecd5c8; }
${CHECKOUT} main aside.surface :is(b, strong)[class*="text-2xl"], ${CHECKOUT} main aside.surface [class*="text-2xl"] { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }

/* ── 16) 주문/결제 2차(사용자 2026-10-16) — 칸 머리 3D 그림(배송지 · 배송요청 · 예상도착일) · 안내 상자 메모지 + 테이프 ·
   로그인하기 작은 와펜 · 작은 글씨는 또렷한 둥근 글꼴 · 결제수단 아이콘은 7개 모두 선 아이콘 그대로 색만 맞춤. 문구 · 색 · 동작 그대로 ── */
/* 칸 머리 아이콘 — 글자 아이콘 대신 사용자 3D 그림(동그라미 바탕 없이) */
${CHECKOUT} main section.surface span[class*="h-9"][class*="w-9"][class*="rounded-full"] { width: 46px; height: 46px; background-color: transparent; background-position: center; background-size: contain; background-repeat: no-repeat; box-shadow: none;
  filter: drop-shadow(0 4px 4px rgba(120, 70, 50, .22)); }
${CHECKOUT} main section.surface span[class*="h-9"][class*="w-9"][class*="rounded-full"] > i { visibility: hidden; }
${CHECKOUT} main section[aria-labelledby$="-address-title"] span[class*="h-9"][class*="w-9"] { background-image: url("/images/ui/stickers/checkout-address.webp"); }
${CHECKOUT} main section[aria-labelledby$="-request-title"] span[class*="h-9"][class*="w-9"] { background-image: url("/images/ui/stickers/checkout-request.webp"); }
${CHECKOUT} main section[aria-labelledby="checkout-delivery-estimate-title"] span[class*="h-9"][class*="w-9"] { background-image: url("/images/ui/stickers/checkout-arrival.webp"); }
/* 안내 상자 — 하늘 메모 · 노란 포스트잇 · 빨간 경고 메모 + 위 테이프(문구 · 색 그대로) */
${CHECKOUT} main :is(div, p):is([class*="bg-sky-50"], [class*="bg-amber-50"], [class*="bg-red-50"]):not([data-payment-mode]) { position: relative; border-width: 0; border-radius: 4px 4px 16px 4px; }
${CHECKOUT} main :is(div, p)[class*="bg-sky-50"]:not([data-payment-mode]) { box-shadow: 0 0 0 1.5px #c7e4f8, 0 8px 12px -10px rgba(60, 110, 150, .45); }
${CHECKOUT} main :is(div, p)[class*="bg-amber-50"] { background-color: #fff3b8; box-shadow: 0 8px 12px -9px rgba(110, 80, 40, .5); }
${CHECKOUT} main :is(div, p)[class*="bg-red-50"] { box-shadow: 0 0 0 1.5px #f6c6c6, 0 8px 12px -10px rgba(150, 60, 60, .4); }
${CHECKOUT} main :is(div, p):is([class*="bg-sky-50"], [class*="bg-amber-50"], [class*="bg-red-50"]):not([data-payment-mode])::before { ${TAPE} top: -6px; left: 20px; width: 40px; height: 12px; rotate: -4deg; }
${CHECKOUT} main :is(div, p)[class*="bg-sky-50"]:not([data-payment-mode])::before { background: repeating-linear-gradient(90deg, rgba(190,224,255,.95) 0 7px, rgba(215,236,255,.95) 7px 14px); }
${CHECKOUT} main :is(div, p)[class*="bg-amber-50"]:not([data-payment-mode])::before { background: repeating-linear-gradient(90deg, rgba(255,214,140,.95) 0 7px, rgba(255,232,180,.95) 7px 14px); }
/* 로그인하기 — 작은 분홍 와펜(같은 로그인 주소) */
${CHECKOUT} main [role="alert"] > a[class*="underline"] { ${PATCH_PINK} display: inline-block; border-width: 2px; outline: none; text-decoration: none; padding: 7px 16px 6px; margin-top: 10px;
  font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; font-size: 13px; line-height: 1; letter-spacing: 0; text-shadow: none;
  background: linear-gradient(#e0557f, #e0557f) padding-box, repeating-linear-gradient(72deg, #c23d6c 0 2px, #d4447a 2px 3.4px) border-box; }
/* 작은 글씨 — 또렷한 둥근 본문 글꼴(입력칸 이름 · 칸 설명 · 결제수단 설명) */
${CHECKOUT} main label[class*="text-xs"][class*="font-black"] { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; font-size: 13px; color: #5c4a42; }
${CHECKOUT} main section.surface > div[class*="border-b"] p, ${CHECKOUT} main button[data-payment-method] > span:last-child { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; }
${CHECKOUT} main button[data-payment-method] > span:last-child { font-size: 11px; color: #8a766c; }
/* 결제수단 아이콘 — 7개 모두 선 아이콘 그대로, 색만(고른 것 분홍 · 나머지 갈색) */
${CHECKOUT} main button[data-payment-method] i { color: #b39b90; }
${CHECKOUT} main button[data-payment-method][aria-checked="true"] i { color: #e8628e; }
/* 저장된 배송지 고르기(회원) — 같은 종이 카드 + 흰 종이 선택칸(위 공통 규칙), 테이프만 노랑 */
${CHECKOUT} main section.surface[aria-label="저장된 배송지 선택"]::before { background: repeating-linear-gradient(90deg, rgba(255,226,140,.95) 0 7px, rgba(255,239,190,.95) 7px 14px); }

/* ── 17) 상품 목록 화면(상품군 · 추천 셀렉트 · 신상품 · 기획전 · 브랜드 · 전체 상품/검색 결과, 사용자 2026-10-16 "완벽하게") ──
   제목 테이프 이름표 · 영문 꼬리표 숨김 · 필터는 테이프 붙인 메모 카드 · 상품 카드는 앱 쇼핑 카드와 같은 스크랩 결
   (색상 칩 숨김 · 살짝 기울기 · 흰 테두리 사진 · BEST/NEW 잉크 도장) · 페이지 번호는 동그란 스티커. 정렬 · 필터 · 이동 동작 그대로 ── */
/* 화면 제목 — 쇼핑 탭 색 마스킹테이프 이름표(장바구니 제목과 같음) */
${LIST} main main > h1, ${LIST} main main > header > h1 {
  display: inline-block; width: fit-content; padding: 7px 20px 6px; rotate: -1deg; text-decoration: none; font-size: 1.55rem; line-height: 1.1; color: #a8480f;
  clip-path: polygon(0 0, 100% 0, 97% 20%, 100% 40%, 97% 60%, 100% 80%, 97% 100%, 0 100%, 3% 80%, 0 60%, 3% 40%, 0 20%);
  background: repeating-linear-gradient(90deg, rgba(251,201,162,.9) 0 9px, rgba(253,224,200,.9) 9px 18px); filter: drop-shadow(0 6px 5px rgba(110, 60, 50, .18)); }
/* 영문 꼬리표(CURATED PICKS · NEW · PROMO · BRANDS) — 앱에서는 숨김(앱 쇼핑 첫 화면과 같은 기준) */
${LIST}:is([data-app-page="best"], [data-app-page="new"], [data-app-page="promo"], [data-app-page="brands"], [data-app-page="brand"]) main main > p:first-child { display: none; }
/* 상품 수(상품 179개) — 작은 분홍 스티커 */
${LIST} main main > header > p:first-child { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #fff; color: #d4447a; font-size: 12px;
  box-shadow: 0 0 0 1.5px #f6c9d6, 0 3px 6px -4px rgba(110, 80, 40, .4); }
${LIST} main main > header > p:first-child + h1 { margin-top: 10px; }
/* 화면 설명 문장 — 둥근 글씨 갈색 */
${LIST} main main > h1 + p { color: #8a766c; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; }
/* 필터(검색 · 카테고리 · 세부 · 정렬) — 테이프 붙인 메모 카드 · 항목 이름은 둥근 글씨 · 입력칸 흰 종이 */
${LIST} main main > section.surface { position: relative; border: 0; border-radius: 6px 6px 18px 6px; background: #fffbea; box-shadow: 0 10px 16px -12px rgba(110, 80, 40, .5); }
${LIST} main main > section.surface::before { ${TAPE} top: -7px; left: 50%; width: 58px; margin-left: -29px; rotate: -2deg; }
${LIST} main main > section.surface label > span { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; font-size: 12.5px; color: #8a6a3a; }
${LIST} main main > section.surface .input { border-color: transparent; border-radius: 14px; background-color: #fff; box-shadow: 0 0 0 1.5px #f3e6d6, 0 4px 8px -6px rgba(110, 80, 40, .4); }
${LIST} main main > section.surface .input:focus { box-shadow: 0 0 0 2px #f283a3, 0 0 0 5px rgba(242, 131, 163, .15); }
/* 상품 카드(웹 공용 ProductCard) — 앱 쇼핑 카드와 같게: 색상 미리보기 칩 · "n가지 색상" 숨김, 살짝 기울기(±1도), 흰 테두리 사진 */
${S} article[data-pet-product="true"] > div:has(> [role="group"]) { display: none; }
${LIST} main article[data-pet-product="true"] { rotate: -.8deg; box-shadow: 0 0 0 1.5px #f3e6d6, 0 10px 18px -12px rgba(110, 80, 40, .5); }
${LIST} main :nth-child(even of article[data-pet-product="true"]) { rotate: .7deg; }
${LIST} main article[data-pet-product="true"] > div:first-child { margin: 6px 6px 0; border-radius: 6px; box-shadow: 0 0 0 3px #fff, 0 4px 8px -5px rgba(90, 60, 50, .4); }
/* 순위 · NEW · 기획 꼬리표 — 잉크 도장(흰 바탕 + 색 테두리) */
${LIST} main article[data-pet-product="true"] > div:first-child > div[class*="top-2"][class*="left-2"] > span > span,
${LIST} main article[data-pet-product="true"] > div:first-child > div[class*="top-2"][class*="left-2"] > span {
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
/* 찜 하트 — 흰 칼선 동그라미 스티커 + 자수 하트 */
${LIST} main article[data-pet-product="true"] button[aria-label^="찜"] { box-shadow: 0 0 0 1.5px #fff, 0 3px 6px -3px rgba(90, 60, 50, .45); }
${LIST} main article[data-pet-product="true"] button i.fa-heart { display: inline-block; width: 1.15rem; height: 1.15rem; background: ${HEART_OFF} center / contain no-repeat; }
${LIST} main article[data-pet-product="true"] button i.fa-heart.fa-solid { background-image: ${HEART_ON_CARD}; }
${LIST} main article[data-pet-product="true"] button i.fa-heart::before { content: ""; }
/* 상품명 · 브랜드 — 둥근 글씨 */
${LIST} main article[data-pet-product="true"] p[class*="line-clamp-2"] { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; color: #3d2f2a; }
/* 페이지 번호 — 동그란 스티커(지금 페이지는 분홍), 이전 · 다음은 크림 알약 */
${LIST} main nav[aria-label="페이지 이동"] button { border-color: transparent; border-radius: 999px; background: #fff; color: #7d6a61; box-shadow: 0 0 0 1.5px #f1e3da, 0 4px 7px -5px rgba(110, 80, 40, .45); }
${LIST} main nav[aria-label="페이지 이동"] button[aria-current="page"] { background: #e8628e; color: #fff; box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px #f6a9bf, 0 5px 8px -5px rgba(200, 70, 110, .55); font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${LIST} main nav[aria-label="페이지 이동"] button:not(:disabled):active { transform: scale(.92); }
/* 상품 없음 — 메모 카드 */
${LIST} main main > div.surface { border: 0; border-radius: 6px 6px 18px 6px; background: #fffdf6; box-shadow: 0 0 0 1.5px #f3e6d6, 0 12px 20px -14px rgba(110, 80, 40, .5); }
/* 브랜드 목록(/brands) — 브랜드 카드는 테이프 붙인 종이, 개수는 분홍 동그라미 스티커 */
${S}[data-app-page="brands"] main main a[class*="rounded-lg"][class*="border"] { position: relative; border: 0; border-radius: 10px; background: #fffaf2; box-shadow: 0 0 0 1.5px #f3e6d6, 0 10px 16px -12px rgba(110, 80, 40, .5); overflow: visible; }
${S}[data-app-page="brands"] main main a[class*="rounded-lg"][class*="border"]::before { ${TAPE} top: -5px; left: 24px; width: 40px; height: 12px; rotate: -6deg; }
${S}[data-app-page="brands"] main main a[class*="rounded-lg"] h2 { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; text-decoration: none; }
${S}[data-app-page="brands"] main main a[class*="rounded-lg"] span[class*="rounded-full"] { background: #fff3f6; color: #d4447a; box-shadow: 0 0 0 1.5px #f6c9d6; }
/* 외부 가격 비교 칸(전체 상품) — 종이 카드 · 영문 꼬리표 숨김 · 더 보기는 크림 와펜 */
${LIST} main main > section[class*="rounded-lg"][class*="border"] { border: 0; border-radius: 6px 6px 18px 6px; background: #fffdf6; box-shadow: 0 0 0 1.5px #f3e6d6, 0 12px 20px -14px rgba(110, 80, 40, .5); }
${LIST} main main > section[class*="rounded-lg"][class*="border"] p.uppercase { display: none; }
${LIST} main main > section[class*="rounded-lg"] button[aria-label*="더 보기"] { ${PATCH_CREAM} }

/* ── 18) 산책 강아지 말풍선(추천 · 안내, 협업자 PetCompanionLayer) — 흰 칼선 메모 말풍선 · 이름은 테이프 이름표 ·
   "보러 가기/메뉴 열기" 같은 버튼은 작은 분홍 알약 · 닫기는 동그란 스티커. 말풍선 자리 · 문구 · 누르는 동작은 그대로 ── */
html.ddb-app-mode [data-pet-companion-speech] { border: 0; background: #fffdf6; color: #4a3a33; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700;
  box-shadow: 0 0 0 2.5px #fff, 0 0 0 4px #f3d9cf, 0 14px 26px -12px rgba(110, 70, 55, .5); }
html.ddb-app-mode [data-pet-companion-speech] > span:first-child { width: fit-content; max-width: 100%; padding: 2px 9px 1px; margin-bottom: 3px; rotate: -1.5deg; color: #9c2f54;
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; font-size: 12px;
  clip-path: polygon(0 0, 100% 0, 95% 25%, 100% 50%, 95% 75%, 100% 100%, 0 100%, 5% 75%, 0 50%, 5% 25%);
  background: repeating-linear-gradient(90deg, rgba(255,200,218,.95) 0 7px, rgba(255,222,232,.95) 7px 14px); }
html.ddb-app-mode [data-pet-companion-speech] > :is(a, button:not([aria-label])) { margin-top: 7px; padding: 5px 12px 4px; border-radius: 999px; background: #e8628e; color: #fff;
  text-decoration: none; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; box-shadow: 0 0 0 2px #fff, 0 4px 7px -4px rgba(200, 70, 110, .55); }
html.ddb-app-mode [data-pet-companion-speech] > :is(a, button:not([aria-label])):active { transform: scale(.95); }
html.ddb-app-mode [data-pet-companion-speech] > button[aria-label$="닫기"] { background: #fff; color: #b39b90; font-size: 15px; box-shadow: 0 0 0 1.5px #f1e3da; }

/* ── 19) 목록 2차 — 상품군 이름은 왼쪽 끝 · 상품 수는 오른쪽 끝(사용자 2026-10-16) · BEST/순위 · NEW 꼬리표는 잉크 도장 ── */
${LIST} main main > header:has(> p:first-child + h1) { display: flex; flex-direction: row-reverse; align-items: center; justify-content: space-between; gap: 10px; }
${LIST} main main > header > p:first-child + h1 { margin-top: 0; }
${S} article[data-pet-product="true"] div[class*="top-2"][class*="left-2"] > span { --c: #e0557f; background: rgba(255, 255, 255, .92); color: var(--c); border-radius: 4px; box-shadow: inset 0 0 0 1.5px var(--c);
  backdrop-filter: none; font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; letter-spacing: .04em; rotate: -8deg; }
${S} article[data-pet-product="true"] div[class*="top-2"][class*="left-2"] > span[class*="from-aurora-indigo"] { --c: #1f9e75; rotate: 6deg; }

/* ── 20) 상품 카드 마무리(사용자 2026-10-16 "가격표 통일 · 완벽하게") — 웹 공용 카드(ProductCard)를 앱 쇼핑 카드(ShopProductCard)와 같게:
   가격은 노란 가격표 꼬리표(구멍 뚫린 태그) 안에 가격 배지 이름 + 가격 · 브랜드는 보라 둥근 글씨 · 구매 상태는 빨간 작은 글씨 ·
   외부 판매점 후기는 옅은 갈색 작은 글씨 · 사진 흰 테두리와 살짝 기울기는 목록 · 같이 보면 좋은 상품 모두. 값 · 링크는 그대로 ── */
${S} article[data-pet-product="true"] { rotate: -.8deg; box-shadow: 0 0 0 1.5px #f3e6d6, 0 10px 18px -12px rgba(110, 80, 40, .5); }
${S} main :nth-child(even of article[data-pet-product="true"]) { rotate: .7deg; }
${S} article[data-pet-product="true"] > div:first-child { margin: 6px 6px 0; border-radius: 6px; box-shadow: 0 0 0 3px #fff, 0 4px 8px -5px rgba(90, 60, 50, .4); }
${S} article[data-pet-product="true"] p[class*="text-aurora-indigo"][class*="uppercase"] { color: #8b6fd6; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; letter-spacing: .03em; }
${S} article[data-pet-product="true"] p[class*="line-clamp-2"] { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; color: #3d2f2a; }
${S} article[data-pet-product="true"] p[data-inventory-state] { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; font-size: 11px; color: #c2413b; }
/* 가격표 — 노란 꼬리표(왼쪽 뾰족 + 구멍) · 가격 배지는 꼬리표 안 작은 글씨 · 가격은 카페24 갈색 */
${S} article[data-pet-product="true"] div:has(> p.ddb-crayon-price) { position: relative; width: fit-content; min-height: 0; margin-left: auto; padding: 3px 9px 3px 16px; gap: 1px;
  flex-direction: column; align-items: flex-end; background: #fff3a6; color: #6b4708; border-radius: 3px 6px 6px 3px;
  clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%); }
${S} article[data-pet-product="true"] div:has(> p.ddb-crayon-price)::before { content: ""; position: absolute; left: 7px; top: 50%; width: 4px; height: 4px; margin-top: -2px; border-radius: 999px;
  background: #fffaf2; box-shadow: inset 0 0 0 1px rgba(170, 120, 40, .35); }
${S} article[data-pet-product="true"] div:has(> p.ddb-crayon-price) > .ddb-price-badge { min-height: 0; padding: 0; border: 0; background: none; box-shadow: none; transform: none; rotate: none;
  color: #8a6a2a; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; font-size: 9.5px; }
${S} article[data-pet-product="true"] div:has(> p.ddb-crayon-price) > .ddb-price-badge::after { display: none; }
${S} article[data-pet-product="true"] p.ddb-crayon-price { background: none; -webkit-text-fill-color: currentColor; color: #6b4708; filter: none;
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; font-size: 15px; letter-spacing: -0.01em; }
/* 할인 줄 — 할인율 분홍 카페24 · 원래 가격 옅게 */
${S} article[data-pet-product="true"] div.text-right > div:first-child span[class*="text-danger"] { color: #e0455f; font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${S} article[data-pet-product="true"] div.text-right > div:first-child span[class*="line-through"] { color: #b5a49b; }
/* 외부 판매점 후기 — 옅은 갈색 둥근 작은 글씨 */
${S} article[data-pet-product="true"] div[class*="min-h-8"][class*="justify-end"] { color: #9c8a80; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; }
${S} article[data-pet-product="true"] div[class*="min-h-8"][class*="justify-end"] span[class*="font-bold"] { color: #5c4a42; font-weight: 700; }
/* 검색 창 결과 줄도 같은 가격표 */
${SEARCH} ul button .ddb-crayon-price { position: relative; padding: 2px 8px 2px 15px; background: #fff3a6; -webkit-text-fill-color: currentColor; color: #6b4708; filter: none;
  border-radius: 3px 6px 6px 3px; clip-path: polygon(9px 0, 100% 0, 100% 100%, 9px 100%, 0 50%);
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; font-size: 14px; }
${SEARCH} ul button .ddb-price-badge { min-height: 0; padding: 0; border: 0; background: none; box-shadow: none; transform: none; color: #8a6a2a;
  font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; font-size: 9.5px; }
${SEARCH} ul button .ddb-price-badge::after { display: none; }
${SEARCH} ul button p[class*="text-aurora-indigo"] { color: #8b6fd6; }

/* 상품 상세 가격 · 아래 구매 바 가격도 같은 노란 가격표(크기만 큼) — 가격 배지 이름은 꼬리표 안 작은 글씨 */
${S} [data-product-detail-content] div:has(> p.ddb-crayon-price) { position: relative; width: fit-content; padding: 6px 14px 6px 24px; background: #fff3a6; color: #6b4708;
  border-radius: 4px 10px 10px 4px; clip-path: polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%); }
${S} [data-product-detail-content] div:has(> p.ddb-crayon-price)::before { content: ""; position: absolute; left: 10px; top: 50%; width: 6px; height: 6px; margin-top: -3px; border-radius: 999px;
  background: #fffdf8; box-shadow: inset 0 0 0 1px rgba(170, 120, 40, .35); }
${S} [data-product-detail-content] div:has(> p.ddb-crayon-price) > .ddb-price-badge { min-height: 0; padding: 0; border: 0; background: none; box-shadow: none; transform: none; color: #8a6a2a;
  font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; font-size: 11px; }
${S} [data-product-detail-content] div:has(> p.ddb-crayon-price) > .ddb-price-badge::after { display: none; }
${S} [data-product-detail-content] p.ddb-crayon-price { background: none; -webkit-text-fill-color: currentColor; color: #6b4708; filter: none;
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; letter-spacing: -0.01em; }
${S} [data-product-detail-content] .fixed.bottom-0 div:has(> p.ddb-crayon-price) { padding: 3px 9px 3px 16px; border-radius: 3px 6px 6px 3px; clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%); }
${S} [data-product-detail-content] .fixed.bottom-0 div:has(> p.ddb-crayon-price)::before { left: 7px; width: 4px; height: 4px; margin-top: -2px; }
${S} [data-product-detail-content] .fixed.bottom-0 p.ddb-crayon-price { font-size: 16px; }
/* 상세 가격표가 링크 복사 · 공유 버튼을 다음 줄로 밀지 않게 — 휴대폰 폭에서 가격 글씨만 조금 작게, 배지와 가격은 위아래로 */
@media (max-width: 767px) {
  ${S} [data-product-detail-content] div:has(> p.ddb-crayon-price):not(.fixed *) { flex-direction: column; align-items: flex-start; gap: 2px; padding: 5px 12px 6px 22px; }
  ${S} [data-product-detail-content] div:not(.fixed *) > p.ddb-crayon-price { font-size: 28px; }
}

/* ── 21) 외부 가격 비교(전체 상품 · 상품군 화면에서 검색어가 있을 때, 협업자 ExternalProductCard · ExternalProductComparisonTable) ──
   지금은 외부 결과가 없어 안 보이지만 미리 입혀 둠. 외부 = 민트(초록) 결로 우리 상품(분홍 · 노랑)과 구분 ·
   영문 꼬리표 숨김 · 비교 상자는 민트 메모 · 외부 상품 카드는 스크랩 카드 + 민트 가격표 · 판매처 버튼은 와펜. 점수 · 가격 · 링크(새 창)는 그대로 ── */
/* 칸 머리 개수 표시 — 동그란 스티커 */
${LIST} main main > section[class*="rounded-lg"] > div:first-child span[class*="rounded-full"] { background: #fff; color: #7d6a61; box-shadow: 0 0 0 1.5px #f1e3da; }
/* 비교 상자 — 민트 메모 카드 + 테이프 · 머리는 투명 + 점선 · 영문 꼬리표 숨김 */
${LIST} main section[class*="border-emerald-200"] { position: relative; overflow: visible; border: 0; border-radius: 8px 8px 20px 8px; background: #f2fbf6;
  box-shadow: 0 0 0 1.5px #cdeedb, 0 12px 20px -14px rgba(40, 110, 80, .45); }
${LIST} main section[class*="border-emerald-200"]::before { ${TAPE} top: -7px; left: 50%; width: 58px; margin-left: -29px; rotate: -2deg; background: repeating-linear-gradient(90deg, rgba(186,236,206,.95) 0 7px, rgba(214,245,226,.95) 7px 14px); }
${LIST} main section[class*="border-emerald-200"] > div:first-child { background: transparent; border-bottom: 2px dashed #cdeedb; border-radius: 8px 8px 0 0; }
${LIST} main section[class*="border-emerald-200"] p.uppercase { display: none; }
${LIST} main section[class*="border-emerald-200"] h3 { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${LIST} main section[class*="border-emerald-200"] span[class*="bg-emerald-700"] { border-radius: 999px; box-shadow: 0 0 0 2px #fff, 0 4px 7px -4px rgba(40, 110, 80, .5); }
/* 기준상품 고르기 · 사실 칩 · 점수 칸 — 둥근 스티커 · 작은 메모 */
${LIST} main section[class*="border-emerald-200"] [aria-label*="기준상품"] > button { border-radius: 999px; box-shadow: 0 3px 6px -4px rgba(40, 110, 80, .45); }
${LIST} main section[class*="border-emerald-200"] span[class*="rounded-md"][class*="border-emerald-200"] { border-radius: 999px; }
${LIST} main section[class*="border-emerald-200"] [aria-label*="점수 기준"] > div { border: 0; border-radius: 4px 4px 12px 4px; background: #fff; box-shadow: 0 0 0 1.5px #e3efe8, 0 5px 8px -7px rgba(40, 110, 80, .4); }
${LIST} main section[class*="border-emerald-200"] div[class*="border-emerald-200"][class*="bg-emerald-50"] { border: 0; border-radius: 4px 4px 14px 4px; background: #e6f7ee; box-shadow: 0 6px 10px -8px rgba(40, 110, 80, .45); }
/* 휴대폰 비교 카드 — 종이 카드 · 사진 흰 테두리 · 순위는 민트 도장 · 보기는 작은 분홍 와펜(새 창 그대로) */
${LIST} main [role="list"][aria-label*="비교 카드"] { background: transparent; }
${LIST} main [role="list"][aria-label*="비교 카드"] > article { border: 0; border-radius: 8px 8px 16px 8px; background: #fffdf6; box-shadow: 0 0 0 1.5px #f3e6d6, 0 8px 14px -11px rgba(110, 80, 40, .45); }
${LIST} main [role="list"][aria-label*="비교 카드"] > article[class*="bg-emerald-50"] { background: #f2fbf6; box-shadow: 0 0 0 2px #9fdcbc, 0 8px 14px -11px rgba(40, 110, 80, .45); }
${LIST} main [role="list"][aria-label*="비교 카드"] img { box-shadow: 0 0 0 3px #fff, 0 4px 7px -4px rgba(90, 60, 50, .4); }
${LIST} main [role="list"][aria-label*="비교 카드"] span[class*="bg-emerald-700"] { background: rgba(255,255,255,.95); color: #1f9e75; box-shadow: inset 0 0 0 1.5px #1f9e75; rotate: -6deg;
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${LIST} main [role="list"][aria-label*="비교 카드"] h4 { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; }
${LIST} main [role="list"][aria-label*="비교 카드"] div[class*="rounded-md"][class*="bg-neutral-50"] { background: #f6f0e8; border-radius: 999px; }
${LIST} main [role="list"][aria-label*="비교 카드"] a[class*="bg-neutral-950"] { ${PATCH_PINK} display: inline-block; border-width: 2px; outline: none; padding: 7px 14px 6px; line-height: 1;
  font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; font-size: 12.5px; text-shadow: none; }
/* 외부 상품 카드 — 우리 카드와 같은 스크랩 결(테이프 · 흰 테두리 사진 · 살짝 기울기) + 가격은 민트 꼬리표(외부 판매가라 우리 노란 가격표와 구분) */
${LIST} main article.group:not([data-pet-product])[class*="rounded-lg"] { position: relative; overflow: visible; border: 0; border-radius: 10px; background: #f7fcf9; rotate: .6deg;
  box-shadow: 0 0 0 1.5px #d9efe2, 0 10px 18px -12px rgba(40, 110, 80, .45); }
${LIST} main article.group:not([data-pet-product])[class*="rounded-lg"]::before { ${TAPE} top: -5px; left: 50%; width: 44px; margin-left: -22px; background: repeating-linear-gradient(90deg, rgba(186,236,206,.95) 0 7px, rgba(214,245,226,.95) 7px 14px); }
${LIST} main article.group:not([data-pet-product])[class*="rounded-lg"] > a:first-child { margin: 6px 6px 0; border-radius: 6px; box-shadow: 0 0 0 3px #fff, 0 4px 8px -5px rgba(90, 60, 50, .4); }
${LIST} main article.group:not([data-pet-product])[class*="rounded-lg"] h3 { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; color: #3d2f2a; }
${LIST} main article.group:not([data-pet-product])[class*="rounded-lg"] p[class*="text-xl"] { position: relative; width: fit-content; margin-left: auto; padding: 3px 9px 3px 16px;
  background: #d9f5e6; color: #1d6b4c; border-radius: 3px 6px 6px 3px; clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%);
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; font-size: 16px; }
${LIST} main article.group:not([data-pet-product])[class*="rounded-lg"] a[class*="bg-neutral-950"] { ${PATCH_CREAM} }
${LIST} main article.group:not([data-pet-product])[class*="rounded-lg"] a[class*="bg-neutral-950"]:active { transform: scale(.96); }
/* 외부 결과 없음 — 점선 메모 */
${LIST} main main > section[class*="rounded-lg"] div[class*="border-dashed"] { border-color: #ecd5c8; border-radius: 6px 6px 16px 6px; background: #fffbea; }

/* ── 22) 외부 가격 비교 2차(사용자 2026-10-16 "앱 화면에서 보기 좋게") — 제목은 민트 테이프 이름표 · 기준상품 고르기는 와펜(고른 것 민트) ·
   점수 칸은 메모 + 테이프 줄무늬 막대 · 비교 카드 가격은 꼬리표(댕다방 기준상품 = 노랑, 외부 = 민트) · 사진 위 판매처 글자는 모서리 도장 ·
   상태 꼬리표 · 개수는 흰 칼선 스티커. 점수 · 가격 · 링크 그대로 ── */
/* 제목 — 민트 마스킹테이프 이름표(외부 영역 표시) */
${LIST} main main > section[class*="rounded-lg"] > div:first-child h2, ${LIST} main main > section[class*="rounded-lg"] h3[class*="text-base"]:not(section[class*="border-emerald-200"] h3) {
  display: inline-block; width: fit-content; padding: 5px 16px 4px; rotate: -1deg; text-decoration: none; line-height: 1.1; color: #1d6b4c;
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400;
  clip-path: polygon(0 0, 100% 0, 96% 25%, 100% 50%, 96% 75%, 100% 100%, 0 100%, 4% 75%, 0 50%, 4% 25%);
  background: repeating-linear-gradient(90deg, rgba(186,236,206,.95) 0 8px, rgba(214,245,226,.95) 8px 16px); filter: drop-shadow(0 5px 4px rgba(40, 90, 60, .15)); }
/* 개수 · 상태 꼬리표 — 흰 칼선 스티커(민트 글씨) */
${LIST} main main > section[class*="rounded-lg"] span[class*="rounded-full"]:is([class*="bg-amber-50"], [class*="bg-emerald-700"]) { background: #fff; color: #1f9e75;
  box-shadow: 0 0 0 1.5px #bfe6d1, 0 0 0 3.5px #fff, 0 4px 7px -4px rgba(40, 110, 80, .4); }
${LIST} main article.group:not([data-pet-product]) div.p-3 > span[class*="rounded-full"] { border-radius: 999px; box-shadow: 0 0 0 2px #fff, 0 3px 6px -4px rgba(90, 60, 50, .4);
  font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; }
/* 기준상품 고르기 — 작은 와펜(고른 것 민트 · 나머지 크림) */
${LIST} main [aria-label*="기준상품"] > button { ${PATCH_CREAM} border-width: 2px; outline-width: 1.5px; outline-offset: -5px; padding: 8px 14px 7px; font-size: 12px; line-height: 1; }
${LIST} main [aria-label*="기준상품"] > button[class*="bg-emerald-700"] { ${PATCH_MINT} border-width: 2px; outline-width: 1.5px; outline-offset: -5px; padding: 8px 14px 7px; font-size: 12px; line-height: 1; }
${LIST} main [aria-label*="기준상품"] > button:active { transform: scale(.95); }
/* 점수 칸 — 흰 메모 + 테이프 줄무늬 막대 */
${LIST} main [aria-label*="점수 기준"] > div { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; }
${LIST} main [aria-label*="점수 기준"] div[class*="h-1.5"] { height: 7px; background: #eaf3ee; box-shadow: inset 0 0 0 1px #d6eadf; }
${LIST} main [aria-label*="점수 기준"] div[class*="bg-emerald-600"] { background: repeating-linear-gradient(90deg, #68c299 0 6px, #8fd8b4 6px 12px); }
/* 휴대폰 비교 카드 — 점수는 카페24 민트 · 가격은 꼬리표(기준상품 노랑 · 외부 민트) */
${LIST} main [role="list"][aria-label*="비교 카드"] > article strong[class*="text-base"] { color: #1d6b4c; font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${LIST} main [role="list"][aria-label*="비교 카드"] > article div[class*="text-base"][class*="font-black"] { position: relative; width: fit-content; padding: 3px 9px 3px 16px;
  background: #d9f5e6; color: #1d6b4c; border-radius: 3px 6px 6px 3px; clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%);
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${LIST} main [role="list"][aria-label*="비교 카드"] > article[class*="bg-emerald-50"] div[class*="text-base"][class*="font-black"] { background: #fff3a6; color: #6b4708; }
${LIST} main [role="list"][aria-label*="비교 카드"] > article div[class*="text-amber-700"] { margin-top: 3px; }
/* 외부 상품 카드 사진 위 판매처 — 글자 띠 대신 모서리에 살짝 걸친 민트 잉크 도장 */
${LIST} main article.group:not([data-pet-product]) > a:first-child > div[class*="bottom-2"][class*="right-2"] { background: rgba(255, 255, 255, .92); color: #1f9e75; border-radius: 4px;
  box-shadow: inset 0 0 0 1.5px #1f9e75; rotate: -6deg; font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
/* 외부 상품 카드 브랜드 · 판매처 줄 — 둥근 글씨 */
${LIST} main article.group:not([data-pet-product]) div.p-3 > div:first-of-type { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; }
${LIST} main article.group:not([data-pet-product]) div.p-3 > div:first-of-type span.uppercase { color: #1f9e75; }
${LIST} main article.group:not([data-pet-product]) a[class*="bg-neutral-950"] { font-size: 13px; outline-offset: -6px; }

/* ── 23) 마이 탭 웹 화면(마이페이지 · 주문 · 배송지 · 결제수단 · 추천 설정 · 정보 수정 · 탈퇴 · 공지 · FAQ · 문의 · 교환/반품 · 약관 · 개인정보) ──
   공통 겉모양(색 · 종이 · 와펜 · 메모)은 위 규칙이 그대로 적용되고, 여기서는 마이 화면만의 것: 영문 꼬리표 숨김 · 제목은 마이 탭 색(버터)
   테이프 이름표 · 마이페이지 메뉴는 테이프 붙인 메모 카드 + 스티커 칩 · 입력칸 흰 종이. 문구(약관 · 개인정보 포함) · 링크 · 로그아웃 동작 그대로 ── */
/* 영문 꼬리표(NOTICE · FAQ · CONTACT · Legal · Privacy · MY 정보 등 제목 위 작은 글씨) — 앱에서는 숨김 */
${MYW} main main :is(main, header, div) > p:first-child:has(+ h1) { display: none; }
/* 화면 제목 — 마이 탭 색 마스킹테이프 이름표 */
${MYW} main main h1 {
  display: inline-block; width: fit-content; padding: 7px 20px 6px; rotate: -1deg; text-decoration: none; font-size: 1.5rem; line-height: 1.1; color: #8a5a0c;
  clip-path: polygon(0 0, 100% 0, 97% 20%, 100% 40%, 97% 60%, 100% 80%, 97% 100%, 0 100%, 3% 80%, 0 60%, 3% 40%, 0 20%);
  background: repeating-linear-gradient(90deg, rgba(244,214,140,.92) 0 9px, rgba(255,236,184,.92) 9px 18px); filter: drop-shadow(0 6px 5px rgba(110, 80, 30, .16)); }
${MYW} main main h1 + p { color: #8a766c; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; }
/* 마이페이지 메뉴 — 테이프 붙인 크림 메모 카드 · 묶음 이름은 작은 테이프 · 항목은 흰 스티커 칩 · 지금 화면은 분홍 와펜 */
${MYW} nav[aria-label="마이페이지 메뉴"] { position: relative; border-radius: 6px 6px 18px 6px; background: #fffbea; box-shadow: 0 10px 16px -12px rgba(110, 80, 40, .5); }
${MYW} nav[aria-label="마이페이지 메뉴"]::before { ${TAPE} top: -7px; left: 50%; width: 56px; margin-left: -28px; rotate: -2deg; }
${MYW} nav[aria-label="마이페이지 메뉴"] section + section, ${MYW} nav[aria-label="마이페이지 메뉴"] > div:last-child { border-top: 2px dashed #f0dcc0; }
${MYW} nav[aria-label="마이페이지 메뉴"] h2 { display: inline-block; width: fit-content; padding: 2px 10px 1px; letter-spacing: 0; text-decoration: none; color: #8a5a0c;
  font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; font-size: 12px; rotate: -1deg;
  clip-path: polygon(0 0, 100% 0, 95% 25%, 100% 50%, 95% 75%, 100% 100%, 0 100%, 5% 75%, 0 50%, 5% 25%);
  background: repeating-linear-gradient(90deg, rgba(244,214,140,.92) 0 7px, rgba(255,236,184,.92) 7px 14px); }
${MYW} nav[aria-label="마이페이지 메뉴"] li > a { background: #fff; border-radius: 999px; color: #5c4a42; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700;
  box-shadow: 0 0 0 1.5px #f1e3da, 0 4px 7px -5px rgba(110, 80, 40, .45); }
${MYW} nav[aria-label="마이페이지 메뉴"] li > a i { color: #f48fac; }
${MYW} nav[aria-label="마이페이지 메뉴"] li > a[aria-current="page"] { ${PATCH_PINK} border-width: 2px; outline-width: 1.5px; outline-offset: -5px; background-image: none;
  background: linear-gradient(#f2789d, #f2789d) padding-box, repeating-linear-gradient(72deg, #d9547d 0 2px, #ea6d93 2px 3.4px) border-box; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; text-shadow: none; }
${MYW} nav[aria-label="마이페이지 메뉴"] li > a[aria-current="page"] i { color: #fff; }
${MYW} nav[aria-label="마이페이지 메뉴"] li > a:active { transform: scale(.96); }
${MYW} nav[aria-label="마이페이지 메뉴"] > div:last-child button { border-radius: 999px; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; }
/* 입력칸 — 흰 종이(오류 빨간 테두리는 제외) · 이름은 둥근 글씨 */
${MYW} main :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea):not([aria-invalid="true"]):not([class*="border-red"]) {
  border-color: transparent; background-color: #fff; border-radius: 14px; box-shadow: 0 0 0 1.5px #f3e6d6, 0 4px 8px -6px rgba(110, 80, 40, .4); }
${MYW} main :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea):not([aria-invalid="true"]):not([class*="border-red"]):focus { box-shadow: 0 0 0 2px #f283a3, 0 0 0 5px rgba(242, 131, 163, .15); }
${MYW} main label[class*="text-xs"] { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; color: #5c4a42; }
${MYW} main input[type="checkbox"], ${MYW} main input[type="radio"] { accent-color: #e8628e; }
/* 카드(마이페이지 칸 · 공지 · FAQ · 문의 · 약관 목차) — 종이 카드(테두리 대신 종이 그림자) */
${MYW} main main :is(section, article, div, details)[class*="rounded-2xl"][class*="border"]:not([class*="ring-"]),
${MYW} main main :is(section, article, details)[class*="rounded-xl"][class*="border"]:not([class*="ring-"]) {
  border-color: transparent; background-color: #fffdf8; box-shadow: 0 0 0 1.5px #f3e6d6, 0 10px 18px -14px rgba(110, 80, 40, .5); }
${MYW} main main .surface { border-color: transparent; border-radius: 8px 8px 18px 8px; background: #fffdf8; box-shadow: 0 0 0 1.5px #f3e6d6, 0 10px 18px -14px rgba(110, 80, 40, .5); }
/* 아이콘 동그라미 — 흰 칼선 스티커 */
${MYW} main main span[class*="rounded-full"][class*="place-items-center"]:is([class*="h-10"], [class*="h-11"], [class*="h-12"], [class*="h-14"], [class*="h-16"]) { box-shadow: 0 0 0 3px #fff, 0 5px 9px -5px rgba(110, 80, 40, .45); }
/* 작은 분류 꼬리표(안내 · 배송 · 이벤트 · 주문/결제 등) — 둥근 스티커 */
${MYW} main main span[class*="rounded-full"][class*="text-[10px]"], ${MYW} main main span[class*="rounded-full"][class*="text-[11px]"] { box-shadow: 0 0 0 1.5px #fff, 0 2px 4px -2px rgba(110, 80, 40, .35); }

/* ── 24) 마이페이지 대시보드 — 연구소 지갑은 앱 마이 첫 화면의 "코인 봉투"와 같은 결(크래프트 봉투 머리 · 동그란 코인 스티커 ·
   바꾸기 칸은 노란 메모 · 지급 기준은 접힌 메모 · 지갑 내역은 영수증 점선) · 이름 아래 이메일은 둥근 글씨. 값 · 새로고침 · 바꾸기 동작 그대로 ── */
${MYW} [data-daenglab-wallet] { border: 0; border-radius: 8px 8px 20px 8px; background: #fffdf6; box-shadow: 0 0 0 1.5px #f3e6d6, 0 12px 20px -14px rgba(110, 80, 40, .55); overflow: visible; position: relative; }
${MYW} [data-daenglab-wallet]::before { ${TAPE} top: -7px; left: 50%; width: 58px; margin-left: -29px; rotate: -2deg; background: repeating-linear-gradient(90deg, rgba(244,214,140,.95) 0 7px, rgba(255,236,184,.95) 7px 14px); }
/* 봉투 머리 — 크래프트 종이 + 아래 지그재그 대신 점선 */
${MYW} [data-daenglab-wallet] > div:first-child { background: #f6e7cf; border-radius: 8px 8px 0 0; border-bottom: 2px dashed #e6cfa8; }
${MYW} [data-daenglab-wallet] > div:first-child p:first-child { color: #8a5a0c; letter-spacing: .02em; font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${MYW} [data-daenglab-wallet] > div:first-child h2 { text-decoration: none; }
${MYW} [data-daenglab-wallet] > div:first-child button { ${PATCH_CREAM} border-width: 2px; outline-width: 1.5px; outline-offset: -5px; padding: 7px 13px 6px; line-height: 1; font-size: 12px; }
/* 적립금 · 코인 · 분석 가능 — 동그란 코인 스티커(흰 칼선) */
${MYW} [data-daenglab-wallet] div.grid > div[class*="rounded-xl"] { border-radius: 18px; box-shadow: 0 0 0 2.5px #fff, 0 6px 10px -7px rgba(110, 80, 40, .45); }
${MYW} [data-daenglab-wallet] div.grid > div[class*="rounded-xl"] strong { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
/* 적립금 → 코인 바꾸기 — 노란 메모 · 지급 기준 — 접힌 분홍 메모 · 최근 내역 — 영수증 점선 */
${MYW} [data-daenglab-wallet] form { border: 0; border-radius: 4px 4px 14px 4px; background: #fff6c9; box-shadow: 0 6px 10px -8px rgba(110, 80, 40, .45); }
${MYW} [data-daenglab-wallet] details { border: 0; border-radius: 4px 4px 14px 4px; background: #fff3f6; box-shadow: 0 0 0 1.5px #f6c9d6; }
${MYW} [data-daenglab-wallet] details > summary { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${MYW} [data-daenglab-wallet] div[class*="border-t"] { border-top: 2px dashed #ecd5c8; }
${MYW} main main h1 + p[class*="text-sm"] { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; color: #8a766c; margin-top: 8px; }

/* 이메일 인증 보너스 카드(지갑 안) — 분홍 편지 메모 + 테이프 · 혜택 꼬리표 스티커 */
${MYW} [data-signup-email-verification] { position: relative; border: 0; border-radius: 6px 6px 18px 6px; background: #fff7f9; box-shadow: 0 0 0 1.5px #f6d3de, 0 10px 16px -12px rgba(160, 70, 100, .4); }
${MYW} [data-signup-email-verification]::before { ${TAPE} top: -6px; left: 22px; width: 42px; height: 12px; rotate: -5deg; }
${MYW} [data-signup-email-verification] h2 { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; text-decoration: none; }
${MYW} [data-signup-email-verification] span[class*="rounded-full"] { box-shadow: 0 0 0 1.5px #f6c9d6; }
${MYW} [data-signup-email-verification] div[class*="rounded-xl"][class*="border"] { border: 0; border-radius: 4px 4px 14px 4px; box-shadow: 0 0 0 1.5px #f3e6d6; }

`;
