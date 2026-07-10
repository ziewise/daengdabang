import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const breedCatalogPath = path.join(root, "lib", "pet-companion-breeds.ts");
const breedSource = readFileSync(breedCatalogPath, "utf8");
const definitionStart = breedSource.indexOf("const BREED_DEFINITIONS");
const definitionEnd = breedSource.indexOf("\n];", definitionStart);
if (definitionStart < 0 || definitionEnd < 0) {
    throw new Error("Unable to locate the pet companion breed catalog.");
}

const definitionBlock = breedSource.slice(definitionStart, definitionEnd);
const breedDefinitionCount = (definitionBlock.match(/^\s*\["[^"]+"/gm) || []).length;
if (breedDefinitionCount !== 120) {
    throw new Error(`Pet companion catalog must define 120 breeds; found ${breedDefinitionCount}.`);
}

const roots = [
    { directory: path.join(root, "public", "images", "pet-companion", "cute-v2"), suffixes: ["idle", "recommend"] },
    { directory: path.join(root, "public", "images", "pet-companion", "cute-v3-motion"), suffixes: ["core", "walk"] },
];

for (let index = 1; index <= 14; index += 1) {
    const rig = `r${String(index).padStart(2, "0")}`;
    for (const { directory, suffixes } of roots) {
        for (const suffix of suffixes) {
            const asset = path.join(directory, `${rig}-${suffix}.webp`);
            if (!existsSync(asset) || statSync(asset).size < 32) {
                throw new Error(`Missing or empty companion asset: ${path.relative(root, asset)}`);
            }
            const header = readFileSync(asset).subarray(0, 12).toString("ascii");
            if (!header.startsWith("RIFF") || header.slice(8, 12) !== "WEBP") {
                throw new Error(`Invalid WebP companion asset: ${path.relative(root, asset)}`);
            }
        }
    }
}

console.log("Pet companion coverage verified: 120 breed profiles, 14 motion rigs, 56 WebP assets.");
