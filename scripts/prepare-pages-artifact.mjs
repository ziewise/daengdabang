import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PRODUCT_ASSET_PREFIX = "images/products/catalog/";
const CDN_ROOT = "https://cdn.jsdelivr.net/gh/ziewise/daengdabang";
const COMMIT_SHA_RE = /^[0-9a-f]{40}$/i;
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".txt", ".xml"]);
const SOURCE_EXTENSIONS = new Set([".css", ".js", ".json", ".mjs", ".ts", ".tsx"]);

function normalizeAssetPath(value) {
    if (typeof value !== "string") return "";
    const clean = value.split(/[?#]/, 1)[0].replaceAll("\\", "/").replace(/^\/+/, "");
    return clean.startsWith(PRODUCT_ASSET_PREFIX) ? clean : "";
}

function collectJsonAssetStrings(value, references) {
    if (typeof value === "string") {
        const normalized = normalizeAssetPath(value);
        if (normalized) references.add(normalized);
        return;
    }
    if (Array.isArray(value)) {
        for (const child of value) collectJsonAssetStrings(child, references);
        return;
    }
    if (value && typeof value === "object") {
        for (const child of Object.values(value)) collectJsonAssetStrings(child, references);
    }
}

async function readJson(filePath, fallback) {
    try {
        return JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch (error) {
        if (error?.code === "ENOENT") return fallback;
        throw error;
    }
}

async function listFiles(root) {
    const files = [];
    async function visit(directory) {
        let entries;
        try {
            entries = await fs.readdir(directory, { withFileTypes: true });
        } catch (error) {
            if (error?.code === "ENOENT") return;
            throw error;
        }
        for (const entry of entries) {
            const absolute = path.join(directory, entry.name);
            if (entry.isSymbolicLink()) {
                throw new Error(`Pages artifact preparation refuses symbolic links: ${absolute}`);
            }
            if (entry.isDirectory()) await visit(absolute);
            else if (entry.isFile()) files.push(absolute);
        }
    }
    await visit(root);
    return files;
}

async function collectRuntimeProductReferences(repoRoot, rawCatalog) {
    const references = new Set();
    collectJsonAssetStrings(rawCatalog, references);
    collectJsonAssetStrings(
        await readJson(path.join(repoRoot, "lib", "external-products", "feed.json"), []),
        references,
    );

    const colors = await readJson(path.join(repoRoot, "lib", "catalog", "colors.json"), {});
    for (const [folder, entries] of Object.entries(colors)) {
        for (const entry of Array.isArray(entries) ? entries : []) {
            for (const key of ["file", "chip"]) {
                if (entry?.[key]) {
                    references.add(normalizeAssetPath(`/images/products/catalog/${folder}/colors/${entry[key]}`));
                }
            }
        }
    }

    for (const sourceRootName of ["app", "components", "data", "lib"]) {
        const sourceRoot = path.join(repoRoot, sourceRootName);
        for (const filePath of await listFiles(sourceRoot)) {
            if (!SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) continue;
            const source = await fs.readFile(filePath, "utf8");
            for (const match of source.matchAll(/\/images\/products\/catalog\/[A-Za-z0-9_.\/-]+/g)) {
                const normalized = normalizeAssetPath(match[0]);
                if (normalized) references.add(normalized);
            }
        }
    }
    references.delete("");
    return references;
}

async function collectBuiltCdnVideos(outRoot, commitSha) {
    const found = new Set();
    const prefix = `${CDN_ROOT}@${commitSha}/public/`;
    for (const filePath of await listFiles(outRoot)) {
        if (!TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())) continue;
        const source = (await fs.readFile(filePath, "utf8"))
            .replace(/\\u002f/gi, "/")
            .replaceAll("\\/", "/");
        let offset = 0;
        while ((offset = source.indexOf(prefix, offset)) >= 0) {
            const rest = source.slice(offset + prefix.length);
            const match = rest.match(/^images\/products\/catalog\/[A-Za-z0-9_.\/-]+\/videos\/hover\.mp4/);
            if (match) found.add(normalizeAssetPath(match[0]));
            offset += prefix.length;
        }
    }
    return found;
}

async function totalBytes(filePaths) {
    let bytes = 0;
    for (const filePath of filePaths) bytes += (await fs.stat(filePath)).size;
    return bytes;
}

export async function preparePagesArtifact({
    repoRoot = process.cwd(),
    outRoot = path.join(repoRoot, "out"),
    commitSha = process.env.NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA || "",
    maxBytes = 950_000_000,
} = {}) {
    const resolvedRepoRoot = path.resolve(repoRoot);
    const resolvedOutRoot = path.resolve(outRoot);
    if (!resolvedOutRoot.startsWith(`${resolvedRepoRoot}${path.sep}`)) {
        throw new Error(`Pages output must stay inside the repository: ${resolvedOutRoot}`);
    }
    if (!COMMIT_SHA_RE.test(commitSha)) {
        throw new Error("NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA must be a full 40-character Git commit SHA");
    }

    const rawCatalog = await readJson(path.join(resolvedRepoRoot, "lib", "catalog", "raw.json"), []);
    const expectedCdnVideos = new Set(
        (Array.isArray(rawCatalog) ? rawCatalog : [])
            .filter((row) => row?.videoDelivery === "jsdelivr_commit_cdn")
            .map((row) => normalizeAssetPath(row.video))
            .filter(Boolean),
    );
    const builtCdnVideos = await collectBuiltCdnVideos(resolvedOutRoot, commitSha);
    const missingCdnVideos = [...expectedCdnVideos].filter((video) => !builtCdnVideos.has(video));
    if (missingCdnVideos.length) {
        throw new Error(
            `Refusing to remove local product videos; ${missingCdnVideos.length} CDN URL(s) are missing from the build`,
        );
    }

    const references = await collectRuntimeProductReferences(resolvedRepoRoot, rawCatalog);
    const beforeFiles = await listFiles(resolvedOutRoot);
    const beforeBytes = await totalBytes(beforeFiles);
    const removed = [];
    for (const filePath of beforeFiles) {
        const relative = path.relative(resolvedOutRoot, filePath).replaceAll(path.sep, "/");
        if (!relative.startsWith(PRODUCT_ASSET_PREFIX)) continue;
        const externalizedVideo = expectedCdnVideos.has(relative);
        const unusedProductAsset = !references.has(relative);
        if (!externalizedVideo && !unusedProductAsset) continue;
        const size = (await fs.stat(filePath)).size;
        await fs.unlink(filePath);
        removed.push({ relative, size, reason: externalizedVideo ? "commit_cdn" : "unused" });
    }

    const afterFiles = await listFiles(resolvedOutRoot);
    const afterBytes = await totalBytes(afterFiles);
    if (afterBytes > maxBytes) {
        throw new Error(`Pages artifact is ${afterBytes} bytes, above the ${maxBytes}-byte safety budget`);
    }
    return {
        beforeBytes,
        afterBytes,
        maxBytes,
        removedBytes: beforeBytes - afterBytes,
        removedFileCount: removed.length,
        externalizedVideoCount: removed.filter((entry) => entry.reason === "commit_cdn").length,
        unusedAssetCount: removed.filter((entry) => entry.reason === "unused").length,
        expectedCdnVideoCount: expectedCdnVideos.size,
    };
}

function parseCliArgs(argv) {
    const options = {};
    for (let index = 0; index < argv.length; index += 1) {
        if (argv[index] === "--out") options.outRoot = path.resolve(argv[++index]);
        else if (argv[index] === "--max-bytes") options.maxBytes = Number(argv[++index]);
        else throw new Error(`Unknown argument: ${argv[index]}`);
    }
    if (options.maxBytes != null && (!Number.isSafeInteger(options.maxBytes) || options.maxBytes <= 0)) {
        throw new Error("--max-bytes must be a positive safe integer");
    }
    return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const result = await preparePagesArtifact(parseCliArgs(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
}
