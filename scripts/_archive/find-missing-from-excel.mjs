// scripts/find-missing-from-excel.mjs
// product_list.xlsx (Excel) 에는 없지만 catalog.json 에는 있는 21개 상품을 찾고,
// 기존 패턴 따라 folder_name 안을 자동 생성한다.
//
// 검토용으로 콘솔 출력만. 실제 Excel 갱신은 사용자 검토 후.
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excel = JSON.parse(readFileSync(path.join(__dirname, "folder_list.json"), "utf-8"));
const catalog = JSON.parse(readFileSync(path.join(__dirname, "..", "lib", "catalog.json"), "utf-8"));

// 정규화 (이전 작업과 동일)
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

// Excel 의 norm 집합
const excelSet = new Set(excel.map((e) => norm(e.name)));

// catalog 에는 있지만 Excel 에 없는 항목
const missingInExcel = catalog.filter((c) => !excelSet.has(norm(c.name)));

console.log(`=== catalog 에는 있지만 Excel 에 없는 항목: ${missingInExcel.length}개 ===\n`);

// 브랜드 prefix 매핑 — 기존 패턴 분석 결과
const BRAND_PREFIX = {
    "러프웨어":       "rw_",
    "리프웨어":       "rw_",
    "렉스스펙스":     "rs_",
    "네이처다이어트": "nd_",
    "요라":           "yora_",
    "카나간":         "canagan_",
    "수파":           "soopa_",
    "펌블펫솝":       "pps_",
    "핏드림하우스":   "pdh_",
    "펫드림하우스":   "pdh_",
    "아페토":         "aff_",
    "이비야야":       "ibi_",
    "주스누드":       "zs_",
    "인더스트리펫":   "ip_",
    "미티본":         "mb_",
    "미티본/미티븐":  "mb_",
    "빌리앤마것":     "bm_",
    "페그너티":       "pug_",
    "퍼그너티":       "pug_",
    "탑라이프":       "tl_",
    "탐라이프":       "tl_",
    "폴카독베이커리": "polkadog_",
    "와우":           "wow_",
    "원티그리스":     "ot_",
    "페리티":         "perity_",
    "아임디퍼런트":   "id_",
    "스키너즈":       "skinners_",
    "휴고앤셀리":     "hugo_",
    "휴고앤샐린":     "hugo_",
    "짜요":           "jjayo_",
    "댕스크림":       "dangcream_",
    "애나펫":         "annapet_",
    "팩트(PACKT)":    "packt_",
    "헤이렉스":       "heyrex_",
    "조아루":         "joaru_",
    "스윗펫":         "sweetpet_",
    "수제/기타":      "homemade_",
    "툴레":           "thule_",
};

/** 상품명에서 영문 폴더명 안 생성 */
function suggestFolderName(c) {
    const prefix = BRAND_PREFIX[c.brandKo] ?? "brand_";
    const name = c.name.toLowerCase();
    // 키워드 → 영문 약어
    const KEYWORDS = [
        // 하네스/리드줄/목줄
        [/하네스/g, "harness"],
        [/리드줄|leash/gi, "leash"],
        [/목줄|collar/gi, "collar"],
        // 의류
        [/자켓|재킷|jacket/gi, "jacket"],
        [/베스트|vest/gi, "vest"],
        [/코트|coat/gi, "coat"],
        [/판초/g, "poncho"],
        [/슈트/g, "suit"],
        [/조끼/g, "vest"],
        // 사료/간식
        [/건사료|키블/g, "kibble"],
        [/습식사료|습식/g, "wet"],
        [/덴탈/g, "dental"],
        [/간식/g, "treat"],
        [/트릿/g, "treat"],
        // 식기/생활
        [/식기|보울|밥그릇/g, "bowl"],
        [/방석|침대|매트/g, "bed"],
        [/캐리어|백팩|배낭/g, "bag"],
        // 케어
        [/샴푸|목욕/g, "shampoo"],
        [/미스트|향수/g, "mist"],
        [/크림/g, "cream"],
        [/발/g, "paw"],
        // 장난감
        [/원반|디스크/g, "disc"],
        [/터그/g, "tug"],
        [/장난감|토이/g, "toy"],
        // 안전
        [/고글/g, "goggles"],
        [/구명/g, "lifejacket"],
        [/라이트|반사/g, "light"],
        // 크기·수량
        [/대형|large|l\b/gi, "l"],
        [/중형|medium|m\b/gi, "m"],
        [/소형|small|s\b/gi, "s"],
    ];
    const parts = [];
    for (const [pat, en] of KEYWORDS) {
        if (pat.test(name)) parts.push(en);
        pat.lastIndex = 0;
    }
    // 중복 제거 + 최대 3개
    const unique = [...new Set(parts)].slice(0, 3);
    return prefix + (unique.join("_") || "item_" + c.no);
}

// 출력
console.log("┌─────┬─────────────────────────────────────────────────────────┬──────────────────────────────┐");
console.log("│ no  │ 상품명                                                  │ folder_name 안              │");
console.log("├─────┼─────────────────────────────────────────────────────────┼──────────────────────────────┤");
missingInExcel.forEach((c) => {
    const fn = suggestFolderName(c);
    const noStr = String(c.no).padEnd(3);
    const nameStr = c.name.length > 55 ? c.name.slice(0, 52) + "..." : c.name.padEnd(55);
    const fnStr = fn.padEnd(28);
    console.log(`│ ${noStr} │ ${nameStr} │ ${fnStr} │`);
});
console.log("└─────┴─────────────────────────────────────────────────────────┴──────────────────────────────┘");
