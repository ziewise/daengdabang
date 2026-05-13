/**
 * lib/grades.ts — 댕다방 회원 등급 정의 + 산정 로직
 * ---------------------------------------------------------------------
 * 5단계 댕 시리즈 (댕린이→댕마스터).
 * 등급 산정: 연간 누적 결제액 또는 활동 점수 중 하나만 충족하면 승급.
 *
 * 작명·기준·혜택 변경 시 이 파일만 수정하면 모든 UI 가 자동 반영.
 */
import type { GradeDefinition } from "./types";

export const GRADES: GradeDefinition[] = [
    {
        id: 1, name: "댕린이", emoji: "🌱", color: "#10b981",
        requireSpend: 0, requirePoints: 0,
        pointsRate: 1, discount: 0, freeShipMin: null,
        perks: ["가입축하 5,000P"],
    },
    {
        id: 2, name: "댕친구", emoji: "🐾", color: "#3b82f6",
        requireSpend: 100_000, requirePoints: 100,
        pointsRate: 2, discount: 1, freeShipMin: 50_000,
        perks: ["월 1회 무료배송 쿠폰"],
    },
    {
        id: 3, name: "댕단짝", emoji: "🦴", color: "#a855f7",
        requireSpend: 300_000, requirePoints: 300,
        pointsRate: 3, discount: 2, freeShipMin: 30_000,
        perks: ["생일 10% 할인 쿠폰", "리뷰 작성 2배 적립"],
    },
    {
        id: 4, name: "댕가족", emoji: "💎", color: "#ec4899",
        requireSpend: 800_000, requirePoints: 700,
        pointsRate: 4, discount: 3, freeShipMin: 0,
        perks: ["생일 15% 할인 쿠폰", "신상품 우선 안내", "모든 주문 무료배송"],
    },
    {
        id: 5, name: "댕마스터", emoji: "👑", color: "#f59e0b",
        requireSpend: 2_000_000, requirePoints: 1_500,
        pointsRate: 5, discount: 5, freeShipMin: 0,
        perks: [
            "전담 큐레이션 추천",
            "VIP 이벤트 초대",
            "생일 20% + 기념일 쿠폰",
            "모든 주문 무료배송",
        ],
    },
];

/**
 * 현재 회원의 연간 결제액 / 활동 점수로 등급 결정.
 * 두 조건 중 하나만 충족해도 승급 — 구매로 키우든 활동(리뷰·사진공유)으로 키우든 OK.
 */
export function computeGrade(spend: number, points: number): GradeDefinition {
    let current = GRADES[0];
    for (const g of GRADES) {
        if (spend >= g.requireSpend || points >= g.requirePoints) current = g;
    }
    return current;
}

/** 다음 등급 (현재가 최고면 null) */
export function nextGrade(current: GradeDefinition): GradeDefinition | null {
    const idx = GRADES.findIndex((g) => g.id === current.id);
    return GRADES[idx + 1] ?? null;
}
