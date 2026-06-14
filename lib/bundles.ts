import { CATALOG, type CatalogProduct } from "./catalog";

export type BundleMood = "walk" | "night" | "rain" | "snack" | "care" | "play" | "travel" | "summer";

export type Bundle = {
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    mood: BundleMood;
    discountRate: number;
    folders: string[];
    heroLabel: string;
    deliveryNote: string;
    benefits: string[];
};

export type BundleShowroomScene = {
    slug: string;
    title: string;
    dog: string;
    setting: string;
    image: string;
};

export const BUNDLES: Bundle[] = [
    {
        slug: "summer-hydration",
        title: "여름 산책 수분충전 세트",
        subtitle: "정수기, 쿨링웨어, 휴대 식기로 더운 날 산책 준비",
        description: "더운 계절 산책 전에 물, 체온, 휴식까지 한 번에 챙기는 묶음 배송 세트입니다.",
        mood: "summer",
        discountRate: 12,
        folders: ["heyrex_taurus_2l", "heyrex_taurus_filter_5p", "rw_swampcooler_vest", "rw_trailrunnerbowl"],
        heroLabel: "여름 산책 필수",
        deliveryNote: "무거운 정수기와 산책 용품을 한 번에 받아보는 묶음 배송가",
        benefits: ["대용량 수분 보충", "쿨링 산책 준비", "휴대 급수까지 연결"],
    },
    {
        slug: "night-safety",
        title: "밤 산책 안전 세트",
        subtitle: "라이트, 리드줄, 경량 하네스로 어두운 길을 또렷하게",
        description: "야간 산책 때 시야 확보와 위치 확인을 함께 챙길 수 있는 안전 중심 구성입니다.",
        mood: "night",
        discountRate: 10,
        folders: ["rw_beacon_light", "rw_audiblebeacon_light", "rw_leash_crag_23", "rw_hiandlight_harness_26"],
        heroLabel: "밤 산책 준비",
        deliveryNote: "빛 반사와 착용감을 함께 맞춘 야간 묶음 배송가",
        benefits: ["시야 확보", "가벼운 착용감", "리드줄까지 통일"],
    },
    {
        slug: "rain-walk",
        title: "비 오는 날 산책 세트",
        subtitle: "방수 웨어와 안전 라이트로 젖는 날도 가볍게",
        description: "비 예보가 있는 날에도 산책 루틴을 유지할 수 있게 방수와 안전을 함께 묶었습니다.",
        mood: "rain",
        discountRate: 11,
        folders: ["rw_sunshower_jacket", "rw_sunshower_coverall_25fw", "rw_leash_flagline_24", "rw_beacon_light"],
        heroLabel: "비 예보 대응",
        deliveryNote: "우비와 라이트를 함께 받는 장마철 묶음 배송가",
        benefits: ["방수 보호", "젖은 날 시인성", "산책 루틴 유지"],
    },
    {
        slug: "crunch-snack",
        title: "아그작 간식 세트",
        subtitle: "동결건조 트릿과 덴탈 간식으로 씹는 재미를 묶었어요",
        description: "훈련 보상, 산책 후 간식, 치아 관리까지 간식 루틴을 다양하게 구성했습니다.",
        mood: "snack",
        discountRate: 8,
        folders: ["id_treat_chicken", "id_treat_duck", "soopa_dental_appleblueberry", "yora_reward_treat"],
        heroLabel: "간식 루틴",
        deliveryNote: "여러 간식을 한 번에 받아 취향을 찾는 묶음 배송가",
        benefits: ["훈련 보상", "덴탈 케어", "취향 탐색"],
    },
    {
        slug: "paw-care",
        title: "산책 후 발바닥 케어 세트",
        subtitle: "발세정, 발비누, 샴푸, 보습까지 귀가 루틴 완성",
        description: "산책 후 발과 피부를 빠르게 정리하는 케어 루틴을 하나의 묶음으로 만들었습니다.",
        mood: "care",
        discountRate: 13,
        folders: ["fumble_footcleanser_200ml", "fumble_footsoap_calamine_2", "fumble_shampoo_laurel", "perity_aloe_essence"],
        heroLabel: "귀가 후 케어",
        deliveryNote: "소모품을 한 번에 채우는 케어 묶음 배송가",
        benefits: ["발 세정", "피부 진정", "보습 마무리"],
    },
    {
        slug: "brain-play",
        title: "집중력 노즈워크 세트",
        subtitle: "느린 급식과 지능형 장난감으로 에너지 쓰기",
        description: "실내에서도 머리 쓰는 놀이와 식사 속도 조절을 함께 챙기는 구성입니다.",
        mood: "play",
        discountRate: 9,
        folders: ["ip_slowdog", "ip_trovbiz_puppy", "ip_trovbiz_nightday", "ip_trovbiz_adventure"],
        heroLabel: "실내 놀이",
        deliveryNote: "장난감과 급식 보조를 함께 받는 놀이 묶음 배송가",
        benefits: ["분리불안 완화", "천천히 먹기", "실내 에너지 소모"],
    },
    {
        slug: "car-travel",
        title: "차량 이동 안심 세트",
        subtitle: "차량 하네스, 카시트, 캐리어로 이동 스트레스 줄이기",
        description: "병원, 여행, 장거리 이동까지 차량 안에서 안정감을 높이는 구성입니다.",
        mood: "travel",
        discountRate: 14,
        folders: ["rw_loadup_harness_24", "aff_carseat_donutkit_l", "aff_carseat_sugarwing", "rw_hitchhiker_carrier"],
        heroLabel: "이동 준비",
        deliveryNote: "부피 큰 이동 용품을 한 번에 준비하는 묶음 배송가",
        benefits: ["차량 안전", "이동 안정감", "여행 준비"],
    },
    {
        slug: "goggle-outdoor",
        title: "눈 보호 아웃도어 세트",
        subtitle: "고글, 교체 렌즈, 하네스와 리드줄까지 보호 조합",
        description: "햇빛, 먼지, 바람이 강한 날 눈 보호와 산책 장비를 함께 맞추는 세트입니다.",
        mood: "walk",
        discountRate: 10,
        folders: ["rs_v2_black", "rs_lens_v2", "rw_hiandlight_harness_26", "rw_leash_hiandlight_24"],
        heroLabel: "눈 보호",
        deliveryNote: "보호 장비와 산책 장비를 함께 맞추는 묶음 배송가",
        benefits: ["눈 보호", "렌즈 교체", "가벼운 산책 장비"],
    },
];

export function bundleHref(bundle: Bundle) {
    return `/bundle/${bundle.slug}`;
}

export function bundleAssetBase(bundle: Bundle) {
    return `/images/bundles/${bundle.slug}`;
}

export function bundleHoverVideoPath(bundle: Bundle) {
    return `${bundleAssetBase(bundle)}/hover.mp4`;
}

export function bundleHoverPosterPath(bundle: Bundle) {
    return `${bundleAssetBase(bundle)}/poster.png`;
}

const SHOWROOM_DOGS_BY_MOOD: Record<BundleMood, Array<Omit<BundleShowroomScene, "slug" | "image">>> = {
    summer: [
        { title: "시원한 낮 산책", dog: "중형 보더콜리", setting: "햇빛이 있는 동네 산책길" },
        { title: "공원 휴식 컷", dog: "소형 토이푸들", setting: "그늘진 공원 벤치 옆" },
        { title: "물 마시는 컷", dog: "대형 골든 리트리버", setting: "산책 후 휴대 식기 앞" },
    ],
    night: [
        { title: "골목길 야간 산책", dog: "중형 비글", setting: "조명이 낮은 주택가 골목" },
        { title: "반사광 체크", dog: "소형 포메라니안", setting: "가로등 아래 횡단보도 앞" },
        { title: "보호자 동행 컷", dog: "중형 시바견", setting: "달빛이 있는 조용한 산책로" },
    ],
    rain: [
        { title: "가벼운 비 산책", dog: "중형 코카스패니얼", setting: "젖은 보도와 낮은 구름" },
        { title: "우비 착용 컷", dog: "소형 말티즈", setting: "비 온 뒤 공원 입구" },
        { title: "방수 장비 컷", dog: "대형 래브라도", setting: "물웅덩이가 있는 산책길" },
    ],
    snack: [
        { title: "훈련 보상 컷", dog: "소형 치와와", setting: "밝은 실내 매트 위" },
        { title: "아그작 간식 컷", dog: "중형 웰시코기", setting: "주방 옆 낮은 테이블" },
        { title: "덴탈 루틴 컷", dog: "대형 사모예드", setting: "깨끗한 거실 러그 위" },
    ],
    care: [
        { title: "귀가 후 발 케어", dog: "소형 비숑프리제", setting: "현관 발매트 옆" },
        { title: "피부 진정 루틴", dog: "중형 푸들 믹스", setting: "욕실 앞 밝은 공간" },
        { title: "보습 마무리 컷", dog: "대형 스탠더드푸들", setting: "따뜻한 실내 조명" },
    ],
    play: [
        { title: "노즈워크 집중", dog: "중형 잭러셀테리어", setting: "실내 놀이방" },
        { title: "천천히 먹기 컷", dog: "소형 닥스훈트", setting: "식사 공간 매트 위" },
        { title: "에너지 소모 컷", dog: "대형 허스키", setting: "넓은 거실" },
    ],
    travel: [
        { title: "차량 탑승 준비", dog: "중형 프렌치불독", setting: "차량 뒷좌석 앞" },
        { title: "카시트 안정 컷", dog: "소형 요크셔테리어", setting: "밝은 차량 내부" },
        { title: "여행 출발 컷", dog: "대형 리트리버 믹스", setting: "주차장 옆 캐리어 공간" },
    ],
    walk: [
        { title: "햇빛 강한 산책", dog: "중형 오스트레일리안 셰퍼드", setting: "맑은 공원 산책로" },
        { title: "먼지 많은 길 보호", dog: "소형 슈나우저", setting: "마른 흙길과 낮은 풀밭" },
        { title: "아웃도어 준비 컷", dog: "대형 말라뮤트", setting: "넓은 야외 데크" },
    ],
};

export function bundleShowroomScenes(bundle: Bundle): BundleShowroomScene[] {
    return SHOWROOM_DOGS_BY_MOOD[bundle.mood].map((scene, index) => ({
        ...scene,
        slug: `showroom-${index + 1}`,
        image: `${bundleAssetBase(bundle)}/showroom-${index + 1}.png`,
    }));
}

export function findBundle(slug: string) {
    return BUNDLES.find((bundle) => bundle.slug === slug);
}

export function byBundleFolder(folder: string) {
    return CATALOG.find((product) => product.folder === folder);
}

export function bundleProducts(bundle: Bundle) {
    return bundle.folders.map(byBundleFolder).filter(Boolean) as CatalogProduct[];
}

export function bundleListPrice(products: CatalogProduct[]) {
    return products.reduce((sum, product) => sum + product.price, 0);
}

export function bundleSalePrice(bundle: Bundle, products = bundleProducts(bundle)) {
    const total = bundleListPrice(products);
    return Math.round((total * (100 - bundle.discountRate)) / 10000) * 100;
}

export function bundleSavings(bundle: Bundle, products = bundleProducts(bundle)) {
    return Math.max(0, bundleListPrice(products) - bundleSalePrice(bundle, products));
}

export type BundleAdjustment = {
    bundle: Bundle;
    sets: number;
    listPrice: number;
    salePrice: number;
    savings: number;
};

export function cartBundleAdjustments(lines: Array<{ productId: string; qty: number }>): BundleAdjustment[] {
    const remaining = new Map(lines.map((line) => [line.productId, line.qty]));
    const candidates = BUNDLES.map((bundle) => {
        const products = bundleProducts(bundle);
        return {
            bundle,
            products,
            savings: bundleSavings(bundle, products),
        };
    }).sort((a, b) => b.savings - a.savings);

    const adjustments: BundleAdjustment[] = [];
    for (const candidate of candidates) {
        if (candidate.products.length !== candidate.bundle.folders.length) continue;
        const sets = Math.min(...candidate.products.map((product) => remaining.get(product.id) ?? 0));
        if (sets <= 0) continue;

        for (const product of candidate.products) {
            remaining.set(product.id, Math.max(0, (remaining.get(product.id) ?? 0) - sets));
        }

        const listPrice = bundleListPrice(candidate.products);
        const salePrice = bundleSalePrice(candidate.bundle, candidate.products);
        adjustments.push({
            bundle: candidate.bundle,
            sets,
            listPrice,
            salePrice,
            savings: (listPrice - salePrice) * sets,
        });
    }

    return adjustments;
}

export function cartBundleSavings(lines: Array<{ productId: string; qty: number }>) {
    return cartBundleAdjustments(lines).reduce((sum, adjustment) => sum + adjustment.savings, 0);
}
