import type {
    RecommendationCatalogProduct,
    RecommendationContext,
    RecommendationItem,
    RecommendationPermissions,
    RecommendationProductPolicy,
    RecommendationProfileInput,
    RecommendationReasonCode,
    RecommendationResult,
    RecommendationSignalCode,
    RecommendationSourceGroup,
    RecommendationSurface,
    RunRecommendationOptions,
} from "./types";
import { productPurchaseState } from "../catalog/inventory.ts";

export const RECOMMENDATION_ENGINE_VERSION = "recommendation-v1" as const;

const REVIEWED_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export function hasValidRecommendationReviewTimestamp(value: unknown): value is string {
    if (typeof value !== "string" || !REVIEWED_AT_RE.test(value)) return false;
    return Number.isFinite(Date.parse(value));
}

export function recommendationProductPolicyIssues(
    product: RecommendationProductPolicy,
): Array<"not_recommendable" | "not_available" | "not_reviewed"> {
    const issues: Array<"not_recommendable" | "not_available" | "not_reviewed"> = [];
    if (product.recommendable !== true) issues.push("not_recommendable");
    if (product.availability !== "available" || !productPurchaseState(product).purchasable) issues.push("not_available");
    if (!hasValidRecommendationReviewTimestamp(product.operatorReviewedAt)) issues.push("not_reviewed");
    return issues;
}

export function isRecommendationOperationallyEligible(
    product: RecommendationProductPolicy,
): boolean {
    return recommendationProductPolicyIssues(product).length === 0;
}

export function isLegacyRecommendationOperationallyEligible(
    product: RecommendationProductPolicy,
): boolean {
    return product.recommendable !== false
        && productPurchaseState(product).purchasable
        && product.availability !== "sold_out"
        && product.availability !== "discontinued";
}

export const PROFILE_ONLY_RECOMMENDATION_PERMISSIONS: RecommendationPermissions = {
    recommendationsEnabled: true,
    profileSignalsEnabled: true,
    petLensSignalsEnabled: false,
    behaviorSignalsEnabled: false,
    consentVersion: "profile-purpose-v1",
};

const MAX_HOME_CATEGORY_ITEMS = 4;
const MAX_FULL_CATEGORY_ITEMS = 6;
const MAX_SUBCATEGORY_ITEMS = 2;

type ScoredReason = {
    code: RecommendationReasonCode;
    label: string;
    points: number;
    source: RecommendationSourceGroup;
};

type ScoredProduct = {
    product: RecommendationCatalogProduct;
    score: number;
    reasons: ScoredReason[];
    cautions: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function stringList(value: unknown, limit = 12): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .slice(0, limit)
        .flatMap((item) => typeof item === "string" ? [item.trim().slice(0, 240)] : [])
        .filter(Boolean);
}

function unique<T>(values: T[]): T[] {
    return [...new Set(values)];
}

function normalizePermissions(input?: Partial<RecommendationPermissions>): RecommendationPermissions {
    return {
        ...PROFILE_ONLY_RECOMMENDATION_PERMISSIONS,
        ...input,
        behaviorSignalsEnabled: false,
    };
}

function normalizedLifeStage(profile: RecommendationProfileInput): RecommendationContext["pet"]["lifeStage"] {
    if (profile.lifeStage && profile.lifeStage !== "unknown") return profile.lifeStage;
    const age = (profile.age || "").trim().toLowerCase();
    if (/퍼피|강아지|자견|puppy|개월/.test(age)) return "puppy";
    if (/시니어|노령|노견|senior/.test(age)) return "senior";
    if (/성견|adult/.test(age)) return "adult";
    return "unknown";
}

function profileSignals(profile: RecommendationProfileInput): RecommendationSignalCode[] {
    const signals: RecommendationSignalCode[] = [
        `profile.size.${profile.size}`,
        `profile.activity.${profile.activity}`,
        `profile.coat.${profile.coat}`,
    ];
    const lifeStage = normalizedLifeStage(profile);
    if (lifeStage !== "unknown") signals.push(`profile.life_stage.${lifeStage}`);

    const concerns = profile.concerns.join(" ").toLowerCase();
    if (/산책|안전|하네스|목줄|리드|외출|야간/.test(concerns)) signals.push("interest.walk_safety");
    if (/눈|고글|자외선|아이웨어/.test(concerns)) signals.push("interest.eye_care");
    if (/피모|털|모질|목욕|브러시|빗질|발바닥|케어/.test(concerns)) signals.push("interest.coat_care");
    if (/식단|간식|사료|먹거리|영양/.test(concerns)) signals.push("interest.food");
    if (/놀이|분리불안|에너지|노즈워크|터그/.test(concerns)) signals.push("interest.play");
    if (/배변|봉투|위생|탈취|냄새|패드|세척/.test(concerns)) signals.push("interest.hygiene");
    return unique(signals);
}

function petLensDetails(rawAnalysis: unknown): Record<string, unknown> | null {
    const raw = asRecord(rawAnalysis);
    if (!raw) return null;
    const petLens = asRecord(raw.petLens);
    return asRecord(petLens?.details) || asRecord(raw.details);
}

function petLensInferenceUsable(rawAnalysis: unknown): boolean {
    const raw = asRecord(rawAnalysis);
    if (!raw) return false;
    const details = petLensDetails(rawAnalysis);
    const petLens = asRecord(raw.petLens);
    const canRecommend = details?.canRecommendProducts
        ?? raw.canRecommendProducts
        ?? raw.can_recommend_products
        ?? raw.readyForRecommendation
        ?? raw.ready_for_recommendation
        ?? raw.analysisReady
        ?? raw.analysis_ready;
    if (canRecommend !== true) return false;

    const status = String(details?.status ?? raw.status ?? "").trim().toLowerCase();
    if (status === "retake") return false;
    const quality = String(details?.photoQualityLabel ?? raw.photoQualityLabel ?? raw.photo_quality_label ?? "").trim();
    if (quality === "사진 보완 필요") return false;
    if (petLens && petLens.schemaVersion !== undefined && Number(petLens.schemaVersion) < 1) return false;
    return true;
}

function petLensRecommendationLines(rawAnalysis: unknown): string[] {
    const raw = asRecord(rawAnalysis);
    if (!raw) return [];
    const petLens = asRecord(raw.petLens);
    const details = petLensDetails(rawAnalysis);
    return unique([
        ...stringList(raw.recommendation_signals, 8),
        ...stringList(raw.recommendationSignals, 8),
        ...stringList(petLens?.recommendationSignals, 8),
        ...stringList(details?.recommendationSignals, 8),
    ]);
}

function petLensSignals(rawAnalysis: unknown): RecommendationSignalCode[] {
    if (!petLensInferenceUsable(rawAnalysis)) return [];
    const text = petLensRecommendationLines(rawAnalysis).join(" ").toLowerCase();
    const signals: RecommendationSignalCode[] = [];
    if (/실측|가슴둘레|목둘레|착용|사이즈/.test(text)) signals.push("petlens.fit_measurement_needed");
    if (/야간|시인성|반사|visibility/.test(text)) signals.push("petlens.visibility_care");
    if (/피모|모질|털 관리|브러시|빗질|목욕|털색|오염/.test(text)) signals.push("petlens.coat_care");
    return unique(signals);
}

function urgencyLevel(rawAnalysis: unknown): string {
    const raw = asRecord(rawAnalysis);
    if (!raw) return "";
    const directUrgency = asRecord(raw.urgency);
    const observation = asRecord(raw.petObservation) || asRecord(raw.observation);
    const observationUrgency = asRecord(observation?.urgency);
    return String(
        directUrgency?.level
        ?? observationUrgency?.level
        ?? raw.urgency_level
        ?? raw.urgencyLevel
        ?? "",
    ).trim().toLowerCase();
}

function hasHighPrioritySafetySignal(rawAnalysis: unknown): boolean {
    const raw = asRecord(rawAnalysis);
    if (!raw) return false;
    if (["emergency", "same_day"].includes(urgencyLevel(rawAnalysis))) return true;
    const riskFlags = [
        ...stringList(raw.risk_flags, 8),
        ...stringList(raw.riskFlags, 8),
    ].join(" ").toLowerCase();
    return /\bemergency\b|\bsame_day\b|즉시\s*(?:병원|진료)|오늘\s*(?:병원|진료)|당일\s*(?:확인|진료)/.test(riskFlags);
}

export function normalizeRecommendationContext({
    profile,
    rawAnalysis,
    permissions: permissionOverrides,
    surface = "home",
}: Pick<RunRecommendationOptions, "profile" | "rawAnalysis" | "permissions" | "surface">): RecommendationContext {
    const permissions = normalizePermissions(permissionOverrides);
    const signals: RecommendationSignalCode[] = [];
    if (permissions.recommendationsEnabled && permissions.profileSignalsEnabled) {
        signals.push(...profileSignals(profile));
    }
    if (permissions.recommendationsEnabled && permissions.petLensSignalsEnabled) {
        signals.push(...petLensSignals(rawAnalysis));
    }

    const hasAllergyExclusion = permissions.recommendationsEnabled
        && permissions.profileSignalsEnabled
        && Boolean(profile.allergies?.some((item) => item.trim()));
    const careFirst = permissions.recommendationsEnabled
        && permissions.petLensSignalsEnabled
        && hasHighPrioritySafetySignal(rawAnalysis);
    if (hasAllergyExclusion || careFirst) signals.push("safety.food_suppressed");
    if (careFirst) signals.push("safety.care_first");

    return {
        engineVersion: RECOMMENDATION_ENGINE_VERSION,
        surface: surface || "home",
        pet: {
            profileId: Number.isInteger(profile.apiProfileId) && Number(profile.apiProfileId) > 0
                ? Number(profile.apiProfileId)
                : null,
            size: profile.size,
            lifeStage: normalizedLifeStage(profile),
            coat: profile.coat,
            activity: profile.activity,
            ...(typeof profile.weightKg === "number" && Number.isFinite(profile.weightKg)
                ? { weightKg: profile.weightKg }
                : {}),
            ...(profile.breed?.trim() ? { confirmedBreed: profile.breed.trim().slice(0, 100) } : {}),
        },
        permissions,
        signals: unique(signals),
        exclusions: hasAllergyExclusion ? ["food.unverified_allergen_data"] : [],
        safety: {
            careFirst,
            suppressFood: hasAllergyExclusion || careFirst,
            suppressSupplements: hasAllergyExclusion || careFirst,
        },
    };
}

function productText(product: RecommendationCatalogProduct): string {
    return [
        product.name,
        product.brandKo,
        product.brandEn,
        product.category,
        product.subcategory,
        product.raw?.target,
        product.raw?.useMain,
        product.raw?.useSub,
        product.raw?.categorizeNote,
        product.season,
        ...(product.externalReviewThemes || []),
        ...(product.details || []),
    ].filter(Boolean).join(" ").toLowerCase();
}

function sizeTextMatch(text: string, size: RecommendationProfileInput["size"]): "match" | "mismatch" | "broad" | "unknown" {
    const small = /초소형|소형견|small\s*breed|toy\s*breed|\bxs\b/.test(text);
    const medium = /중형견|medium\s*breed/.test(text);
    const large = /중대형|대형견|large\s*breed|giant\s*breed|\bxl\b|\bxxl\b/.test(text);
    const matches = size === "small" ? small : size === "medium" ? medium : large;
    const conflicts = size === "small" ? large : size === "large" ? small : false;
    if (matches && conflicts) return "broad";
    if (matches) return "match";
    if (conflicts) return "mismatch";
    return "unknown";
}

function isEligibleProduct(product: RecommendationCatalogProduct, context: RecommendationContext): boolean {
    if (!product?.id || !product.name?.trim()) return false;
    if (!isRecommendationOperationallyEligible(product)) return false;
    if (typeof product.price !== "number" || !Number.isFinite(product.price) || product.price < 0) return false;
    if (context.safety.suppressFood && product.category === "food") return false;
    if (context.safety.suppressSupplements && product.subcategory === "supplement") return false;
    return true;
}

function scoreProduct(product: RecommendationCatalogProduct, context: RecommendationContext): ScoredProduct {
    const signalSet = new Set(context.signals);
    const text = productText(product);
    const reasons: ScoredReason[] = [];
    const cautions: string[] = [];
    let score = 0;
    const add = (
        points: number,
        code: RecommendationReasonCode,
        label: string,
        source: RecommendationSourceGroup,
    ) => {
        score += points;
        reasons.push({ code, label, points, source });
    };

    if (signalSet.has("interest.walk_safety") && product.category === "outdoor") {
        add(120, "matches_member_interest", "등록한 산책·안전 관심사와 맞아요.", "profile");
        if (["harness", "leash", "wear", "goggles", "carrier"].includes(product.subcategory)) score += 35;
    }
    if (signalSet.has("interest.eye_care") && product.subcategory === "goggles") {
        add(140, "matches_member_interest", "등록한 눈 보호·아이웨어 관심사와 맞아요.", "profile");
    }
    if (signalSet.has("interest.coat_care") && product.category === "care") {
        add(110, "matches_member_interest", "등록한 피모 관리 관심사와 맞아요.", "profile");
    }
    if (signalSet.has("interest.food") && product.category === "food") {
        add(130, "matches_member_interest", "회원이 선택한 먹거리 관심사를 반영했어요.", "profile");
    }
    if (signalSet.has("interest.play") && product.category === "toy") {
        add(120, "matches_member_interest", "등록한 놀이 관심사와 맞아요.", "profile");
    }
    if (signalSet.has("interest.hygiene") && (product.category === "care" || product.subcategory === "hygiene")) {
        add(115, "matches_member_interest", "등록한 위생 관리 관심사와 맞아요.", "profile");
    }

    if (signalSet.has("profile.activity.high") && (product.category === "outdoor" || product.category === "toy")) {
        add(product.category === "outdoor" ? 38 : 28, "matches_activity", "활동량이 높은 아이의 생활 패턴을 반영했어요.", "profile");
    }
    if (signalSet.has("profile.activity.low") && product.category === "life") {
        add(28, "matches_activity", "차분한 일상과 휴식 중심의 활동량을 반영했어요.", "profile");
    }
    if ((signalSet.has("profile.coat.medium") || signalSet.has("profile.coat.long")) && product.category === "care") {
        add(24, "matches_coat_care", "등록한 모질 길이에 맞춰 관리 용품을 살펴봤어요.", "profile");
    }

    const sizeMatch = sizeTextMatch(text, context.pet.size);
    if (sizeMatch === "match") {
        add(24, "matches_size", "등록한 체급의 상품 대상 표기와 맞아요.", "profile");
    } else if (sizeMatch === "broad") {
        add(6, "matches_size", "여러 체급을 지원하는 상품이에요. 옵션을 확인해 주세요.", "profile");
    } else if (sizeMatch === "mismatch") {
        score -= 45;
    }

    const stage = context.pet.lifeStage;
    if (
        (stage === "puppy" && /퍼피|puppy|자견/.test(text))
        || (stage === "senior" && /시니어|senior|노령|노견/.test(text))
        || (stage === "adult" && /성견|adult/.test(text))
    ) {
        add(26, "matches_life_stage", "등록한 생애단계의 상품 대상 표기와 맞아요.", "profile");
    }

    if (
        signalSet.has("petlens.fit_measurement_needed")
        && (product.category === "outdoor" || ["harness", "wear", "goggles", "carrier"].includes(product.subcategory))
    ) {
        add(30, "matches_petlens_fit_note", "펫렌즈의 착용 전 실측 확인 신호를 반영했어요.", "petlens");
        cautions.push("구매 전 목둘레·가슴둘레와 상품 사이즈표를 확인해 주세요.");
    }
    if (signalSet.has("petlens.visibility_care") && (product.category === "outdoor" || product.subcategory === "goggles")) {
        add(24, "matches_petlens_visibility", "펫렌즈의 야간 시인성 확인 신호를 반영했어요.", "petlens");
    }
    if (signalSet.has("petlens.coat_care") && product.category === "care") {
        add(30, "matches_petlens_coat_care", "펫렌즈의 피모 관리 신호를 반영했어요.", "petlens");
    }

    return { product, score, reasons, cautions: unique(cautions) };
}

function stableScoreSort(left: ScoredProduct, right: ScoredProduct): number {
    if (right.score !== left.score) return right.score - left.score;
    const leftNo = Number.isFinite(left.product.no) ? left.product.no : Number.MAX_SAFE_INTEGER;
    const rightNo = Number.isFinite(right.product.no) ? right.product.no : Number.MAX_SAFE_INTEGER;
    if (leftNo !== rightNo) return leftNo - rightNo;
    return left.product.id.localeCompare(right.product.id);
}

function takeDiversified(
    candidates: ScoredProduct[],
    limit: number,
    surface: RecommendationSurface,
    selected: ScoredProduct[] = [],
): ScoredProduct[] {
    const categoryLimit = surface === "home" ? MAX_HOME_CATEGORY_ITEMS : MAX_FULL_CATEGORY_ITEMS;
    const productIds = new Set(selected.map((item) => item.product.id));
    const categoryCount = new Map<string, number>();
    const subcategoryCount = new Map<string, number>();
    for (const item of selected) {
        categoryCount.set(item.product.category, (categoryCount.get(item.product.category) || 0) + 1);
        subcategoryCount.set(item.product.subcategory, (subcategoryCount.get(item.product.subcategory) || 0) + 1);
    }
    for (const candidate of candidates) {
        if (selected.length >= limit) break;
        if (productIds.has(candidate.product.id)) continue;
        if ((categoryCount.get(candidate.product.category) || 0) >= categoryLimit) continue;
        if ((subcategoryCount.get(candidate.product.subcategory) || 0) >= MAX_SUBCATEGORY_ITEMS) continue;
        selected.push(candidate);
        productIds.add(candidate.product.id);
        categoryCount.set(candidate.product.category, (categoryCount.get(candidate.product.category) || 0) + 1);
        subcategoryCount.set(candidate.product.subcategory, (subcategoryCount.get(candidate.product.subcategory) || 0) + 1);
    }
    return selected;
}

function recommendationItem(candidate: ScoredProduct): RecommendationItem {
    const reasons = [...candidate.reasons].sort((left, right) => right.points - left.points);
    if (reasons.length === 0) {
        return {
            product: candidate.product,
            score: 0,
            reasonCodes: ["editorial_fallback"],
            reasonLabel: "개인화 후보가 부족해 댕다방 편집 추천을 함께 보여드려요.",
            cautionLabels: candidate.cautions,
            sourceGroups: ["editorial"],
        };
    }
    return {
        product: candidate.product,
        score: candidate.score,
        reasonCodes: unique(reasons.map((reason) => reason.code)),
        reasonLabel: reasons[0].label,
        cautionLabels: candidate.cautions,
        sourceGroups: unique(reasons.map((reason) => reason.source)),
    };
}

export function runRecommendation(options: RunRecommendationOptions): RecommendationResult {
    const context = normalizeRecommendationContext(options);
    const requestedLimit = Number.isFinite(options.limit) ? Math.floor(options.limit || 0) : 8;
    const limit = Math.max(1, Math.min(24, requestedLimit || 8));
    if (!context.permissions.recommendationsEnabled) {
        return {
            engineVersion: RECOMMENDATION_ENGINE_VERSION,
            selectedPetProfileId: context.pet.profileId,
            mode: "disabled",
            items: [],
            notices: ["맞춤 추천이 꺼져 있어 개인화 상품을 표시하지 않아요."],
        };
    }

    const eligible = options.products
        .filter((product) => isEligibleProduct(product, context))
        .map((product) => scoreProduct(product, context))
        .sort(stableScoreSort);
    const selected = takeDiversified(eligible.filter((item) => item.score > 0), limit, context.surface);
    takeDiversified(eligible.filter((item) => item.score <= 0), limit, context.surface, selected);
    const items = selected.map(recommendationItem);
    const usesPetLens = items.some((item) => item.sourceGroups.includes("petlens"));
    const hasPersonalizedItem = items.some((item) => !item.sourceGroups.includes("editorial"));
    const notices: string[] = [];
    if (context.safety.careFirst) {
        notices.push("건강 관리 확인이 먼저 필요한 신호가 있어 먹거리·영양제 추천을 제외했어요.");
    } else if (context.safety.suppressFood) {
        notices.push("등록된 알레르기와 대조할 검증 성분 정보가 부족해 먹거리 추천을 제외했어요.");
    }
    if (context.permissions.petLensSignalsEnabled && !petLensInferenceUsable(options.rawAnalysis)) {
        notices.push("펫렌즈 결과가 추천에 사용할 수 있는 상태가 아니라 회원 프로필만 반영했어요.");
    }
    if (items.length === 0) notices.push("현재 안전 기준을 통과한 추천 상품이 없어요.");

    return {
        engineVersion: RECOMMENDATION_ENGINE_VERSION,
        selectedPetProfileId: context.pet.profileId,
        mode: !hasPersonalizedItem
            ? "editorial_fallback"
            : usesPetLens
                ? "personalized"
                : "profile_only",
        items,
        notices,
    };
}

export function recommendProductsForPet(options: RunRecommendationOptions): RecommendationCatalogProduct[] {
    return runRecommendation(options).items.map((item) => item.product);
}
