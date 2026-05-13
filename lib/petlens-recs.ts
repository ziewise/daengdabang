/**
 * lib/petlens-recs.ts — 펫렌즈 결과 페이지 추천 데이터
 * ---------------------------------------------------------------------
 * 현재는 mock — 백엔드 연동 시 견종/체형에 따라 동적 추천.
 *
 * 외부 쇼핑몰 URL 은 placeholder. 사용자가 실제 상품 페이지 URL 을
 * 받아 externalRecs[i].url 에 교체.
 */

export interface HealthRisk {
    name: string;
    severity: 1 | 2 | 3;   // ★ 개수
}

export interface InternalRec {
    brand: string;
    name: string;
    price: number;
    ph: 1 | 2 | 3 | 4 | 5 | 6;
    icon: string;
}

export interface ExternalRec {
    name: string;
    mall: string;
    url: string;
}

export const HEALTH_RISKS: HealthRisk[] = [
    { name: "고관절 형성부전",   severity: 3 },
    { name: "알러지 피부염",     severity: 2 },
    { name: "외이염",            severity: 2 },
    { name: "비만 (활동량 부족 시)", severity: 1 },
];

export const INTERNAL_RECS: InternalRec[] = [
    { brand: "RUFFWEAR", name: "프론트 레인지 데이 팩 하네스 (2026)", price: 92000,  ph: 1, icon: "fa-medal" },
    { brand: "댕다방",    name: "관절 케어 영양제 (대형견)",            price: 68000,  ph: 5, icon: "fa-flask" },
    { brand: "RUFFWEAR", name: "플로트 코트 구명 조끼",                price: 174000, ph: 2, icon: "fa-shield" },
    { brand: "페리티",   name: "알로에 수딩 케어 미스트",                price: 18000,  ph: 3, icon: "fa-spray-can" },
];

export const EXTERNAL_RECS: ExternalRec[] = [
    { name: "Antinol Plus 관절 영양제",          mall: "Antinol 공식",  url: "https://antinol.co.kr/" },
    { name: "Ruffwear Front Range 하네스",       mall: "Ruffwear 공식", url: "https://ruffwear.com/products/front-range-day-pack" },
    { name: "Yora 곤충사료 라지브리드",          mall: "Yora 공식",     url: "https://yorapets.com/" },
    { name: "Canagan 그레인프리 사료",           mall: "Canagan 공식",  url: "https://canagan.com/" },
    { name: "Now Foods 관절 영양제",             mall: "아이허브",      url: "https://www.iherb.com/" },
];

export const SEARCH_KEYWORDS = ["골든리트리버 관절 영양제", "대형견 하네스", "장모견 케어"];

/** 외부 검색 URL — 키워드 + 쇼핑몰 조합 */
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
