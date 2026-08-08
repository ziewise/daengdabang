import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import {
    GROWTH_PROGRAM_CARDS,
    GROWTH_PROGRAM_IDS,
    growthSharePayload,
} from "../lib/growth-programs.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

async function loadCustomerApi(fetchImpl) {
    const customerApi = await source("lib/customer-api.ts");
    const compiled = ts.transpileModule(customerApi, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    const moduleRecord = { exports: {} };
    vm.runInNewContext(compiled, {
        module: moduleRecord,
        exports: moduleRecord.exports,
        fetch: fetchImpl,
        Headers,
        URL,
        URLSearchParams,
        require(specifier) {
            if (specifier === "@/lib/ddb-api-base") {
                return { ddbApiBase: () => "https://api.example.test" };
            }
            throw new Error(`Unexpected runtime import: ${specifier}`);
        },
    });
    return moduleRecord.exports;
}

test("the treasure mine stays a two-level hub and reuses the live member dashboard", async () => {
    const [page, hub] = await Promise.all([
        source("app/treasure-mine/page.tsx"),
        source("components/growth/GrowthHub.tsx"),
    ]);

    assert.match(page, /<GrowthHub \/>/);
    assert.match(hub, /id="today-treasure"/);
    assert.match(hub, /<GrowthPrograms \/>/);
    assert.match(hub, /<MemberAiDashboard variant="full" \/>/);
    assert.match(hub, /useAuth/);
    assert.match(hub, /\/auth\/login\/\?redirect=%2Ftreasure-mine%2F/);
    assert.match(hub, /비회원도 아래 성장 프로그램과 운영 정책은 먼저 둘러볼 수 있습니다/);
    assert.match(hub, /trackStorefrontEvent\("growth_hub_viewed"/);
    assert.match(hub, /href="\/best\/"/);
    assert.match(hub, /hasPet \? "\/#recommend" : isMember \? "\/my-pet\/" : "\/products\/"/);
    assert.match(hub, /<CommerceBridge isMember=\{isMember\} hasPet=\{hasPet\} hasAiRecord=\{hasAiRecord\} \/>/);
    assert.match(hub, /우리 아이 프로필과 확인된 AI 기록을 상품 선택에 참고해요/);
    assert.match(hub, /우리 아이 프로필을 상품 선택에 참고해요/);
    assert.match(hub, /우리 아이 프로필을 등록하면 맞춤 추천을 시작할 수 있어요/);
});

test("share payloads contain campaign attribution but no pet or health detail", () => {
    for (const kind of ["care_result", "friend_invite"]) {
        const payload = growthSharePayload(kind, "https://www.daengdabang.com/private/path?email=hidden@example.com");
        const url = new URL(payload.url);
        assert.equal(url.pathname, "/treasure-mine/");
        assert.equal(url.searchParams.get("utm_medium"), "referral");
        assert.equal(url.searchParams.get("utm_campaign"), "treasure_mine");
        assert.ok(url.searchParams.get("utm_source"));
        assert.ok(url.searchParams.get("utm_content"));
        assert.doesNotMatch(payload.url, /private|hidden|example\.com/);
        assert.doesNotMatch(`${payload.title} ${payload.text}`, /이메일|전화번호|품종|증상명|진단명|검사값|점수/);
    }
});

test("all future programs are explicitly preparing and cover separate brand interests", () => {
    assert.deepEqual(
        [...GROWTH_PROGRAM_IDS],
        ["membership_beta", "brand_challenge", "product_tester", "custom_goods", "local_care"],
    );
    assert.equal(GROWTH_PROGRAM_CARDS.length, 4);
    assert.ok(GROWTH_PROGRAM_CARDS.every((program) => /중|전/.test(program.status)));
    const options = GROWTH_PROGRAM_CARDS.flatMap((program) => program.interestOptions.map((option) => option.programId));
    assert.deepEqual(options, [...GROWTH_PROGRAM_IDS]);
    const local = GROWTH_PROGRAM_CARDS.find((program) => program.id === "local");
    assert.match(local.existingFeature.href, /^\/chat\/\?q=/);
    assert.match(local.existingFeature.helper, /기존 AI 상담의 지도 검색 보조/);
});

test("interest registration is authenticated, minimal, readable, and cancellable", async () => {
    const [programs, api] = await Promise.all([
        source("components/growth/GrowthPrograms.tsx"),
        source("lib/customer-api.ts"),
    ]);

    assert.match(programs, /로그인 후 관심등록/);
    assert.match(programs, /이름·이메일·건강정보·자유입력 메모는 이 화면에서 받지 않아요/);
    assert.match(programs, /회원 계정에 등록된 이메일/);
    assert.match(programs, /동의 버전·상태·시각/);
    assert.match(programs, /관심등록 취소 시 즉시 삭제 또는 회원 탈퇴 시까지/);
    assert.match(programs, /쇼핑과 기본 돌봄 기능에는 영향이 없습니다/);
    assert.doesNotMatch(programs, /<textarea/);
    assert.match(programs, /required[\s\S]{0,160}type="checkbox"/);
    assert.match(programs, /role="status"/);
    assert.match(programs, /role="alert"/);
    assert.match(programs, /loadGrowthInterests/);
    assert.match(programs, /cancelGrowthInterest/);
    assert.match(programs, /관심 등록 취소/);
    assert.match(programs, /growth_program_interest_opened/);
    assert.match(programs, /growth_program_interest_submitted/);
    assert.match(programs, /growth_program_interest_failed/);

    assert.match(api, /"\/api\/v1\/growth\/interests"/);
    assert.match(api, /"\/api\/v1\/growth\/interests\/me"/);
    assert.match(api, /`\/api\/v1\/growth\/interests\/\$\{encodeURIComponent\(programId\)\}`/);
    assert.match(api, /program_id: payload\.programId/);
    assert.match(api, /consent_to_contact: payload\.consentToContact/);
    const submitBlock = api.match(/export async function submitGrowthInterest\([\s\S]*?\n}\n\nexport async function loadGrowthInterests/)?.[0] || "";
    assert.ok(submitBlock);
    assert.doesNotMatch(submitBlock, /note|email|name|health/);
    assert.match(api, /if \(response\.status === 204\) return undefined as T/);
});

test("interest cancellation accepts a 204 response without trying to parse JSON", async () => {
    let jsonCalls = 0;
    let request = null;
    const customerApi = await loadCustomerApi(async (url, init) => {
        request = { url, init };
        return {
            ok: true,
            status: 204,
            json() {
                jsonCalls += 1;
                throw new SyntaxError("204 has no body");
            },
        };
    });

    await customerApi.cancelGrowthInterest("local_care", "member-token");
    assert.equal(jsonCalls, 0);
    assert.equal(request.url, "https://api.example.test/api/v1/growth/interests/local_care");
    assert.equal(request.init.method, "DELETE");
    assert.equal(request.init.headers.get("Authorization"), "Bearer member-token");
});

test("reward ads have no simulated completion or reward action", async () => {
    const [policy, share, programs] = await Promise.all([
        source("components/growth/GrowthPolicySummary.tsx"),
        source("components/growth/GrowthShareCard.tsx"),
        source("components/growth/GrowthPrograms.tsx"),
    ]);
    const combined = `${policy}\n${share}\n${programs}`;

    assert.match(policy, /공식 리워드 광고는 아직 연동 전/);
    assert.match(policy, /광고를 보지 않아도 기본 기능은 그대로 이용/);
    assert.match(policy, /AI 기록은 의료 진단이 아니에요/);
    assert.doesNotMatch(combined, /watchAd|completeAd|claimAdReward|광고 시청하기|광고 보상 받기/);
});
