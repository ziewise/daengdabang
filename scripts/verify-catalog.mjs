// scripts/verify-catalog.mjs — catalog.ts 의 분류 결과 검증
// 실행: node scripts/verify-catalog.mjs
// docs/01-카탈로그-분석.md, 04-기획전-구성.md 의 기대값과 비교

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawPath = path.join(__dirname, "..", "lib", "catalog.json");
const raw = JSON.parse(readFileSync(rawPath, "utf-8"));

// catalog.ts 의 mapSubcategory / mapPromos 로직을 여기에 복사해서 검증
// (tsx import 가 복잡하므로 JS 로 재구현)

function mapSubcategory(r) {
    const sub = r.useSub || "";
    const name = r.name || "";
    if (/하네스/.test(sub)) return "harness";
    if (/리드줄|목줄|초크/.test(sub)) return "leash";
    if (/고글|렌즈|청력|보호/.test(sub)) return "goggles";
    if (/유모차|카시트|캐리어|백팩|이동/.test(sub)) return "carrier";
    if (/보온|쿨링|방수|우천|판초|스노우|구명|의류|자켓|코트/.test(sub) ||
        /자켓|코트|판초|레인|슈트|베스트|후드/.test(name)) return "wear";
    if (/건사료|사료/.test(sub)) return "drysoy";
    if (/덴탈|간식|트릿/.test(sub)) return "treats";
    if (/영양|보조|보충/.test(sub)) return "supplement";
    if (/아이스크림|음료|디저트|요거트|와인|소주|산양유|스무디|베지/.test(name)) return "dessert";
    if (/방석|침대|매트|쿠션/.test(sub)) return "cushion";
    if (/식기|보울|급수|밥그릇/.test(sub)) return "bowl";
    if (/노즈워크|지능/.test(sub)) return "nosework";
    if (/원반|터그|로프/.test(sub) || /원반|디스크|터그/.test(name)) return "tug";
    if (/라텍스|봉제|장난감/.test(sub)) return "latex";
    if (/샴푸|크림|에센스|미스트|향수|탈취|스킨/.test(sub)) return "cream";
    if (/발바닥|발/.test(sub) || /발바닥/.test(name)) return "paw";
    if (/위생|배변|패드|기저귀/.test(sub)) return "hygiene";
    return "etc";
}

const SUBCAT_TO_CAT = {
    harness: "outdoor", leash: "outdoor", wear: "outdoor", goggles: "outdoor", carrier: "outdoor",
    drysoy: "food", treats: "food", supplement: "food", dessert: "food",
    cushion: "life", bowl: "life",
    nosework: "toy", tug: "toy", latex: "toy",
    cream: "care", paw: "care", hygiene: "care",
    etc: "life",
};

function mapPromos(r) {
    const promos = [];
    if (r.useMain === "산책/외출" || r.useMain === "안전/보호") promos.push("active");
    if (r.season === "우천/장마") promos.push("rainy");
    if (/고글|렌즈|청력/.test(r.useSub || "")) promos.push("eye");
    const isFoodMain = r.useMain === "사료/급여" || r.useMain === "간식/영양";
    const isDessert = /아이스크림|와인|소주|산양유|스무디|베지/.test(r.name || "");
    if (isFoodMain && !isDessert) promos.push("food");
    if (isDessert || /보온|쿨링|야간|반사/.test(r.useSub || "") || /야간|보온|쿨링|여름/.test(r.season || "")) {
        promos.push("seasonal");
    }
    return promos;
}

// 분류 실행
const products = raw.map((r) => ({
    ...r,
    subcategory: mapSubcategory(r),
    category: SUBCAT_TO_CAT[mapSubcategory(r)],
    promos: mapPromos(r),
}));

// 카테고리 분포
const catCount = {};
for (const p of products) catCount[p.category] = (catCount[p.category] || 0) + 1;
console.log("=== 카테고리 분포 (5그룹) ===");
console.log("기대값: outdoor 89 / food 99 / life 52 / toy 12 / care 33 + 의류45 분산");
for (const [c, n] of Object.entries(catCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c}: ${n}`);
}

// 서브카테고리 분포
const subCount = {};
for (const p of products) subCount[p.subcategory] = (subCount[p.subcategory] || 0) + 1;
console.log("\n=== 서브카테고리 분포 ===");
for (const [s, n] of Object.entries(subCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s}: ${n}`);
}

// 기획전 분포
const promoCount = {};
let promoNoneCount = 0;
for (const p of products) {
    if (p.promos.length === 0) promoNoneCount++;
    for (const pr of p.promos) promoCount[pr] = (promoCount[pr] || 0) + 1;
}
console.log("\n=== 기획전 분포 ===");
console.log("기대값: active 88 / rainy 39 / eye 25 / food 83 / seasonal 변동");
for (const [pr, n] of Object.entries(promoCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pr}: ${n}`);
}
console.log(`  (기획전 없음): ${promoNoneCount}`);

// etc 카테고리 의심상품 검사
const etcList = products.filter((p) => p.subcategory === "etc");
console.log(`\n=== 미분류(etc) ${etcList.length}개 ===`);
etcList.slice(0, 20).forEach((p) => {
    console.log(`  [${p.no}] ${p.brandKo} / ${p.useMain} / ${p.useSub} / ${p.name.slice(0, 40)}`);
});
if (etcList.length > 20) console.log(`  ... (+${etcList.length - 20})`);

// 브랜드 수
const brands = new Set(products.map((p) => p.brandKo));
console.log(`\n=== 브랜드 수: ${brands.size} ===`);
