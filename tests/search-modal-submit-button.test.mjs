// 검색 창 "검색" 단추(2026-11-17 사용자 "검색할 내용 입력하고 검색 버튼이 없어") — 화면 코드 확인
//  ① 입력칸 옆 검색 단추 = 기존 검색(form submit → goSearch)에 연결, 새 동작 없음
//  ② 빈 칸이면 단추 꺼짐, 휴대폰 키보드 "검색" 키(enterKeyHint · type=search · role=search)
//  ③ 웹 = 분홍 알약(휴대폰은 돋보기 동그라미), 앱 = 분홍 와펜 동그라미 — 앱 닫기 단추 규칙(form > button[aria-label])에 안 걸리게 aria-label 없음
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modal = await readFile(new URL("../components/header/SearchModal.tsx", import.meta.url), "utf8");
const webCss = await readFile(new URL("../components/header/search-modal-web.css", import.meta.url), "utf8");
const appSkin = await readFile(new URL("../components/app-shell/appShopSkin.ts", import.meta.url), "utf8");

test("search button submits the existing search form and is off while empty", () => {
    assert.match(modal, /<form onSubmit=\{submit\} className="relative" role="search">/);
    assert.match(modal, /const submit = \(e: React\.FormEvent\) => \{\s*e\.preventDefault\(\);\s*goSearch\(term\);/);
    assert.match(modal, /type="submit"\s*disabled=\{!term\.trim\(\)\}\s*data-search-submit=""/);
    assert.match(modal, /enterKeyHint="search"/);
    // 앱 닫기 단추 꾸밈(form > button[aria-label])과 겹치지 않게 — 검색 단추에는 aria-label 대신 글자
    const button = modal.slice(modal.indexOf('data-search-submit=""'), modal.indexOf("</button>", modal.indexOf('data-search-submit=""')));
    assert.doesNotMatch(button, /aria-label/);
    assert.match(button, /<span className="sm-submit-label">\{t\("search"\)\}<\/span>/);
});

test("web pill and app wappen styles exist with room kept in the input", () => {
    assert.match(webCss, /& \.sm-input \{ padding-right: 140px; \}/);
    assert.match(webCss, /& \.sm-submit \{\s*right: 54px;/);
    assert.match(webCss, /@media \(max-width: 480px\) \{\s*html:not\(\.ddb-app-mode\) \.sm-panel \{\s*& \.sm-input \{ padding-right: 98px; \}/);
    assert.match(appSkin, /\$\{SEARCH\} form > button\[data-search-submit\] \{ \$\{PATCH_PINK\} right: 54px; width: 40px; height: 40px;/);
    assert.match(appSkin, /\$\{SEARCH\} form input \{ padding-right: 52px; \}/);
    // 앱은 누르기만(hover 없음)
    assert.doesNotMatch(appSkin, /data-search-submit\]:hover/);
});
