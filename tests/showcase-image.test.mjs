import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogLoader } from "../scripts/catalog-build.mjs";

const { showcaseThumbnailUrl } = createCatalogLoader()("lib/showcase-image.ts");

test("feed thumbnail URLs preserve the original photo and revision for detail", () => {
    const original = "https://api.daengdabang.com/api/v1/showcase/posts/public-123/image?rev=7";
    const card = showcaseThumbnailUrl(original);
    assert.equal(card, `${original}&size=card`);
    assert.equal(showcaseThumbnailUrl(card), card);
    assert.equal(showcaseThumbnailUrl(original.replace("rev=7", "size=full")), original.replace("rev=7", "size=card"));
    assert.equal(original.includes("size="), false);
});

test("upload previews, static photos, and non-photo endpoints remain unchanged", () => {
    for (const src of ["blob:https://localhost/photo", "data:image/png;base64,test", "/images/pet.webp", "https://api.daengdabang.com/api/v1/showcase/posts/public-123", "file:///api/v1/showcase/posts/post/image"]) {
        assert.equal(showcaseThumbnailUrl(src), src);
    }
});
