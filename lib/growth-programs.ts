export const GROWTH_PROGRAM_IDS = [
    "membership_beta",
    "brand_challenge",
    "product_tester",
    "custom_goods",
    "local_care",
] as const;

export type GrowthProgramId = (typeof GROWTH_PROGRAM_IDS)[number];

export type GrowthProgramCard = {
    id: "membership" | "brand" | "goods" | "local";
    eyebrow: string;
    title: string;
    status: string;
    description: string;
    details: readonly string[];
    icon: string;
    tone: "coral" | "teal" | "orange";
    interestOptions: readonly {
        programId: GrowthProgramId;
        label: string;
    }[];
    existingFeature?: {
        href: string;
        label: string;
        helper: string;
    };
};

export const GROWTH_PROGRAM_CARDS: readonly GrowthProgramCard[] = [
    {
        id: "membership",
        eyebrow: "MEMBERSHIP BETA",
        title: "월 4,900원 멤버십 베타",
        status: "가격·혜택 검증 중",
        description: "매주 변화를 한눈에 보는 돌봄 멤버십을 준비하고 있어요.",
        details: [
            "주간 AI 변화 리포트와 이전 기록 비교",
            "예방접종·복약·건강 일정 알림 후보",
            "AI 이용 범위 확대 후보",
        ],
        icon: "fa-gem",
        tone: "coral",
        interestOptions: [{ programId: "membership_beta", label: "멤버십 소식 받기" }],
    },
    {
        id: "brand",
        eyebrow: "BRAND PROGRAM",
        title: "브랜드 챌린지·체험단",
        status: "협업 브랜드 모집 전",
        description: "산책·체중·관절 같은 돌봄 주제의 프로그램 수요를 먼저 확인해요.",
        details: [
            "챌린지와 체험단은 각각 따로 관심등록",
            "선정 기준과 제품 제공 사실을 투명하게 안내",
            "긍정 후기 작성이나 구매를 조건으로 요구하지 않음",
        ],
        icon: "fa-flag-checkered",
        tone: "teal",
        interestOptions: [
            { programId: "brand_challenge", label: "챌린지 소식 받기" },
            { programId: "product_tester", label: "체험단 소식 받기" },
        ],
    },
    {
        id: "goods",
        eyebrow: "CUSTOM GOODS",
        title: "우리 아이 맞춤 굿즈",
        status: "POD 제작 방식 검토 중",
        description: "사진과 기록을 활용한 소량 주문 제작 후보를 살펴보고 있어요.",
        details: [
            "상품·가격·제작 일정은 아직 확정되지 않음",
            "관심등록은 주문이나 결제가 아님",
            "사진 활용은 제작 단계에서 별도 동의를 받음",
        ],
        icon: "fa-shirt",
        tone: "orange",
        interestOptions: [{ programId: "custom_goods", label: "맞춤 굿즈 소식 받기" }],
    },
    {
        id: "local",
        eyebrow: "LOCAL CARE",
        title: "동네 돌봄 연결",
        status: "예약·제휴 서비스 준비 중",
        description: "병원·미용·호텔·데이케어를 지역별로 연결하는 방식을 검토하고 있어요.",
        details: [
            "현재 제휴 업체나 예약 가능 업체로 표시하지 않음",
            "처음에는 한 지역·한 카테고리부터 검증 예정",
            "영업·진료 가능 여부는 방문 전 직접 확인",
        ],
        icon: "fa-map-location-dot",
        tone: "teal",
        interestOptions: [{ programId: "local_care", label: "로컬케어 소식 받기" }],
        existingFeature: {
            href: "/chat/?q=%EA%B0%80%EA%B9%8C%EC%9A%B4%20%EB%8F%99%EB%AC%BC%EB%B3%91%EC%9B%90%20%EC%B0%BE%EC%95%84%EC%A4%98",
            label: "현재 위치로 병원 후보 찾기",
            helper: "기존 AI 상담의 지도 검색 보조 기능으로 이동합니다.",
        },
    },
] as const;

const INTEREST_LABELS = GROWTH_PROGRAM_CARDS.flatMap((card) => card.interestOptions)
    .reduce<Record<GrowthProgramId, string>>((labels, option) => {
        labels[option.programId] = option.label;
        return labels;
    }, {} as Record<GrowthProgramId, string>);

export function growthInterestLabel(programId: GrowthProgramId): string {
    return INTEREST_LABELS[programId];
}

export type GrowthShareKind = "care_result" | "friend_invite";

const SHARE_COPY: Record<GrowthShareKind, {
    title: string;
    text: string;
    source: string;
    content: string;
}> = {
    care_result: {
        title: "댕다방에서 매일 돌봄을 기록해요",
        text: "댕다방 AI에서 우리 아이의 돌봄 기록을 남기고 있어요. 건강 상세 없이 돌봄 습관만 안전하게 공유해요.",
        source: "member_share",
        content: "safe_ai_record",
    },
    friend_invite: {
        title: "같이 보물광산 출근할래요?",
        text: "출근도장부터 산책·돌봄 기록까지, 댕다방 보물광산에서 매일 하나씩 함께해요.",
        source: "friend_invite",
        content: "treasure_mine_invite",
    },
};

export function growthCampaignUrl(kind: GrowthShareKind, origin: string): string {
    let safeOrigin = "https://www.daengdabang.com";
    try {
        const candidate = new URL(origin);
        if (candidate.protocol === "http:" || candidate.protocol === "https:") {
            safeOrigin = candidate.origin;
        }
    } catch {
        // Production origin is the privacy-safe fallback for malformed inputs.
    }
    const url = new URL("/treasure-mine/", safeOrigin);
    const copy = SHARE_COPY[kind];
    url.searchParams.set("utm_source", copy.source);
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", "treasure_mine");
    url.searchParams.set("utm_content", copy.content);
    return url.toString();
}

export function growthSharePayload(kind: GrowthShareKind, origin: string) {
    const copy = SHARE_COPY[kind];
    return {
        title: copy.title,
        text: copy.text,
        url: growthCampaignUrl(kind, origin),
    };
}
