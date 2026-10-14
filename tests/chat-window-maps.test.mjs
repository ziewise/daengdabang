import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { clampChatWindow, defaultChatWindow } from "../lib/chat-window-geometry.ts";
import { placeAddress, placeMapLinks, placeSearchQuery } from "../lib/place-map-links.ts";

test("the reported reverse address produces one business name and a bounded locality search", () => {
    const place = { name: "365 동물병원 분당점", address: "365 동물병원 분당점, 32, 성남대로144번길, 구미동, 분당구, 성남시, 경기도, 13627, 대한민국", lat: 37.35, lon: 127.11 };
    assert.equal(placeAddress(place), "경기도 성남시 분당구 구미동 성남대로144번길 32");
    assert.equal(placeSearchQuery(place), "성남시 분당구 365 동물병원 분당점");
    const links = placeMapLinks(place);
    assert.equal(decodeURIComponent(new URL(links.kakao).pathname), "/link/search/성남시 분당구 365 동물병원 분당점");
    assert.equal(new URL(links.google).searchParams.get("api"), "1");
    assert.equal(new URL(links.google).searchParams.get("query"), placeSearchQuery(place));
    assert.match(links.position, /,37\.35,127\.11$/);
    assert.equal(new URL(links.naver).hostname, "map.naver.com");
});

test("place data cannot inject a destination; invalid or missing coordinates do not create a pin", () => {
    for (const place of [
        { name: '<b>동물병원</b> & ? #', address: '서울특별시 강남구 테헤란로 1', lat: NaN, lon: 127 },
        { name: '병원', lat: 91, lon: 181 }, { name: '병원' }, { name: '병원', lat: 0, lon: 0 },
    ]) {
        const links = placeMapLinks(place);
        assert.equal(links.position, undefined);
        assert.equal(new URL(links.kakao).hostname, "map.kakao.com");
        assert.equal(new URL(links.google).searchParams.get("query"), placeSearchQuery(place));
    }
    assert.equal(placeAddress({ name: "병원", address: "서울특별시 강남구 테헤란로 1" }), "서울특별시 강남구 테헤란로 1");
});

test("window move, resize, and viewport shrink always keep all controls reachable", () => {
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 720, height: 480 }, { width: 681, height: 320 }]) {
        for (const rect of [defaultChatWindow(viewport), { x: -100, y: -200, width: 9000, height: 9000 }, { x: 9000, y: 9000, width: 1, height: 1 }]) {
            const actual = clampChatWindow(rect, viewport);
            assert.ok(actual.x >= 12 && actual.y >= 12);
            assert.ok(actual.x + actual.width <= viewport.width - 12);
            assert.ok(actual.y + actual.height <= viewport.height - 12);
            assert.ok(actual.width <= viewport.width - 24 && actual.height <= viewport.height - 24);
        }
    }
});

test("the compatibility route mounts only a launcher, not a second transcript", () => {
    const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source("app/chat/page.tsx"), /<ChatLaunchClient/);
    assert.doesNotMatch(source("app/chat/page.tsx"), /ChatPageClient/);
    const launcher = source("app/chat/ChatLaunchClient.tsx");
    assert.match(launcher, /openChatWidget/);
    assert.doesNotMatch(launcher, /role="log"|answerShopQuestion|<ChatWidget/);
    for (const path of ["components/header/Header.tsx", "components/header/MobilePanel.tsx"]) assert.match(source(path), /openChatWidget\(\)/);
    assert.match(source("hooks/useChatWindow.ts"), /window.innerWidth > 680/);
});
