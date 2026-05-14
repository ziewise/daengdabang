/**
 * lib/petlens-recs.ts — 펫렌즈 결과 페이지 추천 데이터
 * ---------------------------------------------------------------------
 * 현재는 mock — 백엔드 연동 시 견종/체형/연령/알러지에 따라 동적 추천.
 *
 * 외부 쇼핑몰 URL 은 placeholder. 사용자가 실제 상품 페이지 URL 을
 * 받아 EXTERNAL_RECS[i].url 에 교체.
 */

// ============ 견종별 취약 질환 ============
export interface HealthRisk {
    name: string;
    severity: 1 | 2 | 3;             // ★ 개수 (3=흔함)
    description: string;             // 보호자용 설명
    care: string[];                  // 관리 팁
    relatedProducts: string[];       // 관련 카테고리 (예: "관절 영양제")
    icon: string;                    // fontawesome
}

export const HEALTH_RISKS: HealthRisk[] = [
    {
        name: "고관절 형성부전",
        severity: 3,
        description: "대형견에 흔한 유전성 관절 질환. 활동량 많은 시기 무리하면 악화될 수 있어요.",
        care: [
            "체중 관리 (비만 시 관절 부담 ↑)",
            "미끄러운 바닥 방지 (양말·매트)",
            "과도한 점프 자제",
        ],
        relatedProducts: ["관절 영양제", "쿨매트", "발바닥 양말"],
        icon: "fa-bone",
    },
    {
        name: "알러지 피부염",
        severity: 2,
        description: "장모·이중모 견종에 비교적 흔함. 곡물·치킨 알러지 가능성도.",
        care: [
            "그레인프리 사료 검토",
            "주 1~2회 저자극 샴푸",
            "정기 빗질로 각질 제거",
        ],
        relatedProducts: ["저자극 샴푸", "그레인프리 사료", "오메가-3 영양제"],
        icon: "fa-virus",
    },
    {
        name: "외이염",
        severity: 2,
        description: "귀가 늘어진 견종은 통풍 부족으로 외이염 발생률 ↑.",
        care: [
            "주 1회 귀 청소",
            "수영·목욕 후 귀 건조",
            "정기 검진",
        ],
        relatedProducts: ["귀 세정제", "수의사 검진 쿠폰"],
        icon: "fa-ear-listen",
    },
    {
        name: "비만 (활동량 부족 시)",
        severity: 1,
        description: "활동량 부족하면 살이 잘 찌는 견종. 칼로리·산책량 균형이 핵심.",
        care: [
            "하루 1시간 이상 산책",
            "저칼로리 간식 선택",
            "노즈워크로 활동량 보충",
        ],
        relatedProducts: ["다이어트 사료", "노즈워크 매트", "산책 가방"],
        icon: "fa-weight-scale",
    },
];

// ============ 신체 특성 (분석 결과 외 추가 정보) ============
export interface BodyTrait {
    label: string;
    value: string;
    detail?: string;
}

export const BODY_TRAITS: BodyTrait[] = [
    { label: "분류",   value: "중대형",       detail: "체중 25kg 이상" },
    { label: "체중",   value: "25~30kg",     detail: "표준 범위" },
    { label: "모질",   value: "장모·이중모", detail: "주 2~3회 빗질 권장" },
    { label: "활동량", value: "높음",         detail: "하루 1시간+ 산책 필요" },
];

// ============ 영양제 추천 (취약 질환 매칭) ============
export interface Supplement {
    brand: string;
    name: string;
    price: number;
    target: string;        // 어떤 취약 질환/특성 매칭
    ph: 1 | 2 | 3 | 4 | 5 | 6;
    icon: string;
}

export const SUPPLEMENT_RECS: Supplement[] = [
    { brand: "댕다방", name: "글루코사민 관절 케어 (대형견)", price: 68000, target: "고관절 형성부전",   ph: 5, icon: "fa-flask" },
    { brand: "댕다방", name: "오메가-3 피부 모질 영양제",     price: 42000, target: "알러지 피부염",     ph: 3, icon: "fa-droplet" },
    { brand: "페리티", name: "유산균·프로바이오틱스",          price: 38000, target: "장 건강·면역",     ph: 2, icon: "fa-pills" },
    { brand: "댕다방", name: "종합 영양제 패키지",              price: 89000, target: "전반 영양 보충",    ph: 1, icon: "fa-prescription-bottle" },
];

// ============ 의류 사이즈 가이드 (체형 매칭) ============
export interface SizeGuide {
    category: string;        // "하네스", "의류", "고글" 등
    recommendedSize: string; // "L", "XL" 등
    measurements: { label: string; value: string }[];
    note?: string;
    icon: string;
}

export const SIZE_GUIDE: SizeGuide[] = [
    {
        category: "하네스",
        recommendedSize: "L",
        measurements: [
            { label: "가슴둘레",   value: "60~78cm" },
            { label: "목둘레",     value: "40~52cm" },
        ],
        note: "Ruffwear Front Range 기준",
        icon: "fa-medal",
    },
    {
        category: "의류 (탑·재킷)",
        recommendedSize: "XL",
        measurements: [
            { label: "등길이",     value: "55~62cm" },
            { label: "가슴둘레",   value: "65~80cm" },
        ],
        note: "대형견 표준 사이즈",
        icon: "fa-shirt",
    },
    {
        category: "고글 (Rex Specs)",
        recommendedSize: "Large",
        measurements: [
            { label: "두폭",       value: "10.5~12cm" },
            { label: "코끝-눈",   value: "5~6cm" },
        ],
        note: "골든리트리버 평균",
        icon: "fa-glasses",
    },
];

// ============ 자체 카탈로그 추천 (취약 질환 + 체형 + 시즌 종합) ============
export interface InternalRec {
    brand: string;
    name: string;
    price: number;
    ph: 1 | 2 | 3 | 4 | 5 | 6;
    icon: string;
    tag?: string;             // "건강·관절", "사이즈 매칭" 등
}

export const INTERNAL_RECS: InternalRec[] = [
    { brand: "RUFFWEAR", name: "프론트 레인지 데이 팩 하네스 (L)", price: 92000,  ph: 1, icon: "fa-medal",     tag: "사이즈 매칭" },
    { brand: "댕다방",    name: "관절 케어 영양제 (대형견)",          price: 68000,  ph: 5, icon: "fa-flask",     tag: "취약 질환" },
    { brand: "RUFFWEAR", name: "플로트 코트 구명 조끼 (XL)",          price: 174000, ph: 2, icon: "fa-shield",    tag: "활동·안전" },
    { brand: "페리티",   name: "알로에 수딩 케어 미스트",              price: 18000,  ph: 3, icon: "fa-spray-can", tag: "모질 케어" },
];

// ============ 외부 쇼핑몰 추천 (댕다방 미보유 상품) ============
export interface ExternalRec {
    name: string;
    mall: string;
    url: string;
    reason?: string;
}

export const EXTERNAL_RECS: ExternalRec[] = [
    { name: "Antinol Plus 관절 영양제",          mall: "Antinol 공식",  url: "https://antinol.co.kr/",   reason: "관절 전문" },
    { name: "Ruffwear Front Range 하네스",       mall: "Ruffwear 공식", url: "https://ruffwear.com/products/front-range-day-pack", reason: "직구·정품" },
    { name: "Yora 곤충사료 라지브리드",          mall: "Yora 공식",     url: "https://yorapets.com/",   reason: "알러지 친화" },
    { name: "Canagan 그레인프리 사료",           mall: "Canagan 공식",  url: "https://canagan.com/",    reason: "그레인프리" },
];

// ============ 시즌 추천 (월별 자동 매칭 — 현재는 5월 기준) ============
export interface SeasonalRec {
    title: string;
    desc: string;
    icon: string;
    color: string;          // tailwind 컬러 (배경)
    href: string;
}

export const SEASONAL_RECS: SeasonalRec[] = [
    {
        title: "장마철 우비·방수 의류",
        desc: "5~7월 우천 산책 필수템",
        icon: "fa-cloud-rain",
        color: "bg-aurora-blue/15 text-blue-700",
        href: "#promo-rainy",
    },
    {
        title: "여름 쿨매트·쿨토시",
        desc: "체온 조절 어려운 대형견에게",
        icon: "fa-snowflake",
        color: "bg-aurora-blue/15 text-cyan-700",
        href: "#promo-summer",
    },
];

// ============ 유사 펫 보호자 인사이트 (협업 필터링 mock) ============
export interface SimilarInsight {
    productName: string;
    brand: string;
    buyerCount: number;     // 같은 견종 보호자 중 구매자 수
    rating: number;
    reviewSnippet: string;
    ph: 1 | 2 | 3 | 4 | 5 | 6;
    icon: string;
    price: number;
}

export const SIMILAR_INSIGHTS: SimilarInsight[] = [
    {
        productName: "Ruffwear Front Range 하네스 (L)",
        brand: "RUFFWEAR",
        buyerCount: 2847,
        rating: 4.9,
        reviewSnippet: "활동량 많은 골든이한테 딱 맞아요. 사이즈도 정확.",
        ph: 1, icon: "fa-medal", price: 92000,
    },
    {
        productName: "글루코사민 관절 영양제 (대형견)",
        brand: "댕다방",
        buyerCount: 1923,
        rating: 4.8,
        reviewSnippet: "관절 약한 우리 댕댕이 1년째 먹이는데 활력 ↑",
        ph: 5, icon: "fa-flask", price: 68000,
    },
    {
        productName: "Ruffwear 클라이메이트 체인저 재킷",
        brand: "RUFFWEAR",
        buyerCount: 1456,
        rating: 4.7,
        reviewSnippet: "겨울철 산책 필수. 사이즈 가이드 정확해서 만족.",
        ph: 2, icon: "fa-shirt", price: 104000,
    },
    {
        productName: "오메가-3 피부 모질 영양제",
        brand: "댕다방",
        buyerCount: 1188,
        rating: 4.6,
        reviewSnippet: "장모종 모질 케어에 좋아요. 털 윤기 ↑",
        ph: 3, icon: "fa-droplet", price: 42000,
    },
];

/** 같은 견종 보호자 통계 */
export const SIMILAR_STATS = {
    breed: "골든리트리버",
    totalBuyers: 4283,
    topCategory: "관절·산책 용품",
    avgPurchase: 156000,
};

// ============ 검색 안내 (외부 검색 — 사용자가 직접 탐색) ============
export const SEARCH_KEYWORDS = ["골든리트리버 관절 영양제", "대형견 하네스 L", "장모견 케어"];

export const SEARCH_ENGINES = [
    { name: "네이버 쇼핑", icon: "fa-n", color: "bg-emerald-500",
      build: (q: string) => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}` },
    { name: "쿠팡",       icon: "fa-bag-shopping", color: "bg-red-500",
      build: (q: string) => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}` },
    { name: "11번가",     icon: "fa-shop", color: "bg-pink-500",
      build: (q: string) => `https://search.11st.co.kr/Search.tmall?kwd=${encodeURIComponent(q)}` },
    { name: "다나와",     icon: "fa-magnifying-glass-dollar", color: "bg-blue-500",
      build: (q: string) => `https://search.danawa.com/dsearch.php?query=${encodeURIComponent(q)}` },
];
