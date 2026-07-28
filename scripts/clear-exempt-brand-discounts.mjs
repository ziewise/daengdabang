import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REGULAR_PRICE_BRANDS = new Set(["ruffwear", "rex specs"]);

export function isRegularPriceBrand(value) {
    return REGULAR_PRICE_BRANDS.has(String(value || "").trim().toLowerCase());
}

function omitPriceComparisonFields(row, admin = false) {
    const blocked = new Set(admin
        ? ["originalPrice", "originalPriceSource", "discountRate", "discountPolicyId"]
        : ["originalPriceNum", "originalPriceSource", "discountRate", "discountPolicyId"]);
    return Object.fromEntries(Object.entries(row).filter(([key]) => !blocked.has(key)));
}

export function clearStorefrontBrandDiscounts(rows) {
    if (!Array.isArray(rows)) throw new Error("Storefront catalog must be an array");
    return rows.map((row) => isRegularPriceBrand(row.brandEn) ? omitPriceComparisonFields(row) : row);
}

export function clearAdminBrandDiscounts(items) {
    if (!Array.isArray(items)) throw new Error("Admin catalog must contain items[]");
    return items.map((item) => isRegularPriceBrand(item.brandEn) ? omitPriceComparisonFields(item, true) : item);
}

function prettyJson(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}

function main() {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const args = process.argv.slice(2);
    const write = args.includes("--write");
    const paths = args.filter((arg) => arg !== "--write");
    const storefrontPath = path.resolve(paths[0] || path.join(scriptDir, "..", "lib", "catalog", "raw.json"));
    const adminPath = paths[1] ? path.resolve(paths[1]) : null;
    const beforeRows = JSON.parse(readFileSync(storefrontPath, "utf8"));
    const rows = clearStorefrontBrandDiscounts(beforeRows);
    const targetCount = rows.filter((row) => isRegularPriceBrand(row.brandEn)).length;
    const changedCount = beforeRows.filter((row, index) => JSON.stringify(row) !== JSON.stringify(rows[index])).length;

    let adminCatalog = null;
    if (adminPath) {
        adminCatalog = JSON.parse(readFileSync(adminPath, "utf8"));
        adminCatalog.items = clearAdminBrandDiscounts(adminCatalog.items);
        if (adminCatalog.items.length !== rows.length) throw new Error("Admin/storefront catalog sizes do not match");
    }

    if (write) {
        writeFileSync(storefrontPath, prettyJson(rows), "utf8");
        if (adminPath) writeFileSync(adminPath, prettyJson(adminCatalog), "utf8");
    }
    console.log(JSON.stringify({ mode: write ? "write" : "preview", targetCount, changedCount }, null, 2));
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) main();
