// 터치 기기 입력칸 글자 16px(2026-11-17 사용자 "검색 버튼 클릭하면 화면이 확대되고 취소해도 안 돌아와") — 화면 코드 확인
//  ① 터치 기기(pointer: coarse)에서 글자 쓰는 입력칸 · 글 칸 · 선택칸은 16px(앱 390 폭 맞춤 작은 폰은 17px), PC 는 그대로
//  ② 원래 더 큰 칸(text-lg 이상)과 data-font-keep 칸은 줄이지 않음
//  ③ 확대 자체를 막는 viewport(maximum-scale · user-scalable=no)는 쓰지 않음 — 손가락 확대는 그대로
//  ④ 홈 날씨 지역 알약은 터치 기기에서 12px 글자 알약 + 16px 투명 선택칸(모양 그대로)
//  ⑤ 휴대폰 검색 창 안내 문구는 짧게(16px 에서 잘리지 않게)
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const hero = await readFile(new URL("../components/home/HeroSection.tsx", import.meta.url), "utf8");
const search = await readFile(new URL("../components/header/SearchModal.tsx", import.meta.url), "utf8");

const block = css.slice(css.indexOf("터치 기기 입력칸 글자 16px"));

test("touch devices get 16px text in every typing field, larger fields untouched", () => {
    assert.ok(block.length > 0, "규칙 묶음이 globals.css 에 있어야 함");
    assert.match(block, /@media \(pointer: coarse\) \{\s*:is\(input:not\(\[type="checkbox"\], \[type="radio"\]/);
    assert.match(block, /textarea, select\):not\(\[class\*="text-lg"\], \[class\*="text-xl"\][^)]*\[data-font-keep\]\) \{\s*font-size: 16px !important;/);
    assert.match(block, /html\[data-ddb-viewport-fit="base"\] :is\([\s\S]*?\{\s*font-size: 17px !important;/);
    // 줄 수로 높이가 정해지는 댕자랑 글 칸은 높이 그대로
    assert.match(block, /\.scm-textarea \{ line-height: 25\.5px !important; \}/);
});

test("zoom itself is not blocked", () => {
    assert.doesNotMatch(layout, /maximum-scale|user-scalable/);
});

test("hero region pill keeps its 12px look on touch devices with a 16px invisible select on top", () => {
    assert.match(hero, /<span className="hero-region-pick">/);
    assert.match(hero, /<span className="hero-region-pick-text" aria-hidden="true">/);
    assert.match(block, /\.hero-region-pick-text \{ display: none; \}/);
    assert.match(block, /@media \(pointer: coarse\) \{\s*\.hero-region-pick-text \{[\s\S]*?font-size: 12px;/);
    assert.match(block, /\.hero-region-pick \.hero-region-select \{[\s\S]*?opacity: 0;/);
});

test("phone search placeholder is short enough for 16px", () => {
    assert.match(search, /window\.matchMedia\("\(max-width: 480px\)"\)/);
    assert.match(search, /\? \(locale === "en" \? "Search products" : "어떤 상품을 찾으세요\?"\)/);
});
