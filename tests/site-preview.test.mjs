// 사이트 미리보기 주소 조건 검사 — 계절 · 시간대 고정, 우리 R2 폴더 영상만, 미리보기 모드(2026-10-29)
import assert from "node:assert/strict";
import test from "node:test";
import { readHeroPreview, readIntroPreviewSrc, readPreviewMode } from "../lib/site-preview.ts";

test("hero season and time come from folder words", () => {
    assert.deepEqual(readHeroPreview("?heroSeason=fall&heroTime=afternoon"), { season: "autumn", timeBucket: "day", src: null });
    assert.deepEqual(readHeroPreview("?heroSeason=WINTER&heroTime=night"), { season: "winter", timeBucket: "night", src: null });
    assert.deepEqual(readHeroPreview(""), { season: null, timeBucket: null, src: null });
    assert.deepEqual(readHeroPreview("?heroSeason=monsoon&heroTime=noon"), { season: null, timeBucket: null, src: null });
});

test("only our R2 hero / intro folder videos can be previewed", () => {
    assert.equal(readHeroPreview("?heroSrc=hero/winter/새 눈 영상.mp4").src, `https://media.daengdabang.com/hero/winter/${encodeURIComponent("새 눈 영상.mp4")}`);
    assert.equal(readHeroPreview("?heroSrc=https://evil.example/x.mp4").src, null);
    assert.equal(readHeroPreview("?heroSrc=hero/winter/../../x.mp4").src, null);
    assert.equal(readHeroPreview("?heroSrc=intro/a.mp4").src, null);
    assert.equal(readIntroPreviewSrc("?introSrc=intro/new_intro_test.mp4"), "https://media.daengdabang.com/intro/new_intro_test.mp4");
    assert.equal(readIntroPreviewSrc("?introSrc=hero/fall/a.mp4"), null);
    assert.equal(readIntroPreviewSrc("?introSrc=intro/list.json"), null);
});

test("preview mode", () => {
    assert.equal(readPreviewMode(""), "off");
    assert.equal(readPreviewMode("?ddbPreview=1"), "page");
    assert.equal(readPreviewMode("?ddbPreview=top"), "top");
    assert.equal(readPreviewMode("?ddbPreview=yes"), "off");
});
