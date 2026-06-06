// scripts/link-product-images.mjs
// 폴더목록.xlsx 의 폴더명을 D:/Daengdabang/image/ 의 PNG 파일과 매핑,
// 카탈로그(catalog.json)에 image 필드 추가.
//
// 동작:
//   1. Excel 의 모든 (이름, 폴더명) 항목 순회
//   2. 카탈로그에서 이름으로 매칭 (정규화)
//   3. image 폴더에 {폴더명}.png 존재하면
//   4. public/images/products/catalog/ 로 복사
//   5. catalog.json 에 image 경로 기록 (이미 image 가 설정된 항목은 SKIP)
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelPath = path.join(__dirname, "folder_list.json");
const catalogPath = path.join(__dirname, "..", "lib", "catalog.json");
const srcImageDir = "D:/Daengdabang/image";
const destImageDir = path.join(__dirname, "..", "public", "images", "products", "catalog");

const excel = JSON.parse(readFileSync(excelPath, "utf-8"));
const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));

function norm(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/\.\.\.$/, "")
        .replace(/\s+/g, "")
        .replace(/[\(\)（）\[\]·.,\-_·•&\/!?]/g, "")
        // 통일 (Excel 표기 → 표준)
        .replace(/리프웨어/g, "러프웨어")
        .replace(/팰리세이드/g, "팰리세이드")
        .replace(/팔리세이드/g, "팰리세이드")
        .replace(/핏드림하우스/g, "펫드림하우스")
        .replace(/탐라이프/g, "탑라이프")
        .replace(/퍼그너티/g, "페그너티")
        .replace(/프런트/g, "프론트")
        .replace(/크랙그/g, "크래그")
        .replace(/에베레스트/g, "에버레스트")
        .replace(/인슐레이티드/g, "인슐레이트")
        .replace(/플레그라인/g, "플래그라인")
        .replace(/자켓/g, "재킷")
        .replace(/오자크/g, "오차크")
        .replace(/레인저/g, "레인지")
        .replace(/야즈/g, "아즈")
        .replace(/스테이쉬/g, "스테이식")
        .replace(/스포크스펍/g, "스포크스펀")
        .replace(/렌즈랩/g, "렌즈캡")
        .replace(/모렐/g, "모렌")
        .replace(/래빗/g, "레빗")
        .replace(/어드벤쳐/g, "어드벤처")
        .replace(/트로비즈/g, "트로비스")
        .replace(/아로클/g, "아르쿨")
        .replace(/휴고앤셀리/g, "휴고앤샐린")
        .replace(/퀸지/g, "퀸치")
        .replace(/퀸쳐/g, "런치")
        .replace(/햄프/g, "헴프")
        .replace(/체인져/g, "체인저")
        .replace(/캐롯/g, "키롯")
        .replace(/스웨드/g, "스위드")
        .replace(/언더베/g, "엔데버")
        .replace(/칠갑상어/g, "철갑상어")
        .replace(/배지/g, "베지")
        .replace(/몰그릇/g, "물그릇")
        .replace(/앞침방지/g, "앞섬방지")
        .replace(/블루밍/g, "볼류밍")
        .replace(/슈플/g, "슈룹")
        .replace(/동에등에/g, "동애등에")
        .replace(/플롬/g, "볼륨")
        .replace(/플카독/g, "폴카독");
}

// 폴더 준비
if (!existsSync(destImageDir)) {
    mkdirSync(destImageDir, { recursive: true });
}

// 사용 가능한 이미지 파일 목록
const availableFiles = new Set(readdirSync(srcImageDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)));
console.log(`이미지 폴더 파일 수: ${availableFiles.size}\n`);

// 카탈로그 norm → catalog 매핑
const catalogByNorm = new Map();
for (const c of catalog) {
    catalogByNorm.set(norm(c.name), c);
}

const matched = [];          // image 가 적용된 항목
const skippedNoImage = [];   // Excel 매칭됐지만 image 파일 없음
const skippedAlreadyHas = []; // 카탈로그에 이미 image 있음
const skippedNoCatalog = []; // Excel 에는 있지만 카탈로그 매칭 안 됨

for (const e of excel) {
    const cat = catalogByNorm.get(norm(e.name));
    if (!cat) {
        skippedNoCatalog.push(e);
        continue;
    }
    if (cat.image) {
        skippedAlreadyHas.push({ excel: e, catalog: cat });
        continue;
    }
    // image 파일 찾기 (확장자 .png .jpg .jpeg .webp)
    const candidates = [".png", ".jpg", ".jpeg", ".webp"]
        .map((ext) => `${e.folder}${ext}`)
        .filter((f) => availableFiles.has(f));
    if (candidates.length === 0) {
        skippedNoImage.push(e);
        continue;
    }
    const fileName = candidates[0];
    // 복사
    const srcPath = path.join(srcImageDir, fileName);
    const destPath = path.join(destImageDir, fileName);
    if (!existsSync(destPath)) {
        copyFileSync(srcPath, destPath);
    }
    // catalog 갱신
    cat.image = `/images/products/catalog/${fileName}`;
    matched.push({ excel: e, catalog: cat, file: fileName });
}

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf-8");

console.log("=== 매핑 결과 ===");
console.log(`✅ 이미지 적용 + 복사: ${matched.length}건`);
console.log(`⏭️ 이미 image 있음 (SKIP): ${skippedAlreadyHas.length}건`);
console.log(`⚠️ Excel 에는 있지만 image 파일 없음: ${skippedNoImage.length}건`);
console.log(`⚠️ Excel 에는 있지만 catalog 매칭 안 됨: ${skippedNoCatalog.length}건`);

console.log("\n=== 적용된 매핑 (처음 15개) ===");
matched.slice(0, 15).forEach((m) => {
    console.log(`  [${m.excel.no}] ${m.excel.name.slice(0, 50)}`);
    console.log(`     → ${m.file}`);
});
if (matched.length > 15) console.log(`  ... +${matched.length - 15}건 더`);

if (skippedNoImage.length > 0) {
    console.log("\n=== Excel ↔ catalog 매칭 됐지만 image 파일 없음 (실 파일 누락) ===");
    skippedNoImage.slice(0, 20).forEach((e) => console.log(`  [${e.no}] ${e.folder} | ${e.name.slice(0, 50)}`));
    if (skippedNoImage.length > 20) console.log(`  ... +${skippedNoImage.length - 20}건 더`);
}
