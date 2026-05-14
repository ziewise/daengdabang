/**
 * lib/mypage-data.ts — 마이페이지 mock 데이터
 * ---------------------------------------------------------------------
 * 백엔드 연결 시 fetch 로 교체.
 */
import type { Order, PetProfile } from "./types";

export const MOCK_ORDERS: Order[] = [
    { id: "ORD-2026-0512-001", date: "2026.05.12", name: "Ruffwear Front Range 하네스 (M)",   amount: 78000,  status: "shipped",    icon: "fa-shirt" },
    { id: "ORD-2026-0508-002", date: "2026.05.08", name: "Rex Specs V2 강아지 고글 (M)",       amount: 145000, status: "shipping",   icon: "fa-glasses" },
    { id: "ORD-2026-0501-003", date: "2026.05.01", name: "댕다방 데일리 산책 가방 베이지",      amount: 32000,  status: "preparing",  icon: "fa-bag-shopping" },
];

export const ORDER_STATUS_LABEL = {
    shipped:   "배송완료",
    shipping:  "배송중",
    preparing: "상품준비중",
} as const;

/** Mock 사용자 활동 (등급 계산용) — 백엔드 응답으로 교체 */
export const MOCK_USER_STATS = {
    annualSpend: MOCK_ORDERS.reduce((s, o) => s + o.amount, 0),  // 255,000원
    activityPoints: 240,
    points: 1200,            // 보유 적립금
    totalEarned: 8400,       // 누적 적립
    wishlist: 12,
    reviews: 0,
};

/** 마이페이지 사이드바 메뉴 정의 (라우트별) */
export interface MyMenuItem {
    href: string;
    label: string;
    icon: string;
    divider?: boolean;       // 위에 divider 표시
}

export const MYPAGE_MENU: MyMenuItem[] = [
    { href: "/mypage",              label: "대시보드",      icon: "fa-house" },
    { href: "/mypage/pets",         label: "펫 프로필",     icon: "fa-paw" },
    { href: "/mypage/petlens-log",  label: "펫렌즈 기록",   icon: "fa-wand-magic-sparkles" },
    { href: "/mypage/orders",       label: "주문 내역",     icon: "fa-bag-shopping" },
    { href: "/mypage/address",      label: "배송지 관리",   icon: "fa-location-dot" },
    { href: "/mypage/wishlist",     label: "찜한 상품",     icon: "fa-heart" },
    { href: "/mypage/reviews",      label: "내 리뷰",       icon: "fa-star" },
    { href: "/mypage/points",       label: "적립금",        icon: "fa-coins" },
    { href: "/mypage/grade",        label: "등급 / 혜택",   icon: "fa-crown" },
    { href: "/mypage/profile",      label: "회원정보 수정", icon: "fa-user-pen", divider: true },
];

/** 등록 후 며칠 지났는지 mock */
export function getJoinDate(authTs?: number): string {
    if (!authTs) return "2026.05.13";
    return new Date(authTs).toLocaleDateString("ko-KR");
}

// ============ 펫 프로필 mock — 3마리 다견 가구 (펫 0개일 때 fallback) ============
// 사진은 public/images/reviews/r1~r3.jpg (강아지 사진) 재활용
const oneDay = 24 * 60 * 60 * 1000;
const now = Date.now();

export const MOCK_PETS: PetProfile[] = [
    {
        id: "mock-pet-1",
        name: "초코",
        breed: "골든리트리버",
        confidence: 92,
        body: { size: "중대형", weight: "25~30kg", coat: "장모·이중모", activity: "활동량 높음" },
        avatar: "/images/reviews/r1.jpg",
        photos: ["/images/reviews/r1.jpg"],
        analyzedAt: now - 2 * oneDay,
    },
    {
        id: "mock-pet-2",
        name: "콩이",
        breed: "푸들 (토이)",
        confidence: 88,
        body: { size: "소형", weight: "3~4kg", coat: "곱슬모", activity: "활동량 보통" },
        avatar: "/images/reviews/r3.jpg",
        photos: ["/images/reviews/r3.jpg"],
        analyzedAt: now - 7 * oneDay,
    },
    {
        id: "mock-pet-3",
        name: "두부",
        breed: "비글",
        confidence: 85,
        body: { size: "중형", weight: "10~12kg", coat: "단모·이중모", activity: "활동량 매우 높음" },
        avatar: "/images/reviews/r4.jpg",
        photos: ["/images/reviews/r4.jpg"],
        analyzedAt: now - 14 * oneDay,
    },
];

/** 펫 목록 + mock fallback — 실 펫이 0개면 mock 반환 */
export function petsOrMock(pets: PetProfile[]): PetProfile[] {
    return pets.length > 0 ? pets : MOCK_PETS;
}

// ============ 배송지 mock ============
export interface Address {
    id: string;
    label: string;          // "집", "회사" 등
    recipient: string;
    phone: string;
    zipcode: string;
    address1: string;
    address2: string;
    isDefault?: boolean;
}

export const MOCK_ADDRESSES: Address[] = [
    {
        id: "addr-1",
        label: "집",
        recipient: "댕댕이 가족",
        phone: "010-0000-0000",
        zipcode: "04567",
        address1: "서울특별시 XX구 XX로 00",
        address2: "00동 0000호",
        isDefault: true,
    },
    {
        id: "addr-2",
        label: "회사",
        recipient: "댕댕이 가족",
        phone: "010-0000-0000",
        zipcode: "06234",
        address1: "서울특별시 YY구 YY로 00",
        address2: "YY빌딩 0층",
    },
];

// ============ 찜한 상품 mock ============
export interface WishItem {
    id: string;
    brand: string;
    name: string;
    price: number;
    original: number | null;
    discount: number | null;
    ph: 1 | 2 | 3 | 4 | 5 | 6;
    icon: string;
    addedAt: string;        // "2026.05.10"
    inStock: boolean;
}

export const MOCK_WISHLIST: WishItem[] = [
    { id: "w1", brand: "RUFFWEAR", name: "Front Range 데이 하네스",    price: 78000,  original: 92000,  discount: 15,  ph: 1, icon: "fa-medal",        addedAt: "2026.05.10", inStock: true },
    { id: "w2", brand: "REX SPECS", name: "V2 강아지 고글 (Medium)",   price: 145000, original: null,   discount: null, ph: 2, icon: "fa-glasses",      addedAt: "2026.05.08", inStock: true },
    { id: "w3", brand: "댕다방",     name: "프리미엄 그레인프리 사료 5kg", price: 58000,  original: 68000,  discount: 14,  ph: 5, icon: "fa-bone",         addedAt: "2026.05.05", inStock: true },
    { id: "w4", brand: "댕다방",     name: "메모리폼 쿠션 침대 (M)",      price: 89000,  original: 110000, discount: 19,  ph: 1, icon: "fa-bed",          addedAt: "2026.05.03", inStock: false },
    { id: "w5", brand: "댕다방",     name: "관절 케어 영양제 (대형견)",   price: 68000,  original: null,   discount: null, ph: 5, icon: "fa-flask",        addedAt: "2026.04.28", inStock: true },
    { id: "w6", brand: "RUFFWEAR", name: "Roamer 자동조절 리드줄",     price: 52000,  original: 62000,  discount: 16,  ph: 3, icon: "fa-link",         addedAt: "2026.04.25", inStock: true },
];

// ============ 내 리뷰 mock ============
export interface MyReview {
    id: string;
    productName: string;
    productBrand: string;
    rating: number;
    text: string;
    date: string;
    helpful: number;        // 좋아요 수
    hasPhoto: boolean;
}

export const MOCK_MY_REVIEWS: MyReview[] = [
    {
        id: "r1",
        productName: "Ruffwear Front Range 하네스",
        productBrand: "RUFFWEAR",
        rating: 5,
        text: "활동량 많은 우리 강아지한테 사이즈도 딱이고 디자인도 예뻐서 정말 만족합니다. 산책할 때마다 꼭 챙겨가요.",
        date: "2026.05.12",
        helpful: 24,
        hasPhoto: true,
    },
    {
        id: "r2",
        productName: "댕다방 데일리 산책 가방",
        productBrand: "댕다방",
        rating: 4,
        text: "수납도 잘 되고 가벼워서 좋아요. 색상도 예쁩니다.",
        date: "2026.05.05",
        helpful: 8,
        hasPhoto: false,
    },
];

/** 작성 가능한 리뷰 (구매 후 미작성 상품) */
export interface PendingReview {
    orderId: string;
    productName: string;
    productBrand: string;
    purchaseDate: string;
    icon: string;
}

export const MOCK_PENDING_REVIEWS: PendingReview[] = [
    { orderId: "ORD-2026-0508-002", productName: "Rex Specs V2 강아지 고글 (M)", productBrand: "REX SPECS", purchaseDate: "2026.05.08", icon: "fa-glasses" },
];

// ============ 적립금 내역 mock ============
export interface PointHistory {
    id: string;
    date: string;
    type: "earn" | "use" | "expire";
    title: string;
    amount: number;        // 양수: 적립, 음수: 사용
}

export const MOCK_POINT_HISTORY: PointHistory[] = [
    { id: "p1", date: "2026.05.12", type: "earn",   title: "Ruffwear Front Range 하네스 구매 적립",   amount: 780 },
    { id: "p2", date: "2026.05.10", type: "earn",   title: "리뷰 작성 보너스",                          amount: 500 },
    { id: "p3", date: "2026.05.08", type: "earn",   title: "Rex Specs V2 고글 구매 적립",              amount: 1450 },
    { id: "p4", date: "2026.05.05", type: "use",    title: "댕다방 데일리 산책 가방 결제 시 사용",    amount: -2000 },
    { id: "p5", date: "2026.05.01", type: "earn",   title: "댕다방 데일리 산책 가방 구매 적립",        amount: 320 },
    { id: "p6", date: "2026.04.20", type: "earn",   title: "친구 추천 보너스 (3명)",                    amount: 3000 },
    { id: "p7", date: "2026.03.13", type: "earn",   title: "가입 축하 포인트",                          amount: 5000 },
];
