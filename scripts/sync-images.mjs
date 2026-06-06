// scripts/sync-images.mjs
// 자산 폴더 (public/images/products/catalog/) 스캔 → catalog.json 자동 동기화
// ----------------------------------------------------------------------------
// 작동 방식:
//   각 제품 폴더(catalog 의 folder 필드) 안의 파일들을 자동 감지해서
//   catalog.json 의 image / gallery / details / sizeImage / video 필드에 반영.
//
// 누가 작업하든 (사람·디자이너·RPA) 파일만 폴더에 두면 사이트 반영 자동.
// predev / prebuild 훅으로 npm run dev / build 시 자동 실행.
//
// 명명 규칙 (product_list.xlsx 의 guide 시트 참고):
//   {folder}/{folder}.png    → image (메인)
//   {folder}/2.png, 3.png... → gallery[] (썸네일)
//   {folder}/size.png        → sizeImage
//   {folder}/video.mp4       → video (외부 URL 보존: 로컬 파일 없을 땐 기존 값 유지)
//   {folder}/details/1.png, 2.png... → details[] (상세 본문)
//
// Incremental 동작:
//   파일 새로 추가/삭제 → 해당 필드만 갱신
//   변경 없으면 catalog.json 도 그대로 (mtime 보존)
import { readdirSync, existsSync, statSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CATALOG_DIR = path.join(ROOT, "public", "images", "products", "catalog");
const CATALOG_JSON_PATH = path.join(ROOT, "lib", "catalog", "raw.json");

const URL_BASE = "/images/products/catalog";
const IMG_EXTS = [".png", ".jpg", ".jpeg", ".webp"];
const VIDEO_EXTS = [".mp4", ".webm", ".mov"];
const GALLERY_MAX = 20;      // 안전 상한
const DETAILS_MAX = 50;

const catalog = JSON.parse(readFileSync(CATALOG_JSON_PATH, "utf-8"));

/** 확장자 후보들 중 존재하는 파일명 찾기 */
function findFile(dir, baseName, exts) {
    for (const ext of exts) {
        const candidate = baseName + ext;
        if (existsSync(path.join(dir, candidate))) return candidate;
    }
    return null;
}

/** catalog folder → product 매핑 */
const byFolder = new Map();
for (const p of catalog) {
    if (p.folder) byFolder.set(p.folder, p);
}

// 폴더가 catalog 와 매칭되는 것만 처리
const folders = existsSync(CATALOG_DIR)
    ? readdirSync(CATALOG_DIR).filter((f) => {
          const full = path.join(CATALOG_DIR, f);
          try {
              return statSync(full).isDirectory();
          } catch { return false; }
      })
    : [];

let counts = {
    image: 0, imageRemoved: 0,
    gallery: 0, galleryRemoved: 0,
    details: 0, detailsRemoved: 0,
    size: 0, sizeRemoved: 0,
    video: 0, videoSkipped: 0,
};
const unmatchedFolders = [];

for (const folder of folders) {
    const product = byFolder.get(folder);
    if (!product) {
        unmatchedFolders.push(folder);
        continue;
    }
    const folderPath = path.join(CATALOG_DIR, folder);
    const baseUrl = `${URL_BASE}/${folder}`;

    /* ===== 메인 이미지 ===== */
    const mainFile = findFile(folderPath, folder, IMG_EXTS);
    if (mainFile) {
        const newImage = `${baseUrl}/${mainFile}`;
        if (product.image !== newImage) {
            product.image = newImage;
            counts.image++;
        }
    } else if (product.image) {
        // catalog 엔 image 가 있지만 실제 파일이 없음 — 정리
        delete product.image;
        counts.imageRemoved++;
    }

    /* ===== 갤러리 (2.png, 3.png, ...) ===== */
    const gallery = [];
    for (let i = 2; i <= GALLERY_MAX; i++) {
        const f = findFile(folderPath, String(i), IMG_EXTS);
        if (!f) break;
        gallery.push(`${baseUrl}/${f}`);
    }
    if (gallery.length > 0) {
        if (JSON.stringify(product.gallery) !== JSON.stringify(gallery)) {
            product.gallery = gallery;
            counts.gallery++;
        }
    } else if (product.gallery) {
        delete product.gallery;
        counts.galleryRemoved++;
    }

    /* ===== 상세 본문 (details/1.png, 2.png, ...) ===== */
    const detailsDir = path.join(folderPath, "details");
    const details = [];
    if (existsSync(detailsDir)) {
        for (let i = 1; i <= DETAILS_MAX; i++) {
            const f = findFile(detailsDir, String(i), IMG_EXTS);
            if (!f) break;
            details.push(`${baseUrl}/details/${f}`);
        }
    }
    if (details.length > 0) {
        if (JSON.stringify(product.details) !== JSON.stringify(details)) {
            product.details = details;
            counts.details++;
        }
    } else if (product.details) {
        delete product.details;
        counts.detailsRemoved++;
    }

    /* ===== 사이즈 차트 ===== */
    const sizeFile = findFile(folderPath, "size", IMG_EXTS);
    if (sizeFile) {
        const newPath = `${baseUrl}/${sizeFile}`;
        if (product.sizeImage !== newPath) {
            product.sizeImage = newPath;
            counts.size++;
        }
    } else if (product.sizeImage) {
        delete product.sizeImage;
        counts.sizeRemoved++;
    }

    /* ===== 영상 ===== */
    const videoFile = findFile(folderPath, "video", VIDEO_EXTS);
    if (videoFile) {
        const newPath = `${baseUrl}/${videoFile}`;
        if (product.video !== newPath) {
            product.video = newPath;
            counts.video++;
        }
    } else {
        // 로컬 파일이 없으면 기존 video 필드(외부 URL) 보존
        if (product.video) counts.videoSkipped++;
    }
}

// 정렬해서 저장 (no 오름차순 유지)
catalog.sort((a, b) => a.no - b.no);
writeFileSync(CATALOG_JSON_PATH, JSON.stringify(catalog, null, 2), "utf-8");

// 결과 출력
console.log("[sync-images] 동기화 완료");
console.log(`  처리 폴더: ${folders.length} / 카탈로그 매칭: ${folders.length - unmatchedFolders.length}`);
if (counts.image > 0) console.log(`  메인 이미지 갱신: ${counts.image}`);
if (counts.imageRemoved > 0) console.log(`  메인 이미지 제거: ${counts.imageRemoved}`);
if (counts.gallery > 0) console.log(`  갤러리 갱신: ${counts.gallery}`);
if (counts.galleryRemoved > 0) console.log(`  갤러리 제거: ${counts.galleryRemoved}`);
if (counts.details > 0) console.log(`  상세 갱신: ${counts.details}`);
if (counts.detailsRemoved > 0) console.log(`  상세 제거: ${counts.detailsRemoved}`);
if (counts.size > 0) console.log(`  사이즈 갱신: ${counts.size}`);
if (counts.video > 0) console.log(`  영상 갱신: ${counts.video}`);
if (counts.videoSkipped > 0) console.log(`  영상 (외부 URL 보존): ${counts.videoSkipped}`);
if (unmatchedFolders.length > 0) {
    console.log(`  [경고] 카탈로그 매칭 안 된 폴더 ${unmatchedFolders.length}개:`);
    unmatchedFolders.slice(0, 10).forEach((f) => console.log(`    - ${f}`));
}
