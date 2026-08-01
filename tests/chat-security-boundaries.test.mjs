import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
    classifyChatMedicalSafety,
    resolveSuccessfulApiMedical,
    shouldPreferProtectedMedicalFallback,
} from "../lib/chat-medical-safety.ts";
import { ddbApiBase } from "../lib/ddb-api-base.ts";

const safetyContract = JSON.parse(
    readFileSync(new URL("./fixtures/chat-medical-safety-contract.json", import.meta.url), "utf8"),
);

test("product colors and short Korean homographs do not create medical cards", () => {
    assert.equal(safetyContract.contractId, "chat-medical-safety-v7");
    assert.equal(safetyContract.nonMedicalShopping.length, 40);
    for (const question of safetyContract.nonMedicalShopping) {
        assert.equal(classifyChatMedicalSafety(question), null, question);
    }

    assert.equal(classifyChatMedicalSafety("강아지가 초콜릿을 조금 먹었어"), "emergency");
    assert.equal(classifyChatMedicalSafety("강아지가 초콜릿을 먹어 버렸어"), "emergency");
    assert.equal(classifyChatMedicalSafety("강아지가 포도를 주워 먹었어"), "emergency");
    assert.equal(classifyChatMedicalSafety("포도 패턴 강아지 우비 찾아줘"), null);
    assert.equal(classifyChatMedicalSafety("강아지가 숨을 못 쉬어요"), "emergency");
    assert.equal(
        classifyChatMedicalSafety("호흡하기 편안한 메쉬 하네스를 찼지만 강아지가 숨을 못 쉬어요"),
        "emergency",
    );
    assert.equal(classifyChatMedicalSafety("강아지 열이 나고 기침해요"), "general_health");
});

test("audited Korean emergency inflections remain emergency in offline fallback", () => {
    assert.equal(safetyContract.emergency.length, 127);
    for (const question of safetyContract.emergency) {
        assert.equal(classifyChatMedicalSafety(question), "emergency", question);
    }
});

test("cloudy white eye symptoms stay medical even with a product-detail prefix", () => {
    const medicalQuestions = [
        "내 강아지 눈에 하얀 막이 보여",
        "우리 애 눈동자 위에 우윳빛 필름 같은 게 있어",
        "한쪽 눈 안쪽에서 반투명 막이 올라와 눈을 반쯤 덮어",
        "눈에 막이 생겼어",
        "러프웨어 하네스 상품 문의: 내 강아지 눈에 하얀 막이 보여",
        "백내장 치료 고글 추천해줘",
    ];
    for (const question of medicalQuestions) {
        assert.equal(classifyChatMedicalSafety(question), "general_health", question);
    }

    for (const shoppingQuestion of [
        "강아지 눈 보호용 투명막 고글 추천해줘",
        "눈 모양 하얀 막대 장난감 추천해줘",
        "눈 오는 날 쓸 흰색 하네스 보여줘",
        "눈에 띄는 하얀 막 우비 추천해줘",
        "눈 모양 막이 생기는 장난감 추천해줘",
        "눈 건강용 영양제 추천해줘",
        "발작적으로 잘 팔리는 노즈워크 장난감 보여줘",
        "혼수용 침대 추천해줘",
        "혼절이라는 이름의 장난감 찾아줘",
        "의식불명 문구 티셔츠 추천해줘",
    ]) {
        assert.equal(classifyChatMedicalSafety(shoppingQuestion), null, shoppingQuestion);
    }

    assert.equal(classifyChatMedicalSafety("강아지 의식주 관리법 알려줘"), null);
});

test("structured loss-of-consciousness wording remains emergency without product-copy homographs", () => {
    for (const question of [
        "강아지가 의식불명이야",
        "강아지가 의식 불명이야",
        "강아지가 의식을 잃었어",
        "강아지가 의식이 희미해",
        "강아지가 정신을 잃었어요",
        "강아지가 갑자기 혼절했어요",
        "강아지가 혼수상태예요",
    ]) {
        assert.equal(classifyChatMedicalSafety(question), "emergency", question);
    }
});

test("rare GDV wording with a drum-like abdomen stays emergency", () => {
    assert.equal(
        classifyChatMedicalSafety("배가 북처럼 부풀고 계속 토하려는데 아무것도 안 나와"),
        "emergency",
    );
});

test("a successful API medical route cannot be replaced by knowledge fallbacks", () => {
    const helper = readFileSync(new URL("../lib/daengdabang-llm.ts", import.meta.url), "utf8");

    assert.match(helper, /if \(breedComparisonFallback && !medicalMode\)/);
    assert.match(helper, /if \(knowledgeFallback && fallback === knowledgeFallback && !medicalMode\)/);
    assert.match(helper, /resolveSuccessfulApiMedical<ShopChatMedical>\(data\.medical, fallback\.medical\)/);
});

test("a successful normal API answer never inherits the client emergency fallback", () => {
    const clientFalsePositive = { mode: true, triage: "emergency", topic: "client_false_positive" };
    const normalServerMedical = { mode: false, triage: "shopping", topic: "product_search" };

    const resolved = resolveSuccessfulApiMedical(normalServerMedical, clientFalsePositive);

    assert.deepEqual(resolved, normalServerMedical);
    assert.equal(resolved?.mode, false);
    assert.notEqual(resolved, normalServerMedical, "the API payload should be copied before normalization");
    assert.equal(resolveSuccessfulApiMedical(undefined, clientFalsePositive), undefined);
});

test("an older medical API cannot erase an audited rare eye fallback with a generic topic", () => {
    const auditedEyeFallback = { mode: true, triage: "general_health", topic: "acute_eye_cloudiness" };

    assert.equal(
        shouldPreferProtectedMedicalFallback(
            { mode: true, triage: "general_health", topic: "skin_ear_eye_itch" },
            auditedEyeFallback,
        ),
        true,
    );
    assert.equal(
        shouldPreferProtectedMedicalFallback(
            { mode: true, triage: "general_health", topic: "acute_eye_cloudiness" },
            auditedEyeFallback,
        ),
        false,
    );
    assert.equal(
        shouldPreferProtectedMedicalFallback(
            { mode: false, triage: "shopping", topic: "product_search" },
            auditedEyeFallback,
        ),
        true,
    );
    assert.equal(shouldPreferProtectedMedicalFallback(undefined, auditedEyeFallback), true);
    assert.equal(
        shouldPreferProtectedMedicalFallback(
            { mode: false, triage: "shopping", topic: "product_search" },
            { mode: true, triage: "emergency", topic: "client_false_positive" },
        ),
        false,
    );
});

test("production API-base resolution never reads the localStorage override", () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDdbBase = process.env.NEXT_PUBLIC_DDB_API_BASE;
    const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
    let storageReads = 0;

    try {
        process.env.NODE_ENV = "production";
        delete process.env.NEXT_PUBLIC_DDB_API_BASE;
        delete process.env.NEXT_PUBLIC_API_URL;
        Object.defineProperty(globalThis, "window", {
            configurable: true,
            value: {
                location: { hostname: "preview.example" },
                localStorage: {
                    getItem() {
                        storageReads += 1;
                        return "https://attacker.invalid";
                    },
                },
            },
        });

        assert.equal(ddbApiBase(), "");
        assert.equal(storageReads, 0);

        globalThis.window.location.hostname = "daengdabang.com";
        assert.equal(ddbApiBase(), "https://api.daengdabang.com");
        assert.equal(storageReads, 0);
    } finally {
        if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
        else delete globalThis.window;
        if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = originalNodeEnv;
        if (originalDdbBase === undefined) delete process.env.NEXT_PUBLIC_DDB_API_BASE;
        else process.env.NEXT_PUBLIC_DDB_API_BASE = originalDdbBase;
        if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
        else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
});
