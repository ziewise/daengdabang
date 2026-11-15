import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

test("used icons keep verified outlines and the original full font remains available", () => {
    const font = JSON.parse(readFileSync("scripts/app-icons.generated.json", "utf8"));
    const digest = file => createHash("sha256").update(readFileSync(file)).digest("hex");
    assert.equal(digest(font.source), font.sourceSha256);
    assert.equal(digest(font.file), font.sha256);
    assert.equal(font.allOutlinesAndMetricsMatch, true);
    assert.ok(font.bytes < font.sourceBytes * 0.6);
    assert.ok(readFileSync("app/layout.tsx", "utf8").includes('@fortawesome/fontawesome-free/css/all.min.css'));
    assert.ok(readFileSync("app/app-icons.generated.css", "utf8").includes('unicode-range:'));
});

test("published font slices match the glyph-verified files and preserve the source coverage", () => {
    const receipts = JSON.parse(readFileSync("scripts/app-fonts.generated.json", "utf8"));
    const stylesheet = readFileSync("app/app-fonts.generated.css", "utf8");
    const digest = file => createHash("sha256").update(readFileSync(file)).digest("hex");
    for (const font of receipts) {
        assert.equal(digest(font.source), font.sourceSha256, "Source font changed: regenerate and verify its glyphs");
        assert.equal(font.allOutlinesAndMetricsMatch, true);
        assert.equal(font.slices.reduce((sum, slice) => sum + slice.characters, 0), font.characters);
        for (const slice of font.slices) {
            assert.equal(digest(slice.file), slice.sha256, "Unverified font slice");
            assert.ok(stylesheet.includes(slice.file.replace(/^public/, "")), "A font slice must remain reachable");
        }
        const firstPaint = font.slices.find(slice => slice.file.endsWith("-startup.woff2"));
        assert.ok(firstPaint.bytes < font.sourceBytes * 0.35, "First-screen font byte budget");
        for (const slice of font.slices.filter(slice => /-common-\d+\.woff2$/.test(slice.file))) {
            assert.ok(slice.bytes < 32_000, "A new author name must not load the entire common font");
        }
    }
});
