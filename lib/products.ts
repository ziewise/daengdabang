/**
 * lib/products.ts — 베스트 / 신상품 mock 데이터
 * ---------------------------------------------------------------------
 * 실제 백엔드 연결 시 fetch 로 교체. 현재는 정적 import.
 *
 * placeholder 컬러 (ph 1~6):
 *   1 파스텔 블루 / 2 라벤더 / 3 살구 / 4 노랑 / 5 민트 / 6 그레이
 * 실제 이미지 등록 시 image 필드를 추가해 ph 와 분기 처리.
 */

export type BestPeriod = "realtime" | "daily" | "weekly" | "monthly";

export interface Product {
    brand: string;
    name: string;
    price: number;
    original: number | null;
    discount: number | null;
    ph: 1 | 2 | 3 | 4 | 5 | 6;
    icon: string;
}

export const BEST_TAB_LABELS: Record<BestPeriod, string> = {
    realtime: "실시간",
    daily: "일간",
    weekly: "주간",
    monthly: "월간",
};

export const BEST_PRODUCTS: Record<BestPeriod, Product[]> = {
    realtime: [
        { brand: "RUFFWEAR",  name: "Front Range 데이 하네스",       price: 78000,  original: 92000,  discount: 15,   ph: 1, icon: "fa-medal" },
        { brand: "REX SPECS", name: "V2 강아지 고글 (Medium)",        price: 145000, original: null,   discount: null, ph: 2, icon: "fa-glasses" },
        { brand: "댕다방",     name: "데일리 산책 가방 베이지",        price: 32000,  original: 39000,  discount: 18,   ph: 3, icon: "fa-bag-shopping" },
        { brand: "댕다방",     name: "방수 강아지 우비 옐로우",        price: 45000,  original: null,   discount: null, ph: 4, icon: "fa-cloud-rain" },
    ],
    daily: [
        { brand: "댕다방",     name: "프리미엄 그레인프리 사료 5kg",   price: 58000,  original: 68000,  discount: 14,   ph: 5, icon: "fa-bone" },
        { brand: "댕다방",     name: "발바닥 케어 크림 50ml",          price: 18500,  original: null,   discount: null, ph: 6, icon: "fa-paw" },
        { brand: "댕다방",     name: "메모리폼 쿠션 침대 (M)",         price: 89000,  original: 110000, discount: 19,   ph: 1, icon: "fa-bed" },
        { brand: "댕다방",     name: "훈련용 저칼로리 간식 모음",      price: 12800,  original: null,   discount: null, ph: 2, icon: "fa-cookie-bite" },
    ],
    weekly: [
        { brand: "RUFFWEAR",  name: "Roamer 자동조절 리드줄",         price: 52000,  original: 62000,  discount: 16,   ph: 3, icon: "fa-link" },
        { brand: "댕다방",     name: "자동 급식기 5L 와이파이",        price: 124000, original: null,   discount: null, ph: 4, icon: "fa-utensils" },
        { brand: "댕다방",     name: "종합 영양제 패키지",             price: 68000,  original: 79000,  discount: 14,   ph: 5, icon: "fa-flask" },
        { brand: "댕다방",     name: "노즈워크 매트 라지",             price: 35000,  original: null,   discount: null, ph: 6, icon: "fa-grip" },
    ],
    monthly: [
        { brand: "댕다방",     name: "산책 풀세트 (하네스+리드줄+가방)", price: 198000, original: 235000, discount: 16,   ph: 1, icon: "fa-shoe-prints" },
        { brand: "댕다방",     name: "월간 위생용품 정기 패키지",        price: 89000,  original: null,   discount: null, ph: 2, icon: "fa-soap" },
        { brand: "REX SPECS", name: "Air 강아지 고글 (대형견)",         price: 168000, original: null,   discount: null, ph: 3, icon: "fa-glasses" },
        { brand: "댕다방",     name: "천연 라텍스 매트리스 침대",        price: 248000, original: 298000, discount: 17,   ph: 4, icon: "fa-bed" },
    ],
};

/** 신상품 (자동 캐러셀용, 12종 — 무한 루프 3x 클론) */
export const NEW_PRODUCTS: Product[] = [
    { brand: "RUFFWEAR", name: "릿지라인 하네스 (2026)",             price: 270000, original: null, discount: null, ph: 1, icon: "fa-medal" },
    { brand: "RUFFWEAR", name: "팔리세이드 팩 반려견 배낭 (2026)",    price: 226000, original: null, discount: null, ph: 2, icon: "fa-bag-shopping" },
    { brand: "RUFFWEAR", name: "버트 커버올 스노우 슈트 (2025FW)",    price: 208000, original: null, discount: null, ph: 3, icon: "fa-snowflake" },
    { brand: "RUFFWEAR", name: "팔리세이드 슬립 판초 (2026)",         price: 168000, original: null, discount: null, ph: 4, icon: "fa-cloud-rain" },
    { brand: "RUFFWEAR", name: "선 샤워 커버올 레인 슈트 (2025FW)",   price: 164000, original: null, discount: null, ph: 5, icon: "fa-umbrella" },
    { brand: "RUFFWEAR", name: "릿지라인 리드줄 (2026)",              price: 106000, original: null, discount: null, ph: 6, icon: "fa-link" },
    { brand: "RUFFWEAR", name: "클라이메이트 체인저 재킷 (2025FW)",   price: 104000, original: null, discount: null, ph: 1, icon: "fa-shirt" },
    { brand: "RUFFWEAR", name: "히치 하이커 리드줄 (2026)",            price: 98000,  original: null, discount: null, ph: 2, icon: "fa-link" },
    { brand: "RUFFWEAR", name: "프론트 레인지 플렉스 하네스 (2026)",  price: 92000,  original: null, discount: null, ph: 3, icon: "fa-medal" },
    { brand: "RUFFWEAR", name: "클라이메이트 체인저 베스트 (2025FW)", price: 89000,  original: null, discount: null, ph: 4, icon: "fa-shirt" },
    { brand: "RUFFWEAR", name: "릿지라인 반려견 슈즈 (2026)",          price: 89000,  original: null, discount: null, ph: 5, icon: "fa-shoe-prints" },
    { brand: "RUFFWEAR", name: "릿지라인 목줄 (2026)",                 price: 76000,  original: null, discount: null, ph: 6, icon: "fa-circle-nodes" },
];

/** 가격 천단위 콤마 포맷 */
export const formatKRW = (n: number) => n.toLocaleString("ko-KR");
