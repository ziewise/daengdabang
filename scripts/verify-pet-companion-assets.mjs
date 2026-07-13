import { createHash } from "node:crypto";
import {
    existsSync,
    readFileSync,
    readdirSync,
    statSync,
} from "node:fs";
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
const breedDefinitions = [...definitionBlock.matchAll(
    /^\s*\["([^"]+)", "([^"]+)", "([^"]+)"/gm,
)].map((match) => ({ id: match[1], en: match[2], ko: match[3] }));
const breedIds = breedDefinitions.map(({ id }) => id);
const breedDefinitionById = new Map(breedDefinitions.map((breed) => [breed.id, breed]));
const uniqueBreedIds = new Set(breedIds);
if (breedIds.length !== 120 || uniqueBreedIds.size !== 120) {
    throw new Error(
        `Pet companion catalog must define 120 unique breeds; found ${breedIds.length}/${uniqueBreedIds.size}.`,
    );
}

function assertWebp(asset, { expectedSize, requireAlpha = false } = {}) {
    if (!existsSync(asset) || statSync(asset).size < 32) {
        throw new Error(`Missing or empty companion asset: ${path.relative(root, asset)}`);
    }

    const bytes = readFileSync(asset);
    if (
        bytes.subarray(0, 4).toString("ascii") !== "RIFF"
        || bytes.subarray(8, 12).toString("ascii") !== "WEBP"
    ) {
        throw new Error(`Invalid WebP companion asset: ${path.relative(root, asset)}`);
    }

    if (expectedSize || requireAlpha) {
        const chunkType = bytes.subarray(12, 16).toString("ascii");
        let width;
        let height;
        let hasAlpha;
        if (chunkType === "VP8X" && bytes.length >= 30) {
            const flags = bytes[20];
            width = bytes.readUIntLE(24, 3) + 1;
            height = bytes.readUIntLE(27, 3) + 1;
            hasAlpha = Boolean(flags & 0x10);
        } else if (chunkType === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
            const dimensions = bytes.readUInt32LE(21);
            width = (dimensions & 0x3fff) + 1;
            height = ((dimensions >>> 14) & 0x3fff) + 1;
            hasAlpha = Boolean(dimensions & 0x10000000);
        } else {
            throw new Error(`Unsupported breed WebP layout: ${path.relative(root, asset)}`);
        }
        if (expectedSize && (width !== expectedSize[0] || height !== expectedSize[1])) {
            throw new Error(
                `Breed atlas has wrong dimensions ${width}x${height}: ${path.relative(root, asset)}`,
            );
        }
        if (requireAlpha && !hasAlpha) {
            throw new Error(`Breed atlas has no alpha channel: ${path.relative(root, asset)}`);
        }
    }

    return bytes;
}

const legacyRoots = [
    {
        directory: path.join(root, "public", "images", "pet-companion", "cute-v2"),
        suffixes: ["idle", "recommend"],
    },
    {
        directory: path.join(root, "public", "images", "pet-companion", "cute-v3-motion"),
        suffixes: ["core", "walk"],
    },
];

for (let index = 1; index <= 14; index += 1) {
    const rig = `r${String(index).padStart(2, "0")}`;
    for (const { directory, suffixes } of legacyRoots) {
        for (const suffix of suffixes) {
            assertWebp(path.join(directory, `${rig}-${suffix}.webp`));
        }
    }
}

const breedAssetDirectory = path.join(
    root,
    "public",
    "images",
    "pet-companion",
    "cute-v4-breeds",
);
if (!existsSync(breedAssetDirectory)) {
    throw new Error(`Missing breed-specific asset directory: ${path.relative(root, breedAssetDirectory)}`);
}

const expectedCoreFiles = breedIds.map((breedId) => `${breedId}-core.webp`).sort();
const expectedPosterFiles = breedIds.map((breedId) => `${breedId}-poster.webp`).sort();
const expectedVerticalFiles = breedIds.map((breedId) => `${breedId}-vertical.webp`).sort();
const expectedBreedFiles = [
    ...expectedCoreFiles,
    ...expectedPosterFiles,
    ...expectedVerticalFiles,
].sort();
const actualBreedFiles = readdirSync(breedAssetDirectory)
    .filter((fileName) => fileName.endsWith(".webp"))
    .sort();
const missingBreedFiles = expectedBreedFiles.filter((fileName) => !actualBreedFiles.includes(fileName));
const unexpectedBreedFiles = actualBreedFiles.filter((fileName) => !expectedBreedFiles.includes(fileName));
if (missingBreedFiles.length || unexpectedBreedFiles.length) {
    throw new Error([
        `Breed-specific asset coverage is incomplete (${actualBreedFiles.length}/360).`,
        missingBreedFiles.length ? `Missing: ${missingBreedFiles.join(", ")}` : "",
        unexpectedBreedFiles.length ? `Unexpected: ${unexpectedBreedFiles.join(", ")}` : "",
    ].filter(Boolean).join(" "));
}

const manifestPath = path.join(breedAssetDirectory, "manifest.json");
if (!existsSync(manifestPath)) {
    throw new Error("Missing breed-specific asset manifest. Run scripts/write-pet-companion-breed-manifest.mjs.");
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (
    manifest.version !== "cute-v4-breeds"
    || manifest.cacheVersion !== "20260712-2"
    || manifest.assetCount !== 120
    || manifest.frameCount !== 3_840
    || manifest.layout?.columns !== 4
    || manifest.layout?.rows !== 4
    || manifest.layout?.cell?.[0] !== 256
    || manifest.layout?.cell?.[1] !== 256
    || JSON.stringify(manifest.layout?.motions) !== JSON.stringify(["idle", "walk", "run", "sniff"])
    || manifest.verticalLayout?.columns !== 4
    || manifest.verticalLayout?.rows !== 4
    || manifest.verticalLayout?.cell?.[0] !== 256
    || manifest.verticalLayout?.cell?.[1] !== 256
    || JSON.stringify(manifest.verticalLayout?.upRows) !== JSON.stringify([0, 2])
    || JSON.stringify(manifest.verticalLayout?.downRows) !== JSON.stringify([1, 3])
    || manifest.verticalLayout?.framesPerDirection !== 8
    || JSON.stringify(manifest.verticalLayout?.motions) !== JSON.stringify(["run-up", "run-down"])
    || !Array.isArray(manifest.assets)
    || manifest.assets.length !== 120
) {
    throw new Error("Breed-specific asset manifest header is invalid or incomplete.");
}
const manifestByFile = new Map(manifest.assets.map((asset) => [asset.file, asset]));
if (manifestByFile.size !== 120) {
    throw new Error("Breed-specific asset manifest contains duplicate file entries.");
}

const seenBreedHashes = new Map();
const seenPosterHashes = new Map();
const seenVerticalHashes = new Map();
for (const fileName of expectedCoreFiles) {
    const asset = path.join(breedAssetDirectory, fileName);
    const bytes = assertWebp(asset, { expectedSize: [1024, 1024], requireAlpha: true });
    if (bytes.length < 20_000 || bytes.length > 650_000) {
        throw new Error(
            `Breed atlas size is outside the quality budget (${bytes.length} bytes): ${path.relative(root, asset)}`,
        );
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    const manifestAsset = manifestByFile.get(fileName);
    const expectedBreedId = fileName.replace(/-core\.webp$/, "");
    const expectedBreed = breedDefinitionById.get(expectedBreedId);
    if (
        !manifestAsset
        || !expectedBreed
        || manifestAsset.id !== expectedBreedId
        || manifestAsset.en !== expectedBreed.en
        || manifestAsset.ko !== expectedBreed.ko
        || manifestAsset.file !== fileName
        || manifestAsset.frames !== 16
    ) {
        throw new Error(`Breed atlas does not match manifest: ${fileName}`);
    }
    const duplicate = seenBreedHashes.get(digest);
    if (duplicate) {
        throw new Error(`Breed atlases must be unique: ${duplicate} and ${fileName}`);
    }
    seenBreedHashes.set(digest, fileName);

    const posterFileName = `${expectedBreedId}-poster.webp`;
    const posterPath = path.join(breedAssetDirectory, posterFileName);
    const posterBytes = assertWebp(posterPath, { expectedSize: [256, 256], requireAlpha: true });
    if (posterBytes.length < 5_000 || posterBytes.length > 300_000) {
        throw new Error(
            `Breed poster size is outside the quality budget (${posterBytes.length} bytes): ${path.relative(root, posterPath)}`,
        );
    }
    const posterDigest = createHash("sha256").update(posterBytes).digest("hex");
    if (manifestAsset.poster !== posterFileName) {
        throw new Error(`Breed poster does not match manifest: ${posterFileName}`);
    }
    const duplicatePoster = seenPosterHashes.get(posterDigest);
    if (duplicatePoster) {
        throw new Error(`Breed posters must be unique: ${duplicatePoster} and ${posterFileName}`);
    }
    seenPosterHashes.set(posterDigest, posterFileName);

    const verticalFileName = `${expectedBreedId}-vertical.webp`;
    const verticalPath = path.join(breedAssetDirectory, verticalFileName);
    const verticalBytes = assertWebp(verticalPath, {
        expectedSize: [1024, 1024],
        requireAlpha: true,
    });
    if (verticalBytes.length < 20_000 || verticalBytes.length > 650_000) {
        throw new Error(
            `Vertical breed atlas size is outside the quality budget (${verticalBytes.length} bytes): ${path.relative(root, verticalPath)}`,
        );
    }
    const verticalDigest = createHash("sha256").update(verticalBytes).digest("hex");
    if (
        manifestAsset.vertical !== verticalFileName
        || manifestAsset.verticalFrames !== 16
    ) {
        throw new Error(`Vertical breed atlas does not match manifest: ${verticalFileName}`);
    }
    const duplicateVertical = seenVerticalHashes.get(verticalDigest);
    if (duplicateVertical) {
        throw new Error(`Vertical breed atlases must be unique: ${duplicateVertical} and ${verticalFileName}`);
    }
    seenVerticalHashes.set(verticalDigest, verticalFileName);
}

for (const [digest, verticalFileName] of seenVerticalHashes) {
    const coreFileName = seenBreedHashes.get(digest);
    if (coreFileName) {
        throw new Error(
            `Vertical atlas must not reuse a side-profile core atlas: ${verticalFileName} and ${coreFileName}`,
        );
    }
}

console.log(
    "Pet companion coverage verified: 120 breed core atlases, 120 vertical atlases, 120 independent posters (3,840 frames), 14 legacy source rigs, 416 WebP assets.",
);
