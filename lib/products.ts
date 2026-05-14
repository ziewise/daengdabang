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
    /** 이미지 미등록 상품 fallback — ph 색상 + icon 아이콘으로 placeholder 표시 */
    ph: 1 | 2 | 3 | 4 | 5 | 6;
    icon: string;
    /** 정적 상품 이미지 — 마우스 hover 전 기본 노출 */
    image?: string;
    /** hover 시 재생되는 짧은 영상 (mp4, 외부 CDN URL 가능) */
    video?: string;
}

export const BEST_TAB_LABELS: Record<BestPeriod, string> = {
    realtime: "실시간",
    daily: "일간",
    weekly: "주간",
    monthly: "월간",
};

/* 베스트 — 동일 4상품을 탭별로 순서만 회전. image/video 는 상품 고유 자산 */
const FLAGLINE: Product = {
    brand: "RUFFWEAR", name: "플레그라인 경량 하네스 (2024)",
    price: 92000, original: null, discount: null,
    ph: 1, icon: "fa-medal",
    image: "/images/products/best/pl.png",
    video: "https://res.cloudinary.com/dapuu4gsc/video/upload/v1778663410/pl_kts718.mp4",
};
const FRONTRANGE: Product = {
    brand: "RUFFWEAR", name: "프런트레인지 목줄 (2024)",
    price: 32000, original: null, discount: null,
    ph: 3, icon: "fa-circle-nodes",
    image: "/images/products/best/pr.png",
    video: "https://res.cloudinary.com/dapuu4gsc/video/upload/v1778663427/pr_d2ftfs.mp4",
};
const HILIGHT: Product = {
    brand: "RUFFWEAR", name: "하이 앤 라이트 경량 하네스 (2026)",
    price: 64000, original: null, discount: null,
    ph: 5, icon: "fa-medal",
    image: "/images/products/best/hnl.png",
    video: "https://res.cloudinary.com/dapuu4gsc/video/upload/v1778663400/hnl_zab0ii.mp4",
};
const BEACON: Product = {
    brand: "RUFFWEAR", name: "더 비콘 세이프티 라이트 (야간 산책)",
    price: 44000, original: null, discount: null,
    ph: 2, icon: "fa-lightbulb",
    image: "/images/products/best/light.png",
    video: "https://res.cloudinary.com/dapuu4gsc/video/upload/v1778663419/light_bon82k.mp4",
};

export const BEST_PRODUCTS: Record<BestPeriod, Product[]> = {
    realtime: [FLAGLINE,   FRONTRANGE, HILIGHT,    BEACON],
    daily:    [HILIGHT,    FLAGLINE,   BEACON,     FRONTRANGE],
    weekly:   [BEACON,     HILIGHT,    FRONTRANGE, FLAGLINE],
    monthly:  [FRONTRANGE, BEACON,     FLAGLINE,   HILIGHT],
};

/** 신상품 (자동 캐러셀용, 8종 — 무한 루프 3x 클론)
 *  러프웨어 정식 상품 라인업 — 가격 및 명칭은 실제 리스트 기준 */
export const NEW_PRODUCTS: Product[] = [
    { brand: "RUFFWEAR", name: "러프웨어 하이 앤 라이트 경량 하네스(2026)",      price: 64000,  original: null, discount: null, ph: 1, icon: "fa-medal",      image: "/images/products/new/1.png" },
    { brand: "RUFFWEAR", name: "러프웨어 하이 앤 라이트 리드줄(2026)",           price: 38000,  original: null, discount: null, ph: 2, icon: "fa-link",       image: "/images/products/new/2.png" },
    { brand: "RUFFWEAR", name: "러프웨어 캠프 플라이어 반려견 원반 장난감(2026)", price: 34000,  original: null, discount: null, ph: 3, icon: "fa-circle",     image: "/images/products/new/3.png" },
    { brand: "RUFFWEAR", name: "러프웨어 릿지라인 리드줄(2026)",                 price: 106000, original: null, discount: null, ph: 4, icon: "fa-link",       image: "/images/products/new/4.png" },
    { brand: "RUFFWEAR", name: "러프웨어 릿지라인 하네스(2026)",                 price: 270000, original: null, discount: null, ph: 5, icon: "fa-medal",      image: "/images/products/new/5.png" },
    { brand: "RUFFWEAR", name: "러프웨어 마운틴 에베레스트 도그 코트(2026)",     price: 104000, original: null, discount: null, ph: 6, icon: "fa-shirt",      image: "/images/products/new/6.png" },
    { brand: "RUFFWEAR", name: "러프웨어 웨빙 리믹스 볼 토이 S사이즈(2026)",     price: 24000,  original: null, discount: null, ph: 1, icon: "fa-baseball",   image: "/images/products/new/7.png" },
    { brand: "RUFFWEAR", name: "러프웨어 팰리세이드 슬립 판초(2026)",            price: 168000, original: null, discount: null, ph: 2, icon: "fa-cloud-rain", image: "/images/products/new/8.png" },
];

/** 가격 천단위 콤마 포맷 */
export const formatKRW = (n: number) => n.toLocaleString("ko-KR");
