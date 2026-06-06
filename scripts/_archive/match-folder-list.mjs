// scripts/match-folder-list.mjs
// D:/Daengdabang/image/폴더목록.xlsx 의 상품명과 lib/catalog.json 매칭 분석
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excel = JSON.parse(readFileSync(path.join(__dirname, "folder_list.json"), "utf-8"));
const catalog = JSON.parse(readFileSync(path.join(__dirname, "..", "lib", "catalog.json"), "utf-8"));

/** 정규화 — 표기 흔들림 보정 (강화판) */
function norm(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[\(\)（）\[\]·.,\-_·•&]/g, "")
        // 브랜드명 통일
        .replace(/러프웨어/g, "리프웨어")
        .replace(/팰리세이드/g, "팔리세이드")
        .replace(/볼케이노/g, "블케이노")
        .replace(/펫드림하우스/g, "핏드림하우스")
        .replace(/탐라이프/g, "탑라이프")
        .replace(/퍼그너티/g, "페그너티")
        .replace(/플카독/g, "폴카독")
        // 일반 표기 흔들림
        .replace(/프런트/g, "프론트")
        .replace(/크래그/g, "크랙그")
        .replace(/에베레스트/g, "에버레스트")
        .replace(/인슐레이티드/g, "인슐레이트")
        .replace(/플레그라인/g, "플래그라인")
        .replace(/자켓/g, "재킷")
        .replace(/잭킷/g, "재킷")
        .replace(/오자크/g, "오차크")
        .replace(/레인저/g, "레인지")
        .replace(/야즈/g, "아즈")
        .replace(/스테이쉬/g, "스테이식")
        .replace(/스포크스펍/g, "스포크스펀")
        .replace(/렌즈랩/g, "렌즈캡")
        .replace(/모렐/g, "모렌")
        .replace(/래빗/g, "레빗")
        .replace(/래빗/g, "레빗")
        .replace(/어드벤쳐/g, "어드벤처")
        .replace(/디지/g, "디스")
        .replace(/트로비즈/g, "트로비스")
        .replace(/아로클/g, "아르쿨")
        .replace(/휴고앤셀리/g, "휴고앤샐린")
        .replace(/퀸지/g, "퀸치")
        .replace(/퀸쳐/g, "런치")
        .replace(/햄프/g, "헴프")
        .replace(/체인져/g, "체인저")
        .replace(/플리스/g, "플리스")
        .replace(/캐롯/g, "키롯")
        .replace(/스웨드/g, "스위드")
        .replace(/모렌/g, "모렐")
        .replace(/언더베/g, "엔데버")
        .replace(/리스/g, "리쉬");
}

const matched = [];      // 매칭 OK
const closeMatch = [];   // 토큰 매칭은 됐지만 약간 다른 표기
const unmatched = [];    // Excel 에 있지만 카탈로그 없음
const catalogIds = new Set();  // 매칭된 카탈로그 no 모음

for (const e of excel) {
    const hint = e.name || "";
    const hintN = norm(hint);

    // 1차: 완전 substring 매칭
    let cands = catalog.filter((p) => {
        const pN = norm(p.name);
        return pN === hintN || pN.includes(hintN) || hintN.includes(pN);
    });

    // 2차: 토큰 AND 매칭 (2자 이상 모든 토큰 포함)
    if (cands.length === 0) {
        const tokens = hint.split(/[^가-힣A-Za-z0-9]+/).filter(t => t.length >= 2).map(norm);
        if (tokens.length > 0) {
            cands = catalog.filter((p) => {
                const pN = norm(p.name);
                return tokens.every(t => pN.includes(t));
            });
        }
    }

    // 후보 중 길이 가장 비슷한 것 우선
    cands.sort((a, b) => Math.abs(norm(a.name).length - hintN.length) - Math.abs(norm(b.name).length - hintN.length));
    const best = cands[0];

    if (!best) {
        unmatched.push(e);
    } else {
        catalogIds.add(best.no);
        const exactName = norm(best.name) === hintN;
        if (exactName) {
            matched.push({ excel: e, catalog: { no: best.no, name: best.name } });
        } else {
            closeMatch.push({ excel: e, catalog: { no: best.no, name: best.name } });
        }
    }
}

// 카탈로그에 있지만 Excel에 없음
const inCatalogNotExcel = catalog.filter((p) => !catalogIds.has(p.no));

// unmatched 분류 — 고양이 / 비상품 / 진짜 누락
const isCat = (s) => /\b캣\b|고양이|키튼|퍼피.?키튼/i.test(s);
const isNonProduct = (s) => /제품 메인 이미지|메인 이미지|폴더 ?설명|샘플/i.test(s);

const unmatchedCat = unmatched.filter((e) => isCat(e.name));
const unmatchedNonProduct = unmatched.filter((e) => isNonProduct(e.name));
const unmatchedReal = unmatched.filter((e) => !isCat(e.name) && !isNonProduct(e.name));

console.log("=== 매칭 결과 ===");
console.log(`Excel 총: ${excel.length}`);
console.log(`카탈로그 총: ${catalog.length}`);
console.log(`✅ 정확 매칭: ${matched.length}`);
console.log(`🟡 근사 매칭 (표기 차이): ${closeMatch.length}`);
console.log(`⚠️ Excel 에만 있음 (총): ${unmatched.length}`);
console.log(`   ├ 고양이 제품 (의도적 제외): ${unmatchedCat.length}`);
console.log(`   ├ 비상품 (메인이미지 등): ${unmatchedNonProduct.length}`);
console.log(`   └ 진짜 카탈로그 누락: ${unmatchedReal.length}`);
console.log(`⚠️ 카탈로그에만 있음 (Excel 에 없음): ${inCatalogNotExcel.length}`);

// 결과 저장
const outDir = path.join(__dirname);
writeFileSync(path.join(outDir, "match-result.json"), JSON.stringify({
    summary: {
        excelTotal: excel.length,
        catalogTotal: catalog.length,
        exactMatched: matched.length,
        closeMatched: closeMatch.length,
        unmatchedFromExcel: unmatched.length,
        onlyInCatalog: inCatalogNotExcel.length,
    },
    closeMatch,
    unmatchedFromExcel: unmatched,
    onlyInCatalog: inCatalogNotExcel.map((p) => ({ no: p.no, name: p.name, brandKo: p.brandKo })),
}, null, 2), "utf-8");

console.log("\n=== A. 고양이 제품 (카탈로그에서 의도적 제외) ===");
unmatchedCat.forEach((e) => console.log(`  [${e.no}] ${e.name}`));

console.log("\n=== B. 비상품 항목 ===");
unmatchedNonProduct.forEach((e) => console.log(`  [${e.no}] ${e.name}`));

console.log("\n=== C. ⚠️ 진짜 카탈로그에 없는 상품 (실제 추가/확인 필요) ===");
unmatchedReal.forEach((e) => console.log(`  [${e.no}] ${e.name}  (folder: ${e.folder})`));

console.log("\n=== 근사 매칭 — 표기 차이 있는 항목 (처음 10개) ===");
closeMatch.slice(0, 10).forEach(({ excel, catalog }) => {
    console.log(`  excel[${excel.no}] ${excel.name}`);
    console.log(`     ↔ catalog[no=${catalog.no}] ${catalog.name}`);
});
if (closeMatch.length > 10) console.log(`  ... +${closeMatch.length - 10}건 더`);

console.log("\n=== 카탈로그에만 있는 항목 (Excel 에 없음 — 처음 20개) ===");
inCatalogNotExcel.slice(0, 20).forEach((p) => console.log(`  [no=${p.no}] ${p.brandKo} | ${p.name.slice(0, 60)}`));
if (inCatalogNotExcel.length > 20) console.log(`  ... +${inCatalogNotExcel.length - 20}건 더`);

console.log("\n결과 전체는 scripts/match-result.json 에 저장됨");
