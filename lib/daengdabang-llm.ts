import { CATALOG, applySort, searchCatalog, type CatalogProduct } from "@/lib/catalog";
import { ddbApiBase } from "@/lib/customer-api";
import type { PetProfile } from "@/lib/store";

type PetLensInput = {
    name: string;
    size: PetProfile["size"];
    age: string;
    coat: PetProfile["coat"];
    activity: PetProfile["activity"];
    concerns: string[];
    imageName?: string;
    photoDataUrl?: string;
};

type ShopQuestionContext = {
    pet?: Pick<PetProfile, "name" | "size" | "coat" | "activity" | "concerns"> | null;
};

export type ShopChatSource = {
    name: string;
    url: string;
};

export type ShopChatMedical = {
    mode?: boolean;
    triage?: string;
    topic?: string;
    topicLabel?: string;
    followUpQuestions?: string[];
    followUpSlots?: Array<{ key: string; label: string; prompt: string; required?: boolean }>;
    redFlags?: string[];
    firstSteps?: string[];
    knowledgeLevel?: string;
    disclaimer?: string;
};

export type ShopChatAnswer = {
    answer: string;
    products: CatalogProduct[];
    medical?: ShopChatMedical;
    sources?: ShopChatSource[];
};

const HEALTH_SOURCE_FALLBACK: ShopChatSource[] = [
    { name: "AVMA pet first aid", url: "https://www.avma.org/resources-tools/pet-owners/emergencycare/first-aid-tips-pet-owners" },
    { name: "Merck Veterinary Manual pet emergencies", url: "https://www.merckvetmanual.com/special-pet-topics/emergencies/what-to-do-in-a-dog-or-cat-emergency" },
];

function unique(products: CatalogProduct[]) {
    const seen = new Set<string>();
    return products.filter((product) => {
        if (seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
    });
}

function apiBase() {
    return ddbApiBase();
}

function productFromApi(item: { id?: string; folder?: string; no?: number; name?: string }) {
    return CATALOG.find((product) =>
        product.id === item.id ||
        product.folder === item.folder ||
        product.no === item.no ||
        product.name === item.name
    );
}

function petContextText(context?: ShopQuestionContext) {
    const pet = context?.pet;
    if (!pet) return "";
    const size = sizeLabel(pet.size);
    const activity = pet.activity === "high" ? "활동량 높음" : pet.activity === "low" ? "활동량 낮음" : "활동량 보통";
    const coat = pet.coat === "long" ? "장모" : pet.coat === "short" ? "단모" : "보통 모질";
    const concerns = pet.concerns?.length ? pet.concerns.join(", ") : "특이사항 없음";
    return `반려견 프로필: 이름 ${pet.name || "우리 아이"}, 크기 ${size}, 모질 ${coat}, ${activity}, 관심사 ${concerns}`;
}

function sizeLabel(size: PetProfile["size"]) {
    if (size === "small") return "소형";
    if (size === "large") return "대형";
    return "중형";
}

function medicalSafetyFallback(message: string): ShopChatAnswer | null {
    const text = message.toLowerCase();
    const medical = /(아파|아프|아픈|아픔|아픈가|아픈지|아픈\s*것|이상해|이상한|이상\s*증상|기운|무기력|밥을\s*안|안\s*먹|못\s*먹|다쳤|다쳐|상처|절룩|낑낑|깨갱|토해|토했|변이|구토|설사|경련|발작|호흡|숨|기침|열|통증|피|혈변|중독|초콜릿|자일리톨|포도|건포도|약|용량|처방|질병|질환|진단|치료|수술|알러지|알레르기|vomit|diarrhea|seizure|breath|pain|poison|xylitol|grape|medicine|dose)/i.test(text);
    if (!medical) return null;
    const emergency = /(호흡|숨|잇몸.*파|쓰러|의식|발작|경련|중독|자일리톨|초콜릿|포도|건포도|출혈|피가.*멈추|골절|열사병|breath|collapse|seizure|poison|xylitol|grape|bloat)/i.test(text);
    if (emergency) {
        return {
            answer: "응급 가능성이 있습니다. 상품 추천보다 먼저 가까운 동물병원 또는 24시 응급병원에 즉시 연락하세요. 증상 시작 시간, 먹은 것, 복용한 약, 사진/영상을 준비해 병원에 전달하는 것이 좋습니다.",
            products: [],
            medical: {
                mode: true,
                triage: "emergency",
                followUpQuestions: ["지금 이동 가능한 24시 병원이 있나요?", "언제부터 증상이 시작됐나요?", "먹은 물질이나 사고 가능성이 있나요?"],
                followUpSlots: [
                    { key: "nearest_er", label: "응급 병원", prompt: "지금 이동 가능한 24시 병원이 있나요?", required: true },
                    { key: "duration", label: "기간", prompt: "언제부터 증상이 시작됐나요?", required: true },
                    { key: "core_symptoms", label: "핵심 증상", prompt: "호흡, 의식, 발작, 구토, 통증 중 무엇이 있나요?", required: true },
                ],
                disclaimer: "general information only; contact a veterinarian for diagnosis or treatment",
            },
            sources: HEALTH_SOURCE_FALLBACK,
        };
    }
    return {
        answer: "걱정되시겠어요. 지금은 상품 추천보다 증상 확인이 먼저입니다. 언제부터 아픈지, 구토/설사 여부, 호흡 상태, 식욕과 물 섭취, 기력 변화, 통증을 보이는 부위, 최근 먹은 것이나 삼킨 물건이 있는지 확인해 주세요. 호흡이 힘들거나 의식이 처지고, 반복 발작·중독 의심·피가 섞인 구토/설사·심한 통증·걷지 못함이 있으면 바로 동물병원 또는 24시 응급병원에 연락해야 합니다. 증상이 가볍더라도 계속되거나 악화되면 수의사 진료가 우선입니다.",
        products: [],
        medical: {
            mode: true,
            triage: "general_health",
            followUpQuestions: ["언제부터 어떤 모습이 달라졌나요?", "구토, 설사, 기침, 통증, 무기력, 식욕 변화 중 무엇이 있나요?", "나이, 체중, 기존 질환이나 복용약이 있나요?"],
            followUpSlots: [
                { key: "age", label: "나이", prompt: "나이 또는 개월 수가 어떻게 되나요?", required: true },
                { key: "weight", label: "체중", prompt: "대략 체중이 몇 kg인가요?", required: true },
                { key: "duration", label: "기간", prompt: "언제부터, 얼마나 자주 보이나요?", required: true },
                { key: "core_symptoms", label: "핵심 증상", prompt: "구토, 설사, 기침, 통증, 무기력, 식욕 변화 중 무엇이 있나요?", required: true },
            ],
            disclaimer: "general information only; contact a veterinarian for diagnosis or treatment",
        },
        sources: HEALTH_SOURCE_FALLBACK,
    };
}

export function recommendForPet(profile: Pick<PetProfile, "size" | "coat" | "activity" | "concerns">) {
    const products: CatalogProduct[] = [];
    const concerns = profile.concerns.join(" ");

    if (profile.activity === "high") products.push(...CATALOG.filter((p) => p.category === "outdoor"));
    if (profile.activity === "low") products.push(...CATALOG.filter((p) => p.category === "life"));
    if (profile.coat === "long") products.push(...CATALOG.filter((p) => p.category === "care"));
    if (/눈|고글|자외선|보호/.test(concerns)) products.push(...CATALOG.filter((p) => p.subcategory === "goggles"));
    if (/피부|발바닥|털|목욕|케어/.test(concerns)) products.push(...CATALOG.filter((p) => p.category === "care"));
    if (/체중|식단|알러지|간식|사료/.test(concerns)) products.push(...CATALOG.filter((p) => p.category === "food"));
    if (/놀이|분리불안|에너지/.test(concerns)) products.push(...CATALOG.filter((p) => p.category === "toy"));
    if (profile.size === "small") products.push(...searchCatalog("소형"));
    if (profile.size === "large") products.push(...searchCatalog("대형"));

    products.push(...applySort(CATALOG, "popular").slice(0, 24));
    return unique(products).slice(0, 8);
}

export function analyzePetLens(input: PetLensInput) {
    const concerns = input.concerns.length ? input.concerns : ["일상 케어"];
    const profile: PetProfile = {
        name: input.name || "우리 아이",
        size: input.size,
        age: input.age || "성견",
        coat: input.coat,
        activity: input.activity,
        concerns,
        photoDataUrl: input.photoDataUrl,
        lastAnalyzedAt: new Date().toISOString(),
    };
    const products = recommendForPet(profile);
    const summary = [
        `${profile.name}은 ${sizeLabel(profile.size)}견 기준으로 추천을 구성했습니다.`,
        profile.activity === "high"
            ? "활동량이 높아 산책/아웃도어 제품과 안전 장비를 먼저 확인하는 편이 좋습니다."
            : "일상 케어와 편안한 사용감을 우선으로 추천했습니다.",
        `관심 포인트: ${concerns.join(", ")}`,
    ];

    if (input.imageName) summary.push(`업로드 이미지(${input.imageName})는 프로필 기록과 추천 문맥으로 사용했습니다.`);

    return { profile, products, summary };
}

export async function analyzePetLensSmart(input: PetLensInput, imageFile?: File | null) {
    const base = apiBase();
    if (!base) throw new Error("PetLens API is not configured.");
    if (!imageFile) throw new Error("PetLens requires a dog photo.");

    try {
        const form = new FormData();
        form.append("file", imageFile);
        const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/analyze-pet`, {
            method: "POST",
            body: form,
        });
        if (!response.ok) throw new Error(`PetLens API ${response.status}`);
        const data = await response.json();
        const apiConcerns = Array.isArray(data.concerns) && data.concerns.length ? data.concerns : input.concerns;
        const apiCoat = ["short", "medium", "long"].includes(data.coat) ? data.coat : input.coat;
        const profile: PetProfile = {
            name: input.name || "우리 아이",
            size: input.size,
            age: input.age || "성견",
            coat: apiCoat,
            activity: input.activity,
            concerns: apiConcerns,
            photoDataUrl: input.photoDataUrl,
            rawAnalysis: data,
            lastAnalyzedAt: new Date().toISOString(),
        };
        const summary = [
            data.breed ? `사진 분석 결과 ${data.breed} 계열로 추정했습니다.` : `${profile.name}의 사진을 분석했습니다.`,
            data.summary || "사진 기반 해석을 바탕으로 추천을 구성했습니다.",
            `해석 엔진: ${data.interpreter || "fallback"}${data.interpreter_model ? ` · ${data.interpreter_model}` : ""}`,
        ];
        if (data.size_estimate && data.size_estimate !== "unknown") summary.push(`AI size estimate: ${data.size_estimate}`);
        if (Array.isArray(data.care_notes)) summary.push(...data.care_notes.slice(0, 3));
        if (Array.isArray(data.risk_flags) && data.risk_flags.length) summary.push(`Caution: ${data.risk_flags.slice(0, 3).join(", ")}`);
        if (data.image_stored) summary.push(`Photo stored: ${data.image_storage_key || "ok"}`);
        return { profile, products: recommendForPet(profile), summary };
    } catch (error) {
        throw error instanceof Error ? error : new Error("PetLens API analysis failed.");
    }
}

export function answerShopQuestion(message: string, context?: ShopQuestionContext): ShopChatAnswer {
    const text = message.trim();
    const lower = text.toLowerCase();
    let products: CatalogProduct[] = [];
    let answer = "댕다방 케어톡이 현재 등록된 333개 상품 기준으로 답변드릴게요.";
    const petContext = petContextText(context);

    if (!text) return { answer: "궁금한 점을 입력해 주세요.", products: [] };

    if (/하네스|목줄|리드|산책|외출|아웃도어|야간/.test(text)) {
        products = CATALOG.filter((p) => p.category === "outdoor");
        answer = "산책용품은 착용감, 조절 범위, 야간 안전성, 세탁 편의성을 함께 보면 좋습니다. 아래 상품부터 비교해 보세요.";
    } else if (/간식|사료|먹|푸드|트릿|영양|알러지|체중/.test(text)) {
        products = CATALOG.filter((p) => p.category === "food");
        answer = "먹거리는 알러지, 급여량, 기존 식단과의 충돌 여부를 먼저 확인해 주세요. 질환이나 처방식이 필요한 경우에는 수의사 상담이 우선입니다.";
    } else if (/장난감|노즈|터그|공|놀이|분리불안/.test(text)) {
        products = CATALOG.filter((p) => p.category === "toy");
        answer = "놀이 제품은 아이가 무는 힘과 삼킴 위험을 기준으로 고르는 것이 중요합니다. 처음에는 보호자가 보는 자리에서 사용해 주세요.";
    } else if (/피부|발|샴푸|케어|위생|배변|냄새|치약|칫솔/.test(text)) {
        products = CATALOG.filter((p) => p.category === "care");
        answer = "케어 제품은 작은 부위 테스트와 사용 빈도가 중요합니다. 상처나 염증이 있으면 제품보다 진료가 먼저입니다.";
    } else if (/배송|교환|반품|주문|결제/.test(text)) {
        return {
            answer: "현재 자사몰 주문 흐름은 데모 결제 상태로 저장됩니다. 실 결제/배송 연동 전까지는 주문 검수와 운영 정책 연결이 필요합니다.",
            products: [],
        };
    } else {
        products = searchCatalog(text);
        if (products.length === 0) {
            products = applySort(CATALOG, "popular").slice(0, 6);
            answer = "정확히 일치하는 상품명은 찾지 못했지만, 인기 상품 기준으로 비교 후보를 골랐습니다.";
        } else {
            answer = `"${text}" 기준으로 관련 상품을 찾았습니다.`;
        }
    }

    if (lower.includes("저렴") || lower.includes("낮은") || lower.includes("가격")) products = applySort(products, "priceAsc");
    else if (lower.includes("리뷰")) products = applySort(products, "reviewDesc");
    else products = applySort(products, "popular");

    if (petContext && products.length > 0) {
        answer = `${context?.pet?.name || "우리 아이"} 프로필까지 함께 보고 추천드리면, ${answer}`;
    }

    return { answer, products: unique(products).slice(0, 6) };
}

export async function answerShopQuestionSmart(message: string, context?: ShopQuestionContext): Promise<ShopChatAnswer> {
    const medicalFallback = medicalSafetyFallback(message);
    const fallback = medicalFallback || answerShopQuestion(message, context);
    const base = apiBase();
    if (!base) return fallback;
    const petContext = petContextText(context);
    const apiMessage = petContext ? `${message}\n\n${petContext}` : message;

    try {
        const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/shop-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: apiMessage, limit: 6, petProfile: context?.pet ?? null }),
        });
        if (!response.ok) throw new Error(`shop-chat ${response.status}`);
        const data = await response.json();
        const apiProducts = Array.isArray(data.products)
            ? data.products.map(productFromApi).filter(Boolean) as CatalogProduct[]
            : [];
        const medicalMode = Boolean(data.medical && typeof data.medical === "object" && data.medical.mode);
        const apiSources = Array.isArray(data.sources)
            ? data.sources
                .filter((source: { name?: unknown; url?: unknown }) => typeof source?.name === "string" && typeof source?.url === "string")
                .map((source: { name: string; url: string }) => ({ name: source.name, url: source.url }))
            : [];
        return {
            answer: typeof data.answer === "string" && data.answer.trim() ? data.answer : fallback.answer,
            products: medicalMode ? unique(apiProducts).slice(0, 6) : (apiProducts.length ? unique(apiProducts).slice(0, 6) : fallback.products),
            medical: medicalMode ? data.medical as ShopChatMedical : fallback.medical,
            sources: apiSources.length ? apiSources : fallback.sources,
        };
    } catch {
        return medicalFallback || fallback;
    }
}
