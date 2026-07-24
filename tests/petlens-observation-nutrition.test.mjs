import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";


async function source(path) {
    return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}


let observationModulePromise;

async function observationModule() {
    if (!observationModulePromise) {
        observationModulePromise = source("lib/petlens-observation.ts").then(async (typescriptSource) => {
            const runnableSource = typescriptSource.replace(
                /^import \{ ddbApiBase, getCustomerToken \} from "@\/lib\/customer-api";\r?\n/u,
                'const ddbApiBase = () => ""; const getCustomerToken = () => "";',
            );
            const javascript = ts.transpileModule(runnableSource, {
                compilerOptions: {
                    module: ts.ModuleKind.ESNext,
                    target: ts.ScriptTarget.ES2022,
                },
            }).outputText;
            return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
        });
    }
    return observationModulePromise;
}


function validPayload() {
    return {
        status: "ready",
        duration_seconds: 6,
        summary: "평소와 비교해 관찰해 주세요.",
        media_retention: "not_stored",
        quality: {
            level: "good",
            dog_visible: true,
            audio_available: true,
            bark_detected: true,
            issues: [],
        },
        observations: [
            {
                modality: "vocalization",
                description: "짧은 낑낑거림이 들립니다.",
                time_seconds: 2.1,
                confidence: "high",
            },
            {
                modality: "posture",
                description: "몸을 낮추고 주변을 살핍니다.",
                time_seconds: 3.2,
                confidence: "high",
            },
            {
                modality: "movement",
                description: "현관 쪽으로 이동합니다.",
                time_seconds: 4.1,
                confidence: "medium",
            },
        ],
        bark_context_candidates: [
            {
                label: "경계 가능성",
                confidence: "high",
                confidence_score: 0.95,
                timeline: [
                    { time_seconds: 0.8, confidence_score: 0.41 },
                    { time_seconds: 2.1, confidence_score: 0.95 },
                ],
                evidence: [0, 1],
            },
            { label: "범위 초과", confidence: "high", confidence_score: 0.96, evidence: [0, 1] },
        ],
        behavior_candidates: [
            {
                label: "주변 경계",
                confidence: "high",
                confidence_score: 0.95,
                timeline: [
                    { time_seconds: 4.2, confidence_score: 0.72 },
                    { time_seconds: 1.2, confidence_score: 0.45 },
                    { time_seconds: 4.2, confidence_score: 0.95 },
                    { time_seconds: 7, confidence_score: 0.9 },
                    { time_seconds: 5, confidence_score: 0.96 },
                ],
                evidence: [1, 2],
            },
            { label: "범위 초과", confidence: "high", confidence_score: 0.96, evidence: [1, 2] },
        ],
        health_candidates: [
            {
                label: "호흡 관찰",
                confidence: "medium",
                confidence_score: 0.79,
                timeline: [{ time_seconds: 2.1, confidence_score: 0.79 }],
                evidence: [0],
            },
            { label: "활동 변화", confidence: "low", confidence_score: 0.49, evidence: [0] },
            { label: "건강 고신뢰 금지", confidence: "high", confidence_score: 0.79, evidence: [0] },
            { label: "건강 범위 초과", confidence: "medium", confidence_score: 0.8, evidence: [0] },
        ],
        symptom_signals: [
            {
                label: "먼저 확인",
                confidence: "medium",
                confidence_score: 0.79,
                timeline: [{ time_seconds: 2.1, confidence_score: 0.79 }],
                evidence: [0],
                action: "observe",
            },
            { label: "함께 확인", confidence: "medium", confidence_score: 0.52, evidence: [0], action: "observe" },
            { label: "증상 고신뢰 금지", confidence: "high", confidence_score: 0.79, evidence: [0], action: "observe" },
            { label: "증상 범위 초과", confidence: "medium", confidence_score: 0.8, evidence: [0], action: "observe" },
        ],
        urgency: {
            level: "observe",
            headline: "평소와 비교해 주세요.",
            reasons: [],
            actions: ["물을 마시는지 함께 확인해 주세요."],
        },
        nutrition_recommendations: [{
            focus: "hydration_support",
            life_stage: "adult",
            headline: "평소 수분 섭취와 함께 비교해 보세요",
            reason: "등록 연령과 촬영 상황을 바탕으로 수분을 포함한 주식 후보를 비교합니다.",
            evidence: [0],
            profile_basis: ["age", "situation"],
            catalog_query: "강아지 습식 주식",
            requires_guardian_confirmation: true,
            is_treatment: false,
        }],
        follow_up_questions: [],
        retake_guidance: [],
        limitations: [],
    };
}


test("the parser accepts high behavior and sound scores but caps health and symptom inference at medium 0.79", async () => {
    const { parsePetObservationResult } = await observationModule();
    const result = parsePetObservationResult(validPayload());

    assert.deepEqual(
        result.barkContextCandidates.map(({ label, confidenceScore }) => [label, confidenceScore]),
        [
            ["경계 가능성", 0.95],
        ],
    );
    assert.deepEqual(
        result.behaviorCandidates.map(({ label, confidenceScore }) => [label, confidenceScore]),
        [
            ["주변 경계", 0.95],
        ],
    );
    assert.equal(result.durationSeconds, 6);
    assert.deepEqual(result.behaviorCandidates[0].timeline, [
        { timeSeconds: 1.2, confidenceScore: 0.45 },
        { timeSeconds: 4.2, confidenceScore: 0.95 },
    ]);
    assert.deepEqual(result.barkContextCandidates[0].timeline, [
        { timeSeconds: 0.8, confidenceScore: 0.41 },
        { timeSeconds: 2.1, confidenceScore: 0.95 },
    ]);
    assert.ok(result.barkContextCandidates.every((candidate) =>
        candidate.confidenceScore === undefined || candidate.confidenceScore <= 0.95));
    assert.ok(result.behaviorCandidates.every((candidate) =>
        candidate.confidenceScore === undefined || candidate.confidenceScore <= 0.95));
    assert.deepEqual(
        result.healthCandidates.map(({ label, confidence, confidenceScore }) => [label, confidence, confidenceScore]),
        [
            ["호흡 관찰", "medium", 0.79],
            ["활동 변화", "low", 0.49],
        ],
    );
    assert.deepEqual(
        result.symptomSignals.map(({ label, confidence, confidenceScore }) => [label, confidence, confidenceScore]),
        [
            ["먼저 확인", "medium", 0.79],
            ["함께 확인", "medium", 0.52],
        ],
    );
});


test("the parser hides a timeline whose peak disagrees with the aggregate score", async () => {
    const { parsePetObservationResult } = await observationModule();
    const payload = validPayload();
    payload.behavior_candidates[0].timeline = [
        { time_seconds: 1.2, confidence_score: 0.3 },
        { time_seconds: 4.2, confidence_score: 0.6 },
    ];

    const result = parsePetObservationResult(payload);

    assert.equal(result.behaviorCandidates[0].confidenceScore, 0.95);
    assert.deepEqual(result.behaviorCandidates[0].timeline, []);
});


test("the parser rejects English and mixed-language customer copy while preserving safe Korean fallbacks", async () => {
    const { parsePetObservationResult } = await observationModule();
    const payload = validPayload();
    payload.summary = "Calm behavior를 보여요.";
    payload.observations[0].description = "Whining sound is present.";
    payload.behavior_candidates[0].label = "Alert 행동";
    payload.urgency.headline = "Observe 상태입니다.";
    payload.urgency.reasons = ["No emergency signal.", "평소와 비교해 주세요."];
    payload.urgency.actions = ["Keep watching.", "물을 마시는지 확인해 주세요."];
    payload.follow_up_questions = ["Did this happen before?", "평소에도 같은 행동을 하나요?"];

    const result = parsePetObservationResult(payload);

    assert.equal(result.summary, "짧은 영상만으로 원인이나 질환을 확정할 수는 없어요.");
    assert.equal(result.observations[0].description, "이 시점에서 관찰 신호가 포착됐어요.");
    assert.deepEqual(result.behaviorCandidates, []);
    assert.equal(result.urgency.headline, "평소와 비교하며 관찰해 주세요");
    assert.deepEqual(result.urgency.reasons, ["평소와 비교해 주세요."]);
    assert.deepEqual(result.urgency.actions, ["물을 마시는지 확인해 주세요."]);
    assert.deepEqual(result.followUpQuestions, ["평소에도 같은 행동을 하나요?"]);
});


test("the parser requires sound evidence and caps vocalization-only context below high", async () => {
    const { parsePetObservationResult } = await observationModule();
    const payload = validPayload();
    payload.bark_context_candidates = [
        { label: "발성 단독 후보", confidence: "medium", confidence_score: 0.79, evidence: [0] },
        { label: "발성 단독 초과", confidence: "medium", confidence_score: 0.8, evidence: [0] },
        { label: "발성 근거 없음", confidence: "medium", confidence_score: 0.7, evidence: [1, 2] },
    ];

    const result = parsePetObservationResult(payload);

    assert.deepEqual(
        result.barkContextCandidates.map(({ label, confidenceScore }) => [label, confidenceScore]),
        [
            ["발성 단독 후보", 0.79],
        ],
    );
});


test("high candidates require two relevant pet modalities, excluding quality and environment sound", async () => {
    const { parsePetObservationResult } = await observationModule();
    const payload = validPayload();
    payload.observations.push(
        {
            modality: "quality",
            description: "촬영 구도가 흔들립니다.",
            time_seconds: 5.1,
            confidence: "medium",
        },
        {
            modality: "environment_sound",
            description: "초인종 소리가 함께 들립니다.",
            time_seconds: 5.4,
            confidence: "medium",
        },
    );
    payload.behavior_candidates = [
        { label: "품질 근거 우회", confidence: "high", confidence_score: 0.89, evidence: [1, 3] },
    ];
    payload.bark_context_candidates = [
        { label: "배경음 근거 우회", confidence: "high", confidence_score: 0.89, evidence: [0, 4] },
    ];

    const result = parsePetObservationResult(payload);

    assert.deepEqual(result.behaviorCandidates, []);
    assert.deepEqual(result.barkContextCandidates, []);
});


test("profile-based nutrition is exposed only for ready, good, routine-observation results", async () => {
    const { parsePetObservationResult } = await observationModule();
    const eligible = parsePetObservationResult(validPayload());

    assert.equal(eligible.status, "ready");
    assert.equal(eligible.quality.level, "good");
    assert.equal(eligible.urgency.level, "observe");
    assert.equal(eligible.nutritionRecommendations.length, 1);
    assert.equal(eligible.nutritionRecommendations[0].lifeStage, "adult");
    assert.deepEqual(eligible.nutritionRecommendations[0].profileBasis, ["age", "situation"]);
    assert.equal(eligible.nutritionRecommendations[0].requiresGuardianConfirmation, true);
    assert.equal(eligible.nutritionRecommendations[0].isTreatment, false);

    const unsafeProfile = validPayload();
    unsafeProfile.nutrition_recommendations[0].profile_basis = [];
    assert.deepEqual(parsePetObservationResult(unsafeProfile).nutritionRecommendations, []);

    const unsafeClaim = validPayload();
    unsafeClaim.nutrition_recommendations[0].reason = "질환 개선 확률 80%";
    assert.deepEqual(parsePetObservationResult(unsafeClaim).nutritionRecommendations, []);

    const missingLifeStage = validPayload();
    delete missingLifeStage.nutrition_recommendations[0].life_stage;
    assert.deepEqual(parsePetObservationResult(missingLifeStage).nutritionRecommendations, []);

    const mismatchedLifeStage = validPayload();
    mismatchedLifeStage.nutrition_recommendations[0].life_stage = "senior";
    assert.deepEqual(parsePetObservationResult(mismatchedLifeStage).nutritionRecommendations, []);

    const senior = validPayload();
    senior.nutrition_recommendations[0].focus = "senior_support";
    senior.nutrition_recommendations[0].life_stage = "senior";
    assert.equal(parsePetObservationResult(senior).nutritionRecommendations[0].lifeStage, "senior");

    const puppy = validPayload();
    puppy.nutrition_recommendations[0].life_stage = "puppy";
    assert.deepEqual(parsePetObservationResult(puppy).nutritionRecommendations, []);

    for (const variant of ["emergency", "same_day", "limited", "no_dog"]) {
        const payload = validPayload();
        if (variant === "emergency" || variant === "same_day") {
            payload.urgency.level = variant;
        } else if (variant === "limited") {
            payload.quality.level = "limited";
        } else {
            payload.quality.dog_visible = false;
        }
        const parsed = parsePetObservationResult(payload);
        assert.deepEqual(parsed.nutritionRecommendations, [], `${variant} must not show nutrition sales`);
    }
});


test("nutrition UI repeats the parser safety gate and only links to curated internal product pages", async () => {
    const [component, curation] = await Promise.all([
        source("components/petlens/PetObservationNutritionRecommendations.tsx"),
        source("lib/petlens-observation-nutrition.ts"),
    ]);

    assert.match(component, /result\.status !== "ready"/);
    assert.match(component, /result\.quality\.level !== "good"/);
    assert.match(component, /result\.urgency\.level !== "observe"/);
    assert.match(component, /result\.nutritionRecommendations\.length === 0/);
    assert.match(component, /data-daenglab-nutrition-recommendations/);
    assert.match(component, /recommendation\.profileBasis\.map/);
    assert.match(component, /petObservationNutritionProducts\(\s*recommendation\.focus,\s*recommendation\.lifeStage,/s);
    assert.match(component, /href=\{petObservationNutritionProductHref\(product\)\}/);
    assert.match(curation, /adult:\s*\{\s*balanced_meal:/s);
    assert.match(curation, /senior:\s*\{\s*senior_support:/s);
    assert.doesNotMatch(curation, /weight_management:\s*\[PRODUCTS\.senior/);
    assert.match(curation, /return `\/product\/\$\{encodeURIComponent\(product\.folder\)\}`/);
    assert.doesNotMatch(curation, /https?:\/\//);
});


test("capture consent copy separates inference from profile-based nutrition comparison", async () => {
    const experience = await source("components/petlens/PetLensObservationExperience.tsx");

    assert.match(experience, /영상 추론 결과는 제품 추천에 직접 자동 반영되지 않습니다/);
    assert.match(experience, /등록 프로필과 보호자가 선택한 활동 맥락을 기준으로만 제공됩니다/);
    assert.doesNotMatch(experience, /상품 추천에는 자동 사용하지 않습니다/);
});


test("every curated nutrition product matches the canonical catalog name, price, and image", async () => {
    const [curationSource, catalogSource] = await Promise.all([
        source("lib/petlens-observation-nutrition.ts"),
        source("lib/catalog/raw.json"),
    ]);
    const catalog = JSON.parse(catalogSource);
    const curatedProducts = [...curationSource.matchAll(
        /^\s{4}\w+: \{\r?\n\s+folder: "([^"]+)",\r?\n\s+name: "([^"]+)",\r?\n\s+price: ([\d_]+),\r?\n\s+image: "([^"]+)"/gmu,
    )].map((match) => ({
        folder: match[1],
        name: match[2],
        price: Number(match[3].replaceAll("_", "")),
        image: match[4],
    }));

    assert.ok(curatedProducts.length > 0, "at least one curated nutrition product is required");
    for (const curated of curatedProducts) {
        const canonical = catalog.find((product) => product.folder === curated.folder);
        assert.ok(canonical, `${curated.folder} must exist in lib/catalog/raw.json`);
        assert.equal(curated.name, canonical.name, `${curated.folder} name must match the catalog`);
        assert.equal(curated.price, canonical.priceNum, `${curated.folder} price must match the catalog`);
        assert.equal(curated.image, canonical.image, `${curated.folder} image must match the catalog`);
    }
});
