import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../out/goods-contest/index.html", import.meta.url), "utf8");
const preloadTags = html.match(/<link[^>]+rel="preload"[^>]*>/g) || [];
const fontPreloads = preloadTags.filter((tag) => /as="font"/.test(tag));
const goodsHeroPreloads = preloadTags.filter((tag) => /as="image"/.test(tag) && /goods-hero-/.test(tag));
const goodsHeroMarker = html.indexOf("data-goods-hero-video");
const goodsHeroStart = html.lastIndexOf("<div", goodsHeroMarker);
const goodsHeroEnd = html.indexOf('<div class="ddb-crayon-paper', goodsHeroMarker);

assert.ok(goodsHeroMarker >= 0 && goodsHeroStart >= 0 && goodsHeroEnd > goodsHeroStart, "goods hero markup is missing");
const goodsHeroHtml = html.slice(goodsHeroStart, goodsHeroEnd);

assert.match(html, /\/images\/ui\/pet-lens-128\.webp/);
assert.match(html, /\/images\/ui\/lang-globe-128\.webp/);
assert.doesNotMatch(html, /\/images\/ui\/(?:pet-lens|lang-globe)\.png/);
assert.match(goodsHeroHtml, /\/images\/goods\/goods-hero-lifestyle\.webp/);
assert.match(goodsHeroHtml, /\/videos\/goods-contest-hero\.mp4/);
assert.match(goodsHeroHtml, /\/videos\/goods-contest-hero-mobile\.mp4/);
assert.match(goodsHeroHtml, /<video[^>]*autoPlay=""[^>]*muted=""[^>]*loop=""[^>]*playsInline=""[^>]*preload="auto"/);
assert.match(goodsHeroHtml, /<source[^>]*media="\(max-width: 640px\)"[^>]*goods-contest-hero-mobile\.mp4/);
assert.match(goodsHeroHtml, /absolute inset-0 h-full w-full object-cover/);
assert.doesNotMatch(goodsHeroHtml, /object-contain|fa-pause|fa-play|영상 일시정지|영상 재생|18초 굿즈 미리보기|영상 소리 켜기|영상 음소거/);
assert.equal(goodsHeroPreloads.length, 0, "the poster should not block the route as an eager image preload");
assert.ok(fontPreloads.length <= 4, `font preload budget exceeded: ${fontPreloads.length}`);
assert.match(html, /loading="lazy"/);

console.log(`goods contest build output OK: ${preloadTags.length} preloads, ${fontPreloads.length} fonts`);
