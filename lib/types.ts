/**
 * lib/types.ts — 댕다방 전역 타입 정의
 * ---------------------------------------------------------------------
 * 도메인 모델 + localStorage 스키마 타입.
 * 모든 컴포넌트/hook 에서 이 타입을 import 해서 일관성 유지.
 */

// ============ 인증 ============
export type AuthProvider = "email" | "google" | "kakao" | "naver" | "demo";

export interface LoginState {
    provider: AuthProvider;
    ts: number;
}

// ============ 펫 프로필 / 펫렌즈 분석 ============
export interface PetBody {
    size: string;       // "중대형", "소형" 등
    weight: string;     // "25~30kg" 등
    coat: string;       // "장모·이중모" 등
    activity: string;   // "활동량 높음" 등
}

/** 펫 데이터의 출처 — 회원 직접 등록 vs 펫렌즈 분석 */
export type PetSource = "registered" | "analyzed";

export interface PetProfile {
    id: string;                  // "pet_" + Date.now()
    name: string;                // 사용자 입력 (비어있으면 "댕댕이 N" 자동)
    breed: string;               // 견종
    confidence: number;          // 유사도 (0~100) — 직접 등록 시 100
    body: PetBody;
    avatar: string | null;       // dataURL (얼굴 사진)
    photos: string[];            // 분석 시 사용된 사진들 (얼굴/측면/정면)
    analyzedAt: number;          // 등록/분석 시각 (Date.now())
    /** 출처 — registered: 회원이 직접 등록 / analyzed: 펫렌즈 분석 결과
     *  기존 저장 데이터에 source 없으면 'analyzed' 로 간주 (마이그레이션) */
    source?: PetSource;
    /** 펫렌즈 분석(analyzed)이 등록된 펫(registered)에 연결된 경우 그 펫의 id
     *  연결 없는 경우 undefined (비회원 분석/연결 안 함 선택 등) */
    linkedPetId?: string;
}

// ============ 회원 등급 ============
export interface GradeDefinition {
    id: 1 | 2 | 3 | 4 | 5;
    name: string;                // "댕린이" 등
    emoji: string;
    color: string;               // hex
    requireSpend: number;        // 원
    requirePoints: number;
    pointsRate: number;          // %
    discount: number;            // %
    freeShipMin: number | null;  // null=없음, 0=모든 주문, 양수=최소 결제액
    perks: string[];
}

// ============ 주문 (mock) ============
export type OrderStatus = "preparing" | "shipping" | "shipped";

export interface Order {
    id: string;
    date: string;        // "2026.05.12"
    name: string;
    amount: number;
    status: OrderStatus;
    icon: string;        // fontawesome 클래스명
}

// ============ 펫렌즈 모달 입력 모드 ============
export type PetlensInputMode = "camera" | "file";
export type PetlensStep = "pet-select" | "mode-select" | "upload" | "analyzing" | "result";
export type PetlensSlot = 0 | 1 | 2;   // 얼굴 / 측면 / 정면
