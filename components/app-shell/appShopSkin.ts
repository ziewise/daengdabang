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

/* ── 8) 검색 창(앱 모드 어디서나) — 점 무늬 속지 + 테이프 · 검색칸은 흰 둥근 종이 ── */
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] { ${DOT_PAPER} color: #3d2f2a; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif;
  box-shadow: 0 0 0 1.5px #f1e3da, 0 24px 48px -22px rgba(110, 70, 55, .55); }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] > div:first-child { background: rgba(255, 253, 248, .96); border-bottom: 2px dashed #f0d9cf; }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] input { background: #fff; box-shadow: 0 3px 8px -5px rgba(110, 80, 40, .35); }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] h3 { color: #b07f6b; }
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] :is(a, button)[class*="rounded-full"][class*="bg-neutral-100"],
html.ddb-app-mode [role="dialog"][data-pet-companion-allow="search"] span[class*="rounded-full"][class*="bg-neutral-100"] { background: #fff; box-shadow: 0 0 0 1.5px #f3e6d6; }
`;
