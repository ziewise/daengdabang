import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("daeng showcase exposes the live public community client with truthful metadata", () => {
    const page = read("../app/daeng-showcase/page.tsx");

    assert.match(page, /alternates: \{ canonical: "\/daeng-showcase\/" \}/);
    assert.match(page, /오늘의 댕자랑/);
    assert.match(page, /import DaengShowcaseClient/);
    assert.match(page, /return <DaengShowcaseClient \/>/);
    assert.match(page, /회원은 사진과 이야기를 올리고 친구를 팔로우하며 뼈다귀 응원/);
    assert.doesNotMatch(page, /준비 중|아직 게시물|댓글/);
});

test("desktop and mobile navigation expose daeng showcase as a primary direct link", () => {
    const header = read("../components/header/Header.tsx");
    const mobile = read("../components/header/MobilePanel.tsx");

    const dailyMenuStart = header.indexOf('label={t("dailyLife")}');
    const dailyMenuEnd = header.indexOf("</NavDropdown>", dailyMenuStart);
    const desktopLink = header.indexOf('href="/daeng-showcase/"');
    const nextDropdown = header.indexOf("<NavDropdown", dailyMenuEnd + 1);

    assert.ok(dailyMenuStart >= 0 && dailyMenuEnd > dailyMenuStart);
    assert.ok(desktopLink > dailyMenuEnd && desktopLink < nextDropdown);
    assert.match(header, /className=\{`\$\{headerStyles\.desktopNavItem\}[^`]+`\}/);
    assert.match(header, />\s*댕자랑\s*<\/Link>/);
    assert.match(mobile, /<MobileLink href="\/daeng-showcase\/" icon="fa-images"[^>]+crayon tone="coral">/);
    assert.equal((header.match(/href="\/daeng-showcase\/"/g) || []).length, 1);
    assert.equal((mobile.match(/href="\/daeng-showcase\/"/g) || []).length, 1);
});

test("the public sitemap includes the canonical daeng showcase route", () => {
    const sitemap = read("../app/sitemap.ts");

    assert.match(sitemap, /"\/daeng-showcase"/);
});
