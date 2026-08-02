import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const require = createRequire(import.meta.url);
const ts = require("typescript");

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

async function evidenceModule() {
    const input = await source("lib/shop-chat-evidence.ts");
    const compiled = ts.transpileModule(input, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    const moduleRecord = { exports: {} };
    const context = vm.createContext({
        module: moduleRecord,
        exports: moduleRecord.exports,
        URL,
        Date,
        Number,
        Set,
        String,
    });
    new vm.Script(compiled, { filename: "shop-chat-evidence.js" }).runInContext(context);
    return moduleRecord.exports;
}

async function displayModule() {
    const input = await source("lib/chat-display.ts");
    const compiled = ts.transpileModule(input, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    const moduleRecord = { exports: {} };
    const context = vm.createContext({
        module: moduleRecord,
        exports: moduleRecord.exports,
    });
    new vm.Script(compiled, { filename: "chat-display.js" }).runInContext(context);
    return moduleRecord.exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("chat evidence accepts only bounded credential-free HTTPS sources", async () => {
    const { normalizeShopChatSources } = await evidenceModule();
    const sources = plain(normalizeShopChatSources([
        {
            id: 2,
            name: "  Official\nSource  ",
            url: "https://example.com/report",
            publishedAt: "2026-07-30T09:00:00+09:00",
            retrieved_at: "2026-07-30T10:30:00+09:00",
        },
        { name: "duplicate", url: "https://example.com/report" },
        { name: "plain HTTP", url: "http://example.com/report" },
        { name: "script", url: "javascript:alert(1)" },
        { name: "credentials", url: "https://user:pass@example.com/private" },
        { name: "too long", url: `https://example.com/${"x".repeat(2100)}` },
    ]));

    assert.deepEqual(sources, [{
        id: "2",
        name: "Official Source",
        url: "https://example.com/report",
        publishedAt: "2026-07-30T00:00:00.000Z",
        retrievedAt: "2026-07-30T01:30:00.000Z",
    }]);
});

test("chat evidence bounds source count, text, research tokens, domains, and timestamps", async () => {
    const { normalizeShopChatResearch, normalizeShopChatSources } = await evidenceModule();
    const sources = plain(normalizeShopChatSources(Array.from({ length: 9 }, (_, index) => ({
        name: `${"가".repeat(200)} ${index}`,
        url: `https://source${index}.example/report`,
    }))));
    const research = plain(normalizeShopChatResearch({
        mode: "general-live-web",
        source_count: 5000,
        domains: ["www.Example.com", "bad/path", "example.com", "two.example"],
        freshness_status: "live_verified",
        fresh_as_of: "2026-07-30T02:00:00Z",
        search_completed_at: "2026-07-30T02:01:00Z",
    }));

    assert.equal(sources.length, 6);
    assert.equal(sources[0].name.length, 160);
    assert.deepEqual(research, {
        mode: "general-live-web",
        sourceCount: 1000,
        domains: ["example.com", "two.example"],
        freshnessStatus: "live_verified",
        freshAsOf: "2026-07-30T02:00:00.000Z",
        searchedAt: "2026-07-30T02:01:00.000Z",
    });
});

test("general API fallback is selected only when no protected canine or storefront route exists", async () => {
    const { isCurrentInformationRequest, shouldUseGeneralVerificationFallback } = await evidenceModule();

    assert.equal(shouldUseGeneralVerificationFallback("프랑스 수도는 어디야?"), true);
    assert.equal(shouldUseGeneralVerificationFallback("오늘 서울 날씨를 최신 자료로 찾아줘"), true);
    assert.equal(shouldUseGeneralVerificationFallback("아이폰 최신 가격을 검색해줘"), true);
    assert.equal(shouldUseGeneralVerificationFallback("오늘 강아지 뉴스를 최신 근거로 찾아줘"), true);
    assert.equal(shouldUseGeneralVerificationFallback("강아지 하네스 추천해줘"), false);
    assert.equal(shouldUseGeneralVerificationFallback("강아지에게 맞는 상품을 추천해줘"), false);
    assert.equal(shouldUseGeneralVerificationFallback("오늘 서울 날씨 알려줘", true), false);
    assert.equal(isCurrentInformationRequest("오늘 서울 날씨를 최신 자료로 찾아줘"), true);
    assert.equal(isCurrentInformationRequest("프랑스 수도는 어디야?"), false);
});

test("both chat surfaces preserve research metadata and render compact verified source links", async () => {
    const [helper, widget, page, extras] = await Promise.all([
        source("lib/daengdabang-llm.ts"),
        source("components/site/ChatWidget.tsx"),
        source("app/chat/ChatPageClient.tsx"),
        source("components/site/ChatResponseExtras.tsx"),
    ]);

    assert.match(helper, /normalizeShopChatSources\(data\.sources\)/);
    assert.match(helper, /normalizeShopChatResearch\(data\.research\)/);
    assert.match(helper, /generalVerificationUnavailableAnswer/);
    assert.match(helper, /확인되지 않은 답이나 무관한 인기 상품을 대신 보여드리지 않겠습니다/);
    assert.match(helper, /products:\s*\[\]/);
    for (const surface of [widget, page]) {
        assert.match(surface, /research\?: ShopChatResearch/);
        assert.match(surface, /actions: result\.actions/);
        assert.match(surface, /research: result\.research/);
        assert.match(surface, /research=\{message\.research\}/);
        assert.match(surface, /customerVisibleChatAnswer\(message\.text, Boolean\(message\.sources\?\.length\)\)/);
        assert.doesNotMatch(surface, /function ActionList/);
        assert.doesNotMatch(surface, /<ActionList/);
    }
    assert.match(extras, /sources\?: ShopChatSource\[\]/);
    assert.match(extras, /data-chat-research-evidence/);
    assert.match(extras, /href=\{href\}/);
    assert.match(extras, /target="_blank"/);
    assert.match(extras, /rel="noopener noreferrer"/);
    assert.match(extras, /확인한 출처/);
    assert.match(extras, /확인 가능한 웹 출처 없음/);
    assert.match(extras, /웹 확인 시각/);
    assert.match(extras, /근거 기준/);
    assert.match(extras, /aria-label="답변에 인용된 웹 출처"/);
    assert.match(extras, /group-open:rotate-180/);
    assert.match(extras, /parsed\.protocol !== "https:"/);
    assert.match(extras, /parsed\.username \|\| parsed\.password/);
    assert.match(extras, /citationNumber: index \+ 1/);
    assert.match(extras, /NON_EVIDENCE_RESEARCH_MODES/);
    assert.match(extras, /if \(!visibleSources\.length && !hasResearchAttempt\) return null/);
    assert.match(extras, /\[\{citationNumber\}\]/);
    assert.doesNotMatch(extras, /HTTPS 출처/);
    assert.doesNotMatch(extras, /검색 근거 상태/);
});

test("research timestamps render deterministically across server and browser hydration", async () => {
    const extras = await source("components/site/ChatResponseExtras.tsx");

    assert.match(extras, /EVIDENCE_SEOUL_OFFSET_MS/);
    assert.match(extras, /getUTCFullYear\(\)/);
    assert.match(extras, /getUTCMinutes\(\)/);
    assert.doesNotMatch(extras, /Intl\.DateTimeFormat/);
    assert.match(extras, /open=\{!visibleSources\.length\}/);
    assert.match(extras, /if \(!visibleSources\.length && !hasResearchAttempt\) return null/);
});

test("customer answer display keeps mapped citations and removes unsupported trailing markers", async () => {
    const { customerVisibleChatAnswer } = await displayModule();
    const answer = "첫 번째 확인 내용입니다. [1]\n두 출처가 확인했습니다. [1][2]\n[1]은 항목 번호입니다.";

    assert.equal(
        customerVisibleChatAnswer(answer, true),
        answer,
    );
    assert.equal(
        customerVisibleChatAnswer(answer, false),
        "첫 번째 확인 내용입니다.\n두 출처가 확인했습니다.\n[1]은 항목 번호입니다.",
    );
});
