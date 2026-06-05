// scripts/phase2-migrate.mjs
// Phase 2 종합 마이그레이션
// ---------------------------------------------------------------------
// 1. catalog.json 에 folder 필드 영구 추가 (333개)
// 2. D:/Daengdabang/image/ → D:/Daengdabang/products/ 폴더 이름 변경
// 3. 200개 PNG 파일을 제품별 하위 폴더로 이동
//    products/rw_notarock.png → products/rw_notarock/rw_notarock.png
// 4. public/images/products/catalog/ 도 동일 구조 재배치
// 5. catalog.json image 경로 갱신
//    /images/products/catalog/{folder}.png → /images/products/catalog/{folder}/{folder}.png
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, statSync, rmdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const catalogPath = path.join(ROOT, "lib", "catalog.json");
const folderListPath = path.join(__dirname, "folder_list.json");

// 외부 폴더 경로 (프로젝트 외)
const oldImageDir = "D:/Daengdabang/image";
const newProductsDir = "D:/Daengdabang/products";

// 프로젝트 내 public 폴더
const publicCatalogDir = path.join(ROOT, "public", "images", "products", "catalog");

const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
const folderList = JSON.parse(readFileSync(folderListPath, "utf-8"));

// 정규화 함수
function norm(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/\.\.\.$/, "")
        .replace(/\s+/g, "")
        .replace(/[\(\)（）\[\]·.,\-_·•&\/!?]/g, "")
        .replace(/리프웨어/g, "러프웨어")
        .replace(/팰리세이드/g, "팰리세이드")
        .replace(/팔리세이드/g, "팰리세이드")
        .replace(/핏드림하우스/g, "펫드림하우스")
        .replace(/탐라이프/g, "탑라이프")
        .replace(/퍼그너티/g, "페그너티")
        .replace(/프런트/g, "프론트")
        .replace(/크랙그/g, "크래그");
}

// === Step 1: catalog 에 folder 필드 추가 ===
console.log("\n=== Step 1: catalog folder 필드 추가 ===");

const excelByNorm = new Map();
for (const e of folderList) {
    excelByNorm.set(norm(e.name), e.folder);
}

// no=5 신규 부여
const NEW_FOLDERS_BY_NO = {
    5: "rw_ridgeline_leash_26",
};

let folderAdded = 0;
let noFolder = [];
for (const c of catalog) {
    if (NEW_FOLDERS_BY_NO[c.no]) {
        c.folder = NEW_FOLDERS_BY_NO[c.no];
        folderAdded++;
    } else {
        const folder = excelByNorm.get(norm(c.name));
        if (folder) {
            c.folder = folder;
            folderAdded++;
        } else {
            noFolder.push(c);
        }
    }
}
console.log(`  folder 부여: ${folderAdded}개`);
if (noFolder.length > 0) {
    console.log(`  folder 없음: ${noFolder.length}개`);
    noFolder.forEach((c) => console.log(`    no=${c.no} | ${c.name.slice(0, 50)}`));
}

// === Step 2: 외부 폴더 이름 변경 image/ → products/ ===
console.log("\n=== Step 2: 외부 폴더 이름 변경 ===");
if (existsSync(oldImageDir) && !existsSync(newProductsDir)) {
    renameSync(oldImageDir, newProductsDir);
    console.log(`  ${oldImageDir} → ${newProductsDir}`);
} else if (existsSync(newProductsDir)) {
    console.log(`  이미 ${newProductsDir} 존재 (이전 실행됨?)`);
} else {
    console.log(`  ${oldImageDir} 없음 — 새로 생성`);
    mkdirSync(newProductsDir, { recursive: true });
}

// === Step 3: 외부 폴더 — flat 파일을 제품별 하위 폴더로 이동 ===
console.log("\n=== Step 3: 외부 폴더 — 제품별 하위 폴더로 이동 ===");
const externalFiles = readdirSync(newProductsDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
let externalMoved = 0;
for (const file of externalFiles) {
    const baseName = path.basename(file, path.extname(file));
    const subDir = path.join(newProductsDir, baseName);
    if (!existsSync(subDir)) {
        mkdirSync(subDir, { recursive: true });
    }
    const oldPath = path.join(newProductsDir, file);
    const newPath = path.join(subDir, file);
    if (!existsSync(newPath)) {
        renameSync(oldPath, newPath);
        externalMoved++;
    }
}
console.log(`  외부 ${externalMoved}개 파일 이동 (제품별 하위 폴더로)`);

// === Step 4: public/images/products/catalog/ 도 동일 구조 재배치 ===
console.log("\n=== Step 4: public 폴더 재배치 ===");
if (existsSync(publicCatalogDir)) {
    const publicFiles = readdirSync(publicCatalogDir).filter((f) => {
        const full = path.join(publicCatalogDir, f);
        return statSync(full).isFile() && /\.(png|jpe?g|webp)$/i.test(f);
    });
    let publicMoved = 0;
    for (const file of publicFiles) {
        const baseName = path.basename(file, path.extname(file));
        const subDir = path.join(publicCatalogDir, baseName);
        if (!existsSync(subDir)) {
            mkdirSync(subDir, { recursive: true });
        }
        const oldPath = path.join(publicCatalogDir, file);
        const newPath = path.join(subDir, file);
        if (!existsSync(newPath)) {
            renameSync(oldPath, newPath);
            publicMoved++;
        }
    }
    console.log(`  public ${publicMoved}개 파일 이동 (제품별 하위 폴더로)`);
} else {
    console.log("  public 폴더 없음 — 스킵");
}

// === Step 5: catalog.json image 경로 갱신 ===
console.log("\n=== Step 5: catalog.json image 경로 갱신 ===");
let imagePathUpdated = 0;
for (const c of catalog) {
    if (c.image && c.folder) {
        // 기존: /images/products/catalog/{folder}.png
        // 신규: /images/products/catalog/{folder}/{folder}.png
        const oldPattern = `/images/products/catalog/${c.folder}.png`;
        const newPath = `/images/products/catalog/${c.folder}/${c.folder}.png`;
        if (c.image === oldPattern) {
            c.image = newPath;
            imagePathUpdated++;
        }
    }
}
console.log(`  ${imagePathUpdated}개 image 경로 갱신`);

// 저장
writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf-8");
console.log("\n✅ catalog.json 저장 완료");

// === 최종 요약 ===
console.log("\n=== Phase 2 결과 ===");
const withFolder = catalog.filter((c) => c.folder).length;
const withImage = catalog.filter((c) => c.image).length;
console.log(`  카탈로그 총: ${catalog.length}`);
console.log(`  folder 있음: ${withFolder}`);
console.log(`  image 있음: ${withImage}`);
