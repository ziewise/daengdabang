import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
    new URL("../components/growth/CommerceCommunityExpansion.tsx", import.meta.url),
    "utf8",
);

test("community expansion distinguishes live sharing from the planned internal feed", () => {
    assert.match(source, /title: "댕스냅"/);
    assert.match(source, /status: "준비 중"/);
    assert.match(source, /외부 안전 공유 운영 중/);
    assert.match(source, /게시물·뼈다귀 반응·댓글은 아직 열리지 않았어요/);
    assert.match(source, /href: "#today-treasure"/);
});

test("editorial card never presents an unsupported product comparison as published", () => {
    assert.match(source, /돌봄 비교 매거진/);
    assert.match(source, /검증할 원자료가 없는 ‘5종 비교’는 게시하지 않아요/);
    assert.match(source, /href: "\/reviews\/"/);
});

test("indie brand route is an inquiry, not an admission or launch promise", () => {
    assert.match(source, /href: "\/partner\/#partner-form"/);
    assert.match(source, /상담 접수 중/);
    assert.match(source, /문의 접수는 계약, 입점 또는 선발매 확정을 뜻하지 않아요/);
});

test("PB and membership remain an unpaid, unconfirmed proposal", () => {
    assert.match(source, /댕다방 스탠다드|DAENGDABANG STANDARD/);
    assert.match(source, /월 4,900원은 제안 단계의 검토안이며 가격·혜택 모두 미확정/);
    assert.match(source, /이 화면에서는 신청비나 결제를 받지 않아요/);
    assert.match(source, /href: "#growth-programs"/);
    assert.doesNotMatch(source, /href: "\/(?:checkout|cart)\/?"/);
});

test("expansion is responsive and respects reduced-motion preferences", () => {
    assert.match(source, /md:grid-cols-2 xl:grid-cols-4/);
    assert.match(source, /motion-reduce:transform-none/);
    assert.match(source, /motion-reduce:transition-none/);
    assert.match(source, /aria-labelledby="community-commerce-roadmap-title"/);
});
