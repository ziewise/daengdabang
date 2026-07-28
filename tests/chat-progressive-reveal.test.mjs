import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("customer chat assistant replies reveal gradually with an accessible reduced-motion fallback", async () => {
    const [component, css, page, widget, modal] = await Promise.all([
        source("components/site/ProgressiveRevealText.tsx"),
        source("app/globals.css"),
        source("app/chat/ChatPageClient.tsx"),
        source("components/site/ChatWidget.tsx"),
        source("components/chatbot/ChatbotModal.tsx"),
    ]);

    assert.match(component, /text\.split\(\/\(\\s\+\)\/\)/);
    assert.match(component, /aria-label=\{text\}/);
    assert.match(component, /aria-hidden="true"/);
    assert.match(component, /maxDelayMs = 1_350/);
    assert.match(css, /\.ddb-progressive-token/);
    assert.match(css, /ddb-progressive-gradient-pass/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(page, /<ProgressiveRevealText text=\{message\.text\}/);
    assert.match(widget, /<ProgressiveRevealText text=\{message\.text\} stepMs=\{34\} maxDelayMs=\{1_150\}/);
    assert.match(modal, /<ProgressiveRevealText text=\{m\.text\} stepMs=\{36\} maxDelayMs=\{1_100\}/);
});
