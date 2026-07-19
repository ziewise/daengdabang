// Ruffwear · Rex Specs 초기 정상가를 명시 데이터로 심는 일회성/재실행 가능 도구.
// 최종 판매가(priceNum/price)는 절대 바꾸지 않고 정상가만 추가한다.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SALE_BRANDS = new Set(["ruffwear", "rex specs"]);
export const EXPECTED_BRAND_COUNTS = Object.freeze({ Ruffwear: 110, "Rex Specs": 31 });

export function targetDiscountRate(finalPrice) {
    if (finalPrice < 30_000) return 22;
    if (finalPrice < 40_000) return 21;
    if (finalPrice < 50_000) return 20;
    if (finalPrice < 70_000) return 18;
    if (finalPrice < 90_000) return 17;
    if (finalPrice < 110_000) return 15;
    if (finalPrice < 130_000) return 14;
    if (finalPrice < 150_000) return 13;
    if (finalPrice < 180_000) return 11;
    if (finalPrice < 220_000) return 10;
    return 8;
}

export function calculateOriginalPrice(finalPrice) {
    const price = Number(finalPrice);
    if (!Number.isFinite(price) || price <= 0) throw new Error(`Invalid final price: ${finalPrice}`);
    const rate = targetDiscountRate(price);
    const rounded = Math.round(price / (1 - rate / 100) / 1_000) * 1_000;
    return Math.max(rounded, Math.ceil(price / 1_000) * 1_000 + 1_000);
}

function isSaleBrand(brandEn) {
    return SALE_BRANDS.has(String(brandEn || "").trim().toLowerCase());
}

function setKeyAfter(source, key, value, afterKey) {
    const result = {};
    let inserted = false;
    for (const [entryKey, entryValue] of Object.entries(source)) {
        if (entryKey === key) continue;
        result[entryKey] = entryValue;
        if (entryKey === afterKey) {
            result[key] = value;
            inserted = true;
        }
    }
    if (!inserted) result[key] = value;
    return result;
}

function assertTargetCounts(rows, label) {
    const counts = { Ruffwear: 0, "Rex Specs": 0 };
    for (const row of rows) {
        if (Object.hasOwn(counts, row.brandEn)) counts[row.brandEn] += 1;
    }
    for (const [brand, expected] of Object.entries(EXPECTED_BRAND_COUNTS)) {
        if (counts[brand] !== expected) {
            throw new Error(`${label}: expected ${expected} ${brand} products, received ${counts[brand]}`);
        }
    }
    return counts;
}

export function seedStorefrontRows(rows, { force = false } = {}) {
    assertTargetCounts(rows, "storefront catalog");
    return rows.map((row) => {
        if (!isSaleBrand(row.brandEn)) return row;
        const existingOriginalPrice = Number(row.originalPriceNum);
        if (!force && Number.isInteger(existingOriginalPrice) && existingOriginalPrice > Number(row.priceNum)) {
            return row;
        }
        return setKeyAfter(row, "originalPriceNum", calculateOriginalPrice(row.priceNum), "priceNum");
    });
}

export function seedAdminItems(items, storefrontRows) {
    assertTargetCounts(items, "admin catalog");
    const storefrontByNo = new Map(storefrontRows.map((row) => [Number(row.no), row]));
    return items.map((item) => {
        if (!isSaleBrand(item.brandEn)) return item;
        const storefrontRow = storefrontByNo.get(Number(item.no));
        if (!storefrontRow) throw new Error(`Missing storefront row for admin product ${item.no}`);
        if (Number(item.price) !== Number(storefrontRow.priceNum)) {
            throw new Error(`Final price mismatch for product ${item.no}`);
        }
        return setKeyAfter(item, "originalPrice", storefrontRow.originalPriceNum, "price");
    });
}

/** 기존 JSON의 숫자 표기(예: 1.0)와 줄바꿈을 보존하면서 정상가 한 줄만 넣는다. */
export function seedAdminCatalogText(sourceText, storefrontRows) {
    const catalog = JSON.parse(sourceText);
    if (!Array.isArray(catalog.items)) throw new Error("Admin catalog does not contain items[]");
    const seededItems = seedAdminItems(catalog.items, storefrontRows);
    const lineBreak = sourceText.includes("\r\n") ? "\r\n" : "\n";
    let result = sourceText;

    for (const item of seededItems.filter((entry) => isSaleBrand(entry.brandEn))) {
        const noMarker = `      "no": ${item.no},`;
        const itemStart = result.indexOf(noMarker);
        if (itemStart < 0) throw new Error(`Cannot locate admin product ${item.no}`);
        const nextItem = result.indexOf(`${lineBreak}    {${lineBreak}      "no": `, itemStart + noMarker.length);
        const itemEnd = nextItem < 0 ? result.length : nextItem;
        const priceMarker = `      "price": ${item.price},`;
        const priceStart = result.indexOf(priceMarker, itemStart);
        if (priceStart < 0 || priceStart >= itemEnd) throw new Error(`Cannot locate final price for admin product ${item.no}`);
        const insertAt = priceStart + priceMarker.length;
        const afterPrice = result.slice(insertAt, itemEnd);
        const existingMatch = afterPrice.match(new RegExp(`^${lineBreak}      "originalPrice": [^,]+,?`));
        const originalLine = `${lineBreak}      "originalPrice": ${item.originalPrice},`;
        if (existingMatch) {
            result = result.slice(0, insertAt) + originalLine + afterPrice.slice(existingMatch[0].length) + result.slice(itemEnd);
        } else {
            result = result.slice(0, insertAt) + originalLine + result.slice(insertAt);
        }
    }

    return result;
}

function prettyJson(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}

function main() {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const cliArgs = process.argv.slice(2);
    const force = cliArgs.includes("--force");
    const paths = cliArgs.filter((arg) => arg !== "--force");
    const rawPath = path.resolve(paths[0] || path.join(scriptDir, "..", "lib", "catalog", "raw.json"));
    const adminPath = paths[1] ? path.resolve(paths[1]) : null;
    const storefrontRows = seedStorefrontRows(JSON.parse(readFileSync(rawPath, "utf8")), { force });
    writeFileSync(rawPath, prettyJson(storefrontRows), "utf8");

    if (adminPath) {
        const adminSource = readFileSync(adminPath, "utf8");
        writeFileSync(adminPath, seedAdminCatalogText(adminSource, storefrontRows), "utf8");
    }

    const targetCount = storefrontRows.filter((row) => isSaleBrand(row.brandEn)).length;
    const action = force ? "Recalculated" : "Seeded missing";
    console.log(`${action} explicit original prices for ${targetCount} products; final prices unchanged.`);
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) {
    main();
}
