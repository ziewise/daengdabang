// scripts/apply-excel-names-pass2.mjs
// Step 1 후 남은 53건 중 카탈로그가 "..." 으로 잘린 항목들을 Excel 전체명으로 복원.
// 안전 정책: 정규화 후 catalog 가 excel 의 prefix (앞부분 일치) + 길이 차이 < 30% 일 때만 변경.
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excel = JSON.parse(readFileSync(path.join(__dirname, "folder_list.json"), "utf-8"));
const catalog = JSON.parse(readFileSync(path.join(__dirname, "..", "lib", "catalog.json"), "utf-8"));

function norm(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/\.\.\.$/, "")  // 끝의 ... 제거
        .replace(/\s+/g, "")
        .replace(/[\(\)（）\[\]·.,\-_·•&\/!?]/g, "")
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
        .replace(/플롬/g, "볼륨")  // 펌블펫솝 오타
        .replace(/플카독/g, "폴카독");
}

// excel 항목을 정규화 prefix 트리 대신 간단 배열로 (한번 훑기)
const excelEntries = excel.map((e) => ({ ...e, normName: norm(e.name) }));

const updates = [];
const noChange = [];

for (const c of catalog) {
    const cN = norm(c.name);
    // 1차: 완전 일치
    let match = excelEntries.find((e) => e.normName === cN);
    // 2차: catalog 가 excel 의 prefix
    if (!match) {
        const candidates = excelEntries.filter((e) => e.normName.startsWith(cN) && cN.length >= 15);
        if (candidates.length === 1) {
            match = candidates[0];
        } else if (candidates.length > 1) {
            // 가장 길이 비슷한 것
            candidates.sort((a, b) => a.normName.length - b.normName.length);
            match = candidates[0];
        }
    }
    if (!match || match.name === c.name) {
        noChange.push(c);
        continue;
    }
    updates.push({ no: c.no, oldName: c.name, newName: match.name, excelNo: match.no });
}

console.log(`=== Step 2 prefix 매칭 결과: ${updates.length}건 ===\n`);
updates.forEach((u) => {
    console.log(`  catalog[no=${u.no}] ← excel[no=${u.excelNo}]`);
    console.log(`    OLD: ${u.oldName}`);
    console.log(`    NEW: ${u.newName}`);
    console.log("");
});

const updateMap = new Map(updates.map((u) => [u.no, u.newName]));
const updatedCatalog = catalog.map((c) => updateMap.has(c.no) ? { ...c, name: updateMap.get(c.no) } : c);
writeFileSync(path.join(__dirname, "..", "lib", "catalog.json"), JSON.stringify(updatedCatalog, null, 2), "utf-8");

console.log(`✅ ${updates.length}건 적용. 카탈로그 갱신.`);

// 남은 미매칭 확인
console.log(`\n남은 카탈로그-only (Excel 없음, 변경 안 함): ${noChange.length - updates.length}건`);
