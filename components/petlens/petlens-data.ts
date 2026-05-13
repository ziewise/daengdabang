/**
 * petlens-data.ts — 펫렌즈 모달 mock 데이터 + 슬롯/가이드 설정
 * ---------------------------------------------------------------------
 * 향후 실제 AI 모델 연동 시 mockResult / analysisSteps 만 교체.
 */
import type { PetlensSlot } from "@/lib/types";

/** 슬롯별 라벨/힌트/카메라 가이드 프레임 형태 */
export const SLOT_CONFIG: Record<
    PetlensSlot,
    {
        label: string;
        hint: string;
        ratioLabel: string;       // "1:1", "16:10", "3:4"
        ratioKey: "ratioFace" | "ratioSide" | "ratioFront";   // petlens.module.css 의 클래스 키
        cameraClass: "face" | "side" | "front";
        cameraHint: string;
    }
> = {
    0: {
        label: "얼굴",
        hint: "정면 클로즈업",
        ratioLabel: "1:1",
        ratioKey: "ratioFace",
        cameraClass: "face",
        cameraHint: "얼굴을 원 안에 맞춰주세요",
    },
    1: {
        label: "측면",
        hint: "옆에서 본 전신",
        ratioLabel: "16:10",
        ratioKey: "ratioSide",
        cameraClass: "side",
        cameraHint: "강아지 옆모습이 프레임에 들어오게 맞춰주세요",
    },
    2: {
        label: "정면 (전체)",
        hint: "정면에서 본 전신",
        ratioLabel: "3:4",
        ratioKey: "ratioFront",
        cameraClass: "front",
        cameraHint: "강아지 전체가 프레임에 들어오게 맞춰주세요",
    },
};

export interface MockResult {
    breed: { primary: string; confidence: number };
    body: { size: string; weight: string; coat: string; activity: string };
}

export const MOCK_RESULT: MockResult = {
    breed: { primary: "골든리트리버", confidence: 92 },
    body: {
        size: "중대형",
        weight: "25~30kg",
        coat: "장모·이중모",
        activity: "활동량 높음",
    },
};

export const ANALYSIS_STEPS: { text: string; progress: number }[] = [
    { text: "강아지 영역 인식 중...", progress: 25 },
    { text: "견종 판독 중...", progress: 55 },
    { text: "체형 분석 중...", progress: 80 },
    { text: "맞춤 상품 검색 중...", progress: 100 },
];
