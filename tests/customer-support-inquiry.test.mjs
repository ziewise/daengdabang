import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { customerSupportInquiryHref, customerSupportRoute } from "../lib/customer-support.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("strong post-purchase questions route to customer support before shopping", () => {
    const cases = [
        ["제품 구매를 했는데 사이즈가 안 맞아서 교환하고 싶어", "exchange"],
        ["상품을 반품하려면 어떻게 해야 해?", "return"],
        ["주문 취소하고 환불받고 싶어요", "refund"],
        ["받은 제품이 이상하고 파손됐어요", "defect"],
        ["택배가 안 와서 배송 조회하고 싶어요", "delivery"],
        ["주문 변경 문의할게요", "order"],
        ["결제 오류가 났어요", "payment"],
    ];

    for (const [question, expectedCategory] of cases) {
        assert.equal(customerSupportRoute(question)?.category, expectedCategory, question);
    }
    assert.equal(customerSupportRoute("대형견 하네스 추천해줘"), null);
    assert.equal(customerSupportRoute("샴푸 제품 비교해줘"), null);
    assert.equal(
        customerSupportInquiryHref("exchange"),
        "/inquiry?category=exchange&source=chat#inquiry-form",
    );
});

test("chat support replies guarantee an internal inquiry CTA and suppress remote products", async () => {
    const [llm, extras, widget] = await Promise.all([
        source("lib/daengdabang-llm.ts"),
        source("components/site/ChatResponseExtras.tsx"),
        source("components/site/ChatWidget.tsx"),
    ]);

    assert.match(llm, /kind: "internal_link"/);
    assert.match(llm, /const supportFallback = supportRoute \? customerSupportAnswer\(supportRoute\) : undefined/);
    assert.match(llm, /if \(supportFallback\) \{[\s\S]{0,900}products: \[\]/);
    assert.match(llm, /ctas: mergedCtas/);
    assert.match(extras, /cta\.kind === "internal_link" && cta\.url/);
    assert.match(extras, /<Link[\s\S]{0,220}href=\{cta\.url\}/);
    assert.match(widget, /onInternalNavigate=\{\(\) => setOpen\(false\)\}/);
});

test("the inline inquiry form posts the exact API contract and shows the persisted ticket id", async () => {
    const [page, panel, api, legal] = await Promise.all([
        source("app/inquiry/page.tsx"),
        source("components/contact/CustomerInquiryPanel.tsx"),
        source("lib/customer-api.ts"),
        source("lib/legal.ts"),
    ]);

    assert.match(page, /<CustomerInquiryPanel/);
    assert.match(panel, /aria-controls="inquiry-form"/);
    assert.match(panel, /source = openedFromChat \? "chatbot" : "inquiry_page"/);
    for (const field of [
        "order_number",
        "product_name",
        "requested_action",
        "privacy_consent",
    ]) {
        assert.match(panel, new RegExp(`${field}:`));
    }
    assert.match(panel, /user\?\.name/);
    assert.match(panel, /user\?\.email/);
    assert.match(panel, /user\?\.phone/);
    assert.match(panel, /접수번호: <b>\{receipt\.id\}<\/b>/);
    assert.match(api, /method: "POST"/);
    assert.match(api, /"\/api\/v1\/customer-support\/inquiries"/);
    assert.match(legal, /customerServiceEmail:[^\n]*"support@daengdabang\.com"/);
    assert.doesNotMatch(legal, /help@daengdabang\.com/);
});

test("FAQ, order, and return destinations have persistent button affordances", async () => {
    const [inquiry, faqPage, faqClient, returnPage] = await Promise.all([
        source("app/inquiry/page.tsx"),
        source("app/faq/page.tsx"),
        source("app/faq/FaqClient.tsx"),
        source("app/return/page.tsx"),
    ]);

    for (const destination of ["/faq", "/mypage", "/return"]) {
        assert.match(inquiry, new RegExp(`href="${destination.replace("/", "\\/")}"`));
    }
    assert.match(faqPage, /1:1 문의 바로 작성/);
    assert.match(faqClient, /교환·반품 기준 보기/);
    assert.match(faqClient, /교환·반품 접수/);
    assert.match(returnPage, /교환·반품 접수하기/);
    assert.match(returnPage, /href="\/inquiry\?category=exchange#inquiry-form"/);
});
