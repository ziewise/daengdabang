import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_ASSETS = path.join(ROOT, "public", "images", "products", "catalog");

// Supplier price/color/size data comes from the 2026FW workbook.
// Customer-facing detail images come only from each official Ruffwear product feed.
const products = [
    { folder: "rw_backtrak_evac_kit", handle: "backtrak-evac-kit", images: [1, 2, 5, 7, 8] },
    { folder: "rw_doubletrack_coupler", handle: "double-track-coupler", images: [1, 2] },
    { folder: "rw_knotahitch", handle: "knot-a-hitch", images: [1, 2, 5, 6, 7] },
    { folder: "rw_trailrunner_vest", handle: "trail-runner-vest", images: [3, 4, 5, 6, 8] },
    { folder: "rw_gourdo_small", handle: "gourdo-rubber-throw-toy", images: [2, 3, 4, 10, 11] },
    { folder: "rw_gourdo_large", handle: "gourdo-rubber-throw-toy", images: [2, 3, 4, 10, 11] },
    { folder: "rw_pacificring_toy", handle: "pacific-ring-rope-dog-toy", images: [3, 4, 5, 6] },
    {
        folder: "rw_powderhound_waterproof_jacket_26fw",
        handle: "powder-hound-jacket",
        images: [2, 3, 5, 16, 17],
    },
    { folder: "rw_powderhound_coverall_26fw", handle: "powder-hound-coverall", images: [1, 2, 3, 4, 11] },
    {
        folder: "rw_timberline_fuse_vest_26fw",
        handle: "timberline-fuse-fleece-vest",
        images: [2, 3, 4, 11, 12, 18, 19],
    },
    {
        folder: "rw_mt_hoodie_gaiter_26fw",
        handle: "mt-hoodie-warming-neck-gaiter",
        images: [1, 2, 3, 5, 17, 18],
    },
    {
        folder: "rw_lumenglow_jacket_26fw",
        handle: "lumenglow-high-vis-vest",
        images: [1, 2, 3, 6, 9, 12],
    },
    { folder: "rw_polartrex_boots_26fw", handle: "polar-trex-winter-dog-boots", images: [1, 2, 3, 4] },
    { folder: "rw_rogue_longline_26fw", handle: "rogue-long-line-leash", images: [1, 2, 3] },
    {
        folder: "rw_remix_cactus_tug_26fw",
        handle: "webbing-remix-cactus-tug-toy",
        images: [1, 2],
    },
    {
        folder: "rw_remix_soft_disc_26fw",
        handle: "webbing-remix-soft-flying-disc",
        images: [1, 2],
    },
];

async function fetchProduct(handle) {
    const response = await fetch(`https://ruffwear.com/products/${handle}.js`);
    if (!response.ok) {
        throw new Error(`Ruffwear product feed failed (${response.status}): ${handle}`);
    }
    return response.json();
}

async function fetchImage(url) {
    const normalized = url.startsWith("//") ? `https:${url}` : url;
    const response = await fetch(normalized);
    if (!response.ok) {
        throw new Error(`Ruffwear image failed (${response.status}): ${normalized}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

for (const product of products) {
    const destination = path.join(CATALOG_ASSETS, product.folder, "details");
    await mkdir(destination, { recursive: true });

    // Admin product management rejects the retired generated first-detail panel.
    // Official Ruffwear source images therefore begin at details/2.webp.
    await rm(path.join(destination, "1.webp"), { force: true });

    const official = await fetchProduct(product.handle);
    for (let index = 0; index < product.images.length; index += 1) {
        const sourceIndex = product.images[index];
        const sourceUrl = official.images[sourceIndex];
        if (!sourceUrl) {
            throw new Error(`Missing official image index ${sourceIndex}: ${product.handle}`);
        }
        const input = await fetchImage(sourceUrl);
        await sharp(input, { limitInputPixels: false })
            .resize({ width: 1400, height: 1800, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 84, effort: 5 })
            .toFile(path.join(destination, `${index + 2}.webp`));
    }
    console.log(`${product.folder}: ${product.images.length} official detail images`);
}
