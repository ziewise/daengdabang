import assert from "node:assert/strict";
import test from "node:test";
import { safeInternalRedirect } from "../lib/internal-redirect.ts";

const ORIGIN = "https://www.daengdabang.com";

test("internal login redirects preserve safe paths, queries, and fragments", () => {
    assert.equal(safeInternalRedirect("/checkout", ORIGIN), "/checkout");
    assert.equal(safeInternalRedirect("/checkout?coupon=welcome#payment", ORIGIN), "/checkout?coupon=welcome#payment");
});

test("login redirects reject external, backslash, and control-character forms", () => {
    const decodedBackslash = new URLSearchParams("redirect=/%5Cevil.example").get("redirect");
    const decodedProtocolRelative = new URLSearchParams("redirect=%2F%2Fevil.example").get("redirect");
    for (const value of [
        "https://evil.example",
        "//evil.example",
        decodedBackslash,
        decodedProtocolRelative,
        "/%5Cevil.example",
        "/%2F%2Fevil.example",
        "/%0Aheader",
        "/%not-valid",
        "/.//evil.example",
        "/%2e//evil.example",
        "/account/..//evil.example",
        "/checkout\nheader",
        "/checkout\u0000tail",
        null,
    ]) {
        assert.equal(safeInternalRedirect(value, ORIGIN), null, String(value));
    }
});
