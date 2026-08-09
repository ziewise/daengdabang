import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("daeng showcase has a truthful static coming-soon landing", () => {
    const page = read("../app/daeng-showcase/page.tsx");

    assert.match(page, /alternates: \{ canonical: "\/daeng-showcase\/" \}/);
    assert.match(page, /오늘의 댕자랑/);
    assert.match(page, /게시물·뼈다귀·댓글/);
    assert.match(page, /준비 중/);
    assert.match(page, /개인정보 없는 외부 공유/);
    assert.match(page, /href="\/treasure-mine\/#today-treasure"/);
    assert.match(page, /href="\/treasure-mine\/"/);
    assert.match(page, /이 페이지에서는 아직 게시물 작성, 뼈다귀 반응, 댓글을 받지 않습니다/);
    assert.doesNotMatch(page, /오픈 알림 신청|결제하기|구매하기/);
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
