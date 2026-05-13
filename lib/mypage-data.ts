/**
 * lib/mypage-data.ts — 마이페이지 mock 데이터
 * ---------------------------------------------------------------------
 * 백엔드 연결 시 fetch 로 교체.
 */
import type { Order } from "./types";

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
