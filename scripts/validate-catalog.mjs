// scripts/validate-catalog.mjs — 카탈로그 데이터 무결성 검증
// ----------------------------------------------------------------------------
// lib/catalog/raw.json + curations.json 을 Zod 스키마로 검증.
// 잘못된 형식이면 즉시 에러 출력 + 종료 코드 1 → 빌드 중단.
//
// 검증 항목:
//   1. raw.json: 각 행이 CatalogRow 스키마 충족
//   2. curations.json: bestRanks (30개) + newProducts (18개+) 스키마 충족
//   3. 교차 검증: 큐레이션의 모든 no 가 raw catalog 에 실존
//   4. 중복 no 없음 (raw, bestRanks 양쪽)
//   5. bestRanks 의 rank 가 1~30 연속·중복 없음
//
// npm 훅:
//   - prebuild 에 sync-images.mjs 다음 단계로 자동 실행됨
//   - npm run validate-catalog 로 수동 실행 가능
//
// RPA · 다른 개발자에게:
//   curations.json 편집 후 `npm run validate-catalog` 한 번 돌리면 안전 확인.
//   에러 메시지가 "어디가 왜 잘못됐는지" 구체적으로 알려줌.

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const RAW_PATH = path.join(ROOT, "lib", "catalog", "raw.json");
const CURATIONS_PATH = path.join(ROOT, "lib", "catalog", "curations.json");

// ============ 스키마 정의 ============

const CatalogRowSchema = z.object({
    no: z.number().int().positive(),
    brandKo: z.string(),
    brandEn: z.string(),
    target: z.string(),
    useMain: z.string(),
    useSub: z.string(),
    seasonalFlag: z.boolean(),
    season: z.string(),
    isWalk: z.boolean(),
    isFood: z.boolean(),
    isHygiene: z.boolean(),
    name: z.string().min(1, "상품명 비어있음"),
    priceText: z.string(),
    priceNum: z.number().nonnegative(),
    categorizeNote: z.string(),
    sourceUrl: z.string(),
    verifyNote: z.string(),
    // 옵션 — sync-images.mjs 가 채움
    folder: z.string().optional(),
    image: z.string().optional(),
    gallery: z.array(z.string()).optional(),
    details: z.array(z.string()).optional(),
    sizeImage: z.string().optional(),
    video: z.string().optional(),
});

const RawCatalogSchema = z.array(CatalogRowSchema).min(1, "raw catalog 비어있음");

const BestRankSchema = z.object({
    rank: z.number().int().min(1).max(30),
    no: z.number().int().positive(),
    name: z.string().optional(),     // 가독성용 메모 — 검증 없음
});

const NewProductSchema = z.object({
    no: z.number().int().positive(),
    name: z.string().optional(),     // 가독성용 메모
});

const CurationsSchema = z.object({
    bestRanks: z.array(BestRankSchema).length(30, "bestRanks 는 정확히 30개여야 함"),
    newProducts: z.array(NewProductSchema).min(1, "newProducts 최소 1개"),
});

// ============ 검증 실행 ============

let errorCount = 0;
function reportError(label, error) {
    errorCount++;
    console.error(`\n❌ ${label}`);
    if (error.issues) {
        // Zod error
        for (const issue of error.issues) {
            const path = issue.path.length ? issue.path.join(".") : "<root>";
            console.error(`   · [${path}] ${issue.message}`);
        }
    } else {
        console.error(`   ${error.message ?? error}`);
    }
}

// ─── 1. raw.json 파싱·스키마 ───
let raw;
try {
    raw = JSON.parse(readFileSync(RAW_PATH, "utf8"));
} catch (e) {
    reportError(`raw.json JSON 파싱 실패 (${RAW_PATH})`, e);
    process.exit(1);
}

const rawResult = RawCatalogSchema.safeParse(raw);
if (!rawResult.success) {
    reportError(`raw.json 스키마 위반 (${raw.length} 행 중 일부 무효)`, rawResult.error);
}

// ─── 2. curations.json 파싱·스키마 ───
let curations;
try {
    curations = JSON.parse(readFileSync(CURATIONS_PATH, "utf8"));
} catch (e) {
    reportError(`curations.json JSON 파싱 실패 (${CURATIONS_PATH})`, e);
    process.exit(1);
}

const curResult = CurationsSchema.safeParse(curations);
if (!curResult.success) {
    reportError("curations.json 스키마 위반", curResult.error);
}

// 아래 교차 검증은 위 스키마가 통과했을 때만 의미 있음
if (rawResult.success && curResult.success) {
    const rawNoSet = new Set(raw.map((r) => r.no));

    // ─── 3. raw 의 no 중복 검사 ───
    if (rawNoSet.size !== raw.length) {
        const seen = new Set();
        const dups = [];
        for (const r of raw) {
            if (seen.has(r.no)) dups.push(r.no);
            seen.add(r.no);
        }
        reportError(`raw.json 의 no 중복: ${dups.join(", ")}`, { message: "no 는 시스템 ID, 중복 불가" });
    }

    // ─── 4. bestRanks 의 rank 1~30 연속·중복 검사 ───
    const ranks = curations.bestRanks.map((b) => b.rank).sort((a, b) => a - b);
    const expectedRanks = Array.from({ length: 30 }, (_, i) => i + 1);
    if (JSON.stringify(ranks) !== JSON.stringify(expectedRanks)) {
        reportError("bestRanks 의 rank 가 1~30 연속이 아님 (중복·누락)", {
            message: `현재: [${ranks.join(",")}]`,
        });
    }

    // ─── 5. bestRanks 의 no 중복 검사 ───
    const bestNoSet = new Set(curations.bestRanks.map((b) => b.no));
    if (bestNoSet.size !== curations.bestRanks.length) {
        reportError("bestRanks 의 no 중복 — 같은 상품이 여러 위에 못 올라옴", { message: "" });
    }

    // ─── 6. 교차 검증 — 큐레이션의 모든 no 가 raw 에 실존 ───
    const missingBest = curations.bestRanks.filter((b) => !rawNoSet.has(b.no));
    if (missingBest.length) {
        reportError("bestRanks 에 raw catalog 에 없는 no", {
            message: missingBest.map((b) => `rank ${b.rank}: no=${b.no}`).join(", "),
        });
    }

    const missingNew = curations.newProducts.filter((p) => !rawNoSet.has(p.no));
    if (missingNew.length) {
        reportError("newProducts 에 raw catalog 에 없는 no", {
            message: missingNew.map((p) => `no=${p.no}`).join(", "),
        });
    }
}

// ============ 결과 출력 ============

if (errorCount === 0) {
    console.log(
        `✅ catalog 검증 통과 — raw ${raw.length} 행, ` +
        `bestRanks ${curations.bestRanks.length} 개, ` +
        `newProducts ${curations.newProducts.length} 개`
    );
    process.exit(0);
} else {
    console.error(`\n❌ ${errorCount}개 검증 실패. 위 메시지 참고해서 수정 후 다시 시도.`);
    process.exit(1);
}
