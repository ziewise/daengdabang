import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../out/goods-contest/index.html", import.meta.url), "utf8");
const preloadTags = html.match(/<link[^>]+rel="preload"[^>]*>/g) || [];
const fontPreloads = preloadTags.filter((tag) => /as="font"/.test(tag));
const goodsHeroPreloads = preloadTags.filter((tag) => /as="image"/.test(tag) && /goods-hero-/.test(tag));

assert.match(html, /\/images\/ui\/pet-lens-128\.webp/);
assert.match(html, /\/images\/ui\/lang-globe-128\.webp/);
assert.doesNotMatch(html, /\/images\/ui\/(?:pet-lens|lang-globe)\.png/);
assert.match(html, /\/images\/goods\/goods-hero-lifestyle\.webp/);
assert.match(html, /\/videos\/goods-contest-hero\.mp4/);
assert.match(html, /preload="metadata"/);
assert.equal(goodsHeroPreloads.length, 0, "the poster should not block the route as an eager image preload");
assert.ok(fontPreloads.length <= 4, `font preload budget exceeded: ${fontPreloads.length}`);
assert.match(html, /loading="lazy"/);

console.log(`goods contest build output OK: ${preloadTags.length} preloads, ${fontPreloads.length} fonts`);
