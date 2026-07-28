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
    assert.match(component, /Math\.min\(visibleIndex \* stepMs, maxDelayMs\)/);
    assert.match(component, /if \(\/\^\\s\+\$\/\.test\(part\)\) return part/);
    assert.match(component, /CHAT_REVEAL_STEP_MS = 68/);
    assert.match(component, /CHAT_REVEAL_MAX_DELAY_MS = 2_600/);
    assert.match(component, /stepMs = CHAT_REVEAL_STEP_MS/);
    assert.match(component, /maxDelayMs = CHAT_REVEAL_MAX_DELAY_MS/);
    assert.match(css, /\.ddb-progressive-token/);
    assert.match(css, /ddb-progressive-token-in 520ms/);
    assert.match(css, /ddb-progressive-gradient-pass 1240ms/);
    assert.match(css, /ddb-progressive-gradient-pass/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(page, /<ProgressiveRevealText text=\{message\.text\}/);
    assert.match(widget, /<ProgressiveRevealText text=\{message\.text\} \/>/);
    assert.match(modal, /<ProgressiveRevealText text=\{m\.text\} \/>/);
});
