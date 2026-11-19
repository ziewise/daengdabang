import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { careTalkCopy } from "../lib/care-talk-copy.ts";
import { englishDetailPhotos, englishDetailSections } from "../lib/catalog/english-detail-sections.ts";
import { walkingBuddyName } from "../lib/pet-companion-copy.ts";

const data = name => JSON.parse(readFileSync(new URL("../lib/" + name, import.meta.url), "utf8"));
const rows = data("catalog/raw.json");
const names = data("catalog/storefront-english-names.json");
const english = data("catalog/storefront-english.generated.json").products;
const labels = data("storefront-labels.en.json");

test("catalog cards and detail pages share an English edition for every existing listing", () => {
    for (const row of rows) {
        const entry = english[row.folder];
        assert.ok(entry?.description.trim(), row.folder);
        assert.equal(names[row.folder], entry.name, row.folder);
        assert.doesNotMatch(entry.name, /[가-힣]/, row.folder);
        assert.doesNotMatch(entry.description.replaceAll("댕다방", ""), /[가-힣]/, row.folder);
    }
    assert.equal(names.ip_slowdog, "Industry Pet SloDog Slow Feeder Plate");
});

test("each bundled English detail identifies its evidence and keeps source copy available to Product Management", () => {
    for (const { folder } of rows) {
        const entry = english[folder];
        const source = entry.detailSource;
        assert.ok(source.title.trim(), folder);
        if (source.kind === "supplier") {
            assert.equal(source.url, undefined, folder);
            continue;
        }
        assert.ok(["manufacturer", "manufacturer-model"].includes(source.kind), folder);
        assert.equal(new URL(source.url).protocol, "https:", folder);
        assert.ok(source.basis.trim() && source.observedAt, folder);
        assert.ok(source.verifiedDescription?.trim(), folder);
    }
    assert.equal(english.perity_aloe_essence.detailSource.kind, "supplier");
});

test("the Twilight Gray Brush Guard keeps its historical size guide, photos and product sheet", () => {
    const original = english.rw_jsk_1000000031;
    const update = english.rw_jsk_1000001129;
    assert.equal(new URL(original.detailSource.url).pathname, "/products/brush-guard-3080");
    assert.equal(new URL(update.detailSource.url).pathname, "/products/brush-guard");
    assert.match(original.description, /43–56 cm/);
    assert.match(original.description, /Web Master Pro/);
    assert.ok(original.detailSource.references.some(ref => /3080/.test(ref.title)));
    assert.ok(original.detailSource.leadImage.endsWith("b9_184024.jpg"));
    assert.notEqual(original.description, update.description);
});

test("English shows approved language-neutral images without importing Korean supplier panels", () => {
    const product = { image: "/hero.jpg", details: ["/lead.jpg", "/korean-copy.jpg", "/official-visual-1.jpg"], gallery: ["/gallery.jpg", "/hero.jpg"] };
    const guide = { kind: "manufacturer", title: "Guide", leadImage: "/lead.jpg" };
    assert.deepEqual(englishDetailPhotos(product, guide), { lead: "/lead.jpg", images: ["/official-visual-1.jpg", "/gallery.jpg"] });
    assert.equal(englishDetailPhotos(product, { ...guide, leadImage: "/different-product.jpg" }).lead, undefined);
});

test("English edits retain the original manufacturer photo selection and detail sections", () => {
    const original = { summary: "설명", features: ["기능"], visualDetailIndices: [2, 0], sourceUrl: "https://example.com/product", safety: "주의" };
    const english = englishDetailSections(original, "Walk in comfort.\n\nFeatures\n• Padded handle\n\nUse\n• Clip to the harness.\n\nSafety\n• Check the buckle.");
    assert.equal(english.summary, "Walk in comfort.");
    assert.deepEqual(english.features, ["Padded handle"]);
    assert.deepEqual(english.usage, ["Clip to the harness."]);
    assert.deepEqual(english.cautions, ["Check the buckle."]);
    assert.deepEqual(english.visualDetailIndices, [2, 0]);
    assert.equal(english.sourceUrl, original.sourceUrl);
    assert.equal(original.safety, "주의");
});

test("site-selected language covers the first chat prompt, navigation and walking buddy", () => {
    assert.equal(careTalkCopy("en", "메시지를 입력하세요"), "Type a message");
    assert.equal(careTalkCopy("ko", "메시지를 입력하세요"), "메시지를 입력하세요");
    assert.equal(labels["댕자랑"], "Dog Showcase");
    assert.equal(labels["커뮤니티"], "Community");
    assert.equal(labels["댕다방 연구소"], "댕다방 Lab");
    assert.equal(labels["댕다방 핫픽"], "댕다방 Hot Picks");
    assert.equal(labels["댕다방 추천 셀렉트"], "댕다방 Curated Picks");
    assert.equal(walkingBuddyName("몽이", "en"), "Mongi");
    assert.equal(walkingBuddyName("몽이", "ko"), "몽이");
    assert.equal(walkingBuddyName("Coco", "en"), "Coco");
});
