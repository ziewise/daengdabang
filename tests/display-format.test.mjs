import assert from "node:assert/strict";
import test from "node:test";
import { formatShowcaseDate } from "../lib/display-format.ts";

test("showcase labels retain the existing Korean format in each viewer time zone", () => {
    const previous = process.env.TZ;
    try {
        for (const zone of ["Asia/Seoul", "UTC", "America/New_York", "Asia/Kathmandu"]) {
            process.env.TZ = zone;
            const reference = new Intl.DateTimeFormat("ko-KR", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            });
            for (const value of [
                "2026-11-15T00:00:00+09:00", "2026-11-15T12:00:00+09:00",
                "2026-01-01T00:01:00Z", "2024-02-29T23:59:00Z",
                "2026-03-08T06:59:00Z", "2026-03-08T07:01:00Z",
                "2026-11-01T05:59:00Z", "2026-11-01T06:01:00Z",
                "2026-11-15T09:04:00", "2026-12-31T23:59:59-08:00",
            ]) {
                assert.equal(formatShowcaseDate(value), reference.format(new Date(value)), `${zone}: ${value}`);
            }
        }
    } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
    }
});

test("invalid showcase dates retain the existing fallback", () => {
    for (const value of ["", "not-a-date", "2026-13-40"]) {
        assert.equal(formatShowcaseDate(value), "방금 전");
    }
});
