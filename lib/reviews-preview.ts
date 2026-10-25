/**
 * reviews-preview.ts — 자사몰 상품 후기 "시안" 자료 · 2026-10-25
 * ---------------------------------------------------------------------
 * 서버(협업자)가 후기 기능을 만들기 전, 화면 시안을 보기 위한 예시 자료와 스위치.
 *  - 개발 서버(npm run dev)에서만 켜짐: 상품 주소에 ?rvpreview=1 을 붙이거나 localStorage "ddb.review.preview" = "1".
 *  - 배포 빌드(NODE_ENV=production)에서는 절대 켜지지 않음 → 운영 화면은 그대로(가짜 단추 없음).
 *  - 타입은 인계 문서(docs/09-앱-시안-인계/HANDOFF_20261025_BACKEND_TODO_4ITEMS_READY.md 4장)의 서버 응답 모양을 따름.
 *    서버가 준비되면 이 파일의 예시 자료 대신 lib/reviews-api.ts(새로 만들 파일)에서 같은 모양을 받아 쓰면 됨.
 */
"use client";

import { useSyncExternalStore } from "react";

const PREVIEW_KEY = "ddb.review.preview";

/** 시안 스위치 — 개발 서버 + (?rvpreview=1 또는 localStorage). ?rvpreview=empty 는 "첫 후기" 빈 화면 */
export type ReviewPreviewMode = "off" | "on" | "empty";
function readPreview(): ReviewPreviewMode {
    if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return "off";
    try {
        const query = new URLSearchParams(window.location.search).get("rvpreview");
        if (query === "1") return "on";
        if (query === "empty") return "empty";
        return window.localStorage.getItem(PREVIEW_KEY) === "1" ? "on" : "off";
    } catch {
        return "off";
    }
}

const noop = () => () => {};
/** 화면에서 쓰는 스위치(서버 그림에서는 늘 꺼짐 — 붙은 뒤 한 번 읽음) */
export function useReviewPreview(): ReviewPreviewMode {
    return useSyncExternalStore(noop, readPreview, () => "off");
}

export type ReviewFit = "small" | "good" | "big";

export type OwnReview = {
    id: string;
    type: "text" | "photo";
    rating: 1 | 2 | 3 | 4 | 5;
    body: string;
    /** 가린 이름(서버가 가려서 줌) */
    maskedName: string;
    createdAt: string;
    option?: string;
    fit?: ReviewFit;
    pet?: { name: string; breed: string; weightKg: number; size?: string };
    media: Array<{ url: string; width: number; height: number }>;
    helpfulCount: number;
    helpfulByMe: boolean;
    sellerReply?: { body: string; createdAt: string };
};

export type ReviewSummary = {
    average: number;
    count: number;
    photoCount: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
    fit: Record<ReviewFit, number>;
    /** 후기에서 자주 나온 이야기(서버가 모아 줌 · 시안 예시) */
    keywords: Array<{ label: string; count: number }>;
    /** 우리 아이와 같은 사이즈를 고른 후기 수 */
    similarCount: number;
};

/** 분류별 짧은 평가 질문(서버 · 기획 확정 전 시안) */
export const FIT_QUESTION: Record<string, { question: string; options: Array<{ value: ReviewFit; label: string }> }> = {
    outdoor: { question: "사이즈는 어땠나요?", options: [{ value: "small", label: "작아요" }, { value: "good", label: "딱 맞아요" }, { value: "big", label: "커요" }] },
    food: { question: "아이가 잘 먹었나요?", options: [{ value: "small", label: "잘 안 먹어요" }, { value: "good", label: "잘 먹어요" }, { value: "big", label: "아주 잘 먹어요" }] },
    default: { question: "기대와 비교하면 어땠나요?", options: [{ value: "small", label: "아쉬워요" }, { value: "good", label: "기대만큼" }, { value: "big", label: "기대 이상" }] },
};

/** 상품 분류 → 짧은 평가 질문(입는 것 · 먹는 것 · 그 밖) */
export function fitQuestionFor(category?: string) {
    if (category === "outdoor") return FIT_QUESTION.outdoor;
    if (category === "food") return FIT_QUESTION.food;
    return FIT_QUESTION.default;
}

const R = (n: number) => ({ url: `/images/reviews/r${n}.jpg`, width: 600, height: 600 });

/** 예시 후기 — 사진은 반려견만 나온 것만(사람 얼굴이 보이는 사진은 안내 문구와 맞지 않아 뺌) */
export const PREVIEW_REVIEWS: OwnReview[] = [
    {
        id: "rv1", type: "photo", rating: 5, maskedName: "김*댕", createdAt: "2026-10-22", option: "블루 · S", fit: "good",
        pet: { name: "몽이", breed: "토이푸들", weightKg: 3.2, size: "S" },
        body: "산책 나갈 때마다 줄이 엉켜서 고민이었는데 길이가 넉넉해서 공원에서 마음껏 뛰어놀았어요. 손잡이도 손에 잘 감기고, 비 오는 날 젖어도 금방 말라서 좋아요. 다음에는 다른 색으로 하나 더 사려고요!",
        media: [R(1), R(3)], helpfulCount: 14, helpfulByMe: false,
        sellerReply: { body: "몽이와 즐거운 산책 시간이 되셨다니 저희도 기뻐요. 다른 색상도 곧 다시 들어올 예정이에요!", createdAt: "2026-10-23" },
    },
    {
        id: "rv2", type: "photo", rating: 5, maskedName: "박*리", createdAt: "2026-10-20", option: "레드 · M", fit: "good",
        pet: { name: "보리", breed: "요크셔테리어", weightKg: 2.6, size: "M" },
        body: "가볍고 튼튼해요. 보리가 끌어당겨도 고리가 단단하게 잡혀 있어서 안심이 돼요.",
        media: [R(4)], helpfulCount: 9, helpfulByMe: true,
    },
    {
        id: "rv3", type: "text", rating: 4, maskedName: "이*두", createdAt: "2026-10-18", option: "블루 · S", fit: "small",
        pet: { name: "두부", breed: "믹스견", weightKg: 7.4, size: "S" },
        body: "품질은 좋은데 두부한테는 한 치수 크게 살 걸 그랬어요. 7kg 넘는 친구들은 M 추천해요!",
        media: [], helpfulCount: 21, helpfulByMe: false,
    },
    {
        id: "rv4", type: "photo", rating: 5, maskedName: "최*이", createdAt: "2026-10-15", option: "그레이 · S", fit: "good",
        pet: { name: "콩이", breed: "코카스파니엘", weightKg: 11.8, size: "S" },
        body: "배송도 빠르고 포장도 꼼꼼했어요. 색이 사진이랑 똑같아요.",
        media: [R(2), R(7)], helpfulCount: 6, helpfulByMe: false,
    },
    {
        id: "rv6", type: "photo", rating: 4, maskedName: "한*루", createdAt: "2026-10-13", option: "블루 · M", fit: "good",
        pet: { name: "하루", breed: "보더콜리", weightKg: 14.2, size: "M" },
        body: "활동량 많은 하루가 뛰어도 몸에 딱 붙어서 안 돌아가요. 버클이 조금 뻑뻑한 건 아쉽지만 쓰다 보니 부드러워졌어요.",
        media: [R(6)], helpfulCount: 11, helpfulByMe: false,
    },
    {
        id: "rv5", type: "text", rating: 3, maskedName: "정*톨", createdAt: "2026-10-11", option: "레드 · M", fit: "big",
        pet: { name: "밤톨", breed: "요크셔테리어", weightKg: 2.9, size: "M" },
        body: "생각보다 길어서 처음엔 조금 다루기 어려웠어요. 익숙해지니 괜찮아요.",
        media: [], helpfulCount: 3, helpfulByMe: false,
        sellerReply: { body: "소중한 의견 감사해요. 상세 페이지에 길이 안내를 더 잘 보이게 바꿀게요!", createdAt: "2026-10-12" },
    },
];

export const PREVIEW_SUMMARY: ReviewSummary = {
    average: 4.6,
    count: 128,
    photoCount: 47,
    distribution: { 5: 92, 4: 24, 3: 8, 2: 3, 1: 1 },
    fit: { small: 14, good: 78, big: 8 },
    keywords: [
        { label: "가벼워요", count: 41 },
        { label: "입히기 쉬워요", count: 33 },
        { label: "튼튼해요", count: 27 },
        { label: "색이 예뻐요", count: 18 },
        { label: "배송이 빨라요", count: 12 },
    ],
    similarCount: 46,
};

/** 시안 작성 창에 미리 채울 우리 아이 · 주문 정보 */
export const PREVIEW_WRITE_CONTEXT = {
    option: "블루 · S",
    deliveredAt: "2026-10-20",
    deadline: "2027-01-18",
    rewardPoints: 1000,
    pet: { name: "몽이", breed: "토이푸들", weightKg: 3.2, size: "S" },
};

/** 별점 말 */
export const RATING_WORDS: Record<number, string> = { 1: "아쉬워요", 2: "조금 아쉬워요", 3: "보통이에요", 4: "좋아요", 5: "최고예요!" };

/** 글쓰기 도움 알약 — 누르면 이야기 칸에 첫마디를 붙여 줌 */
export const WRITING_PROMPTS: Array<{ label: string; starter: string }> = [
    { label: "사이즈", starter: "사이즈는 " },
    { label: "착용감", starter: "입혔을 때 " },
    { label: "아이 반응", starter: "아이가 " },
    { label: "소재 · 마감", starter: "소재는 " },
    { label: "배송 · 포장", starter: "배송은 " },
];
