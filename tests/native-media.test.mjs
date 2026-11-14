import assert from "node:assert/strict";
import test from "node:test";
import { fixNativeMediaElement, nativeMediaUrl } from "../lib/native-media.ts";

test("native media observer settles, including mixed bundled/remote srcset", () => {
    const attributes = new Map([
        ["src", "/images/products/item.webp"],
        ["poster", "/images/pet-companion/cute-v4-breeds/posters/poodle.webp"],
        ["srcset", "/images/ui/small.webp 1x, /images/products/large.webp 2x"],
    ]);
    let writes = 0;
    let pending = 1;
    const element = {
        getAttribute: name => attributes.get(name) ?? null,
        setAttribute(name, value) { attributes.set(name, value); writes++; pending++; },
    };
    // Emulate the observer re-delivering each attribute write. The old
    // unchanged-local-srcset write never drained this queue and froze input.
    while (pending) {
        assert.ok(writes < 10, "attribute observer must not loop");
        pending--;
        fixNativeMediaElement(element);
    }
    assert.equal(writes, 2);
    assert.equal(attributes.get("srcset"), "/images/ui/small.webp 1x, https://www.daengdabang.com/images/products/large.webp 2x");
    assert.equal(attributes.get("poster"), "/images/pet-companion/cute-v4-breeds/posters/poodle.webp");
});

test("native media preserves offline, absolute and inline resources", () => {
    for (const value of ["/images/ui/icon.webp", "/images/products/card/rw_rogue_longline_26fw.webp", "/images/ui/shop-hero-poster.webp", "/fonts/app.woff2", "//cdn.example/image.webp", "https://cdn.example/image.webp", "data:image/png;base64,AA==", "blob:https://localhost/abc"]) {
        assert.equal(nativeMediaUrl(value), value);
    }
});
