import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { customerVisibleChatAnswer } from "../lib/chat-display.ts";

test("customer answers omit provider branding while retaining storage facts and references", () => {
    const input = "Google Gemini 임시 채팅은 Google 계정에 72시간 보관됩니다. [1]";
    assert.equal(customerVisibleChatAnswer(input, true), "AI 상담 임시 채팅은 Google 계정에 72시간 보관됩니다. [1]");
    assert.equal(customerVisibleChatAnswer(input, false), "AI 상담 임시 채팅은 Google 계정에 72시간 보관됩니다.");
    for (const label of ["Gemini", "GEMINI", "gemini", "구글 제미나이", "제미니", "지미니"]) {
        assert.equal(customerVisibleChatAnswer(`${label} 안내`, true), "AI 상담 안내");
    }
});

test("provider chat links resolve to the service privacy notice without changing other sources", () => {
    const input = "Gemini: https://gemini.google.com/app/123?hl=ko\nhttps://policies.google.com/privacy [2]";
    assert.equal(customerVisibleChatAnswer(input, true), "AI 상담: https://www.daengdabang.com/privacy/#overseas\nhttps://policies.google.com/privacy [2]");
});

test("the published privacy copy omits provider branding and preserves recipient and retention details", async () => {
    const privacy = await readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(privacy, /gemini|제미나이|제미니|지미니/i);
    assert.match(privacy, /Google LLC/);
    assert.match(privacy, /임시 채팅은 Google 계정에 72시간 보관/);
    assert.match(privacy, /AI 모델 학습에 사용되지 않음/);
});
