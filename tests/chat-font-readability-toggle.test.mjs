import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("CareTalk offers a persistent readable-font toggle before the clear button", async () => {
    const [widget, css, storage] = await Promise.all([
        source("components/site/ChatWidget.tsx"),
        source("components/site/ChatWidget.module.css"),
        source("lib/storage.ts"),
    ]);

    assert.match(storage, /CHAT_FONT_MODE: "daengdabang_chat_font_mode"/);
    assert.match(storage, /export type ChatFontMode = "crayon" \| "readable"/);
    assert.match(storage, /chatFontModeStorage/);
    assert.match(storage, /chatFontMode: makeSnapshot<ChatFontMode>/);

    assert.match(widget, /useSyncExternalStore/);
    assert.match(widget, /subscribeStorage\("CHAT_FONT_MODE", callback\)/);
    assert.match(widget, /data-chat-font-mode=\{chatFontMode\}/);
    assert.match(widget, /data-chat-font-toggle/);
    assert.match(widget, /aria-pressed=\{readableFontEnabled\}/);
    assert.match(widget, /또박또박한 정자체로 보기/);
    assert.match(widget, /기존 손글씨체로 보기/);
    assert.match(widget, /fontModeCrayonSample/);
    assert.match(widget, /fontModeReadableSample/);
    assert.doesNotMatch(widget, /window\.localStorage/);

    const toggleIndex = widget.indexOf("data-chat-font-toggle");
    const clearIndex = widget.indexOf('aria-label="채팅 비우기"');
    assert.ok(toggleIndex >= 0 && clearIndex > toggleIndex);

    assert.match(css, /--chat-font-body: var\(--font-crayon\)/);
    assert.match(css, /\.panel\[data-chat-font-mode="readable"\] \{[\s\S]{0,260}--chat-font-body: var\(--font-wanted-sans\)/);
    assert.match(css, /\.panel\[data-chat-font-mode="readable"\] \.messageBubble \{[\s\S]{0,180}font-size: 16px/);
    assert.match(css, /\.headerIconButton\[data-active="true"\]/);
    assert.match(css, /\.fontModeCrayonSample \{[\s\S]{0,260}font-family: var\(--font-crayon\)/);
    assert.match(css, /\.fontModeReadableSample \{[\s\S]{0,260}font-family: var\(--font-wanted-sans\)/);
});
