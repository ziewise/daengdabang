import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "lib", "pet-companion-breeds.ts");
const source = readFileSync(catalogPath, "utf8");
function readDefinitionBlock(name) {
    const start = source.indexOf(`const ${name}`);
    const end = source.indexOf("\n];", start);
    if (start < 0 || end < 0) {
        throw new Error(`Unable to locate ${name}.`);
    }
    return [...source.slice(start, end).matchAll(
        /^\s*\["([^"]+)", "([^"]+)", "([^"]+)"/gm,
    )].map((match) => ({ id: match[1], en: match[2], ko: match[3] }));
}

const definitions = [
    ...readDefinitionBlock("BREED_DEFINITIONS"),
    ...readDefinitionBlock("EXTENDED_BREED_DEFINITIONS"),
];
if (definitions.length !== 155 || new Set(definitions.map(({ id }) => id)).size !== 155) {
    throw new Error(`Expected 155 unique breed definitions; found ${definitions.length}.`);
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
    cacheVersion: "20260730-1",
    catalog: "DaengDaBang 155 breed companion characters",
    generated: "2026-07-30",
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
