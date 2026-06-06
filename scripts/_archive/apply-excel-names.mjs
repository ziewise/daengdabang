// scripts/apply-excel-names.mjs
// 카탈로그 상품명을 Excel(폴더목록.xlsx) 기준으로 정정.
//
// 안전 정책: 정규화 후 완전 일치하는 경우만 변경 (오타·표기 흔들림만 수정).
// 의미가 다른 항목(예: "낫어콘" vs "낫어락")은 정규화로 안 합쳐지므로 자동 매칭에서 제외.
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelPath = path.join(__dirname, "folder_list.json");
const catalogPath = path.join(__dirname, "..", "lib", "catalog.json");

const excel = JSON.parse(readFileSync(excelPath, "utf-8"));
const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));

/** 강력 정규화 — 표기 흔들림 흡수 */
function norm(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[\(\)（）\[\]·.,\-_·•&\/!?]/g, "")
        // 브랜드 통일 (Excel 표기로)
        .replace(/리프웨어/g, "러프웨어")
        .replace(/팰리세이드/g, "팰리세이드")
        .replace(/팔리세이드/g, "팰리세이드")
        .replace(/블케이노/g, "볼케이노")
        .replace(/볼케이노/g, "볼케이노")
        .replace(/핏드림하우스/g, "펫드림하우스")
        .replace(/펫드림하우스/g, "펫드림하우스")
        .replace(/탐라이프/g, "탑라이프")
        .replace(/퍼그너티/g, "페그너티")
        .replace(/플카독/g, "폴카독")
        // 표기 흔들림
        .replace(/프런트/g, "프론트")
        .replace(/프론트/g, "프론트")
        .replace(/크래그/g, "크래그")
        .replace(/크랙그/g, "크래그")
        .replace(/에베레스트/g, "에버레스트")
        .replace(/에버레스트/g, "에버레스트")
        .replace(/인슐레이티드/g, "인슐레이트")
        .replace(/인슐레이트/g, "인슐레이트")
        .replace(/플레그라인/g, "플래그라인")
        .replace(/플래그라인/g, "플래그라인")
        .replace(/자켓/g, "재킷")
        .replace(/재킷/g, "재킷")
        .replace(/오자크/g, "오차크")
        .replace(/오차크/g, "오차크")
        .replace(/레인저/g, "레인지")
        .replace(/레인지/g, "레인지")
        .replace(/야즈/g, "아즈")
        .replace(/아즈/g, "아즈")
        .replace(/스테이쉬/g, "스테이식")
        .replace(/스테이식/g, "스테이식")
        .replace(/스포크스펍/g, "스포크스펀")
        .replace(/스포크스펀/g, "스포크스펀")
        .replace(/렌즈랩/g, "렌즈캡")
        .replace(/렌즈캡/g, "렌즈캡")
        .replace(/모렐/g, "모렌")
        .replace(/모렌/g, "모렌")
        .replace(/래빗/g, "레빗")
        .replace(/레빗/g, "레빗")
        .replace(/어드벤쳐/g, "어드벤처")
        .replace(/트로비즈/g, "트로비스")
        .replace(/트로비스/g, "트로비스")
        .replace(/아로클/g, "아르쿨")
        .replace(/아르쿨/g, "아르쿨")
        .replace(/휴고앤셀리/g, "휴고앤샐린")
        .replace(/휴고앤샐린/g, "휴고앤샐린")
        .replace(/퀸지/g, "퀸치")
        .replace(/퀸치/g, "퀸치")
        .replace(/퀸쳐/g, "런치")
        .replace(/햄프/g, "헴프")
        .replace(/헴프/g, "헴프")
        .replace(/체인져/g, "체인저")
        .replace(/체인저/g, "체인저")
        .replace(/캐롯/g, "키롯")
        .replace(/키롯/g, "키롯")
        .replace(/스웨드/g, "스위드")
        .replace(/스위드/g, "스위드")
        .replace(/언더베/g, "엔데버")
        .replace(/엔데버/g, "엔데버")
        // 카탈로그 오타 → Excel 정답
        .replace(/칠갑상어/g, "철갑상어")
        .replace(/배지/g, "베지")
        .replace(/몰그릇/g, "물그릇")
        .replace(/앞침방지/g, "앞섬방지")
        .replace(/블루밍/g, "볼류밍")
        .replace(/슈플/g, "슈룹")
        .replace(/동에등에/g, "동애등에");
}

/** Excel 항목 정규화 → 원본 Excel 매핑 (정규화 후 같은 텍스트는 첫 번째 Excel 항목만) */
const excelByNorm = new Map();
for (const e of excel) {
    const k = norm(e.name);
    if (!excelByNorm.has(k)) excelByNorm.set(k, e);
}

// 각 카탈로그 항목 처리
const updates = [];
const noChange = [];

for (const c of catalog) {
    const k = norm(c.name);
    const match = excelByNorm.get(k);
    if (!match) {
        noChange.push({ no: c.no, name: c.name, reason: "Excel에 해당 정규화 키 없음" });
        continue;
    }
    if (match.name === c.name) {
        noChange.push({ no: c.no, name: c.name, reason: "이미 같음" });
        continue;
    }
    updates.push({ no: c.no, oldName: c.name, newName: match.name, excelNo: match.no });
}

console.log(`=== 변경 대상: ${updates.length}건 (정규화 일치만, 안전) ===\n`);
updates.forEach((u) => {
    console.log(`  catalog[no=${u.no}] ← excel[no=${u.excelNo}]`);
    console.log(`    OLD: ${u.oldName}`);
    console.log(`    NEW: ${u.newName}`);
    console.log("");
});

// 적용
const updateMap = new Map(updates.map((u) => [u.no, u.newName]));
const updatedCatalog = catalog.map((c) => updateMap.has(c.no) ? { ...c, name: updateMap.get(c.no) } : c);
writeFileSync(catalogPath, JSON.stringify(updatedCatalog, null, 2), "utf-8");

console.log(`\n✅ ${updates.length}건 적용. lib/catalog.json 갱신.`);
console.log(`(매칭 안 된 ${noChange.filter(n => n.reason === "Excel에 해당 정규화 키 없음").length}건은 변경 없음)`);

// '낫 어' 시리즈 등 모호 매칭 확인용 진단 출력
console.log("\n--- 낫 어/후크 어 시리즈 (안전성 확인) ---");
updatedCatalog.filter(x => /낫 어|후크 어/.test(x.name)).forEach(p => console.log(`  no=${p.no} | ${p.name}`));
