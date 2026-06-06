// scripts/renumber-catalog.mjs
// catalog.json 의 no 를 1~333 연속으로 재번호.
// 동시에 lib/catalog.ts 의 BEST_RANKS, NEW_PRODUCT_NOS 도 매핑 적용.
//
// 매핑 정책: 기존 no 오름차순 → 1, 2, 3, ... (빈 번호 채우기)
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, "..", "lib", "catalog.json");
const catalogTsPath = path.join(__dirname, "..", "lib", "catalog.ts");

const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));

// 1. 매핑 생성: old_no → new_no
const sorted = [...catalog].sort((a, b) => a.no - b.no);
const oldToNew = new Map();
sorted.forEach((c, idx) => {
    oldToNew.set(c.no, idx + 1);
});

console.log(`매핑 생성: ${oldToNew.size} 개`);
console.log("샘플 (앞 10개, 빈 번호 영향):");
let count = 0;
for (const [oldNo, newNo] of oldToNew.entries()) {
    if (oldNo !== newNo) {
        console.log(`  old=${oldNo} → new=${newNo}`);
        count++;
        if (count >= 10) break;
    }
}

// 2. catalog.json 재번호
const renumbered = sorted.map((c, idx) => ({
    ...c,
    no: idx + 1,
}));
writeFileSync(catalogPath, JSON.stringify(renumbered, null, 2), "utf-8");
console.log(`\n✅ catalog.json 재번호 완료 (총 ${renumbered.length} 행, no = 1~${renumbered.length})`);

// 3. catalog.ts 의 BEST_RANKS, NEW_PRODUCT_NOS 매핑 적용
let tsContent = readFileSync(catalogTsPath, "utf-8");

// BEST_RANKS 의 `no: N` 모두 갱신 (각 항목 별로)
// 패턴: `no: 31  },  // 주석` 또는 `no: 31 },`
let bestUpdates = 0;
tsContent = tsContent.replace(
    /(\{\s*rank:\s*\d+\s*,\s*no:\s*)(\d+)(\s*\},?)/g,
    (m, prefix, no, suffix) => {
        const oldNo = parseInt(no, 10);
        const newNo = oldToNew.get(oldNo);
        if (newNo === undefined) {
            console.warn(`  ⚠️ BEST_RANKS no=${oldNo} 매핑 없음 (catalog 에 해당 항목 없음)`);
            return m;
        }
        bestUpdates++;
        return `${prefix}${newNo}${suffix}`;
    }
);
console.log(`\n✅ BEST_RANKS 매핑 적용: ${bestUpdates} 건`);

// NEW_PRODUCT_NOS 배열: `const NEW_PRODUCT_NOS: number[] = [23, 1, 2, ...];`
const newProductMatch = tsContent.match(/const NEW_PRODUCT_NOS:\s*number\[\]\s*=\s*\[([\s\S]*?)\];/);
if (newProductMatch) {
    const before = newProductMatch[1];
    // 각 숫자만 추출 + 매핑 (주석 보존)
    let newUpdates = 0;
    const after = before.replace(/(\b)(\d+)(\b)/g, (m, b1, no, b2) => {
        const oldNo = parseInt(no, 10);
        const newNo = oldToNew.get(oldNo);
        if (newNo === undefined) {
            console.warn(`  ⚠️ NEW_PRODUCT_NOS no=${oldNo} 매핑 없음`);
            return m;
        }
        newUpdates++;
        return `${b1}${newNo}${b2}`;
    });
    tsContent = tsContent.replace(newProductMatch[0], `const NEW_PRODUCT_NOS: number[] = [${after}];`);
    console.log(`✅ NEW_PRODUCT_NOS 매핑 적용: ${newUpdates} 건`);
}

writeFileSync(catalogTsPath, tsContent, "utf-8");
console.log(`\n✅ catalog.ts 갱신 완료`);

// 4. 매핑 결과 저장 (참고용)
const mappingPath = path.join(__dirname, "renumber-mapping.json");
const mappingArr = [...oldToNew.entries()].map(([oldNo, newNo]) => ({ oldNo, newNo }));
writeFileSync(mappingPath, JSON.stringify(mappingArr, null, 2), "utf-8");
console.log(`\n📁 매핑 저장: ${mappingPath}`);
