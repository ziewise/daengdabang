import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("full chat keeps clear controls and message scrolling inside a bounded card", async () => {
    const page = await source("app/chat/ChatPageClient.tsx");

    assert.match(page, /surface flex h-\[min\(720px,calc\(100dvh-180px\)\)\] min-h-\[420px\] flex-col overflow-hidden/);
    assert.match(page, /aria-label="대화 내용 비우기"/);
    assert.match(page, /ref=\{messagesRef\} className="min-h-0 flex-1[^\n]*overflow-y-auto/);
    assert.match(page, /<form onSubmit=\{submit\} className="flex shrink-0/);

    const sectionStart = page.indexOf("<section className=\"surface flex h-[min(720px");
    const clearButton = page.indexOf("aria-label=\"대화 내용 비우기\"");
    const sectionEnd = page.indexOf("</section>", sectionStart);
    assert.ok(sectionStart >= 0 && clearButton > sectionStart && clearButton < sectionEnd);
});

test("product inquiry opens the existing chat widget without navigating away", async () => {
    const [tabs, widget, events] = await Promise.all([
        source("components/products/detail/ProductTabs.tsx"),
        source("components/site/ChatWidget.tsx"),
        source("lib/chat-widget-events.ts"),
    ]);

    assert.match(tabs, /openChatWidget\(\{ productName: displayName \}\)/);
    assert.doesNotMatch(tabs, /\/chat\?q=/);
    assert.match(events, /window\.dispatchEvent\(new CustomEvent/);
    assert.match(widget, /window\.addEventListener\(CHAT_WIDGET_OPEN_EVENT, openFromPage\)/);
    assert.match(widget, /setOpen\(true\)/);
    assert.match(widget, /상품 문의/);
    assert.match(widget, /const questionForAnswer = productContext/);
    assert.match(widget, /answerShopQuestionSmart\(questionForAnswer/);
});

test("medical follow-up slots request the answer instead of sending the prompt as a user message", async () => {
    const extras = await source("components/site/ChatResponseExtras.tsx");

    assert.doesNotMatch(extras, /medical\??\.knowledgeLevel/);
    assert.match(extras, /answerInput: true/);
    assert.match(extras, /if \(group\.answerInput\) \{/);
    assert.match(extras, /setAnswerSlot\(\{ label: choice\.label, prompt: choice\.prompt \}\)/);
    assert.match(extras, /aria-label=\{answerSlot \? `\$\{answerSlot\.label\} 답변 입력`/);
    assert.match(extras, /void onAsk\(value\)/);

    const answerBranch = extras.indexOf("if (group.answerInput) {");
    const immediateAsk = extras.indexOf("void onAsk(choice.prompt);", answerBranch);
    assert.ok(answerBranch >= 0 && immediateAsk > answerBranch);
    assert.match(extras.slice(answerBranch, immediateAsk), /return;/);
});
