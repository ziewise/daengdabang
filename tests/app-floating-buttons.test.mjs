/**
 * app-floating-buttons.test.mjs — 앱 오른쪽 아래 떠 있는 버튼 순서 · 스크롤 중 숨김(2026-11-05 사용자 결정)
 * - 케어톡 버튼은 맨 아래(탭바 바로 위) 그대로, 사진 올리기(data-app-fab) · 강아지 집이 케어톡 바로 위로 올라간다.
 * - 스크롤하는 동안 html[data-app-scrolling="true"] 가 붙어 떠 있는 버튼이 모두 숨고, 멈춘 뒤 0.18초면 다시 보인다.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shell = () => readFile(new URL("../components/app-shell/AppShell.tsx", import.meta.url), "utf8");

test("케어톡은 아래, 사진 올리기 · 강아지 집은 그 위", async () => {
    const src = await shell();
    // 케어톡 버튼을 위로 올리던 예전 규칙은 없어야 함
    assert.doesNotMatch(src, /body:has\(\[data-app-fab\]\) \.app-care-fab/);
    assert.doesNotMatch(src, /body:has\(button\[data-pet-companion-home\][^)]*\)\s*\.app-care-fab/);
    // 케어톡 버튼이 있을 때만 다른 버튼이 그 위(52px + 12px 간격)로
    assert.match(src, /body:has\(\.app-care-fab\) \[data-app-fab\] \{ bottom: calc\(var\(--app-tabbar-h\) \+ 4px \+ 52px \+ 12px\) !important; \}/);
    assert.match(src, /body:has\(\.app-care-fab\) button\[data-pet-companion-home\] \{ bottom: calc\(var\(--app-tabbar-h\) \+ 4px \+ 52px \+ 12px\) !important; \}/);
    assert.match(src, /body:has\(\.app-care-fab\) button\[data-pet-companion-home\]\[data-buybar="true"\] \{ bottom: calc\(112px \+ 52px \+ 12px/);
});

test("스크롤하는 동안 떠 있는 버튼 모두 숨김, 멈추면 다시", async () => {
    const src = await shell();
    assert.match(src, /document\.addEventListener\("scroll", onScroll, \{ capture: true, passive: true \}\)/);
    assert.match(src, /root\.dataset\.appScrolling = "true"/);
    assert.match(src, /setTimeout\(\(\) => \{ delete root\.dataset\.appScrolling; \}, 180\)/);
    assert.match(src, /html\.ddb-app-mode\[data-app-scrolling="true"\] :is\(\.app-care-fab, \[data-app-fab\], button\[data-pet-companion-home\]\)/);
    assert.match(src, /data-app-scrolling="true"\][^{]*\{[^}]*visibility: hidden !important;[^}]*pointer-events: none !important;/);
});
