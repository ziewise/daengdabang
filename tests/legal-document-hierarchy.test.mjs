import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("the published terms restore every clause and item marker from the Word source", async () => {
    const terms = await source("app/terms/page.tsx");
    const schemaSource = terms.match(/const SECTION_MARKER_GROUPS[^=]*= (\[[\s\S]*?\n\]);/);
    assert.ok(schemaSource, "terms numbering schema must remain statically inspectable");

    const schema = Function(`"use strict"; return (${schemaSource[1]});`)();
    const counts = schema.flatMap((section) => section).reduce(
        (result, [kind, count]) => ({ ...result, [kind]: (result[kind] || 0) + count }),
        {},
    );
    assert.equal(counts.clause, 75);
    assert.equal(counts.item, 47);

    const bodies = [...terms.matchAll(/body: `([\s\S]*?)`,/g)].map((match) => match[1]);
    assert.equal(bodies.length, schema.length);
    bodies.forEach((body, index) => {
        const expectedLines = schema[index].reduce((sum, [, count]) => sum + count, 0);
        assert.equal(body.split("\n").length, expectedLines, `section ${index + 1} numbering must cover every line`);
    });

    assert.match(terms, /data-legal-marker=\{marker\?\.kind\}/);
    assert.match(terms, /spoken: `제\$\{clause\}항`/);
    assert.match(terms, /spoken: `제\$\{item\}호`/);
});

test("the privacy page restores the June source details without removing newer PetLens disclosures", async () => {
    const privacy = await source("app/privacy/page.tsx");

    assert.match(privacy, /\(이하 “포엔치”\)는 개인정보 보호법/);
    assert.match(privacy, /<span aria-hidden="true">①<\/span>/);
    assert.match(privacy, /<span aria-hidden="true">②<\/span>/);
    assert.match(privacy, /계약 이행에 필요한 항목과 별도 동의가 필요한 항목을 구분하여 관리합니다\./);
    assert.match(privacy, /이용자는 언제든지 \{BUSINESS_INFO\.companyName\}에 대해 개인정보 열람/);
    assert.match(privacy, /제13조 AI 분석 및 자동화된 결정/);
    assert.match(privacy, /댕랩 행동·소리 분석\(PetLens 관찰 기능\)/);
    assert.match(privacy, /가입 혜택 중복 방지/);
    assert.match(privacy, /const PRIVACY_UPDATED_AT = "2026-07-24"/);
    assert.match(privacy, /개인정보처리방침 버전: v1\.4/);
});

test("the privacy page discloses the live behavior and sound processing boundary in plain language", async () => {
    const privacy = await source("app/privacy/page.tsx");

    assert.doesNotMatch(privacy, /상시적으로 국외 이전하지 않습니다/);
    assert.doesNotMatch(privacy, /Gemini/);
    assert.match(privacy, /Google LLC \(개인정보 문의: https:\/\/policies\.google\.com\/privacy\?hl=ko\)/);
    assert.match(privacy, /명시적으로 동의하고 분석을 실행할 때 암호화된 HTTPS 통신으로 이전/);
    assert.match(privacy, /분석 기능 운영을 위한 임시 처리는 최대 24시간/);
    assert.match(privacy, /안전·오남용 방지 기록은 최대 55일/);
    assert.match(privacy, /동의하지 않거나 전송을 거부할 수 있으며, 이 경우 댕랩 행동·소리 분석 기능을 이용할 수 없음/);
    assert.match(privacy, /분석 결과, 원본의 SHA-256 해시, 동의 증적\(동의 영수증\)과 요청 기록은 이용자가 삭제를 요청하거나 회원 탈퇴할 때까지 보관/);
    assert.match(privacy, /원본 영상·음성은 분석 요청 중에만 일시 처리하고 댕다방 서버에 보관하지 않음/);
    assert.match(privacy, /자체 학습한 수의학적 진단 모델이나 수의사의 진단을 대신하는 기능이 아닙니다/);
    assert.match(privacy, /5~20초\(권장 15초\) 반려견 영상/);
    assert.match(privacy, /const DAENGLAB_OBSERVATION_PRIVACY_NOTICE_VERSION = "daenglab-observation-privacy-20260724-v2"/);
});
