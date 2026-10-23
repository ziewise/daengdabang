// 웹 케어톡 크레파스 그림일기 창(2026-10-23 C3) — 사이트 색으로 바꾸되 손님 글이 잘 읽히는지 고정
// 앱은 기존 공책 창(chat-paper-readability.test.mjs) 그대로, 웹은 html:not(.ddb-app-mode) 구역만 확인
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");
const WEB = ":global(html:not(.ddb-app-mode))";

// 웹 구역에서 한 규칙 덩어리 꺼내기
const webBlock = (css, selector) => {
    const start = css.indexOf(`${WEB} ${selector} {`);
    assert.ok(start >= 0, `${selector} web block must exist`);
    const end = css.indexOf("\n}", start);
    return css.slice(start, end + 2);
};

test("web CareTalk uses site colors with readable bubbles and no ruled paper", async () => {
    const css = await source("components/site/ChatWidget.module.css");
    const list = webBlock(css, ".messageList");
    const user = webBlock(css, ".userBubble");
    const header = webBlock(css, ".header");
    const composer = webBlock(css, ".composer");

    // 대화 바탕은 줄 없이(창 크림 종이 + 연한 장난감 벽지가 비침)
    assert.match(list, /background: transparent/);
    assert.doesNotMatch(list, /repeating-linear-gradient/);
    assert.match(webBlock(css, ".panel"), /background: #fffaf1/);
    // 손님 말풍선 = 연분홍 바탕 + 진한 분홍 글씨, 케어톡 말풍선 = 흰 바탕 + 진한 글씨
    assert.match(user, /background: #fff3f6/);
    assert.match(user, /color: #7a2b45/);
    assert.match(css, /\.assistantBubble,\n:global\(html:not\(\.ddb-app-mode\)\) \.loadingBubble \{[\s\S]*?background: #ffffff;[\s\S]*?color: #334155;/);
    // 머리 · 입력 칸은 점선 · 줄무늬 없이
    assert.match(header, /#fff3e3/);
    assert.doesNotMatch(header, /dashed|repeating-linear-gradient/);
    assert.doesNotMatch(composer, /dashed|repeating-linear-gradient/);
});

test("web CareTalk shows its welcome and AI 상담 cards open it with a starter question", async () => {
    const dock = await source("components/site/FloatingDock.tsx");
    const launch = await source("app/chat/ChatLaunchClient.tsx");
    assert.match(dock, /empty=\{CareTalkWelcome\}/);
    assert.match(launch, /openChatWidget\(\{ initialQuestion: topic\.question \}\)/);
});
