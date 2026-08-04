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
        text: "카메라를 가까이 대도 가만히 바라봐 주는 우리 럭키예요. 긴 귀와 촉촉한 눈까지 또렷하게 담겨서 가장 좋아하는 사진이 됐어요.",
        author: "럭키맘",
        product: "우리 아이 일상 포토",
        image: "/images/reviews/r1.jpg",
    },
    {
        rating: 5,
        text: "햇살 드는 소파가 코코의 최애 자리예요. 편하게 기대어 쉬는 모습이 너무 사랑스러워서 한 장 남겼어요.",
        author: "코코아빠",
        product: "우리 아이 휴식 기록",
        image: "/images/reviews/r2.jpg",
    },
    {
        rating: 5,
        text: "이동가방만 꺼내면 두부가 먼저 쏙 들어가요. 안에서 편안하게 쉬는 걸 보니 외출 준비가 훨씬 수월해졌어요.",
        author: "두부맘",
        product: "반려견 이동가방",
        image: "/images/reviews/r3.jpg",
    },
    {
        rating: 4,
        text: "매너팬티를 입고 포근한 소파에서 잠든 초코예요. 몸에 편하게 맞아 쉬는 동안에도 불편해하지 않았어요.",
        author: "초코맘",
        product: "반려견 매너팬티",
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
