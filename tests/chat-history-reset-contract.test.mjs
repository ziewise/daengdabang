import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

function sectionBetween(value, startMarker, endMarker) {
    const start = value.indexOf(startMarker);
    const end = value.indexOf(endMarker, start + startMarker.length);

    assert.notEqual(start, -1, `missing section start: ${startMarker}`);
    assert.notEqual(end, -1, `missing section end: ${endMarker}`);
    return value.slice(start, end);
}

function assertLastTwelveMessagesAreSent(component) {
    const ask = sectionBetween(component, "const ask", "const submit");

    assert.match(
        ask,
        /const history: ShopChatHistoryTurn\[\] = messages\.slice\(-12\)\.map\(\(item\) => \(\{[\s\S]*?role: item\.role,[\s\S]*?content: item\.text,[\s\S]*?\}\)\);/,
    );
    assert.match(
        ask,
        /answerShopQuestionSmart\([^,]+, \{[\s\S]*?\bhistory,[\s\S]*?\}\)/,
    );
}

test("full chat sends the last 12 messages and clearing starts a fresh request context", async () => {
    const page = await source("app/chat/ChatPageClient.tsx");
    const clearChat = sectionBetween(page, "const clearChat = () => {", "const ask");

    assertLastTwelveMessagesAreSent(page);
    assert.match(clearChat, /requestSequenceRef\.current \+= 1/);
    assert.match(clearChat, /inFlightRef\.current = false/);
    assert.match(clearChat, /setMessages\(\[\]\)/);
    assert.match(clearChat, /setInput\(""\)/);
    assert.match(clearChat, /setLoading\(false\)/);
    assert.match(clearChat, /generationReferences\.clear\(\)/);
});

test("chat widget sends the last 12 messages and clears product and request context", async () => {
    const widget = await source("components/site/ChatWidget.tsx");
    const clearChat = sectionBetween(widget, "const clearChat = () => {", "const ask");

    assertLastTwelveMessagesAreSent(widget);
    assert.match(clearChat, /requestSequenceRef\.current \+= 1/);
    assert.match(clearChat, /inFlightRef\.current = false/);
    assert.match(clearChat, /setMessages\(\[\]\)/);
    assert.match(clearChat, /setInput\(""\)/);
    assert.match(clearChat, /setLoading\(false\)/);
    assert.match(clearChat, /setProductContext\(""\)/);
    assert.match(clearChat, /generationReferences\.clear\(\)/);
});
