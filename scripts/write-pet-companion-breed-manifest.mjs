import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
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

const rigEnds = [
    ["R01", 4], ["R02", 11], ["R03", 18], ["R04", 27], ["R05", 33],
    ["R06", 41], ["R07", 54], ["R08", 70], ["R09", 78], ["R10", 91],
    ["R11", 96], ["R12", 104], ["R13", 114], ["R14", 120],
];
const assetDirectory = path.join(
    root,
    "public",
    "images",
    "pet-companion",
    "cute-v4-breeds",
);

const assets = definitions.map((breed, index) => {
    const file = `${breed.id}-core.webp`;
    const poster = `${breed.id}-poster.webp`;
    const vertical = `${breed.id}-vertical.webp`;
    const absolutePath = path.join(assetDirectory, file);
    const posterPath = path.join(assetDirectory, poster);
    const verticalPath = path.join(assetDirectory, vertical);
    const bytes = readFileSync(absolutePath);
    const posterBytes = readFileSync(posterPath);
    const verticalBytes = readFileSync(verticalPath);
    const sourceRig = rigEnds.find(([, end]) => index < end)?.[0];
    return {
        ...breed,
        sourceRig,
        file,
        poster,
        vertical,
        frames: 16,
        verticalFrames: 16,
        bytes: statSync(absolutePath).size,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        posterBytes: statSync(posterPath).size,
        posterSha256: createHash("sha256").update(posterBytes).digest("hex"),
        verticalBytes: statSync(verticalPath).size,
        verticalSha256: createHash("sha256").update(verticalBytes).digest("hex"),
    };
});

const manifest = {
    version: "cute-v4-breeds",
    cacheVersion: "20260712-2",
    catalog: "Stanford Dogs / PetLens 120-class order",
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
    style: {
        rendering: "premium-plush-chibi",
        proportions: "oversized-head-short-compact-body",
        targetIdleHeadHeightRatio: [0.4, 0.45],
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
