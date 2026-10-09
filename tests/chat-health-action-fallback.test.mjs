import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import {
    classifyChatMedicalSafety,
    healthActionFollowUpKind,
    resolveChatHealthActionContext,
} from "../lib/chat-medical-safety.ts";
import { normalizeShopChatSources } from "../lib/shop-chat-evidence.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const fishQuestion = "우리강아지가 생선을 잘못먹었는지 켁켁~거리는데 어떻게하지?";
const history = [
    { role: "user", content: fishQuestion },
    { role: "assistant", content: "호흡과 침 삼킴을 확인하고 동물병원에 연락하세요." },
];
const compiled = new Map();

function loadChat({ fetch, base = "https://api.example.test" }) {
    const modules = new Map();
    const stubs = {
        "@/lib/catalog": { CATALOG: [] },
        "@/lib/customer-api": { ddbApiBase: () => base },
        "@/lib/customer-support": { customerSupportRoute: () => null },
        "@/lib/petlens-review-breed": {},
        "@/lib/petlens-result-policy": {},
        "@/lib/pet-companion-breeds": { PET_BREEDS: [] },
        "@/lib/recommendation": {},
        "@/lib/recommendation/feature-flags": { RECOMMENDATION_FEATURE_FLAGS: {} },
        "@/lib/shop-chat-client-contract": { projectShopChatPetProfile: () => null },
    };
    const context = vm.createContext({
        fetch, URL, Headers, Response, AbortController, AbortSignal, Error, TypeError,
        TextDecoder, TextEncoder, setTimeout, clearTimeout,
    });
    const load = (name) => {
        if (stubs[name]) return stubs[name];
        if (modules.has(name)) return modules.get(name).exports;
        const path = `${name.replace("@/", "")}.ts`;
        if (!compiled.has(path)) {
            compiled.set(path, ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
                compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
            }).outputText);
        }
        const record = { exports: {} };
        modules.set(name, record);
        const factory = new vm.Script(`(function(require, module, exports) {\n${compiled.get(path)}\n})`, { filename: path }).runInContext(context);
        factory(load, record, record.exports);
        return record.exports;
    };
    return load("@/lib/daengdabang-llm");
}

function sse(body) {
    return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

function assertFishSafety(answer) {
    assert.equal(answer.medical?.mode, true);
    assert.equal(answer.medical?.triage, "emergency");
    assert.equal(answer.medical?.topic, "foreign_body_or_bone_ingestion");
    assert.equal(answer.products.length, 0);
    assert.equal(answer.sources.length, 2);
    assert.ok(answer.sources.every((source) => source.name && source.url.startsWith("https://")));
    assert.equal(answer.research.sourceCount, answer.sources.length);
    assert.match(answer.answer, /동물병원/);
    assert.match(answer.answer, /억지로 먹이|먹여 밀어내려 하지|소금물·과산화수소를 먹이거나 목을 자극하지/);
    assert.match(answer.answer, /토하게 하지/);
}

test("fish ingestion and gagging remain medical without classifying routine fish products", () => {
    for (const question of [
        fishQuestion,
        "생선 가시를 삼킨 강아지가 캑캑거려요",
        "생선가시가 목에 걸려 켁켁거려",
        "하네스 상품 문의: 강아지가 생선을 먹고 헛구역질해",
    ]) assert.equal(classifyChatMedicalSafety(question), "emergency", question);
    assert.equal(classifyChatMedicalSafety("강아지가 켁켁거려"), "general_health");
    for (const question of [
        "강아지 생선 간식 추천해줘",
        "생선 패턴 목줄 보여줘",
        "강아지에게 가시 없는 익힌 생선 급여법 알려줘",
        "켁켁 문구가 있는 강아지 티셔츠 추천해줘",
    ]) assert.equal(classifyChatMedicalSafety(question), null, question);
});

test("action followups use the latest bounded user health anchor and respect topic changes", () => {
    assert.equal(healthActionFollowUpKind("물을 먹여야하나?"), "water");
    assert.equal(healthActionFollowUpKind("밥을 줘도 돼?"), "food");
    assert.equal(healthActionFollowUpKind("토하게 해야 하나?"), "induce_vomiting");
    const continued = resolveChatHealthActionContext("물을 먹여야하나?", [
        ...history,
        { role: "user", content: "아직 침도 많이 흘려" },
        { role: "assistant", content: "삼킬 수 있나요?" },
    ]);
    assert.equal(continued.anchor, fishQuestion);
    assert.equal(continued.safety, "emergency");
    assert.equal(continued.turnsUsed, 3);
    assert.equal(resolveChatHealthActionContext("하네스 상품 문의: 물을 먹여야하나?", [
        { role: "user", content: `하네스 상품 문의: ${fishQuestion}` },
    ]).anchor, fishQuestion);
    assert.equal(resolveChatHealthActionContext("물을 먹여야하나?", []), null);
});

test("health action context cannot cross a shopping, subject, or unrelated topic boundary", () => {
    for (const switchMessage of ["하네스 추천해줘", "다른 질문인데 날씨 알려줘", "고양이가 기침해", "프랑스 수도는 어디야?"]) {
        assert.equal(resolveChatHealthActionContext("물을 줘도 돼?", [...history, { role: "user", content: switchMessage }]), null);
    }
    for (const question of ["고양이에게 물을 줘도 돼?", "다른 강아지에게 물을 먹여도 돼?", "선물을 줘도 돼?", "생수 상품 추천해줘"]) {
        assert.equal(resolveChatHealthActionContext(question, history), null);
    }
    assert.equal(resolveChatHealthActionContext("물을 줘도 돼?", [
        ...history,
        ...Array.from({ length: 12 }, () => ({ role: "assistant", content: "관찰 중" })),
    ]), null);
    const next = resolveChatHealthActionContext("물을 줘도 돼?", [...history, { role: "user", content: "내 강아지 눈에 하얀 막이 보여" }]);
    assert.equal(next.safety, "general_health");
    assert.match(next.anchor, /눈/);
    const newQuestion = "내 강아지 눈에 하얀 막이 보여. 물을 줘도 돼?";
    const newContext = resolveChatHealthActionContext(newQuestion, history);
    assert.equal(newContext.anchor, newQuestion);
    assert.equal(newContext.safety, "general_health");
    assert.equal(newContext.turnsUsed, 1);
});

test("offline water, food, and emesis questions answer the action directly", async () => {
    const chat = loadChat({ base: "", fetch: () => { throw new Error("must stay offline"); } });
    const first = await chat.answerShopQuestionSmart(fishQuestion);
    assertFishSafety(first);
    for (const question of ["물을 먹여야하나?", "밥을 줘도 돼?", "토하게 해야 하나?", "이미 물을 먹였어"]) {
        const result = await chat.answerShopQuestionSmart(question, { history });
        assertFishSafety(result);
        assert.equal(result.conversation.continued, true);
        assert.equal(result.delivery.status, "degraded");
    }
    const missingContext = await chat.answerShopQuestionSmart("물을 먹여야하나?");
    assert.equal(missingContext.medical?.mode, false);
    assert.doesNotMatch(missingContext.answer, /생선|가시/);
});

test("medical safety survives transport errors and accepted SSE failures without another request", async (t) => {
    const cases = {
        offline: () => { throw new TypeError("network offline"); },
        timeout: () => { const error = new Error("timed out"); error.name = "TimeoutError"; throw error; },
        unavailable: () => new Response("", { status: 503, headers: { "retry-after": "5" } }),
        rateLimited: () => new Response("", { status: 429 }),
        malformed: () => new Response("broken", { headers: { "content-type": "text/plain" } }),
        missingAnswer: () => new Response("{}", { headers: { "content-type": "application/json" } }),
        eventError: () => sse('event: meta\ndata: {"accepted":true}\n\nevent: error\ndata: {"code":"timeout"}\n\n'),
        truncated: () => sse('event: meta\ndata: {"accepted":true}\n\nevent: delta\ndata: {"text":"unfinished"}\n\n'),
    };
    for (const [name, outcome] of Object.entries(cases)) {
        await t.test(name, async () => {
            let calls = 0;
            const chat = loadChat({ fetch: async () => { calls += 1; return outcome(); } });
            const result = await chat.answerShopQuestionSmart("물을 먹여야하나?", { history });
            assertFishSafety(result);
            assert.equal(result.delivery.status, "degraded");
            assert.equal(calls, 1);
            if (name === "timeout" || name === "eventError") assert.equal(result.delivery.reason, "timeout");
            if (name === "unavailable") assert.equal(result.delivery.retryAfterSeconds, 5);
        });
    }
});

test("an explicitly unsupported stream preserves medical safety on POST failure", async () => {
    let calls = 0;
    const chat = loadChat({ fetch: async () => new Response("", { status: ++calls === 1 ? 405 : 504 }) });
    const result = await chat.answerShopQuestionSmart("물을 먹여야하나?", { history });
    assertFishSafety(result);
    assert.equal(calls, 2);
});

test("successful API replies stay authoritative and count only normalized source links", async () => {
    const chat = loadChat({ fetch: async () => new Response(JSON.stringify({
        answer: "서버에서 확인한 답변입니다.",
        products: [],
        medical: { mode: false, triage: "general_conversation", topic: "server_answer" },
        sources: [
            { title: "Merck source title", url: "https://www.merckvetmanual.com/example" },
            { name: "unsafe", url: "javascript:alert(1)" },
        ],
        research: { mode: "static-health-guidance", sourceCount: 99 },
    }), { headers: { "content-type": "application/json" } }) });
    const result = await chat.answerShopQuestionSmart("물을 먹여야하나?", { history });
    assert.equal(result.answer, "서버에서 확인한 답변입니다.");
    assert.equal(result.medical.mode, false);
    assert.equal(result.medical.topic, "server_answer");
    assert.equal(result.delivery.status, "live");
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0].name, "Merck source title");
    assert.equal(result.research.sourceCount, 1);
});

test("source titles fill missing names while all strict URL and count gates remain", () => {
    const sources = normalizeShopChatSources([
        { title: "  Clinical\nsource ", url: "https://example.com/clinical" },
        { name: "", title: "Fallback title", url: "https://example.com/second" },
        { name: "Preferred name", title: "unused title", url: "https://example.com/third" },
        { title: "credentials", url: "https://user:pass@example.com/credentials" },
        { title: "http", url: "http://example.com/plain" },
        { title: "duplicate", url: "https://example.com/clinical" },
    ]);
    assert.equal(sources.length, 3);
    assert.equal(sources[0].name, "Clinical source");
    assert.equal(sources[1].name, "Fallback title");
    assert.equal(sources[2].name, "Preferred name");
});
