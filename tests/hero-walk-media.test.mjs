import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { HERO_VIDEO_MANIFEST } from "../lib/hero-video-manifest.ts";

test("every desktop and mobile weather scene serves its reviewed retimed media", async () => {
    const review = JSON.parse(await readFile(new URL("../lib/hero-walk-review.json", import.meta.url), "utf8"));
    const paths = Object.values(HERO_VIDEO_MANIFEST).flatMap(({ pc, m }) => [pc, m]);
    assert.equal(paths.length, 24);
    assert.equal(new Set(paths).size, 24);
    assert.equal(review.videos.length, 24);
    for (const path of paths) {
        assert.ok(path.startsWith("/images/hero/steady-walk-v2/"));
        const row = review.videos.find((entry) => entry.path === path);
        assert.ok(row, `Missing review: ${path}`);
        const bytes = await readFile(new URL(`../public${path}`, import.meta.url));
        assert.equal(createHash("sha256").update(bytes).digest("hex"), row.sha256, path);
        assert.notEqual(row.sha256, row.sourceSha256, path);
        assert.equal(row.fps, 30);
        assert.ok(row.duration > 8);
        assert.equal(row.duration, row.previousDuration, `Approved pace changed: ${path}`);
        assert.equal(row.timingPreserved, true);
        assert.equal(row.interpolation, "rife-v4.6-full-resolution-exact-time");
        assert.equal(row.encode, "h264-slow-crf21-single-pass-no-vbv");
        // A single fixed slow playback multiplier does not fix source ramps.
        assert.ok(row.rateMin < row.rateMax && row.rateMax <= 0.8);
    }
});
