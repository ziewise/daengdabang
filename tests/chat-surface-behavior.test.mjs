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

test("floating CareTalk keeps its behavior while using the scoped crayon skin", async () => {
    const [widget, css] = await Promise.all([
        source("components/site/ChatWidget.tsx"),
        source("components/site/ChatWidget.module.css"),
    ]);

    assert.match(widget, /import styles from "\.\/ChatWidget\.module\.css"/);
    assert.match(widget, /className=\{`\$\{styles\.panel\}/);
    assert.match(widget, /data-chat-role=\{message\.role\}/);
    assert.match(widget, /styles\.userBubble/);
    assert.match(widget, /styles\.assistantBubble/);
    assert.match(widget, /styles\.composer/);
    assert.match(widget, /CRAYON CARE NOTE/);
    assert.match(widget, /우리 아이 케어 노트/);
    assert.match(widget, /styles\.responseExtras/);
    assert.match(css, /font-family: var\(--font-crayon\)/);
    assert.match(css, /repeating-linear-gradient/);
    assert.match(css, /right: 4\.75rem/);
    assert.match(css, /linear-gradient\(90deg, transparent 0 34px/);
    assert.match(css, /\.emptyNote \{/);
    assert.match(css, /outline: 2px dashed rgba\(242, 139, 114/);
    assert.match(css, /@media \(max-width: 680px\)/);
    assert.match(css, /inset: calc\(env\(safe-area-inset-top\) \+ 12px\) 12px calc\(env\(safe-area-inset-bottom\) \+ 12px\)/);
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
