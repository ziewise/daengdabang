// 웹 검색 결과 페이지(/search, 2026-10-23 사용자 결정 "검색은 별도 페이지") — 연결이 깨지지 않게 고정
// 웹 검색(헤더 검색 창 · 모바일 메뉴 · 예전 /products?q= 주소)은 /search 로, 앱은 지금처럼 /products?q= 에서 검색
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("search page reuses the product list with the search layout", async () => {
    const page = await source("app/search/page.tsx");
    const client = await source("app/products/ProductsClient.tsx");
    assert.match(page, /<ProductsClient variant="search" \/>/);
    assert.match(page, /index: false/);
    // 다른 판매처 가격 비교 덩어리는 한 곳에만 두고 두 모양이 같이 씀
    assert.match(client, /const externalSection = hasSearch \?/);
    assert.equal(client.match(/\{externalSection\}/g)?.length, 2);
    assert.match(client, /data-search-page/);
});

test("web searches go to /search while the app keeps /products?q=", async () => {
    const modal = await source("components/header/SearchModal.tsx");
    const panel = await source("components/header/MobilePanel.tsx");
    const client = await source("app/products/ProductsClient.tsx");
    const parts = await source("components/search/SearchParts.tsx");
    assert.match(parts, /`\/search\/\?q=\$\{encodeURIComponent\(clean\)\}`/);
    assert.match(modal, /classList\.contains\("ddb-app-mode"\)\)[\s\S]*router\.push\(searchHref\(t\)\)/);
    assert.match(modal, /router\.push\(`\/products\?q=\$\{encodeURIComponent\(t\)\}`\)/);
    assert.match(panel, /router\.push\(searchHref\(t\)\)/);
    assert.match(client, /classList\.contains\("ddb-app-mode"\)\) return;\s*router\.replace\(searchHref\(q\)\)/);
});
