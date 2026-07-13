import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "lib", "pet-companion-breeds.ts");
const source = readFileSync(catalogPath, "utf8");
const definitionStart = source.indexOf("const BREED_DEFINITIONS");
const definitionEnd = source.indexOf("\n];", definitionStart);
if (definitionStart < 0 || definitionEnd < 0) {
    throw new Error("Unable to locate the pet companion breed catalog.");
}

const definitions = [...source.slice(definitionStart, definitionEnd).matchAll(
    /^\s*\["([^"]+)", "([^"]+)", "([^"]+)"/gm,
)].map((match) => ({ id: match[1], en: match[2], ko: match[3] }));
if (definitions.length !== 120) {
    throw new Error(`Expected 120 breed definitions; found ${definitions.length}.`);
}

const assetDirectory = path.join(
    root,
    "public",
    "images",
    "pet-companion",
    "cute-v4-breeds",
);

const assets = definitions.map((breed) => {
    const file = `${breed.id}-core.webp`;
    const poster = `${breed.id}-poster.webp`;
    const vertical = `${breed.id}-vertical.webp`;
    return {
        ...breed,
        file,
        poster,
        vertical,
        frames: 16,
        verticalFrames: 16,
    };
});

const manifest = {
    version: "cute-v4-breeds",
    cacheVersion: "20260712-2",
    catalog: "DaengDaBang 120 breed companion characters",
    generated: "2026-07-12",
    layout: {
        columns: 4,
        rows: 4,
        cell: [256, 256],
        motions: ["idle", "walk", "run", "sniff"],
    },
    verticalLayout: {
        columns: 4,
        rows: 4,
        cell: [256, 256],
        upRows: [0, 2],
        downRows: [1, 3],
        framesPerDirection: 8,
        motions: ["run-up", "run-down"],
    },
    assetCount: assets.length,
    frameCount: assets.reduce(
        (sum, asset) => sum + asset.frames + asset.verticalFrames,
        0,
    ),
    assets,
};

const output = path.join(assetDirectory, "manifest.json");
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(root, output)} with ${assets.length} breed assets.`);
