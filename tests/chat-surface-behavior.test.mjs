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
    assert.match(page, /ref=\{messagesRef\}[\s\S]{0,260}className="min-h-0 flex-1[^\n]*overflow-y-auto/);
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
    assert.match(css, /--chat-font-accent: var\(--font-crayon\)/);
    assert.match(css, /--chat-font-body: var\(--font-wanted-sans\)/);
    assert.match(css, /\.messageBubble \{[\s\S]{0,260}font-family: var\(--chat-font-body\)/);
    assert.match(css, /\.messageBubble \{[\s\S]{0,320}font-weight: 600/);
    assert.match(css, /\.input \{[\s\S]{0,520}font-size: 16px/);
    assert.match(css, /repeating-linear-gradient/);
    assert.match(css, /right: 4\.75rem/);
    assert.match(css, /linear-gradient\(90deg, transparent 0 34px/);
    assert.match(css, /\.emptyNote \{/);
    assert.match(css, /outline: 2px dashed rgba\(242, 139, 114/);
    assert.match(css, /@media \(max-width: 680px\)/);
    assert.match(css, /inset: calc\(env\(safe-area-inset-top\) \+ 12px\) 12px calc\(env\(safe-area-inset-bottom\) \+ 12px\)/);
});

test("required medical follow-up slots are collected once and old cards become inactive", async () => {
    const [extras, widget, page] = await Promise.all([
        source("components/site/ChatResponseExtras.tsx"),
        source("components/site/ChatWidget.tsx"),
        source("app/chat/ChatPageClient.tsx"),
    ]);

    assert.doesNotMatch(extras, /medical\??\.knowledgeLevel/);
    assert.match(extras, /CHAT_FOLLOW_UP_BUNDLE_PREFIX = "추가로 알려드릴 내용입니다\."/);
    assert.match(extras, /followUpSlots\.some\(\(slot\) => slot\.required\) \? followUpSlots : \[\]/);
    assert.match(extras, /\.\.\.answeredEntries\.map\(\(\{ label, answer \}\) => `- \$\{label\}: \$\{answer\}`\)/);
    assert.match(extras, /const accepted = await onAsk\(prompt\)/);
    assert.match(extras, /if \(accepted\) \{[\s\S]{0,140}setSubmittedCount/);
    assert.match(extras, /추가 정보 \{submittedCount\}개를 한 번에 전달했어요/);
    assert.match(extras, /아는 내용만 적고 한 번에 보내세요/);
    assert.match(extras, /disabled=\{!answeredEntries\.length \|\| submitting\}/);
    assert.match(extras, /aria-controls=\{formId\}/);
    assert.match(widget, /index === messages\.length - 1/);
    assert.match(widget, /!isFollowUpBundlePrompt/);
    assert.match(page, /index === messages\.length - 1/);
    assert.match(page, /!isFollowUpBundlePrompt/);
    assert.doesNotMatch(widget, /\[open, messages, loading\]/);
    assert.doesNotMatch(page, /\[messages, loading\]/);
    assert.doesNotMatch(widget, /scroll-smooth/);
    assert.doesNotMatch(page, /scroll-smooth/);
    assert.match(widget, /latestMessage\.role === "user"/);
    assert.match(page, /latestMessage\.role === "user"/);
    assert.match(widget, /requestSequence !== requestSequenceRef\.current/);
    assert.match(page, /requestSequence !== requestSequenceRef\.current/);
});

test("shop chat strips only the customer-facing routing preamble", async () => {
    const helper = await source("lib/daengdabang-llm.ts");

    assert.match(helper, /CUSTOMER_ROUTING_PREAMBLE_RE/);
    assert.match(helper, /source\.replace\(CUSTOMER_ROUTING_PREAMBLE_RE, ""\)\.trim\(\)/);
    assert.match(helper, /answer: customerFacingShopChatAnswer\(data\.answer, fallback\.answer\)/);
    assert.doesNotMatch(helper, /이 질문은 상품 추천보다 강아지 생활\/행동 정보에 가까워서/);
    assert.doesNotMatch(helper, /지금은 상품 추천보다 증상 확인이 먼저/);
});
