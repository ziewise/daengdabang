// 인트로 R2 목록 검사 — media-admin 이 켠 영상만 · 몇 개든 무작위 · 이상한 주소 거르기 · 못 읽으면 예전 목록(2026-10-29)
import assert from "node:assert/strict";
import test from "node:test";
import { enabledIntroVideos, INTRO_LIST_URL, INTRO_MEDIA_ORIGIN, pickFromIntroList } from "../lib/intro-r2.ts";

const list = {
    version: 1,
    items: [
        { id: 1, file: "intro/intro-random-1-clean-v1.mp4", enabled: false },
        { id: 2, file: "intro/intro-random-2-clean-v1.mp4", enabled: true },
        { id: 4, file: "intro/intro-random-4-clean-v1.mp4", enabled: true },
        { id: 7, file: "intro/새 인트로 7.mp4", enabled: true },
        { id: 8, file: "../secret.mp4", enabled: true }, // 주소 밖 → 거름
        { id: 9, file: "intro/notes.txt", enabled: true }, // 영상 아님 → 거름
    ],
};

test("intro list url points at the media-admin R2 list", () => {
    assert.equal(INTRO_LIST_URL, "https://media.daengdabang.com/intro/list.json");
});

test("only enabled, safe intro videos are offered", () => {
    const videos = enabledIntroVideos(list);
    assert.deepEqual(videos.map((v) => v.id), [2, 4, 7]);
    assert.equal(videos[0].src, `${INTRO_MEDIA_ORIGIN}/intro/intro-random-2-clean-v1.mp4`);
    assert.equal(videos[2].src, `${INTRO_MEDIA_ORIGIN}/intro/${encodeURIComponent("새 인트로 7.mp4")}`);
    assert.deepEqual(enabledIntroVideos(null), []);
    assert.deepEqual(enabledIntroVideos({ items: "x" }), []);
});

test("any number of enabled intros can be picked, QA id only when enabled", () => {
    const videos = enabledIntroVideos(list);
    const seen = new Set();
    for (let i = 0; i < 3; i++) seen.add(pickFromIntroList(videos, null, () => i / 3 + 0.01));
    assert.equal(seen.size, 3); // 켜진 3개 모두 나올 수 있음
    assert.equal(pickFromIntroList(videos, "4"), videos[1].src);
    const offPick = pickFromIntroList(videos, "1"); // 꺼진 1번 요청 → 켜진 것 중 하나
    assert.ok(videos.some((v) => v.src === offPick));
    assert.equal(pickFromIntroList([], null), null); // 비면 null → 화면은 예전 코드 목록
});
