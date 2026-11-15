import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogLoader } from "../scripts/catalog-build.mjs";

const { showcaseThumbnailUrl, showcasePhotoRetryUrl } = createCatalogLoader()("lib/showcase-image.ts");

test("retry forces a fresh API photo request while retaining revision and size", () => {
    const src = "https://api.daengdabang.com/api/v1/showcase/posts/public-123/image?rev=7&size=card";
    assert.equal(showcasePhotoRetryUrl(src, 0), src);
    assert.equal(showcasePhotoRetryUrl(src, 1), src + "&ddb_retry=1");
    assert.equal(showcasePhotoRetryUrl(showcasePhotoRetryUrl(src, 1), 2), src + "&ddb_retry=2");
    for (const untouched of ["blob:https://localhost/photo", "/images/pet.webp", "https://cdn.example/api/v1/showcase/posts/public-123/image?signature=123"]) {
        assert.equal(showcasePhotoRetryUrl(untouched, 1), untouched);
    }
});

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
