/**
 * 앱 쇼핑 화면 스티커북 껍데기 — 앱 전용 CSS (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 앱 틀 안에서 여는 웹 쇼핑 화면(상품 상세 · 장바구니 · 결제 · 목록 · 검색)에 "보이는 겉모양"만 입힌다.
 *  - 범위: html.ddb-app-mode.ddb-app-web-header (= 앱 모드 + 쇼핑 탭의 웹 화면) · 검색 창은 앱 모드 어디서나
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
const S = "html.ddb-app-mode.ddb-app-web-header";
/* 점 무늬 다이어리 속지 — 앱 쇼핑 첫 화면 · 케어톡과 같은 종이(괘선 없음) */
const DOT_PAPER = "background-color: #fffdf8; background-image: radial-gradient(circle, rgba(196,160,140,.24) 1px, transparent 1.3px); background-size: 15px 15px;";
/* 마스킹테이프 한 조각(꾸밈 · 눌리지 않음) */
const TAPE = "content: \"\"; position: absolute; z-index: 3; pointer-events: none; height: 13px; border-radius: 2px; background: repeating-linear-gradient(90deg, rgba(255,200,218,.92) 0 7px, rgba(255,220,232,.92) 7px 14px); box-shadow: 0 2px 3px -2px rgba(110,60,50,.3);";

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

/* ── 3) 버튼 — 주 색 버튼은 젤리 스티커(아랫면 두께), 흰 테두리 버튼은 종이 버튼 · 누르면 살짝 눌림 ── */
${S} main button.bg-indigo-600:not([class*="ring-"]), ${S} [data-purchase-option-sheet] button.bg-indigo-600:not([class*="ring-"]),
${S} main a.bg-indigo-600:not([class*="ring-"]) { box-shadow: inset 0 -3px 0 rgba(120, 25, 60, .22), 0 6px 12px -8px rgba(212, 68, 122, .7); }
${S} main :is(button, a)[class*="border-neutral-200"][class*="bg-white"]:not([class*="ring-"]) { box-shadow: 0 3px 6px -4px rgba(110, 80, 40, .35); }
${S} main button:not(:disabled):active, ${S} [data-purchase-option-sheet] button:not(:disabled):active { filter: brightness(.96); }

/* 사이트 공용 버튼(.btn-primary · .btn-secondary — 결제창 열기 등) — 색 · 모서리만 */
${S} main .btn { border-radius: 12px; }
${S} main .btn-primary { background: #d4447a; box-shadow: inset 0 -3px 0 rgba(120, 25, 60, .22), 0 6px 12px -8px rgba(212, 68, 122, .7); }
${S} main .btn-primary:disabled { background: #e9a9c0; box-shadow: none; }
${S} main .btn-secondary { border-color: #efdfd2; color: #3d2f2a; }

/* ── 4) 상품 상세 ── */
/* 사진 — 종이 테두리색 · 갈색 그림자 */
${S} [data-product-gallery] { border-color: #f3e6d6; box-shadow: 0 10px 18px -14px rgba(110, 80, 40, .55); }
/* 사진 넘김 작은 사진 — 둥근 종이(고른 표시 테두리는 협업자 것 그대로 · 색만 분홍) */
${S} [data-product-detail-content] button[aria-label^="상품 이미지"] { border-radius: 8px; }
/* 색상 고르기 · 재고 · 안내 칸 — 메모지 */
${S} [data-pet-guide-target="color"] { position: relative; border-color: #f3e6d6; background: #fffbea; box-shadow: 0 8px 14px -12px rgba(110, 80, 40, .5); }
${S} [data-pet-guide-target="color"]::before { ${TAPE} top: -6px; left: 50%; width: 52px; margin-left: -26px; rotate: -3deg; }
/* 입혀보기 버튼 — 분홍 → 보라 젤리 */
${S} [data-pet-guide-target="try-on"]:not([class*="ring-"]) { box-shadow: inset 0 -3px 0 rgba(80, 30, 90, .2), 0 8px 16px -10px rgba(160, 70, 160, .7); }
/* 구매 버튼 줄 · 아래 고정 구매 바 — 크림 종이 */
${S} [data-product-detail-content] .fixed.bottom-0.border-t { background: rgba(255, 253, 248, .9); border-top: 2px dashed #f0d9cf; }
/* 상세 탭(상세정보 · 후기 · Q&A) — 크림 띠 + 분홍 밑줄 */
${S} nav[aria-label="상세정보"] { background: rgba(255, 253, 248, .94); border-color: #f0dfd2; }
${S} nav[aria-label="상세정보"] a { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${S} nav[aria-label="상세정보"] a > span.absolute { height: 4px; border-radius: 999px; background: rgba(240, 106, 150, .55); }
/* 상세 안 카드(배송 · 반품 안내, 후기, 문의) — 종이 카드 */
${S} main section[class*="rounded-2xl"][class*="border"]:not([class*="ring-"]) { border-color: #f3e6d6; background: #fffefb; box-shadow: 0 10px 18px -14px rgba(110, 80, 40, .5); }

/* ── 5) 옵션 고르기 판(장바구니 담기 · 바로 구매) — 점 무늬 속지 + 위 테이프 ── */
${S} [data-purchase-option-sheet] { ${DOT_PAPER} border-radius: 24px 24px 0 0; box-shadow: 0 -10px 30px -12px rgba(110, 70, 55, .45); }
${S} [data-purchase-option-sheet="open"]::before { ${TAPE} top: -5px; left: 50%; width: 64px; margin-left: -32px; rotate: -2deg; }
${S} [data-purchase-option-sheet] h2 { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
${S} [data-purchase-option-sheet] > div { border-color: #f0dfd2; }
${S} [data-purchase-option-sheet] :is(select, [class*="border-neutral-200"]) { background-color: #fff; }

/* ── 6) 상품 카드(목록 · 관련 상품 · 베스트 · 신상품 · 카테고리 · 검색 결과) — 크래프트 종이 스크랩 ── */
${S} article[data-pet-product="true"] { position: relative; background: #fffaf2; border-radius: 10px; }
${S} article[data-pet-product="true"]::after { ${TAPE} top: 0; left: 50%; width: 46px; margin-left: -23px; border-radius: 0 0 2px 2px; }

/* ── 7) 장바구니 · 결제 — 종이 카드(색 · 모서리만, 결제 수단 고유색 · 안내 문구는 그대로) ── */
${S} main :is(div, section, li, form)[class*="rounded"][class*="border-neutral-200"][class*="bg-white"]:not([class*="ring-"]) { border-color: #f3e6d6; box-shadow: 0 10px 18px -14px rgba(110, 80, 40, .45); }
${S} main :is(input, select, textarea) { background-color: #fff; }
${S} main :is(input, select, textarea):focus { border-color: #f283a3; }

/* ── 8) 검색 창(앱 모드 어디서나) — 점 무늬 속지 + 테이프 · 검색칸은 흰 둥근 종이 ── */
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] { ${DOT_PAPER} color: #3d2f2a; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif;
  box-shadow: 0 0 0 1.5px #f1e3da, 0 24px 48px -22px rgba(110, 70, 55, .55); }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] > div:first-child { background: rgba(255, 253, 248, .96); border-bottom: 2px dashed #f0d9cf; }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] input { background: #fff; box-shadow: 0 3px 8px -5px rgba(110, 80, 40, .35); }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] h3 { color: #b07f6b; }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] :is(a, button)[class*="rounded-full"][class*="bg-neutral-100"],
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] span[class*="rounded-full"][class*="bg-neutral-100"] { background: #fff; box-shadow: 0 0 0 1.5px #f3e6d6; }
`;
