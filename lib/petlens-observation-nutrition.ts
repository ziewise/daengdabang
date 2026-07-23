import type {
    PetObservationNutritionFocus,
    PetObservationNutritionLifeStage,
} from "@/lib/petlens-observation";

export type PetObservationNutritionProduct = {
    folder: string;
    name: string;
    price: number;
    image: string;
    comparisonLabel: string;
};

const PRODUCTS = {
    adultDry: {
        folder: "yora_allbreed_2.5kg",
        name: "요라 올브리드 2.5kg 전견종 성견용 (250G X 10개 소포장)",
        price: 56_000,
        image: "/images/products/catalog/yora_allbreed_2.5kg/yora_allbreed_2.5kg.webp",
        comparisonLabel: "성견용 주식 후보",
    },
    adultWet: {
        folder: "nd_feelgood_c",
        name: "네이처다이어트 필 굿 치킨 주식 습식사료 390g",
        price: 60_000,
        image: "/images/products/catalog/nd_feelgood_c/nd_feelgood_c.webp",
        comparisonLabel: "주식 습식 후보",
    },
    hydrationWet: {
        folder: "yora_stew_carrotpotato_390g",
        name: "요라 습식스튜 파테 390g 캐롯 & 포테이토 습식 주식사료",
        price: 9_900,
        image: "/images/products/catalog/yora_stew_carrotpotato_390g/yora_stew_carrotpotato_390g.webp",
        comparisonLabel: "수분 섭취를 고려한 습식 후보",
    },
    seniorDry: {
        folder: "yora_lightsenior_2.5kg",
        name: "요라 라이트 시니어 2.5kg 저칼로리 다이어트",
        price: 60_000,
        image: "/images/products/catalog/yora_lightsenior_2.5kg/yora_lightsenior_2.5kg.webp",
        comparisonLabel: "시니어 주식 후보",
    },
    seniorWet: {
        folder: "nd_feelgood_sl",
        name: "네이처다이어트 필 굿 시니어라이트(터키 앤 치킨) 주식 습식사료 390g",
        price: 60_000,
        image: "/images/products/catalog/nd_feelgood_sl/nd_feelgood_sl.webp",
        comparisonLabel: "시니어 습식 후보",
    },
} satisfies Record<string, PetObservationNutritionProduct>;

const PRODUCT_CURATION: Record<
    PetObservationNutritionLifeStage,
    Partial<Record<PetObservationNutritionFocus, readonly PetObservationNutritionProduct[]>>
> = {
    adult: {
        balanced_meal: [PRODUCTS.adultDry, PRODUCTS.adultWet],
        hydration_support: [PRODUCTS.hydrationWet, PRODUCTS.adultWet],
    },
    senior: {
        senior_support: [PRODUCTS.seniorDry, PRODUCTS.seniorWet],
    },
};

export function petObservationNutritionProducts(
    focus: PetObservationNutritionFocus,
    lifeStage: PetObservationNutritionLifeStage,
): readonly PetObservationNutritionProduct[] {
    return PRODUCT_CURATION[lifeStage][focus] ?? [];
}

export function petObservationNutritionProductHref(product: PetObservationNutritionProduct) {
    return `/product/${encodeURIComponent(product.folder)}`;
}
