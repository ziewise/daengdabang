import {
    access,
    cp,
    mkdir,
    readdir,
    readFile,
    rm,
    stat,
    writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const exportRoot = path.join(projectRoot, "out");
const nativeRoot = path.join(projectRoot, "native", "www");

const bundledRoutes = [
    "app",
    "auth",
    "chat",
    "legal",
    "my-pet",
    "mypage",
    "offline",
    "pet-lens",
    "petlens",
    "privacy",
    "terms",
];

const bundledDirectories = [
    "_next",
    "fonts",
    "images/brand",
    "images/breeds",
    "images/pwa",
    "images/ui",
    "ai/tryon",
];

const bundledFiles = [
    "apple-icon.png",
    "icon.png",
    "manifest.webmanifest",
    "images/logo-black-poodle-v2.png",
    "images/og-ai-platform-20260804-1200x630.png",
    "images/wordmark.png",
    "videos/login.mp4",
];

const launchDocument = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#fffaf0">
  <title>댕다방</title>
  <style>
    html,body{height:100%;margin:0;background:#fffaf0;color:#0f172a;font-family:system-ui,sans-serif}
    body{display:grid;place-items:center}.launch{text-align:center}.mark{width:88px;height:88px;border-radius:24px}
    p{margin:14px 0 0;font-weight:800}
  </style>
</head>
<body>
  <div class="launch">
    <img class="mark" src="/images/pwa/icon-v2-192x192.png" alt="">
    <p>댕다방을 여는 중이에요</p>
  </div>
  <script>location.replace('/app/');</script>
</body>
</html>
`;

function assertSafeOutputDirectory(target) {
    const expectedParent = path.join(projectRoot, "native") + path.sep;
    if (!target.startsWith(expectedParent) || path.basename(target) !== "www") {
        throw new Error(`Refusing to replace unexpected directory: ${target}`);
    }
}

async function copyRelative(relativePath) {
    const source = path.join(exportRoot, relativePath);
    const destination = path.join(nativeRoot, relativePath);
    await access(source);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
}

async function collectTextFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectTextFiles(absolutePath));
        } else if (/\.(?:html|txt)$/i.test(entry.name)) {
            files.push(absolutePath);
        }
    }
    return files;
}

async function verifyReferencedAssets() {
    const missing = new Set();
    const files = await collectTextFiles(nativeRoot);
    const assetPattern = /\/(images|videos|fonts)\/[^"'\\\s<>)]+/g;

    for (const file of files) {
        const contents = await readFile(file, "utf8");
        for (const match of contents.matchAll(assetPattern)) {
            const relativePath = match[0].slice(1);
            try {
                await access(path.join(nativeRoot, relativePath));
            } catch {
                missing.add(relativePath);
            }
        }
    }

    if (missing.size > 0) {
        throw new Error(`Native bundle is missing referenced assets:\n${[...missing].sort().join("\n")}`);
    }
}

async function removeWebOnlyOnnxRuntimeMedia() {
    const mediaRoot = path.join(nativeRoot, "_next", "static", "media");
    const entries = await readdir(mediaRoot, { withFileTypes: true });
    for (const entry of entries) {
        if (
            entry.isFile()
            && /^ort(?:[.-]).*\.(?:mjs|wasm)$/i.test(entry.name)
        ) {
            await rm(path.join(mediaRoot, entry.name), { force: true });
        }
    }
}

async function directorySize(directory) {
    let bytes = 0;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) bytes += await directorySize(absolutePath);
        else bytes += (await stat(absolutePath)).size;
    }
    return bytes;
}

await access(path.join(exportRoot, "app", "index.html"));
assertSafeOutputDirectory(nativeRoot);
await rm(nativeRoot, { recursive: true, force: true });
await mkdir(nativeRoot, { recursive: true });

for (const relativePath of [...bundledRoutes, ...bundledDirectories, ...bundledFiles]) {
    await copyRelative(relativePath);
}

await writeFile(path.join(nativeRoot, "index.html"), launchDocument, "utf8");
// Native product pages run the same graph through Core ML/NNAPI. The browser
// WebGPU/WASM artifacts are intentionally omitted from the install package.
await removeWebOnlyOnnxRuntimeMedia();
await verifyReferencedAssets();

const bytes = await directorySize(nativeRoot);
const megabytes = bytes / 1024 / 1024;
const maximumMegabytes = 40;
if (megabytes > maximumMegabytes) {
    throw new Error(`Native web bundle is ${megabytes.toFixed(2)} MB; maximum is ${maximumMegabytes} MB.`);
}

console.log(`Native web bundle ready: ${megabytes.toFixed(2)} MB (${bundledRoutes.length} route groups)`);
