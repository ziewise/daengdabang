import { CATALOG, applySort, searchCatalog, type CatalogProduct } from "@/lib/catalog";
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

function unique(products: CatalogProduct[]) {
    const seen = new Set<string>();
    return products.filter((product) => {
        if (seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
    });
}

function apiBase() {
    const envBase = process.env.NEXT_PUBLIC_DDB_API_BASE || "";
    if (typeof window === "undefined") return envBase;
    return window.localStorage.getItem("ddb.apiBase") || envBase;
}

function productFromApi(item: { id?: string; folder?: string; no?: number; name?: string }) {
    return CATALOG.find((product) =>
        product.id === item.id ||
        product.folder === item.folder ||
        product.no === item.no ||
        product.name === item.name
    );
}

function sizeLabel(size: PetProfile["size"]) {
    if (size === "small") return "소형";
    if (size === "large") return "대형";
    return "중형";
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
    if (!base || !imageFile) return analyzePetLens(input);

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
            lastAnalyzedAt: new Date().toISOString(),
        };
        const summary = [
            data.breed ? `사진 분석 결과 ${data.breed} 계열로 추정했습니다.` : `${profile.name}의 사진을 분석했습니다.`,
            data.summary || "LLaMA 하이브리드 해석을 바탕으로 추천을 구성했습니다.",
            `해석 엔진: ${data.interpreter || "fallback"}${data.interpreter_model ? ` · ${data.interpreter_model}` : ""}`,
        ];
        return { profile, products: recommendForPet(profile), summary };
    } catch {
        return analyzePetLens(input);
    }
}

export function answerShopQuestion(message: string) {
    const text = message.trim();
    const lower = text.toLowerCase();
    let products: CatalogProduct[] = [];
    let answer = "댕다방 LLM이 현재 등록된 333개 상품 기준으로 답변드릴게요.";

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

    return { answer, products: unique(products).slice(0, 6) };
}

export async function answerShopQuestionSmart(message: string) {
    const fallback = answerShopQuestion(message);
    const base = apiBase();
    if (!base) return fallback;

    try {
        const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/shop-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, limit: 6 }),
        });
        if (!response.ok) throw new Error(`shop-chat ${response.status}`);
        const data = await response.json();
        const apiProducts = Array.isArray(data.products)
            ? data.products.map(productFromApi).filter(Boolean) as CatalogProduct[]
            : [];
        return {
            answer: typeof data.answer === "string" && data.answer.trim() ? data.answer : fallback.answer,
            products: apiProducts.length ? unique(apiProducts).slice(0, 6) : fallback.products,
        };
    } catch {
        return fallback;
    }
}
