/**
 * lib/reviews.ts — 리뷰 mock 데이터
 * ---------------------------------------------------------------------
 * 포토 리뷰 4개 + 간단 리뷰 4개. 백엔드 연결 시 API 응답으로 교체.
 */

export interface PhotoReview {
    rating: number;        // 0~5 (소수 가능, ex 4.5)
    text: string;
    author: string;
    product: string;
    image: string;         // /images/reviews/...
}

export interface SimpleReview {
    rating: number;
    text: string;
    author: string;
    product: string;
}

export const REVIEW_STATS = {
    avg: 4.9,
    total: 12847,
    recommend: 98,        // %
};

export const PHOTO_REVIEWS: PhotoReview[] = [
    {
        rating: 5,
        text: "정말 튼튼하고 우리 댕댕이가 너무 좋아해요. 산책할 때마다 꼭 챙겨가는데, 활동량 많은 우리 강아지한테 사이즈도 딱이고 디자인도 예뻐서 사진 찍을 때마다 이쁘게 나와요. 다음에 또 사고 싶은 제품이에요!",
        author: "럭키맘",
        product: "Ruffwear Front Range 하네스",
        image: "/images/reviews/r1.jpg",
    },
    {
        rating: 5,
        text: "고글이 잘 안 맞을까봐 걱정했는데 사이즈 가이드 따라 골라서 딱 맞아요.",
        author: "코코아빠",
        product: "Rex Specs V2 고글",
        image: "/images/reviews/r2.jpg",
    },
    {
        rating: 5,
        text: "아이스크림 너무 좋아해서 매일 하나씩 줘요. 더위가 심해서 걱정이었는데 이거 주고 나서 우리 댕댕이가 너무 행복해해요. 재료도 안심되고 맛있어 보여서 자주 살 것 같아요.",
        author: "두부맘",
        product: "댕스크림 딸기맛",
        image: "/images/reviews/r3.jpg",
    },
    {
        rating: 4,
        text: "우비 사이즈가 살짝 큰 편이지만 방수는 확실해요. 장마철 필수템.",
        author: "초코맘",
        product: "리프웨어 레인 자켓",
        image: "/images/reviews/r4.jpg",
    },
];

export const SIMPLE_REVIEWS: SimpleReview[] = [
    {
        rating: 5,
        text: "사료 바꾸고 나서 털이 윤기 나고 변 상태도 좋아졌어요. 알러지 있던 우리 강아지가 이 사료 먹은 후로 가려워하지도 않고 식욕도 좋아져서 정말 만족하고 있어요. 가격은 좀 있지만 그만한 값어치를 해요.",
        author: "몽몽아빠",
        product: "요라 올브리드 사료",
    },
    {
        rating: 5,
        text: "노즈워크 매트로 댕댕이 분리불안 해소했어요.",
        author: "호두맘",
        product: "노즈워크 매트 라지",
    },
    {
        rating: 5,
        text: "메모리폼 침대 받자마자 들어가서 안 나와요. 댕댕이 마음에 쏙 들었나봐요!",
        author: "송이맘",
        product: "아페토 도넛방석",
    },
    {
        rating: 5,
        text: "발바닥 크림이 정말 부드럽고 흡수도 빨라요. 산책 다녀온 후 패드 케어 필수템이라 자주 쓰는데, 향도 거슬리지 않고 강아지가 핥아도 안전한 성분이라 안심됩니다.",
        author: "버터맘",
        product: "페리티 알로에 케어",
    },
];

/** ★★★★☆ 형태 별점 — 정수 부분만 채움 */
export const stars = (rating: number) => "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
