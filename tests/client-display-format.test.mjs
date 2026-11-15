import assert from "node:assert/strict";
import test from "node:test";
import { formatPriceAmount, formatShowcaseDate } from "../lib/display-format.ts";
import { shopMediaUrl } from "../lib/shop-media-url.ts";

test("reused formatters preserve Korean and English prices, including rounding", () => {
    for (const value of [0, 1, -1234.5, 46000, 54000, 1234567.89123]) {
        assert.equal(formatPriceAmount(value, "ko", "KRW"), `${value.toLocaleString("ko-KR")}원`);
        assert.equal(formatPriceAmount(value, "en", "KRW"), `₩${value.toLocaleString("en-US")}`);
        for (const locale of ["ko", "en"]) {
            assert.equal(formatPriceAmount(value, locale, "USD"), `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        }
    }
});

test("showcase dates retain local time and invalid-date fallback across a feed", () => {
    const original = new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    for (let index = 0; index < 32; index++) {
        const date = new Date(Date.UTC(2026, 10, 14, 15, index));
        assert.equal(formatShowcaseDate(date.toISOString()), original.format(date));
    }
    assert.equal(formatShowcaseDate("invalid"), "방금 전");
});

test("app media is valid before hydration without sending bundled cards to the network", () => {
    const thumbnails = { "/images/products/example/main.jpg": "/images/products/card/example.webp" };
    assert.equal(shopMediaUrl("/images/products/example/main.jpg", thumbnails), thumbnails["/images/products/example/main.jpg"]);
    for (const src of ["/images/ui/photo.webp", "/images/products/card/other.webp", "/fonts/body.woff2"]) {
        assert.equal(shopMediaUrl(src, thumbnails), src);
    }
    assert.equal(shopMediaUrl("/images/products/example/detail.jpg", thumbnails), "https://www.daengdabang.com/images/products/example/detail.jpg");
    for (const src of ["https://api.daengdabang.com/api/v1/showcase/posts/test/image?size=card", "blob:photo", "data:image/webp;base64,abcd", "//cdn.example.com/photo.webp"]) {
        assert.equal(shopMediaUrl(src, thumbnails), src);
    }
    assert.equal(shopMediaUrl(null, thumbnails), undefined);
    assert.equal(shopMediaUrl("", thumbnails), undefined);
});
