import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("Treasure Mine exposes all four current-location pet-care categories without routing through chat", async () => {
    const [finder, hub, programs] = await Promise.all([
        source("components/growth/LocalCareFinder.tsx"),
        source("components/growth/GrowthHub.tsx"),
        source("lib/growth-programs.ts"),
    ]);

    for (const label of ["병원", "미용", "호텔", "데이케어"]) {
        assert.match(finder, new RegExp(label));
    }
    for (const category of ["veterinary", "grooming", "hotel", "daycare"]) {
        assert.match(finder, new RegExp(`id: "${category}"`));
    }
    assert.match(finder, /navigator\.geolocation\.getCurrentPosition/);
    assert.match(finder, /onClick=\{\(\) => void search\(selected\.id, null\)\}/);
    assert.match(finder, /if \(coordinates\) void search\(categoryId, coordinates\)/);
    assert.match(finder, /\/api\/v1\/local\/pet-care/);
    assert.match(finder, /https:\/\/map\.naver\.com\/p\/search\//);
    assert.match(finder, /위치는 이 검색에만 사용하며 계정에 저장하지 않아요/);
    assert.match(finder, /댕다방 제휴·예약 가능 업체라는 뜻이 아닙니다/);
    assert.doesNotMatch(finder, /근거 부족|확인 가능한 웹 출처 없음/);
    assert.match(hub, /<LocalCareFinder \/>/);
    assert.match(programs, /href: "#local-care-finder"/);
    assert.doesNotMatch(programs, /\/chat\/\?q=/);
});

test("policy copy is customer-facing and collapsed instead of an oversized operator notice", async () => {
    const policy = await source("components/growth/GrowthPolicySummary.tsx");

    assert.match(policy, /<details/);
    assert.match(policy, /안심하고 이용하세요/);
    assert.match(policy, /광고 없이도 오늘의 돌봄은 그대로/);
    assert.match(policy, /완료한 활동만 보상에 반영/);
    assert.match(policy, /AI 기록은 의료 진단이 아닌 참고 정보/);
    assert.match(policy, /의료 진단을 대신하지 않아요/);
    assert.match(policy, /AI 기록은 의료 진단이 아니며/);
    assert.doesNotMatch(policy, /연동 전|가짜 시청|완료 이벤트|운영 약속/);
});
