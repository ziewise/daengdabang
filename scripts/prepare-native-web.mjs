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
    "cart", // 2026-10-21: 앱 안 상품 상세에서 담은 상품이 보이게 장바구니도 앱 안(약 1MB)
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
    // PC 로그인 영상(auth/login 화면이 묶음에 들어가 있어 참조 검사에 걸림) — 워터마크 지운 1.9MB 새 영상(2026-10-28)
    // 예전 videos/login.mp4(2.5MB)는 뺌 → 앱 묶음 0.6MB 감소
    "videos/login-clean-v1.mp4",
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
  <!-- 2026-10-18: 새 앱 홈으로 바로(다시 불러오기 · 확장자 없는 주소도 여기로 와서 새 앱 홈으로) -->
  <script>location.replace('/app/home-1/index.html');</script>
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
    // The 2.3 MB icon master is an input to native:assets, not a runtime icon.
    // Keep the generated PWA icons while excluding only this build-time source.
    const iconMaster = path.join(
        exportRoot, "images", "pwa", "daengdabang-black-poodle-app-icon-master-v3.png",
    );
    await cp(source, destination, {
        recursive: true,
        filter: (sourcePath) => sourcePath !== iconMaster,
    });
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

// 앱 묶음 40MB 한도(2026-10-26 사용자 승인): 묶음 폴더 안에 있지만 앱 화면이 쓰지 않는 큰 파일만 뺀다.
// 웹에는 그대로 배포되고(out/), 지우는 파일은 없음. 앱이 쓰는 파일을 실수로 빼면 아래 verifyReferencedAssets 가 막는다.
const nativeExcludedFiles = [
    // 예전 원티드 산스 한 덩어리(1.26MB) — 지금은 fonts/wanted/ 세 조각을 씀(app/globals.css), 원본 보관용
    "fonts/WantedSansVariable.woff2",
    // 연구소 상징 원본 PNG(1.92MB) — 화면은 daengdabang-research-lab-symbol-nav.webp 만 씀
    "images/brand/daengdabang-research-lab-symbol.png",
    // 견종 얼굴 영상 원본(장당 1.9MB) — 웹 홈 전용. 앱 쇼핑 홈 배지는 images/breeds/badge/*-240.mp4
    "images/breeds/englishbulldog.mp4",
    "images/breeds/poodle.mp4",
    "images/breeds/welshcorgi.mp4",
];

async function removeNativeExcludedFiles() {
    for (const relativePath of nativeExcludedFiles) {
        await rm(path.join(nativeRoot, relativePath), { force: true });
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
// 앱 시작 화면(새 앱 홈)이 빌드에 있어야 함(2026-10-18)
await access(path.join(exportRoot, "app", "home-1", "index.html"));
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
await removeNativeExcludedFiles();
await verifyReferencedAssets();

const bytes = await directorySize(nativeRoot);
const megabytes = bytes / 1024 / 1024;
const maximumMegabytes = 40;
if (megabytes > maximumMegabytes) {
    throw new Error(`Native web bundle is ${megabytes.toFixed(2)} MB; maximum is ${maximumMegabytes} MB.`);
}

console.log(`Native web bundle ready: ${megabytes.toFixed(2)} MB (${bundledRoutes.length} route groups)`);
