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
    assert.match(privacy, /const PRIVACY_UPDATED_AT = "2026-07-18"/);
});
